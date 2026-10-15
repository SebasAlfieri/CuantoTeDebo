// Recuerda en este navegador a quién se le cargó el último gasto en cada sala.
// Es solo una comodidad: la sala es libre y cualquiera puede cargar gastos de cualquiera.
const storageKey = (roomId: string) => `cuantotedebo:room:${roomId}:payer`;

export const getStoredPayerId = (roomId: string): string | null => {
  try {
    return window.localStorage.getItem(storageKey(roomId));
  } catch {
    return null;
  }
};

export const storePayerId = (roomId: string, participantId: string): void => {
  try {
    window.localStorage.setItem(storageKey(roomId), participantId);
  } catch {
    // Sin almacenamiento disponible: se usa la primera persona de la lista.
  }
};
