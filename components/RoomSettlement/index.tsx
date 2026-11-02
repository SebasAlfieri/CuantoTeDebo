'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import cs from 'classnames';

import { getPaymentInfoType } from '@/lib/payment-info';
import { calculateOptimizedTransactions, formatNumber, getDebtKey } from '@/lib/split';
import type { ParticipantBalance } from '@/types/room';

import AnimatedAmount from '../AnimatedAmount';
import Avatar from '../Avatar';
import CopyIcon from '../CopyIcon';
import s from './RoomSettlement.module.css';

interface RoomSettlementProps {
  balances: ParticipantBalance[];
  settled: string[];
  onToggleSettled: (debtKey: string, paid: boolean) => void;
}

type CopyStatus = { id: string; state: 'copied' | 'error' } | null;

interface ConfettiPiece {
  id: number;
  color: string;
  x: number;
  y: number;
  rotate: number;
  delay: number;
}

const COPY_FEEDBACK_MS = 2000;
const CONFETTI_PIECES = 46;
const CONFETTI_MS = 1600;

const makeConfetti = (colors: string[]): ConfettiPiece[] =>
  Array.from({ length: CONFETTI_PIECES }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 220;
    return {
      id: i,
      color: colors[i % colors.length],
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 120,
      rotate: Math.random() * 720 - 360,
      delay: Math.random() * 0.08
    };
  });

