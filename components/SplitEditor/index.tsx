"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type Variants,
} from "framer-motion";
import cs from "classnames";

import { logger } from "@/lib/logger";
import {
  getPaymentInfoType,
  isValidPaymentInfo,
  normalizePaymentInfo,
  PAYMENT_INFO_MAX_LENGTH,
} from "@/lib/payment-info";
import { getStoredPayerId, storePayerId } from "@/lib/room-storage";
import {
  AMOUNT_MAX,
  calculateOptimizedTransactions,
  DESCRIPTION_MAX_LENGTH,
  formatNumber,
  getDebtKey,
  getPersonTone,
  MAX_EXPENSES,
  MAX_PARTICIPANTS,
  normalizeName,
  PERSON_NAME_MAX_LENGTH,
} from "@/lib/split";
import type { Expense, Participant, ParticipantBalance } from "@/types/room";

import AnimatedAmount from "../AnimatedAmount";
import Avatar from "../Avatar";
import BackLink from "../BackLink";
import Button from "../Button";
import Cafecito from "../Cafecito";
import CopyIcon from "../CopyIcon";
import RoomSettlement from "../RoomSettlement";
import s from "./SplitEditor.module.css";

// Operaciones que cada modo implementa a su manera (Firestore en la sala, el celular en "yo solo").
export interface SplitEditorActions {
  addPerson: (name: string) => Promise<Participant>;
  removePerson: (participant: Participant) => Promise<void>;
  addExpense: (
    participantId: string,
    amount: number,
    description: string,
  ) => Promise<void>;
  removeExpense: (expense: Expense) => Promise<void>;
  setPaymentInfo: (participant: Participant, value: string) => Promise<void>;
  setSettled: (debtKey: string, paid: boolean) => Promise<void>;
}

interface SplitEditorProps {
  title: string;
  participants: Participant[];
  expenses: Expense[];
  settled: string[];
  actions: SplitEditorActions;
  // Clave para recordar en este navegador a quién se le cargó el último gasto.
  storageScope: string;
  intro?: ReactNode;
  // Acción en la cabecera azul (reemplaza a la marca).
  headerAction?: ReactNode;
  expensesAction?: ReactNode;
  resultActions?: ReactNode;
  resultCaptureId?: string;
}

const COPIED_FEEDBACK_MS = 2000;
const MAX_FACES = 6;

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const vibrate = (pattern: number | number[]) => {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
};

