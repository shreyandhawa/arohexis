import type { ButtonHTMLAttributes } from 'react';
import styles from './Chip.module.css';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & { pressed: boolean };

export function Chip({ pressed, className, type = 'button', ...rest }: Props) {
  const classes = [styles['chip'], pressed && styles['pressed'], className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} aria-pressed={pressed} className={classes} {...rest} />;
}
