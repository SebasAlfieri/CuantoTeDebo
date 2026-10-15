import cs from 'classnames';

import s from './Avatar.module.css';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md';
}

const Avatar = ({ name, color, size = 'md' }: AvatarProps) => (
  <span
    className={cs(s.avatar, { [s['avatar--sm']]: size === 'sm' })}
    style={{ backgroundColor: color }}
    aria-hidden="true">
    {name.trim().charAt(0).toUpperCase() || '?'}
  </span>
);

export default Avatar;
