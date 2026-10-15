// Logs visibles solo en desarrollo (`yarn dev`). En producción no se escribe nada en la consola.
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]): void => {
    if (isDevelopment) console.log(...args);
  },
  warn: (...args: unknown[]): void => {
    if (isDevelopment) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    if (isDevelopment) console.error(...args);
  }
};
