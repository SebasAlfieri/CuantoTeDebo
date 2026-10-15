'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion, type Variants } from 'framer-motion';
import { ReactSVG } from 'react-svg';
import cs from 'classnames';

import {
  getPaymentInfoType,
  isValidPaymentInfo,
  normalizePaymentInfo,
  PAYMENT_INFO_MAX_LENGTH
} from '@/lib/payment-info';
import { getStoredPayerId, storePayerId } from '@/lib/room-storage';
import {
  AMOUNT_MAX,
  DESCRIPTION_MAX_LENGTH,
  formatNumber,
  MAX_EXPENSES,
  MAX_PARTICIPANTS,
  normalizeName,
  PERSON_NAME_MAX_LENGTH
} from '@/lib/split';
import type { Expense, Participant, ParticipantBalance } from '@/types/room';

import AnimatedAmount from '../AnimatedAmount';
import Avatar from '../Avatar';
import BackLink from '../BackLink';
import Button from '../Button';
import Cafecito from '../Cafecito';
import CopyIcon from '../CopyIcon';
import RoomSettlement from '../RoomSettlement';
import s from './SplitEditor.module.css';

// Operaciones que cada modo implementa a su manera (Firestore en la sala, el celular en "yo solo").
export interface SplitEditorActions {
  addPerson: (name: string) => Promise<Participant>;
  removePerson: (participant: Participant) => Promise<void>;
  addExpense: (participantId: string, amount: number, description: string) => Promise<void>;
  removeExpense: (expense: Expense) => Promise<void>;
  setPaymentInfo: (participant: Participant, value: string) => Promise<void>;
}

interface SplitEditorProps {
  eyebrow: string;
  title: string;
  participants: Participant[];
  expenses: Expense[];
  actions: SplitEditorActions;
  // Clave para recordar en este navegador a quién se le cargó el último gasto.
  storageScope: string;
  intro?: ReactNode;
  expensesAction?: ReactNode;
  resultActions?: ReactNode;
  resultCaptureId?: string;
}

const COPIED_FEEDBACK_MS = 2000;

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
};

interface StepProps {
  step: number;
  title: string;
  id: string;
  action?: ReactNode;
  children: ReactNode;
}

const Step = ({ step, title, id, action, children }: StepProps) => (
  <motion.section className={s.step} aria-labelledby={id} variants={itemVariants}>
    <header className={s.step__header}>
      <span className={s.step__number} aria-hidden="true">
        {step}
      </span>
      <h2 id={id} className={s.step__title}>
        {title}
      </h2>
      {action && <div className={s.step__action}>{action}</div>}
    </header>
    {children}
  </motion.section>
);

