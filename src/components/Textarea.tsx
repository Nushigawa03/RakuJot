import React, { useRef, useEffect } from 'react';
import './Textarea.css';

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  autoResize?: boolean;
  showLines?: boolean;
}

const Textarea: React.FC<TextareaProps> = ({
  value,
  onChange,
  autoResize = true,
  showLines = true,
  className = '',
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleInput = () => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      handleInput();
    }
  }, [value, autoResize]);

  const classes = [
    'textarea',
    showLines && 'textarea--lined',
    className
  ].filter(Boolean).join(' ');

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onInput={handleInput}
      className={classes}
      {...props}
    />
  );
};

export default Textarea;