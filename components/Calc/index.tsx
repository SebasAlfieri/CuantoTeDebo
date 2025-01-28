"use client";
import React, { useState } from "react";
import s from "./Calc.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { ReactSVG } from "react-svg";

// Definimos los tipos
interface Person {
  name: string;
  amount: number;
  color: string;
}

const Calc: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [usedColors, setUsedColors] = useState<string[]>([]);

  // Lista de colores simples predefinidos
  const colors = [
    "#FFB6C1",
    "#87CEEB",
    "#7dd67d",
    "#FFD700",
    "#FFA07A",
    "#9370DB",
    "#3cfae7",
    "#FF4500",
    "#849324",
    "#FFB30F",
    "#820B8A",
  ];

  // Genera un color no repetido hasta que se usen todos los colores
  const getRandomColor = (): string => {
    let availableColors = colors.filter((color) => !usedColors.includes(color));

    // Si todos los colores ya se usaron, reinicia la lista de colores usados
    if (availableColors.length === 0) {
      setUsedColors([]);
      availableColors = colors;
    }

    // Selecciona un color aleatorio de los disponibles
    const color =
      availableColors[Math.floor(Math.random() * availableColors.length)];

    // Actualiza la lista de colores usados
    setUsedColors((prev) => [...prev, color]);

    return color;
  };

  // Agregar una persona al estado
  const addPerson = (): void => {
    if (name && amount) {
      setPeople([
        ...people,
        { name, amount: parseFloat(amount), color: getRandomColor() },
      ]);
      setName("");
      setAmount("");
    }
  };

  // Eliminar una persona del estado
  const removePerson = (index: number): void => {
    setPeople(people.filter((_, i) => i !== index));
  };

  // Optimización de transacciones
  const calculateOptimizedTransactions = (): {
    transactions: { debtor: Person; creditor: Person; amount: number }[];
    totalPerPerson: number;
  } => {
    if (people.length < 2) return { transactions: [], totalPerPerson: 0 };

    const totalSpent = people.reduce((sum, person) => sum + person.amount, 0);
    const totalPerPerson = totalSpent / people.length;

    const balances = people.map((person) => ({
      ...person,
      balance: person.amount - totalPerPerson,
    }));

    const creditors = balances.filter((b) => b.balance > 0);
    const debtors = balances.filter((b) => b.balance < 0);

    const transactions: { debtor: Person; creditor: Person; amount: number }[] =
      [];

    const minimizeTransactions = (
      creditors: typeof balances,
      debtors: typeof balances
    ) => {
      let i = 0;
      let j = 0;

      while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];
        const payment = Math.min(creditor.balance, -debtor.balance);

        transactions.push({
          debtor,
          creditor,
          amount: payment,
        });

        creditors[i].balance -= payment;
        debtors[j].balance += payment;

        if (creditors[i].balance === 0) i++;
        if (debtors[j].balance === 0) j++;
      }
    };

    minimizeTransactions(creditors, debtors);

    return { transactions, totalPerPerson };
  };

  const { transactions, totalPerPerson } = calculateOptimizedTransactions();

  return (
    <div className={s.container}>
      <h1 className={s.container__title}>🤑¿Cuánto Te Debo?🤑</h1>
      <h2 className={s.container__subtitle}>Distribuir Pagos</h2>
      <div className={s.container__flex}>
        <div className={s.container__flex__form}>
          <div className={s.container__flex__form__inputs}>
            <input
              type="text"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
            />
            <input
              type="number"
              placeholder="Monto gastado"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 7) {
                  setAmount(value);
                }
              }}
            />
          </div>

          <button
            onClick={addPerson}
            className={s.container__flex__form__button}
          >
            Agregar Persona
          </button>
        </div>
        <div className={s.container__flex__list}>
          <h2>Personas</h2>{" "}
          <AnimatePresence>
            {people.map((person, index) => (
              <motion.div
                key={index}
                className={s.container__flex__list__person}
                style={{ color: person.color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{
                  x: [10, 20, 0, -20],
                  opacity: 0,
                  transition: {
                    opacity: { duration: 0.3 },
                    x: { type: "spring", duration: 1 },
                  },
                }}
              >
                <p>
                  <b>{person.name}:</b> ${person.amount.toFixed(2)}
                </p>
                <button
                  className={s.container__flex__list__delete}
                  onClick={() => removePerson(index)}
                >
                  <ReactSVG
                    src="/icons/close.svg"
                    wrapper="span"
                    className={s.container__flex__list__delete__icon}
                  />
                </button>
              </motion.div>
            ))}{" "}
          </AnimatePresence>
        </div>
        {people.length > 1 && (
          <>
            <div className={s.summary}>
              <h2>Resumen</h2>
              <p>
                Total gastado por todos: $
                {people.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
              </p>
              <p>Cada uno debería gastar: ${totalPerPerson.toFixed(2)}</p>
            </div>
            <div className={s.container__flex__results}>
              <h2>Deudas (Transacciones Óptimas)</h2>
              {transactions.map((transaction, index) => (
                <div key={index} className={s.container__flex__results__debt}>
                  <b style={{ color: transaction.debtor.color }}>
                    {transaction.debtor.name}
                  </b>{" "}
                  debe pagar{" "}
                  <span style={{ fontWeight: "bold" }}>
                    ${transaction.amount.toFixed(2)}
                  </span>{" "}
                  a{" "}
                  <b style={{ color: transaction.creditor.color }}>
                    {transaction.creditor.name}
                  </b>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Calc;
