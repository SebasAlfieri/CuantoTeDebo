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

export const PERSON_COLORS = [
  '#E879F9',
  '#9370DB',
  '#188afc',
  '#70c9ec',
  '#3cfae7',
  '#7dd67d',
  '#A3E635',
  '#f9de47',
  '#FFB30F',
  '#FFB6C1',
  '#FF4500'
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

export const pickColor = (usedColors: string[]): string => {
  const available = PERSON_COLORS.filter((color) => !usedColors.includes(color));
  const pool = available.length > 0 ? available : PERSON_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
};
