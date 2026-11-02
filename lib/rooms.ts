import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore/lite';

import type { Expense, Participant, Room } from '@/types/room';

import { getDb } from './firebase';
import { isValidPaymentInfo, normalizePaymentInfo } from './payment-info';
import {
  createId,
  DESCRIPTION_MAX_LENGTH,
  isExpense,
  isParticipant,
  normalizeName,
  PERSON_NAME_MAX_LENGTH,
  pickColor
} from './split';

// Toda la sala vive en un único documento: 1 lectura por carga (plan Spark).
const ROOMS_COLLECTION = 'rooms';

// Cada escritura marca la última actividad; la limpieza automática borra las salas
// que pasan 7 días sin cambios (ver lib/room-cleanup.ts). Las lecturas no lo tocan.
const touch = () => ({ lastActivityAt: serverTimestamp() });
const ROOM_ID_PATTERN = /^[A-Za-z0-9]{20}$/;

export const ROOM_NAME_MAX_LENGTH = 40;
export const isValidRoomId = (roomId: string): boolean => ROOM_ID_PATTERN.test(roomId);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// arrayRemove necesita el objeto idéntico al guardado, sin campos extra.
const toStoredExpense = (expense: Expense): Expense => ({
  id: expense.id,
  participantId: expense.participantId,
  description: expense.description,
  amount: expense.amount,
  createdAt: expense.createdAt
});

const parseRoom = (id: string, data: unknown): Room | null => {
  if (!isRecord(data) || typeof data.name !== 'string') return null;

  const participants = Array.isArray(data.participants)
    ? data.participants.filter(isParticipant)
    : [];
  const participantIds = new Set(participants.map((p) => p.id));
  const expenses = Array.isArray(data.expenses)
    ? data.expenses.filter(isExpense).filter((e) => participantIds.has(e.participantId))
    : [];

  // Los datos de cobro viven en un mapa aparte para poder editarlos sin tocar el array.
  const payments = isRecord(data.payments) ? data.payments : {};
  const participantsWithPayment = participants.map((participant) => {
    const paymentInfo = payments[participant.id];
    return typeof paymentInfo === 'string' && paymentInfo
      ? { ...participant, paymentInfo }
      : participant;
  });

  const settled = Array.isArray(data.settled)
    ? data.settled.filter((key): key is string => typeof key === 'string')
    : [];

  return { id, name: data.name, participants: participantsWithPayment, expenses, settled };
};

export const getRoom = async (roomId: string): Promise<Room | null> => {
  if (!isValidRoomId(roomId)) return null;

  const snapshot = await getDoc(doc(getDb(), ROOMS_COLLECTION, roomId));
  if (!snapshot.exists()) return null;

  return parseRoom(snapshot.id, snapshot.data());
};

export const createRoom = async (
  roomName: string,
  creatorName: string
): Promise<{ roomId: string; participantId: string }> => {
  const ref = doc(collection(getDb(), ROOMS_COLLECTION));
  const creator: Participant = {
    id: createId(),
    name: normalizeName(creatorName).slice(0, PERSON_NAME_MAX_LENGTH),
    color: pickColor([])
  };

  await setDoc(ref, {
    name: normalizeName(roomName).slice(0, ROOM_NAME_MAX_LENGTH),
    createdAt: serverTimestamp(),
    ...touch(),
    participants: [creator],
    expenses: []
  });

  return { roomId: ref.id, participantId: creator.id };
};

export const addParticipant = async (room: Room, name: string): Promise<Participant> => {
  const participant: Participant = {
    id: createId(),
    name: normalizeName(name).slice(0, PERSON_NAME_MAX_LENGTH),
    color: pickColor(room.participants.map((p) => p.color))
  };

  await updateDoc(doc(getDb(), ROOMS_COLLECTION, room.id), {
    participants: arrayUnion(participant),
    ...touch()
  });

  return participant;
};

// Quita a la persona y todos sus gastos en una sola escritura.
export const removeParticipant = async (room: Room, participant: Participant): Promise<void> => {
  const expenses = room.expenses.filter((e) => e.participantId === participant.id);

  await updateDoc(doc(getDb(), ROOMS_COLLECTION, room.id), {
    participants: arrayRemove({
      id: participant.id,
      name: participant.name,
      color: participant.color
    }),
    ...(expenses.length > 0 && { expenses: arrayRemove(...expenses.map(toStoredExpense)) }),
    [`payments.${participant.id}`]: deleteField(),
    ...touch()
  });
};

// Guarda (o borra, si viene vacío) el CBU/CVU/alias de una persona. Devuelve el valor guardado.
export const setPaymentInfo = async (
  roomId: string,
  participantId: string,
  value: string
): Promise<string | undefined> => {
  const normalized = normalizePaymentInfo(value);

  if (normalized && !isValidPaymentInfo(normalized)) {
    throw new Error('Dato de cobro inválido');
  }

  await updateDoc(doc(getDb(), ROOMS_COLLECTION, roomId), {
    [`payments.${participantId}`]: normalized || deleteField(),
    ...touch()
  });

  return normalized || undefined;
};

export const addExpense = async (
  roomId: string,
  participantId: string,
  amount: number,
  description: string
): Promise<Expense> => {
  const expense: Expense = {
    id: createId(),
    participantId,
    description: normalizeName(description).slice(0, DESCRIPTION_MAX_LENGTH),
    amount,
    createdAt: Date.now()
  };

  await updateDoc(doc(getDb(), ROOMS_COLLECTION, roomId), {
    expenses: arrayUnion(expense),
    ...touch()
  });

  return expense;
};

export const setDebtSettled = async (roomId: string, key: string, paid: boolean): Promise<void> => {
  await updateDoc(doc(getDb(), ROOMS_COLLECTION, roomId), {
    settled: paid ? arrayUnion(key) : arrayRemove(key),
    ...touch()
  });
};

export const removeExpense = async (roomId: string, expense: Expense): Promise<void> => {
  await updateDoc(doc(getDb(), ROOMS_COLLECTION, roomId), {
    expenses: arrayRemove(toStoredExpense(expense)),
    ...touch()
  });
};
