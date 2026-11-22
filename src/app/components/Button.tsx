import type { ComponentProps } from 'react';
import styles from './Button.module.css';

type Props = ComponentProps<'button'> & { variant?: 'primary' | 'quiet' };

export function Button({ variant = 'primary', className, type = 'button', ...rest }: Props) {
  const classes = [styles['button'], styles[variant], className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
