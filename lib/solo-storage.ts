import type { Expense, Participant } from '@/types/room';

import { isExpense, isParticipant } from './split';

// El modo "yo solo" guarda todo en este navegador, sin Firebase.
const STORAGE_KEY = 'cuantotedebo:solo';
// Formato de la calculadora anterior: [{ key, name, amount, color }].
const LEGACY_STORAGE_KEY = 'splitPayments';

export interface SoloData {
  participants: Participant[];
  expenses: Expense[];
}

const EMPTY_DATA: SoloData = { participants: [], expenses: [] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseSoloData = (value: unknown): SoloData => {
  if (!isRecord(value)) return EMPTY_DATA;

  const participants = Array.isArray(value.participants)
    ? value.participants.filter(isParticipant)
    : [];
  const ids = new Set(participants.map((p) => p.id));
  const expenses = Array.isArray(value.expenses)
    ? value.expenses.filter(isExpense).filter((e) => ids.has(e.participantId))
    : [];

  return { participants, expenses };
};

// Convierte cada persona de la versión anterior en una persona con un único gasto.
const migrateLegacy = (value: unknown): SoloData => {
  if (!Array.isArray(value)) return EMPTY_DATA;

  const data: SoloData = { participants: [], expenses: [] };

  value.forEach((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.key !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.color !== 'string' ||
      typeof item.amount !== 'number' ||
      !Number.isFinite(item.amount)
    ) {
      return;
    }

    data.participants.push({ id: item.key, name: item.name, color: item.color });
    if (item.amount > 0) {
      data.expenses.push({
        id: `${item.key}-gasto`,
        participantId: item.key,
        description: '',
        amount: item.amount,
        createdAt: Date.now()
      });
    }
  });

  return data;
};

export const loadSoloData = (): SoloData => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return parseSoloData(JSON.parse(stored));

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return legacy ? migrateLegacy(JSON.parse(legacy)) : EMPTY_DATA;
  } catch {
    return EMPTY_DATA;
  }
};

export const saveSoloData = (data: SoloData): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Sin almacenamiento disponible: los datos duran mientras la página esté abierta.
  }
};
