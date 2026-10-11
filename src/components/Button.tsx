import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  full?: boolean;
}

const Button = ({ variant = 'primary', size = 'md', full, className = '', type = 'button', ...props }: ButtonProps) => (
  <button
    type={type}
    className={`btn btn--${variant} ${size === 'sm' ? 'btn--sm' : ''} ${full ? 'btn--full' : ''} ${className}`}
    {...props}
  />
);

export default Button;
