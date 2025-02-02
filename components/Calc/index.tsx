"use client";
import React, { useState, useEffect } from "react";
import s from "./Calc.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { ReactSVG } from "react-svg";
import cs from "classnames";

interface Person {
  key: string;
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
  const [isSubmitDisabled, setIsSubmitDisabled] = useState<boolean>(true);

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

  const submitDisable = cs(s.container__flex__form__button, {
    [(s.container__flex__form__button, s.disable)]: isSubmitDisabled,
  });

  useEffect(() => {
    const storedPeople = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedPeople) {
      setPeople(JSON.parse(storedPeople));
    }
  }, []);

  useEffect(() => {
    if (people.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(people));
    }
  }, [people]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(people));
  }, [people]);

  useEffect(() => {
    if (name && amount && !isNaN(Number(amount))) {
      setIsSubmitDisabled(false);
    } else {
      setIsSubmitDisabled(true);
    }
  }, [name, amount]);

  const formatNumber = (num: number): string => {
    const fix = Number.isInteger(num) ? 0 : 2;
    const [integerPart, decimalPart] = num.toFixed(fix).split(".");

    const formattedIntegerPart = integerPart
      .split("")
      .reduceRight((acc, num, i, orig) => {
        if ("-" === num && 0 === i) {
          return num + acc;
        }
        const pos = orig.length - i - 1;
        return num + (pos && !(pos % 3) ? "." : "") + acc;
      }, "");

    return decimalPart
      ? `${formattedIntegerPart},${decimalPart}`
      : formattedIntegerPart;
  };

  const getRandomColor = (): string => {
    let availableColors = colors.filter((color) => !usedColors.includes(color));

    if (availableColors.length === 0) {
      setUsedColors([]);
      availableColors = colors;
    }

    const color =
      availableColors[Math.floor(Math.random() * availableColors.length)];

    setUsedColors((prev) => [...prev, color]);

    return color;
  };

  const addPerson = (): void => {
    if (name && amount) {
      const uniqueKey = `${name}-${new Date().getTime()}-${Math.random()}`;
      setPeople([
        ...people,
        {
          key: uniqueKey,
          name,
          amount: parseFloat(amount),
          color: getRandomColor(),
        },
      ]);
      setName("");
      setAmount("");
    }
  };

  const removePerson = (index: number): void => {
    setPeople(people.filter((_, i) => i !== index));
  };

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
            className={submitDisable}
            disabled={isSubmitDisabled}
          >
            Agregar Persona
          </button>
        </div>
        <motion.div
          className={s.container__flex__list}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: {
              opacity: { duration: 0.3 },
            },
          }}
        >
          <div className={s.container__flex__list__title}>
            {people.length <= 1 && (
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 1 } }}
                exit={{}}
              >
                Personas
              </motion.h2>
            )}
            {people.length >= 2 && (
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 1] }}
                transition={{
                  repeat: Infinity,
                  duration: 1,
                  type: "easeInOut",
                  repeatType: "reverse",
                }}
              >
                Agrega al menos 2 personas
              </motion.h2>
            )}
          </div>

          <AnimatePresence>
            {people.map((person, index) => (
              <motion.div
                key={person.key}
                className={s.container__flex__list__person}
                style={{ color: person.color }}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{
                  x: [10, 20, 0, -20],
                  opacity: 0,
                  transition: {
                    opacity: { duration: 0.3 },
                    x: { type: "spring", duration: 0.5 },
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
                  aria-label="Delete"
                >
                  <ReactSVG
                    src="/icons/close.svg"
                    wrapper="span"
                    className={s.container__flex__list__delete__icon}
                  />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        <AnimatePresence>
          {people.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: {
                  opacity: { duration: 0.3 },
                },
              }}
            >
              <motion.div className={s.container__flex__results}>
                <h2>💲 Deudas 💲</h2>
                <AnimatePresence>
                  {transactions.map((transaction, index) => (
                    <motion.div
                      key={`transaction-${transaction.debtor.name}${index}`}
                      className={s.container__flex__results__debt}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{
                        x: [10, 20, 0, -20],
                        opacity: 0,
                        transition: {
                          delay: 0.5,
                          opacity: { duration: 0.3 },
                          x: { type: "spring", duration: 0.5 },
                        },
                      }}
                    >
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
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>{" "}
              <div className={s.container__flex__summary}>
                <h2>📈 Resumen 📈</h2>
                <div className={s.container__flex__summary__total}>
                  <p>
                    Total gastado por todos:
                    <br />
                    <span>
                      $
                      {formatNumber(
                        people.reduce((sum, p) => sum + p.amount, 0)
                      )}
                    </span>
                  </p>
                </div>
                <div className={s.container__flex__summary__divided}>
                  <p>
                    Cada uno estaria gastando:
                    <br />
                    <span>${formatNumber(totalPerPerson)}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Calc;
