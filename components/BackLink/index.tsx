import Link from 'next/link';
import cs from 'classnames';

import s from './BackLink.module.css';

interface BackLinkProps {
  label?: string;
  // Sobre la cabecera azul el link va en blanco.
  onAccent?: boolean;
  className?: string;
}

const BackLink = ({ label = 'Inicio', onAccent = false, className }: BackLinkProps) => (
  <Link href="/" className={cs(s.link, { [s['link--on-accent']]: onAccent }, className)}>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
    {label}
  </Link>
);

export default BackLink;
