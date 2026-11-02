import Link from "next/link";

import { Cafecito, RoomCreate } from "@/components";
import { PERSON_COLORS, getPersonTone } from "@/lib/split";

import s from "./page.module.css";

const FACES = ["A", "M", "J", "L"];

export default function Home() {
  return (
    <main className={s.container}>
      <header className={s.hero}>
        <div className={s.hero__inner}>
          <p className={s.hero__mark}>¿Cuánto te debo?</p>
          <h1 className={s.hero__title}>
            Dividí los gastos del grupo sin vueltas.
          </h1>
          <p className={s.hero__subtitle}>
            Cargá quién pagó qué y te decimos quién le paga a quién.
          </p>
          <div className={s.hero__faces} aria-hidden="true">
            {FACES.map((letter, index) => {
              const { tint, ink } = getPersonTone(PERSON_COLORS[index]);
              return (
                <span
                  key={letter}
                  className={s.hero__face}
                  style={{
                    backgroundColor: ink,
                    color: tint,
                    animationDelay: `${0.2 + index * 0.06}s`,
                  }}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        </div>
      </header>

      <div className={s.options}>
        <RoomCreate />

        <Link href="/calculadora" className={s.option}>
          <span className={s.option__icon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="5" y="3" width="14" height="18" rx="3" />
              <path d="M9 8h6M9 12h6M9 16h3" />
            </svg>
          </span>
          <span className={s.option__copy}>
            <span className={s.option__title}>Cargar yo solo</span>
            <span className={s.option__caption}>
              Anotás lo de todos desde tu celular
            </span>
          </span>
          <svg
            className={s.option__arrow}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div className={s.support}>
        <Cafecito />
      </div>
    </main>
  );
}