const SplitEditor = ({
  eyebrow,
  title,
  participants,
  expenses,
  actions,
  storageScope,
  intro,
  expensesAction,
  resultActions,
  resultCaptureId
}: SplitEditorProps) => {
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentDraft, setPaymentDraft] = useState('');
  const [copiedPaymentId, setCopiedPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPayerId(getStoredPayerId(storageScope));
  }, [storageScope]);

  useEffect(() => {
    if (!copiedPaymentId) return;
    const timer = setTimeout(() => setCopiedPaymentId(null), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copiedPaymentId]);

  // Si la persona elegida ya no existe (o nunca se eligió), se usa la primera.
  const payer = participants.find((p) => p.id === selectedPayerId) ?? participants[0] ?? null;

  const balances: ParticipantBalance[] = participants.map((participant) => ({
    ...participant,
    amount: expenses
      .filter((expense) => expense.participantId === participant.id)
      .reduce((sum, expense) => sum + expense.amount, 0)
  }));

  const participantToRemove = participants.find((p) => p.id === confirmRemoveId) ?? null;
  const expensesToRemove = participantToRemove
    ? expenses.filter((e) => e.participantId === participantToRemove.id).length
    : 0;

  const normalizedPaymentDraft = normalizePaymentInfo(paymentDraft);
  const isPaymentDraftValid =
    normalizedPaymentDraft === '' || isValidPaymentInfo(normalizedPaymentDraft);

  const parsedAmount = Number(amount);
  const isAmountValid =
    amount !== '' &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= AMOUNT_MAX;

  const selectPayer = (id: string) => {
    storePayerId(storageScope, id);
    setSelectedPayerId(id);
  };

  // Ejecuta una acción mostrando su estado y un mensaje claro si falla.
  const runAction = async (key: string, errorMessage: string, action: () => Promise<void>) => {
    setPendingAction(key);
    setError(null);

    try {
      await action();
    } catch (err) {
      console.error(errorMessage, err);
      setError(errorMessage);
    } finally {
      setPendingAction(null);
    }
  };

  const handleAddPerson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingAction) return;

    const name = normalizeName(personName);
    if (!name) return;

    const existing = participants.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setError(`"${existing.name}" ya está en la lista.`);
      return;
    }
    if (participants.length >= MAX_PARTICIPANTS) {
      setError('Llegaste al máximo de personas.');
      return;
    }

    await runAction('add-person', 'No se pudo agregar a la persona. Probá de nuevo.', async () => {
      const participant = await actions.addPerson(name);
      selectPayer(participant.id);
      setPersonName('');
    });
  };

  const handleRemovePerson = async (participant: Participant) => {
    if (pendingAction) return;
    setConfirmRemoveId(null);

    await runAction(participant.id, 'No se pudo quitar a la persona. Probá de nuevo.', () =>
      actions.removePerson(participant)
    );
  };

  const handleCopyPayment = async (participant: Participant) => {
    if (!participant.paymentInfo) return;

    try {
      await navigator.clipboard.writeText(participant.paymentInfo);
      setCopiedPaymentId(participant.id);
    } catch {
      setError('No se pudo copiar. Mantené apretado el dato para copiarlo a mano.');
    }
  };

  const startEditingPayment = (participant: Participant) => {
    setEditingPaymentId(participant.id);
    setPaymentDraft(participant.paymentInfo ?? '');
    setError(null);
  };

  const handleSavePayment = async (event: FormEvent<HTMLFormElement>, participant: Participant) => {
    event.preventDefault();
    if (!isPaymentDraftValid || pendingAction) return;

    await runAction('payment', 'No se pudo guardar el CBU/CVU/alias. Probá de nuevo.', async () => {
      await actions.setPaymentInfo(participant, normalizedPaymentDraft);
      setEditingPaymentId(null);
      setPaymentDraft('');
    });
  };

  const handleAddExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!payer || !isAmountValid || pendingAction) return;

    if (expenses.length >= MAX_EXPENSES) {
      setError('Llegaste al máximo de gastos.');
      return;
    }

    await runAction('add-expense', 'No se pudo agregar el gasto. Probá de nuevo.', async () => {
      await actions.addExpense(
        payer.id,
        parsedAmount,
        normalizeName(description).slice(0, DESCRIPTION_MAX_LENGTH)
      );
      setAmount('');
      setDescription('');
    });
  };

  const handleRemoveExpense = async (expense: Expense) => {
    if (pendingAction) return;

    await runAction(expense.id, 'No se pudo eliminar el gasto. Probá de nuevo.', () =>
      actions.removeExpense(expense)
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={s.container}
        variants={listVariants}
        initial="hidden"
        animate="visible">
        <motion.div className={s.container__top} variants={itemVariants}>
          <BackLink />
        </motion.div>

        <motion.header className={s.hero} variants={itemVariants}>
          <p className={s.hero__eyebrow}>{eyebrow}</p>
          <h1 className={s.hero__title}>{title}</h1>
          <p className={s.hero__meta}>
            {participants.length} {participants.length === 1 ? 'persona' : 'personas'} ·{' '}
            {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'}
          </p>
        </motion.header>

        {intro && <motion.div variants={itemVariants}>{intro}</motion.div>}

        <AnimatePresence>
          {error && (
            <motion.p
              className={s.container__error}
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}>
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <Step step={1} title="Personas" id="people-title">
          <form className={s.inline} onSubmit={handleAddPerson}>
            <input
              className={s.input}
              type="text"
              placeholder="Nombre de la persona"
              aria-label="Nombre de la persona"
              value={personName}
              maxLength={PERSON_NAME_MAX_LENGTH}
              onChange={(e) => setPersonName(e.target.value)}
            />
            <Button type="submit" disabled={!normalizeName(personName) || pendingAction !== null}>
              {pendingAction === 'add-person' ? '…' : 'Agregar'}
            </Button>
          </form>

          {participants.length === 0 ? (
            <p className={s.empty}>Todavía no hay nadie. Agregá a la primera persona.</p>
          ) : (
            <ul className={s.chips}>
              <AnimatePresence initial={false}>
                {participants.map((participant) => (
                  <motion.li
                    key={participant.id}
                    className={cs(s.chip, {
                      [s['chip--confirming']]: participant.id === confirmRemoveId
                    })}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}>
                    <Avatar name={participant.name} color={participant.color} size="sm" />
                    <span className={s.chip__name}>{participant.name}</span>
                    <button
                      type="button"
                      className={s.chip__remove}
                      onClick={() =>
                        setConfirmRemoveId((prev) =>
                          prev === participant.id ? null : participant.id
                        )
                      }
                      disabled={pendingAction !== null}
                      aria-label={`Quitar a ${participant.name}`}>
                      <ReactSVG src="/icons/close.svg" wrapper="span" className={s.icon} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          <AnimatePresence>
            {participantToRemove && (
              <motion.div
                className={s.confirm}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}>
                <p className={s.confirm__text}>
                  ¿Quitar a <b className={s.confirm__name}>{participantToRemove.name}</b>
                  {expensesToRemove > 0 &&
                    ` y ${expensesToRemove === 1 ? 'su gasto' : `sus ${expensesToRemove} gastos`}`}
                  ?
                </p>
                <div className={s.confirm__actions}>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => void handleRemovePerson(participantToRemove)}
                    disabled={pendingAction !== null}>
                    Quitar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmRemoveId(null)}>
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Step>

        <Step step={2} title="Cargar gasto" id="add-expense-title">
          {payer ? (
            <form className={s.expenseForm} onSubmit={handleAddExpense}>
              <fieldset className={s.payers}>
                <legend className={s.label}>¿Quién pagó?</legend>
                <div className={s.payers__list}>
                  {participants.map((participant) => {
                    const isSelected = participant.id === payer.id;

                    return (
                      <label
                        key={participant.id}
                        className={cs(s.payer, { [s['payer--selected']]: isSelected })}>
                        <input
                          type="radio"
                          name="payer"
                          value={participant.id}
                          checked={isSelected}
                          onChange={() => selectPayer(participant.id)}
                        />
                        {isSelected && (
                          <motion.span
                            layoutId="payer-highlight"
                            className={s.payer__highlight}
                            style={{ borderColor: participant.color }}
                            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                          />
                        )}
                        <Avatar name={participant.name} color={participant.color} size="sm" />
                        <span className={s.payer__name}>{participant.name}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className={s.fields}>
                <label className={s.field}>
                  <span className={s.label}>Monto</span>
                  <span className={s.money}>
                    <span className={s.money__sign} aria-hidden="true">
                      $
                    </span>
                    <input
                      className={cs(s.input, s['input--amount'])}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 7) setAmount(value);
                      }}
                    />
                  </span>
                </label>
                <label className={s.field}>
                  <span className={s.label}>Detalle (opcional)</span>
                  <input
                    className={s.input}
                    type="text"
                    placeholder="Carne, bebida…"
                    value={description}
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
              </div>

              <Button type="submit" block disabled={!isAmountValid || pendingAction !== null}>
                {pendingAction === 'add-expense' ? (
                  'Agregando…'
                ) : (
                  <span>
                    Agregar gasto de <span className={s.capitalize}>{payer.name}</span>
                  </span>
                )}
              </Button>
            </form>
          ) : (
            <p className={s.empty}>Primero agregá al menos una persona.</p>
          )}
        </Step>

        <Step step={3} title="Gastos" id="expenses-title" action={expensesAction}>
          {balances.length === 0 ? (
            <p className={s.empty}>Acá vas a ver lo que gastó cada uno.</p>
          ) : (
            <ul className={s.people}>
              <AnimatePresence initial={false}>
                {balances.map((participant) => {
                  const personExpenses = expenses.filter((e) => e.participantId === participant.id);

                  return (
                    <motion.li
                      key={participant.id}
                      layout
                      className={s.person}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}>
                      <div className={s.person__summary}>
                        <Avatar name={participant.name} color={participant.color} />
                        <span className={s.person__info}>
                          <b className={s.person__name}>{participant.name}</b>
                          <span className={s.person__count}>
                            {personExpenses.length === 0
                              ? 'Sin gastos'
                              : `${personExpenses.length} ${personExpenses.length === 1 ? 'gasto' : 'gastos'}`}
                          </span>
                        </span>
                        <AnimatedAmount value={participant.amount} className={s.person__total} />
                      </div>

                      <div className={s.payment}>
                        {editingPaymentId === participant.id ? (
                          <form
                            className={s.payment__form}
                            onSubmit={(e) => void handleSavePayment(e, participant)}>
                            <div className={s.payment__row}>
                              <input
                                className={cs(s.input, s['input--small'])}
                                type="text"
                                placeholder="CBU, CVU o alias"
                                aria-label={`CBU, CVU o alias de ${participant.name}`}
                                aria-invalid={!isPaymentDraftValid}
                                value={paymentDraft}
                                maxLength={PAYMENT_INFO_MAX_LENGTH}
                                autoComplete="off"
                                spellCheck={false}
                                onChange={(e) => setPaymentDraft(e.target.value)}
                              />
                              <Button
                                type="submit"
                                size="sm"
                                disabled={!isPaymentDraftValid || pendingAction !== null}>
                                {pendingAction === 'payment' ? '…' : 'Guardar'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingPaymentId(null)}>
                                Cancelar
                              </Button>
                            </div>
                            <p
                              className={cs(s.payment__hint, {
                                [s['payment__hint--error']]: !isPaymentDraftValid
                              })}>
                              {isPaymentDraftValid
                                ? 'Para que le puedan transferir. Dejalo vacío para borrarlo.'
                                : 'Tiene que ser un CBU/CVU de 22 números o un alias de 6 a 20 caracteres.'}
                            </p>
                          </form>
                        ) : participant.paymentInfo ? (
                          <div className={s.payment__saved}>
                            <button
                              type="button"
                              className={cs(s.payment__copy, {
                                [s['payment__copy--done']]: copiedPaymentId === participant.id
                              })}
                              onClick={() => void handleCopyPayment(participant)}
                              title="Tocá para copiar"
                              aria-label={`Copiar ${getPaymentInfoType(participant.paymentInfo)} de ${participant.name}`}>
                              <span className={s.payment__type}>
                                {getPaymentInfoType(participant.paymentInfo)}
                              </span>
                              <span className={s.payment__value}>
                                {copiedPaymentId === participant.id
                                  ? '✓ Copiado'
                                  : participant.paymentInfo}
                              </span>
                              <span className={s.payment__icon}>
                                <CopyIcon />
                              </span>
                            </button>
                            <button
                              type="button"
                              className={s.payment__edit}
                              onClick={() => startEditingPayment(participant)}
                              disabled={pendingAction !== null}
                              aria-label={`Editar CBU, CVU o alias de ${participant.name}`}>
                              Editar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={s.payment__add}
                            onClick={() => startEditingPayment(participant)}
                            disabled={pendingAction !== null}>
                            + Agregar CBU, CVU o alias
                          </button>
                        )}
                      </div>

                      {personExpenses.length > 0 && (
                        <ul className={s.person__expenses}>
                          <AnimatePresence initial={false}>
                            {personExpenses.map((expense) => (
                              <motion.li
                                key={expense.id}
                                className={s.expense}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}>
                                <span className={s.expense__description}>
                                  {expense.description || 'Gasto'}
                                </span>
                                <span className={s.expense__amount}>
                                  ${formatNumber(expense.amount)}
                                </span>
                                <button
                                  type="button"
                                  className={s.expense__remove}
                                  onClick={() => void handleRemoveExpense(expense)}
                                  disabled={pendingAction !== null}
                                  aria-label={`Eliminar gasto ${expense.description || ''} de $${formatNumber(expense.amount)}`}>
                                  <ReactSVG
                                    src="/icons/close.svg"
                                    wrapper="span"
                                    className={s.icon}
                                  />
                                </button>
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </Step>

        <Step step={4} title="Resultado" id="result-title">
          {balances.length >= 2 ? (
            <>
              <div id={resultCaptureId} className={s.result}>
                <RoomSettlement balances={balances} />
              </div>
              {resultActions}
            </>
          ) : (
            <p className={s.empty}>Hacen falta al menos 2 personas para calcular.</p>
          )}
        </Step>

        <motion.div className={s.container__footer} variants={itemVariants}>
          <BackLink label="Volver al inicio" />
          <Cafecito />
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
};

export default SplitEditor;
