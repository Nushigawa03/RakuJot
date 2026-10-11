export { default as Button } from './Button';
export { default as DatePickerInput } from './DatePickerInput';
export { default as Textarea } from './Textarea';
export { Modal, ConfirmModal } from './Modal';
export { TagInput, type Chip } from './TagInput';

/** ルートの HydrateFallback 用 */
export const Loading = ({ message = '読み込み中...' }: { message?: string }) => (
  <div className="loading">{message}</div>
);

/** ON/OFF スイッチ */
export const Switch = ({ id, checked, onChange }: { id: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <label className="switch">
    <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="switch__slider" />
  </label>
);
