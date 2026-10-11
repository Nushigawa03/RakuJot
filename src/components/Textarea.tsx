import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  autoResize?: boolean;
  /** ノート風の罫線を表示する */
  lined?: boolean;
}

const Textarea = ({ value, onChange, autoResize = false, lined = false, className = '', ...props }: TextareaProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!autoResize || !el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, autoResize]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`textarea ${lined ? 'textarea--lined' : ''} ${className}`}
      {...props}
    />
  );
};

export default Textarea;
