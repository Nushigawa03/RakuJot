import React, { useRef } from 'react';
import './DatePickerInput.css';

interface DatePickerInputProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "日付やキーワード（空欄でもOK）",
}) => {
  const hiddenRef = useRef<HTMLInputElement | null>(null);

  const handleCalendarClick = () => {
    if (hiddenRef.current) {
      try {
        // @ts-ignore
        if (typeof hiddenRef.current.showPicker === 'function') {
          // @ts-ignore
          hiddenRef.current.showPicker();
          return;
        }
      } catch {}
      hiddenRef.current.click();
    }
  };

  return (
    <label>
      {label}:
      <div className="date-with-picker">
        <input
          className="date"
          type="text"
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="date-picker-btn"
          onClick={handleCalendarClick}
        >
          📅
        </button>
        <input
          ref={hiddenRef}
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 36,
            height: 36,
            opacity: 0,
            border: 'none',
            padding: 0,
            margin: 0,
            background: 'transparent',
          }}
        />
      </div>
    </label>
  );
};

export default DatePickerInput;
