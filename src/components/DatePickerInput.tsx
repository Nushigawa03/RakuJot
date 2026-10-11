import { useRef } from 'react';

interface DatePickerInputProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** 自由記述（「去年の夏」など）とカレンダー選択の両方に対応した日付入力 */
const DatePickerInput = ({ label, value, onChange, placeholder = '日付やキーワード（空欄でもOK）' }: DatePickerInputProps) => {
  const pickerRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const picker = pickerRef.current;
    try {
      picker?.showPicker();
    } catch {
      picker?.click();
    }
  };

  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="date-input">
        <input className="input" type="text" placeholder={placeholder} value={value || ''} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="icon-btn" onClick={openPicker} aria-label="カレンダーから選ぶ">📅</button>
        <input
          ref={pickerRef}
          className="date-input__picker"
          type="date"
          value={/^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value! : ''}
          onChange={(e) => onChange(e.target.value)}
          tabIndex={-1}
          aria-hidden="true"
        />
      </span>
    </label>
  );
};

export default DatePickerInput;
