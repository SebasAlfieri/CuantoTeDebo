import Link from 'next/link';
import cs from 'classnames';

import s from './BackLink.module.css';

interface BackLinkProps {
  label?: string;
  className?: string;
}

const BackLink = ({ label = 'Inicio', className }: BackLinkProps) => (
  <Link href="/" className={cs(s.link, className)}>
    <span aria-hidden="true">←</span>
    {label}
  </Link>
);

export default BackLink;
