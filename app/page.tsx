import Link from "next/link";

import { Cafecito, RoomCreate } from "@/components";

import s from "./page.module.css";

export default function Home() {
  return (
    <main className={s.container}>
      <header className={s.hero}>
        <h1 className={s.hero__title}>🤑¿Cuánto Te Debo?🤑</h1>
        <p className={s.hero__subtitle}>Dividí gastos sin vueltas.</p>
      </header>

      <div className={s.options}>
        <RoomCreate />

        <Link href="/calculadora" className={s.option}>
          <span className={s.option__icon} aria-hidden="true">
            🧮
          </span>
          <span className={s.option__copy}>
            <span className={s.option__title}>Cargar yo solo</span>
            <span className={s.option__caption}>
              Anotás lo que puso cada uno desde tu celular
            </span>
          </span>
          <span className={s.option__arrow} aria-hidden="true">
            →
          </span>
        </Link>
      </div>

      <Cafecito />
    </main>
  );
}
