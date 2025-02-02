"use client";
import React, { useState, useEffect } from "react";
import s from "./Calc.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { ReactSVG } from "react-svg";

// Definimos los tipos
interface Person {
  name: string;
  amount: number;
  color: string;
}

const LOCAL_STORAGE_KEY = "splitPayments";

const Calc: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [usedColors, setUsedColors] = useState<string[]>([]);

  // Lista de colores simples predefinidos
  const colors = [
    "#820B8A",
    "#9370DB",
    "#188afc",
    "#70c9ec",
    "#3cfae7",
    "#7dd67d",
    "#849324",
    "#f9de47",
    "#FFB30F",
    "#FFB6C1",
    "#FF4500",
  ];

  // Cargar datos desde localStorage al iniciar
  useEffect(() => {
    const storedPeople = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedPeople) {
      setPeople(JSON.parse(storedPeople));
    }
  }, []);

  // Guardar datos en localStorage cada vez que cambia `people`
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(people));
  }, [people]);

  const formatNumber = (num: number): string => {
    if (Number.isInteger(num)) {
      return num.toLocaleString("es-ES");
    } else {
      return num.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  };

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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addPerson();
                }
              }}
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addPerson();
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
                  <b>{person.name}:</b>{" "}
                  <span>${formatNumber(person.amount)}</span>
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
            <div className={s.container__flex__results}>
              <h2>Deudas (Transacciones Óptimas)</h2>
              {transactions.map((transaction, index) => (
                <div key={index} className={s.container__flex__results__debt}>
                  <b style={{ color: transaction.debtor.color }}>
                    {transaction.debtor.name}
                  </b>{" "}
                  debe pagar{" "}
                  <span style={{ fontWeight: "bold" }}>
                    ${formatNumber(transaction.amount)}
                  </span>{" "}
                  a{" "}
                  <b style={{ color: transaction.creditor.color }}>
                    {transaction.creditor.name}
                  </b>
                </div>
              ))}
            </div>{" "}
            <div className={s.summary}>
              <h2>Resumen</h2>
              <p>
                Total gastado por todos: $
                {formatNumber(people.reduce((sum, p) => sum + p.amount, 0))}
              </p>
              <p>Cada uno debería gastar: ${formatNumber(totalPerPerson)}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Calc;