const SplitEditor = ({
  title,
  participants,
  expenses,
  settled,
  actions,
  storageScope,
  intro,
  headerAction,
  expensesAction,
  resultActions,
  resultCaptureId,
}: SplitEditorProps) => {
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmExpenseId, setConfirmExpenseId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentDraft, setPaymentDraft] = useState("");
  const [copiedPaymentId, setCopiedPaymentId] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<{
    id: number;
    text: string;
    personId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPayerId(getStoredPayerId(storageScope));
  }, [storageScope]);

  useEffect(() => {
    if (!copiedPaymentId) return;
    const timer = setTimeout(
      () => setCopiedPaymentId(null),
      COPIED_FEEDBACK_MS,
    );
    return () => clearTimeout(timer);
  }, [copiedPaymentId]);

  // Si la persona elegida ya no existe (o nunca se eligió), se usa la primera.
  const payer =
    participants.find((p) => p.id === selectedPayerId) ??
    participants[0] ??
    null;

  const balances: ParticipantBalance[] = participants.map((participant) => ({
    ...participant,
    amount: expenses
      .filter((expense) => expense.participantId === participant.id)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }));
  const totalSpent = balances.reduce((sum, p) => sum + p.amount, 0);
  const { transactions } = calculateOptimizedTransactions(balances);
  const pendingTotal = transactions
    .filter(
      (t) =>
        !settled.includes(getDebtKey(t.debtor.id, t.creditor.id, t.amount)),
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const normalizedPaymentDraft = normalizePaymentInfo(paymentDraft);
  const isPaymentDraftValid =
    normalizedPaymentDraft === "" || isValidPaymentInfo(normalizedPaymentDraft);

  const parsedAmount = Number(amount);
  const isAmountValid =
    amount !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= AMOUNT_MAX;

  const selectPayer = (id: string) => {
    storePayerId(storageScope, id);
    setSelectedPayerId(id);
    setEditingPaymentId(null);
  };

  // Ejecuta una acción mostrando su estado y un mensaje claro si falla.
  const runAction = async (
    key: string,
    errorMessage: string,
    action: () => Promise<void>,
  ) => {
    setPendingAction(key);
    setError(null);

    try {
      await action();
    } catch (err) {
      logger.error(errorMessage, err);
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

    const existing = participants.find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      setError(`"${existing.name}" ya está en la lista.`);
      return;
    }
    if (participants.length >= MAX_PARTICIPANTS) {
      setError("Llegaste al máximo de personas.");
      return;
    }

    await runAction(
      "add-person",
      "No se pudo agregar a la persona. Probá de nuevo.",
      async () => {
        const participant = await actions.addPerson(name);
        selectPayer(participant.id);
        setPersonName("");
        setIsAddingPerson(false);
        vibrate(10);
      },
    );
  };

  const handleRemovePerson = async (participant: Participant) => {
    if (pendingAction) return;
    setConfirmRemoveId(null);
    setOpenPersonId(null);

    await runAction(
      participant.id,
      "No se pudo quitar a la persona. Probá de nuevo.",
      () => actions.removePerson(participant),
    );
  };

  const handleCopyPayment = async (participant: Participant) => {
    if (!participant.paymentInfo) return;

    try {
      await navigator.clipboard.writeText(participant.paymentInfo);
      setCopiedPaymentId(participant.id);
      vibrate(10);
    } catch {
      setError(
        "No se pudo copiar. Mantené apretado el dato para copiarlo a mano.",
      );
    }
  };

  const startEditingPayment = (participant: Participant) => {
    setEditingPaymentId(participant.id);
    setPaymentDraft(participant.paymentInfo ?? "");
    setError(null);
  };

  const handleSavePayment = async (
    event: FormEvent<HTMLFormElement>,
    participant: Participant,
  ) => {
    event.preventDefault();
    if (!isPaymentDraftValid || pendingAction) return;

    await runAction(
      "payment",
      "No se pudo guardar el CBU/CVU/alias. Probá de nuevo.",
      async () => {
        await actions.setPaymentInfo(participant, normalizedPaymentDraft);
        setEditingPaymentId(null);
        setPaymentDraft("");
      },
    );
  };

  const handleAddExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!payer || !isAmountValid || pendingAction) return;

    if (expenses.length >= MAX_EXPENSES) {
      setError("Llegaste al máximo de gastos.");
      return;
    }

    await runAction(
      "add-expense",
      "No se pudo agregar el gasto. Probá de nuevo.",
      async () => {
        await actions.addExpense(
          payer.id,
          parsedAmount,
          normalizeName(description).slice(0, DESCRIPTION_MAX_LENGTH),
        );
        setLastAdded({
          id: Date.now(),
          text: `+$${formatNumber(parsedAmount)}`,
          personId: payer.id,
        });
        setAmount("");
        setDescription("");
        vibrate(12);
      },
    );
  };

  const handleRemoveExpense = async (expense: Expense) => {
    if (pendingAction) return;

    await runAction(
      expense.id,
      "No se pudo eliminar el gasto. Probá de nuevo.",
      () => actions.removeExpense(expense),
    );
  };

  // Formulario de CBU/CVU/alias; se usa en el detalle de cada persona y en el recuadro del monto.
  const renderPaymentForm = (
    participant: Participant,
    onCancel?: () => void,
  ) => (
    <form
      className={s.payment__form}
      onSubmit={(e) => void handleSavePayment(e, participant)}
    >
      <div className={s.addPerson__row}>
        <input
          className={s.field}
          type="text"
          placeholder="CBU, CVU o alias"
          aria-label={`CBU, CVU o alias de ${participant.name}`}
          aria-invalid={!isPaymentDraftValid}
          value={paymentDraft}
          maxLength={PAYMENT_INFO_MAX_LENGTH}
          autoComplete="off"
          spellCheck={false}
          autoFocus={Boolean(onCancel)}
          onChange={(e) => setPaymentDraft(e.target.value)}
        />
        <Button
          type="submit"
          disabled={!isPaymentDraftValid || pendingAction !== null}
        >
          {pendingAction === "payment" ? "…" : "Guardar"}
        </Button>
      </div>
      <p className={cs(s.hint, { [s["hint--error"]]: !isPaymentDraftValid })}>
        {isPaymentDraftValid
          ? "Para que le puedan transferir. Dejalo vacío para borrarlo."
          : "Tiene que ser un CBU/CVU de 22 números o un alias de 6 a 20 caracteres."}
      </p>
      {onCancel && (
        <button type="button" className={s.textButton} onClick={onCancel}>
          Cancelar
        </button>
      )}
    </form>
  );

  // Edición de alias abierta desde el recuadro del monto (no desde el detalle de la persona).
  const isEditingPayerPayment =
    payer !== null &&
    editingPaymentId === payer.id &&
    openPersonId !== payer.id;
  const lastAddedPerson = participants.find(
    (p) => p.id === lastAdded?.personId,
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className={s.page}>
        <header className={s.hero}>
          <div className={s.hero__inner}>
            <div className={s.hero__bar}>
              <BackLink onAccent />
              {headerAction ?? (
                <span className={s.hero__mark}>¿Cuánto te debo?</span>
              )}
            </div>
            <h1 className={s.hero__title}>{title}</h1>

            <div className={s.crew}>
              {participants.length > 0 && (
                <div className={s.crew__faces} aria-hidden="true">
                  {participants
                    .slice(0, MAX_FACES)
                    .map((participant, index) => (
                      <motion.span
                        key={participant.id}
                        className={s.crew__face}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          delay: 0.1 + index * 0.05,
                          type: "spring",
                          stiffness: 500,
                          damping: 22,
                        }}
                      >
                        <Avatar
                          name={participant.name}
                          color={participant.color}
                        />
                      </motion.span>
                    ))}
                  {participants.length > MAX_FACES && (
                    <span className={s.crew__more}>
                      +{participants.length - MAX_FACES}
                    </span>
                  )}
                </div>
              )}
              <p className={s.crew__text}>
                <b>
                  {participants.length}{" "}
                  {participants.length === 1 ? "persona" : "personas"} · $
                  {formatNumber(totalSpent)}
                </b>
                {transactions.length === 0
                  ? participants.length < 2
                    ? "Sumá a los que participan"
                    : "Nadie le debe nada a nadie"
                  : pendingTotal > 0
                    ? `Faltan pagar $${formatNumber(pendingTotal)}`
                    : "Ya está todo pagado"}
              </p>
            </div>

            {intro && <div className={s.hero__intro}>{intro}</div>}
          </div>
        </header>

        <motion.div
          className={s.body}
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={s.main}>
            <AnimatePresence>
              {error && (
                <motion.p
                  className={s.error}
                  role="alert"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.section
              className={s.card}
              aria-labelledby="add-expense-title"
              variants={itemVariants}
            >
              <h2 id="add-expense-title" className={s.card__title}>
                ¿Quién pagó?
              </h2>

              <ul className={s.people}>
                {participants.map((participant) => {
                  const { tint, ink } = getPersonTone(participant.color);
                  const isSelected = participant.id === payer?.id;

                  return (
                    <li key={participant.id}>
                      <button
                        type="button"
                        className={cs(s.tile, {
                          [s["tile--selected"]]: isSelected,
                        })}
                        style={{
                          backgroundColor: isSelected ? ink : tint,
                          color: isSelected ? "#fff" : ink,
                        }}
                        aria-pressed={isSelected}
                        onClick={() => {
                          selectPayer(participant.id);
                          vibrate(6);
                        }}
                      >
                        <Avatar
                          name={participant.name}
                          color={participant.color}
                          size="sm"
                          inverted={isSelected}
                        />
                        <span className={s.capitalize}>{participant.name}</span>
                      </button>
                    </li>
                  );
                })}
                {!isAddingPerson && participants.length > 0 && (
                  <li>
                    <button
                      type="button"
                      className={cs(s.tile, s["tile--add"])}
                      onClick={() => setIsAddingPerson(true)}
                    >
                      + Persona
                    </button>
                  </li>
                )}
              </ul>

              <AnimatePresence initial={false}>
                {(isAddingPerson || participants.length === 0) && (
                  <motion.form
                    className={s.addPerson}
                    onSubmit={handleAddPerson}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className={s.addPerson__row}>
                      <input
                        className={s.field}
                        type="text"
                        placeholder={
                          participants.length === 0
                            ? "¿Quién participa? Escribí un nombre"
                            : "Nombre"
                        }
                        aria-label="Nombre de la persona"
                        value={personName}
                        maxLength={PERSON_NAME_MAX_LENGTH}
                        onChange={(e) => setPersonName(e.target.value)}
                      />
                      <Button
                        type="submit"
                        disabled={
                          !normalizeName(personName) || pendingAction !== null
                        }
                      >
                        {pendingAction === "add-person" ? "…" : "Sumar"}
                      </Button>
                    </div>
                    {participants.length > 0 && (
                      <button
                        type="button"
                        className={s.textButton}
                        onClick={() => {
                          setIsAddingPerson(false);
                          setPersonName("");
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </motion.form>
                )}
              </AnimatePresence>

              {payer && isEditingPayerPayment ? (
                <div
                  className={cs(s.amount, s["amount--editing"])}
                  style={
                    {
                      "--tint": getPersonTone(payer.color).tint,
                      "--ink": getPersonTone(payer.color).ink,
                    } as CSSProperties
                  }
                >
                  <span className={s.amount__payer}>
                    <Avatar name={payer.name} color={payer.color} size="sm" />
                    <span>
                      Alias de <b className={s.capitalize}>{payer.name}</b>
                    </span>
                  </span>
                  {renderPaymentForm(payer, () => setEditingPaymentId(null))}
                </div>
              ) : (
                payer && (
                  <form className={s.expenseForm} onSubmit={handleAddExpense}>
                    <div
                      className={s.amount}
                      style={
                        {
                          "--tint": getPersonTone(payer.color).tint,
                          "--ink": getPersonTone(payer.color).ink,
                        } as CSSProperties
                      }
                    >
                      <div className={s.amount__top}>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={payer.id}
                            className={s.amount__payer}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.18 }}
                          >
                            <Avatar
                              name={payer.name}
                              color={payer.color}
                              size="sm"
                            />
                            <span>
                              Pagó <b className={s.capitalize}>{payer.name}</b>
                            </span>
                          </motion.span>
                        </AnimatePresence>
                        {!isEditingPayerPayment && (
                          <button
                            type="button"
                            className={s.amount__alias}
                            onClick={() => {
                              setOpenPersonId(null);
                              startEditingPayment(payer);
                            }}
                            aria-label={`${payer.paymentInfo ? "Editar" : "Cargar"} CBU, CVU o alias de ${payer.name}`}
                          >
                            {payer.paymentInfo
                              ? "Editar alias"
                              : "+ Cargar alias"}
                          </button>
                        )}
                      </div>
                      <label className={s.amount__row}>
                        <span className={s.amount__sign} aria-hidden="true">
                          $
                        </span>
                        <input
                          className={s.amount__input}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          aria-label={`Monto que pagó ${payer.name}`}
                          value={amount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 7) setAmount(value);
                          }}
                        />
                      </label>
                    </div>
                    <input
                      className={s.field}
                      type="text"
                      placeholder="¿En qué? Carne, bebida, hielo…"
                      aria-label="Detalle del gasto (opcional)"
                      value={description}
                      maxLength={DESCRIPTION_MAX_LENGTH}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <div className={s.submit}>
                      <Button
                        type="submit"
                        block
                        disabled={!isAmountValid || pendingAction !== null}
                      >
                        {pendingAction === "add-expense" ? (
                          "Sumando…"
                        ) : isAmountValid ? (
                          <span>
                            Sumar ${formatNumber(parsedAmount)} de{" "}
                            <span className={s.capitalize}>{payer.name}</span>
                          </span>
                        ) : (
                          "Agregar gasto"
                        )}
                      </Button>
                      <AnimatePresence>
                        {lastAdded && lastAddedPerson && (
                          <motion.span
                            key={lastAdded.id}
                            className={s.float}
                            style={{
                              color: getPersonTone(lastAddedPerson.color).ink,
                            }}
                            initial={{ y: 0, opacity: 1, scale: 1 }}
                            animate={{ y: -72, opacity: 0, scale: 1.15 }}
                            transition={{
                              duration: 0.9,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            onAnimationComplete={() => setLastAdded(null)}
                            aria-hidden="true"
                          >
                            {lastAdded.text}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </form>
                )
              )}
            </motion.section>

            <motion.section
              className={s.card}
              aria-labelledby="expenses-title"
              variants={itemVariants}
            >
              <div className={s.card__head}>
                <h2 id="expenses-title" className={s.card__title}>
                  Lo que puso cada uno
                </h2>
                {expensesAction}
              </div>

              {balances.length === 0 ? (
                <p className={s.empty}>
                  Cuando sumes gente, acá vas a ver lo que puso cada uno.
                </p>
              ) : (
                <ul className={s.rows}>
                  {balances.map((participant) => {
                    const personExpenses = expenses.filter(
                      (e) => e.participantId === participant.id,
                    );
                    const isOpen = openPersonId === participant.id;
                    const { tint } = getPersonTone(participant.color);

                    return (
                      <li
                        key={participant.id}
                        className={cs(s.row, { [s["row--open"]]: isOpen })}
                      >
                        <AnimatePresence>
                          {lastAdded?.personId === participant.id && (
                            <motion.span
                              key={lastAdded.id}
                              className={s.row__flash}
                              style={{ backgroundColor: tint }}
                              initial={{ opacity: 1 }}
                              animate={{ opacity: 0 }}
                              transition={{ duration: 1.1, ease: "easeOut" }}
                              aria-hidden="true"
                            />
                          )}
                        </AnimatePresence>
                        <button
                          type="button"
                          className={s.row__summary}
                          aria-expanded={isOpen}
                          onClick={() => {
                            setOpenPersonId(isOpen ? null : participant.id);
                            setConfirmRemoveId(null);
                            setConfirmExpenseId(null);
                            setEditingPaymentId(null);
                          }}
                        >
                          <Avatar
                            name={participant.name}
                            color={participant.color}
                          />
                          <span className={s.row__who}>
                            <b className={s.capitalize}>{participant.name}</b>
                            <small>
                              {personExpenses.length === 0
                                ? "Todavía no puso nada"
                                : personExpenses
                                    .map((e) => e.description || "Gasto")
                                    .join(", ")}
                            </small>
                          </span>
                          <AnimatedAmount
                            value={participant.amount}
                            className={cs(s.row__money, {
                              [s["row__money--zero"]]: participant.amount === 0,
                            })}
                          />
                          <motion.svg
                            className={s.row__chevron}
                            viewBox="0 0 24 24"
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            aria-hidden="true"
                          >
                            <path d="M6 9l6 6 6-6" />
                          </motion.svg>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              className={s.detail}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{
                                duration: 0.3,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                            >
                              <div className={s.detail__inner}>
                                {personExpenses.length > 0 && (
                                  <ul className={s.expenses}>
                                    {personExpenses.map((expense) => (
                                      <li
                                        key={expense.id}
                                        className={s.expense}
                                      >
                                        <AnimatePresence
                                          mode="wait"
                                          initial={false}
                                        >
                                          {confirmExpenseId === expense.id ? (
                                            <motion.div
                                              key="confirm"
                                              className={s.expense__confirm}
                                              initial={{ opacity: 0, x: 12 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              exit={{ opacity: 0, x: 12 }}
                                              transition={{ duration: 0.15 }}
                                            >
                                              <span
                                                className={
                                                  s.expense__description
                                                }
                                              >
                                                ¿Eliminar $
                                                {formatNumber(expense.amount)}?
                                              </span>
                                              <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => {
                                                  setConfirmExpenseId(null);
                                                  void handleRemoveExpense(
                                                    expense,
                                                  );
                                                }}
                                                disabled={
                                                  pendingAction !== null
                                                }
                                              >
                                                Eliminar
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  setConfirmExpenseId(null)
                                                }
                                              >
                                                No
                                              </Button>
                                            </motion.div>
                                          ) : (
                                            <motion.div
                                              key="view"
                                              className={s.expense__view}
                                              initial={{ opacity: 0, x: -12 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              exit={{ opacity: 0, x: -12 }}
                                              transition={{ duration: 0.15 }}
                                            >
                                              <span
                                                className={
                                                  s.expense__description
                                                }
                                              >
                                                {expense.description || "Gasto"}
                                              </span>
                                              <span>
                                                ${formatNumber(expense.amount)}
                                              </span>
                                              <button
                                                type="button"
                                                className={s.iconButton}
                                                onClick={() =>
                                                  setConfirmExpenseId(
                                                    expense.id,
                                                  )
                                                }
                                                disabled={
                                                  pendingAction !== null
                                                }
                                                aria-label={`Eliminar gasto ${expense.description || ""} de $${formatNumber(expense.amount)}`}
                                              >
                                                <svg
                                                  className={s.icon}
                                                  viewBox="0 0 24 24"
                                                  aria-hidden="true"
                                                >
                                                  <circle
                                                    cx="12"
                                                    cy="12"
                                                    r="12"
                                                  />
                                                  <path d="M8 8l8 8M16 8l-8 8" />
                                                </svg>
                                              </button>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                {editingPaymentId === participant.id ? (
                                  renderPaymentForm(participant)
                                ) : participant.paymentInfo ? (
                                  <div className={s.payment}>
                                    <button
                                      type="button"
                                      className={cs(s.payment__copy, {
                                        [s["payment__copy--done"]]:
                                          copiedPaymentId === participant.id,
                                      })}
                                      onClick={() =>
                                        void handleCopyPayment(participant)
                                      }
                                      aria-label={`Copiar ${getPaymentInfoType(participant.paymentInfo)} de ${participant.name}`}
                                    >
                                      <span className={s.payment__type}>
                                        {getPaymentInfoType(
                                          participant.paymentInfo,
                                        )}
                                      </span>
                                      <span className={s.payment__value}>
                                        {copiedPaymentId === participant.id
                                          ? "✓ Copiado"
                                          : participant.paymentInfo}
                                      </span>
                                      <CopyIcon />
                                    </button>
                                    <button
                                      type="button"
                                      className={s.textButton}
                                      onClick={() =>
                                        startEditingPayment(participant)
                                      }
                                    >
                                      Editar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className={cs(
                                      s.textButton,
                                      s["textButton--accent"],
                                    )}
                                    onClick={() =>
                                      startEditingPayment(participant)
                                    }
                                  >
                                    + Agregar CBU, CVU o alias
                                  </button>
                                )}

                                {confirmRemoveId === participant.id ? (
                                  <div className={s.confirm}>
                                    <p>
                                      ¿Quitar a{" "}
                                      <b className={s.capitalize}>
                                        {participant.name}
                                      </b>
                                      {personExpenses.length > 0 &&
                                        ` y ${personExpenses.length === 1 ? "su gasto" : `sus ${personExpenses.length} gastos`}`}
                                      ?
                                    </p>
                                    <div className={s.confirm__actions}>
                                      <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() =>
                                          void handleRemovePerson(participant)
                                        }
                                        disabled={pendingAction !== null}
                                      >
                                        Quitar
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setConfirmRemoveId(null)}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className={cs(
                                      s.textButton,
                                      s["textButton--danger"],
                                    )}
                                    onClick={() =>
                                      setConfirmRemoveId(participant.id)
                                    }
                                  >
                                    Quitar a{" "}
                                    <span className={s.capitalize}>
                                      {participant.name}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.section>
          </div>

          <motion.section
            id={resultCaptureId}
            className={s.ticket}
            aria-labelledby="result-title"
            variants={itemVariants}
          >
            <h2 id="result-title" className={s.card__title}>
              La cuenta
            </h2>
            {balances.length >= 2 ? (
              <>
                <div className={s.result}>
                  <RoomSettlement
                    balances={balances}
                    settled={settled}
                    onToggleSettled={(debtKey, paid) => {
                      vibrate(paid ? [10, 40, 20] : 8);
                      void runAction(
                        debtKey,
                        "No se pudo actualizar el pago. Probá de nuevo.",
                        () => actions.setSettled(debtKey, paid),
                      );
                    }}
                  />
                </div>
                {resultActions && (
                  <div className={s.result__actions} data-capture="remove">
                    {resultActions}
                  </div>
                )}
              </>
            ) : (
              <p className={s.empty}>
                Con al menos dos personas, acá ves cuánto le toca a cada uno y
                quién le paga a quién.
              </p>
            )}
          </motion.section>

          <motion.footer className={s.footer} variants={itemVariants}>
            <BackLink label="Volver al inicio" />
            <Cafecito />
          </motion.footer>
        </motion.div>
      </div>
    </MotionConfig>
  );
};

export default SplitEditor;
