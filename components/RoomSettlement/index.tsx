'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import cs from 'classnames';

import { getPaymentInfoType } from '@/lib/payment-info';
import { calculateOptimizedTransactions, formatNumber } from '@/lib/split';
import type { ParticipantBalance } from '@/types/room';

import AnimatedAmount from '../AnimatedAmount';
import Avatar from '../Avatar';
import CopyIcon from '../CopyIcon';
import s from './RoomSettlement.module.css';

interface RoomSettlementProps {
  balances: ParticipantBalance[];
}

type CopyStatus = { id: string; state: 'copied' | 'error' } | null;

const COPY_FEEDBACK_MS = 2000;

const RoomSettlement = ({ balances }: RoomSettlementProps) => {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);

  const { transactions, totalPerPerson } = calculateOptimizedTransactions(balances);
  const totalSpent = balances.reduce((sum, p) => sum + p.amount, 0);

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

  return (
    <div className={s.container}>
      <div className={s.container__stats}>
        <div className={s.container__stat}>
          <span className={s.container__label}>Total gastado</span>
          <AnimatedAmount value={totalSpent} className={s.container__value} />
        </div>
        <div className={cs(s.container__stat, s['container__stat--accent'])}>
          <span className={s.container__label}>Le toca a cada uno</span>
          <AnimatedAmount value={totalPerPerson} className={s.container__value} />
        </div>
      </div>

      <h3 className={s.container__heading}>Quién le paga a quién</h3>

      {transactions.length === 0 ? (
        <p className={s.container__empty}>Están todos a mano 🎉</p>
      ) : (
        <ul className={s.container__list}>
          <AnimatePresence initial={false}>
            {transactions.map((transaction, index) => {
              const { debtor, creditor } = transaction;
              const copyId = `${debtor.id}-${creditor.id}`;
              const paymentType = creditor.paymentInfo
                ? getPaymentInfoType(creditor.paymentInfo)
                : null;
              const status = copyStatus?.id === copyId ? copyStatus.state : null;

              return (
                <motion.li
                  key={copyId}
                  className={s.debt}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                  exit={{ opacity: 0, x: -12 }}>
                  <div className={s.debt__main}>
                    <span className={s.debt__people}>
                      <span className={s.debt__person}>
                        <Avatar name={debtor.name} color={debtor.color} size="sm" />
                        <span className={s.debt__name}>{debtor.name}</span>
                      </span>
                      <span className={s.debt__arrow} aria-hidden="true">
                        →
                      </span>
                      <span className={s.visuallyHidden}>le paga a</span>
                      <span className={s.debt__person}>
                        <Avatar name={creditor.name} color={creditor.color} size="sm" />
                        <span className={s.debt__name}>{creditor.name}</span>
                      </span>
                    </span>
                    {creditor.paymentInfo && paymentType && (
                      <div className={s.debt__actions} data-capture="exclude">
                        <button
                          type="button"
                          className={cs(s.copy, {
                            [s['copy--done']]: status === 'copied',
                            [s['copy--error']]: status === 'error'
                          })}
                          onClick={() => void handleCopy(copyId, creditor.paymentInfo ?? '')}
                          title={`${paymentType} de ${creditor.name}: ${creditor.paymentInfo}`}>
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={status ?? 'idle'}
                              className={s.copy__content}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15 }}>
                              {status === 'error' ? (
                                'No se pudo copiar'
                              ) : (
                                <>
                                  {status === 'copied' ? '✓ ' : <CopyIcon />}
                                  {status === 'copied' ? '' : 'Copiar '}
                                  {paymentType} de
                                  <span className={s.copy__name}>{creditor.name}</span>
                                  {status === 'copied' && ' copiado'}
                                </>
                              )}
                            </motion.span>
                          </AnimatePresence>
                        </button>
                      </div>
                    )}
                  </div>
                  <span className={s.debt__amount}>${formatNumber(transaction.amount)}</span>
                  <span className={s.visuallyHidden} role="status">
                    {status === 'copied' ? `${paymentType} de ${creditor.name} copiado` : ''}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
};

export default RoomSettlement;
