import type { Expense, Participant } from '@/types/room';

// Límites compartidos por la sala y el modo "yo solo".
export const PERSON_NAME_MAX_LENGTH = 12;
export const DESCRIPTION_MAX_LENGTH = 40;
export const AMOUNT_MAX = 9_999_999;
export const MAX_PARTICIPANTS = 30;
export const MAX_EXPENSES = 300;

export const createId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export const normalizeName = (value: string): string => value.trim().replace(/\s+/g, ' ');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isParticipant = (value: unknown): value is Participant =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.color === 'string';

export const isExpense = (value: unknown): value is Expense =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.participantId === 'string' &&
  typeof value.description === 'string' &&
  typeof value.amount === 'number' &&
  Number.isFinite(value.amount) &&
  typeof value.createdAt === 'number';

// Ordenados para que dos personas seguidas tengan tonos bien distintos.
export const PERSON_COLORS = [
  '#1d5fd6',
  '#e0561a',
  '#0f9a84',
  '#d4246f',
  '#7a9a0f',
  '#2b8fd6',
  '#c48a07',
  '#9b3fd1',
  '#e23b3b',
  '#13865a'
];

// Diferencias menores a medio centavo se consideran saldadas (evita deudas de $0 por flotantes).
const BALANCE_EPSILON = 0.005;

export interface Transaction<T> {
  debtor: T;
  creditor: T;
  amount: number;
}

export const formatNumber = (num: number): string => {
  const fix = Number.isInteger(num) ? 0 : 2;
  const [integerPart, decimalPart] = num.toFixed(fix).split('.');

  const formattedIntegerPart = integerPart.split('').reduceRight((acc, digit, i, orig) => {
    if ('-' === digit && 0 === i) {
      return digit + acc;
    }
    const pos = orig.length - i - 1;
    return digit + (pos && !(pos % 3) ? '.' : '') + acc;
  }, '');

  return decimalPart ? `${formattedIntegerPart},${decimalPart}` : formattedIntegerPart;
};

export const calculateOptimizedTransactions = <T extends { amount: number }>(
  people: T[]
): { transactions: Transaction<T>[]; totalPerPerson: number } => {
  if (people.length < 2) return { transactions: [], totalPerPerson: 0 };

  const totalSpent = people.reduce((sum, person) => sum + person.amount, 0);
  const totalPerPerson = totalSpent / people.length;

  const balances = people.map((person) => ({
    person,
    balance: person.amount - totalPerPerson
  }));

  const creditors = balances.filter((b) => b.balance > BALANCE_EPSILON);
  const debtors = balances.filter((b) => b.balance < -BALANCE_EPSILON);

  const transactions: Transaction<T>[] = [];

  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const payment = Math.min(creditor.balance, -debtor.balance);

    transactions.push({ debtor: debtor.person, creditor: creditor.person, amount: payment });

    creditor.balance -= payment;
    debtor.balance += payment;

    if (creditor.balance <= BALANCE_EPSILON) i++;
    if (debtor.balance >= -BALANCE_EPSILON) j++;
  }

  return { transactions, totalPerPerson };
};

// Incluye el monto: si cambian los gastos y la deuda cambia, la marca de "pagado" deja de aplicar.
export const getDebtKey = (debtorId: string, creditorId: string, amount: number): string =>
  `${debtorId}_${creditorId}_${Math.round(amount * 100)}`;

export const pickColor = (usedColors: string[]): string =>
  PERSON_COLORS.find((color) => !usedColors.includes(color)) ??
  PERSON_COLORS[usedColors.length % PERSON_COLORS.length];

// Fondo pálido y tinta oscura del mismo color de la persona (sirve también para colores viejos guardados).
export const getPersonTone = (hex: string): { tint: string; ink: string } => {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  const channels = Number.isNaN(value)
    ? [128, 128, 128]
    : [value >> 16, (value >> 8) & 255, value & 255];
  const mix = (target: number, amount: number) =>
    `rgb(${channels.map((c) => Math.round(c + (target - c) * amount)).join(',')})`;
  return { tint: mix(255, 0.8), ink: mix(0, 0.25) };
};
