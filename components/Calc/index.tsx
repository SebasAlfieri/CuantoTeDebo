"use client";
import React, { useState } from "react";
import s from "./calc.module.css";

// Definimos los tipos
interface Person {
  name: string;
  amount: number;
}

const Calc: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  // Agregar una persona al estado
  const addPerson = (): void => {
    if (name && amount) {
      setPeople([...people, { name, amount: parseFloat(amount) }]);
      setName("");
      setAmount("");
    }
  };

  // Optimización de transacciones
  const calculateOptimizedTransactions = (): {
    transactions: string[];
    totalPerPerson: number;
  } => {
    if (people.length < 2) return { transactions: [], totalPerPerson: 0 };

    const totalSpent = people.reduce((sum, person) => sum + person.amount, 0);
    const totalPerPerson = totalSpent / people.length;

    // Calcular balances
    const balances = people.map((person) => ({
      name: person.name,
      balance: person.amount - totalPerPerson,
    }));

    // Separar acreedores y deudores
    const creditors = balances.filter((b) => b.balance > 0);
    const debtors = balances.filter((b) => b.balance < 0);

    const transactions: string[] = [];

    // Algoritmo para minimizar transacciones
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

        transactions.push(
          `${debtor.name} debe pagar $${payment.toFixed(2)} a ${creditor.name}`
        );

        // Reducir balances
        creditors[i].balance -= payment;
        debtors[j].balance += payment;

        // Si alguno llega a 0, pasamos al siguiente
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
      <h1>Distribuir Pagos</h1>
      <div className={s.form}>
        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Monto gastado"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button onClick={addPerson}>Agregar Persona</button>
      </div>
      <div className={s.list}>
        <h2>Personas</h2>
        {people.map((person, index) => (
          <div key={index} className={s.person}>
            {person.name}: ${person.amount.toFixed(2)}
          </div>
        ))}
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
          <div className={s.results}>
            <h2>Deudas (Transacciones Óptimas)</h2>
            {transactions.map((debt, index) => (
              <div key={index} className={s.debt}>
                {debt}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Calc;
