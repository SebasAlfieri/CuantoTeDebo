import Image from 'next/image';

import s from './Cafecito.module.css';

const Cafecito = () => (
  <a
    className={s.link}
    href="https://cafecito.app/cuantotedebo"
    rel="noopener noreferrer"
    target="_blank">
    <Image
      className={s.link__image}
      width={384}
      height={80}
      src="/icons/cafecito.png"
      alt="Invitame un cafecito en cafecito.app"
    />
  </a>
);

export default Cafecito;
