import React from "react";
import "./Button.css";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  full?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: ButtonVariant;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type?: "button" | "submit";
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled,
  full,
  size = "md",
  variant = "primary",
  className,
  leftIcon,
  rightIcon,
  type = "button",
}) => {
  const classes = [
    "btn",
    variant && `btn--${variant}`,
    full ? "btn--full" : "",
    size !== "md" ? `btn--${size}` : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} onClick={onClick} className={classes} disabled={disabled}>
      {leftIcon && <span className="btn__icon">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="btn__icon">{rightIcon}</span>}
    </button>
  );
};

export default Button;