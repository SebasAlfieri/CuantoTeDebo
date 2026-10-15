import Image from 'next/image';

import s from './Cafecito.module.css';

const Cafecito = () => (
  <div className={s.container}>
    <p className={s.container__note}>Ayúdame a mantener esta página viva y sin anuncios</p>
    <a
      className={s.container__link}
      href="https://cafecito.app/cuantotedebo"
      rel="noopener noreferrer"
      target="_blank">
      <Image
        className={s.container__image}
        width={384}
        height={80}
        src="/icons/cafecito.png"
        alt="Invitame un cafecito en cafecito.app"
      />
    </a>
  </div>
);

export default Cafecito;
