import type { ButtonHTMLAttributes } from 'react';
import cs from 'classnames';

import s from './Button.module.css';

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'light';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  block?: boolean;
}

const Button = ({
  variant = 'primary',
  size = 'md',
  block = false,
  type = 'button',
  className,
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={cs(
      s.button,
      {
        [s['button--ghost']]: variant === 'ghost',
        [s['button--danger']]: variant === 'danger',
        [s['button--light']]: variant === 'light',
        [s['button--small']]: size === 'sm',
        [s['button--block']]: block
      },
      className
    )}
    {...props}
  />
);

export default Button;
