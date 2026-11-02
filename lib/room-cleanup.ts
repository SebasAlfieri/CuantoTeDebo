import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type Firestore
} from 'firebase-admin/firestore';

// Limpieza automática de salas: se borran las que pasan 7 días sin ninguna escritura.
// Corre en el servidor (ver app/api/cron/cleanup-rooms/route.ts), nunca en el navegador.
export const INACTIVITY_DAYS = 7;

const ROOMS_COLLECTION = 'rooms';
// Documento interno (las reglas lo cierran para los clientes) que recuerda si ya se migraron
// las salas creadas antes de que existiera lastActivityAt.
const META_DOC = '_meta/roomCleanup';
const PAGE_SIZE = 200;
// Tope por ejecución para acotar lecturas/escrituras diarias; lo que quede se borra al día siguiente.
const MAX_DELETES_PER_RUN = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CleanupResult {
  cutoff: string;
  backfilled: number;
  deleted: number;
  // Salas que tuvieron actividad entre la consulta y el borrado: se respetan.
  skipped: number;
}

// Una sola vez: las salas viejas no tienen lastActivityAt y no aparecerían en la consulta.
// Se les pone "ahora", así tienen 7 días de gracia en vez de borrarse sin saber si se usan.
const backfillLegacyRooms = async (db: Firestore): Promise<number> => {
  const meta = db.doc(META_DOC);
  if ((await meta.get()).exists) return 0;

  const snapshot = await db.collection(ROOMS_COLLECTION).select('lastActivityAt').get();
  const writer = db.bulkWriter();
  let backfilled = 0;

  snapshot.docs.forEach((doc) => {
    if (doc.get('lastActivityAt') instanceof Timestamp) return;
    backfilled++;
    // Precondición: si la sala cambió mientras tanto, ya tiene su propia marca.
    void writer
      .update(
        doc.ref,
        { lastActivityAt: FieldValue.serverTimestamp() },
        { lastUpdateTime: doc.updateTime }
      )
      .catch(() => undefined);
  });

  await writer.close();
  await meta.set({ legacyBackfillAt: FieldValue.serverTimestamp(), backfilled });
  return backfilled;
};

// Hoy las salas no tienen subcolecciones; si algún día las tienen, no quedan huérfanas.
const deleteSubcollections = async (db: Firestore, ref: DocumentReference): Promise<void> => {
  const subcollections = await ref.listCollections();
  await Promise.all(subcollections.map((collection) => db.recursiveDelete(collection)));
};

export const cleanupInactiveRooms = async (
  db: Firestore,
  now: Date = new Date()
): Promise<CleanupResult> => {
  const cutoff = Timestamp.fromMillis(now.getTime() - INACTIVITY_DAYS * DAY_MS);
  const backfilled = await backfillLegacyRooms(db);
  let deleted = 0;
  let skipped = 0;

  while (deleted + skipped < MAX_DELETES_PER_RUN) {
    // Consulta por índice de un solo campo (automático): solo trae salas vencidas.
    const snapshot = await db
      .collection(ROOMS_COLLECTION)
      .where('lastActivityAt', '<=', cutoff)
      .orderBy('lastActivityAt')
      .limit(PAGE_SIZE)
      .select()
      .get();

    if (snapshot.empty) break;

    const writer = db.bulkWriter();
    const removed: DocumentReference[] = [];

    snapshot.docs.forEach((doc) => {
      // Solo se borra si la sala no cambió desde que se leyó: una escritura de último momento la salva.
      void writer
        .delete(doc.ref, { lastUpdateTime: doc.updateTime })
        .then(() => {
          deleted++;
          removed.push(doc.ref);
        })
        .catch(() => {
          skipped++;
        });
    });

    await writer.close();
    await Promise.all(removed.map((ref) => deleteSubcollections(db, ref)));

    if (snapshot.size < PAGE_SIZE) break;
  }

  return { cutoff: cutoff.toDate().toISOString(), backfilled, deleted, skipped };
};