const RoomSettlement = ({ balances, settled, onToggleSettled }: RoomSettlementProps) => {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);
  const [justPaidKey, setJustPaidKey] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  const { transactions, totalPerPerson } = calculateOptimizedTransactions(balances);
  const totalSpent = balances.reduce((sum, p) => sum + p.amount, 0);
  const debtKeys = transactions.map((t) => getDebtKey(t.debtor.id, t.creditor.id, t.amount));
  const paidCount = debtKeys.filter((key) => settled.includes(key)).length;
  const allPaid = transactions.length > 0 && paidCount === transactions.length;

  // Festeja solo cuando el último pago se marca acá, no al abrir una cuenta ya saldada.
  const wasAllPaid = useRef(allPaid);
  useEffect(() => {
    const celebrate = allPaid && !wasAllPaid.current && justPaidKey !== null;
    wasAllPaid.current = allPaid;
    if (!celebrate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    setConfetti(makeConfetti(balances.map((p) => p.color)));
    const timer = setTimeout(() => setConfetti([]), CONFETTI_MS);
    return () => clearTimeout(timer);
  }, [allPaid, justPaidKey, balances]);

  useEffect(() => {
    if (!copyStatus) return;
    const timer = setTimeout(() => setCopyStatus(null), COPY_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copyStatus]);

  const handleCopy = async (copyId: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus({ id: copyId, state: 'copied' });
    } catch {
      setCopyStatus({ id: copyId, state: 'error' });
    }
  };

  const handleToggle = (debtKey: string, paid: boolean) => {
    setJustPaidKey(paid ? debtKey : null);
    onToggleSettled(debtKey, paid);
  };

  return (
    <div className={s.container}>
      <div className={s.sum}>
        <span>Gastaron entre todos</span>
        <AnimatedAmount value={totalSpent} className={s.sum__value} />
      </div>
      <hr className={s.tear} />
      <div className={cs(s.sum, s['sum--big'])}>
        <span>Le toca a cada uno</span>
        <AnimatedAmount value={totalPerPerson} className={s.sum__value} />
      </div>
      <hr className={s.tear} />

      {transactions.length === 0 ? (
        <p className={s.done}>Nadie le debe nada a nadie</p>
      ) : (
        <>
          <div className={s.progress}>
            <span>
              {paidCount} de {transactions.length} {transactions.length === 1 ? 'pago' : 'pagos'}{' '}
              hechos
            </span>
            <span className={s.progress__track} aria-hidden="true">
              <motion.span
                className={s.progress__fill}
                initial={false}
                animate={{ scaleX: paidCount / transactions.length }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              />
            </span>
          </div>

          <ul className={s.list}>
            {transactions.map((transaction, index) => {
              const { debtor, creditor } = transaction;
              const copyId = `${debtor.id}-${creditor.id}`;
              const paymentType = creditor.paymentInfo
                ? getPaymentInfoType(creditor.paymentInfo)
                : null;
              const status = copyStatus?.id === copyId ? copyStatus.state : null;
              const debtKey = debtKeys[index];
              const isPaid = settled.includes(debtKey);
              const isJust = isPaid && justPaidKey === debtKey;

              return (
                <motion.li
                  key={copyId}
                  className={cs(s.debt, { [s['debt--paid']]: isPaid })}
                  initial={{ opacity: 0, y: 8 }}
                  animate={
                    isJust
                      ? { opacity: 1, y: [0, 0, 2, 0], transition: { duration: 0.45 } }
                      : { opacity: 1, y: 0, transition: { delay: index * 0.05 } }
                  }>
                  <div className={s.debt__top}>
                    <span className={s.debt__pair}>
                      <Avatar name={debtor.name} color={debtor.color} size="sm" />
                      <span className={s.debt__name}>{debtor.name}</span>
                      <span className={s.debt__arrow} aria-hidden="true">
                        →
                      </span>
                      <span className={s.visuallyHidden}>le paga a</span>
                      <Avatar name={creditor.name} color={creditor.color} size="sm" />
                      <span className={s.debt__name}>{creditor.name}</span>
                    </span>
                    <span className={s.debt__amount}>${formatNumber(transaction.amount)}</span>
                  </div>

                  <div className={s.debt__actions} data-capture="remove">
                    <span className={s.debt__copySlot} aria-hidden={isPaid}>
                      {creditor.paymentInfo && paymentType ? (
                        <button
                          type="button"
                          className={cs(s.copy, {
                            [s['copy--done']]: status === 'copied',
                            [s['copy--error']]: status === 'error'
                          })}
                          tabIndex={isPaid ? -1 : undefined}
                          onClick={() => void handleCopy(copyId, creditor.paymentInfo ?? '')}
                          aria-label={`Copiar ${paymentType} de ${creditor.name}: ${creditor.paymentInfo}`}>
                          {status === 'error' ? (
                            'No se pudo copiar'
                          ) : status === 'copied' ? (
                            '✓ Copiado'
                          ) : (
                            <>
                              <CopyIcon />
                              Copiar {paymentType}
                            </>
                          )}
                        </button>
                      ) : (
                        <span className={s.debt__noInfo}>
                          <span className={s.debt__name}>{creditor.name}</span> no cargó alias
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPaid}
                      aria-label={`Pagado: ${debtor.name} le paga a ${creditor.name}`}
                      className={cs(s.switch, { [s['switch--on']]: isPaid })}
                      onClick={() => handleToggle(debtKey, !isPaid)}>
                      <span className={s.switch__track} aria-hidden="true">
                        <span className={s.switch__thumb} />
                      </span>
                      Pagado
                    </button>
                  </div>

                  <AnimatePresence>
                    {isPaid && (
                      <motion.span
                        className={s.stamp}
                        aria-hidden="true"
                        data-capture="remove"
                        initial={isJust ? { rotate: -14, scale: 2.4, opacity: 0 } : false}
                        animate={{ rotate: -8, scale: 1, opacity: 0.92 }}
                        exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                        <svg viewBox="0 0 24 24">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                        PAGADO
                      </motion.span>
                    )}
                  </AnimatePresence>

                  <span className={s.visuallyHidden} role="status">
                    {status === 'copied' ? `${paymentType} de ${creditor.name} copiado` : ''}
                  </span>
                </motion.li>
              );
            })}
          </ul>

          <AnimatePresence>
            {allPaid && (
              <motion.p
                className={s.done}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
                ¡Están todos a mano!
              </motion.p>
            )}
          </AnimatePresence>
        </>
      )}

      {/* En un portal: el ticket recorta (mask) todo lo que se sale de él. */}
      {confetti.length > 0 &&
        createPortal(
          <div className={s.confetti} aria-hidden="true">
            {confetti.map((piece) => (
              <motion.i
                key={piece.id}
                className={s.confetti__piece}
                style={{ backgroundColor: piece.color }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{ x: piece.x, y: piece.y, rotate: piece.rotate, opacity: 0 }}
                transition={{ duration: 1.4, delay: piece.delay, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default RoomSettlement;
