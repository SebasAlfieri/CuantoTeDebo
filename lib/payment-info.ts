// Datos para recibir transferencias en Argentina: CBU/CVU (22 dígitos) o alias (6 a 20 caracteres).
export type PaymentInfoType = 'CBU' | 'CVU' | 'alias';

const ACCOUNT_NUMBER_PATTERN = /^\d{22}$/;
const ALIAS_PATTERN = /^[A-Za-z0-9.-]{6,20}$/;

export const PAYMENT_INFO_MAX_LENGTH = 30;

// Quita espacios y guiones de los números para aceptar "0000 0031 ..." pegado del home banking.
export const normalizePaymentInfo = (value: string): string => {
  const trimmed = value.trim();
  const digitsOnly = trimmed.replace(/[\s-]/g, '');
  return /^\d+$/.test(digitsOnly) ? digitsOnly : trimmed;
};

export const isValidPaymentInfo = (value: string): boolean =>
  ACCOUNT_NUMBER_PATTERN.test(value) || ALIAS_PATTERN.test(value);

// Los CVU (billeteras virtuales) empiezan con 000; el resto de los números son CBU.
export const getPaymentInfoType = (value: string): PaymentInfoType => {
  if (!ACCOUNT_NUMBER_PATTERN.test(value)) return 'alias';
  return value.startsWith('000') ? 'CVU' : 'CBU';
};
