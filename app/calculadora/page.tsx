import type { Metadata } from 'next';

import { Calc } from '@/components';

import s from './page.module.css';

export const metadata: Metadata = {
  title: 'Cargar yo solo | ¿Cuánto Te Debo?',
  description: 'Anotá lo que puso cada uno y calculá quién le debe a quién'
};

const CalculatorPage = () => (
  <main className={s.container}>
    <div className={s.container__content}>
      <Calc />
    </div>
  </main>
);

export default CalculatorPage;
