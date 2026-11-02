import cs from 'classnames';

import { getPersonTone } from '@/lib/split';

import s from './Avatar.module.css';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md';
  className?: string;
  // Fondo blanco con la letra del color de la persona, para usar sobre su color.
  inverted?: boolean;
}

const Avatar = ({ name, color, size = 'md', className, inverted = false }: AvatarProps) => {
  const { tint, ink } = getPersonTone(color);

  return (
    <span
      className={cs(s.avatar, { [s['avatar--sm']]: size === 'sm' }, className)}
      style={{ backgroundColor: inverted ? '#fff' : ink, color: inverted ? ink : tint }}
      aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
};

export default Avatar;
