import React, { useState, useEffect } from 'react';
import useCreateQuickMemo from '../hooks/useCreateQuickMemo';
import './FullScreenMemoInput.css';

const FullScreenMemoInput: React.FC = () => {
  const [content, setContent] = useState('');
  const { save, isSaving, error } = useCreateQuickMemo();

  const handleSave = async () => {
    console.log('[FullScreenMemoInput] handleSave called');
    if (!content.trim()) {
      alert('メモを入力してください。');
      return;
    }
    try {
      const result = await save(content);
      if (result.ok) {
        setContent('');
        try {
          window.dispatchEvent(new CustomEvent('memoSaved', { detail: result.payload }));
        } catch {}
      } else {
        alert(result.error || '保存に失敗しました。');
      }
    } catch (e) {
      console.error(e);
      alert('保存中にエラーが発生しました');
    }
  };

  useEffect(() => {
    // function to update CSS variable --kbd-height based on visualViewport
    const updateKeyboardInset = () => {
      try {
        const vv = (window as any).visualViewport;
        if (vv && typeof vv.height === 'number') {
          // difference between layout viewport and visual viewport height is the keyboard height
          const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
          document.documentElement.style.setProperty('--kbd-height', `${keyboardHeight}px`);
        } else {
          // fallback: no VisualViewport API
          document.documentElement.style.setProperty('--kbd-height', `0px`);
        }
      } catch (e) {
        // ignore
      }
    };

    // update on visualViewport resize (keyboard show/hide) and on window resize
    const vv = (window as any).visualViewport;
    if (vv && typeof vv.addEventListener === 'function') {
      vv.addEventListener('resize', updateKeyboardInset);
      vv.addEventListener('scroll', updateKeyboardInset);
    }
    window.addEventListener('resize', updateKeyboardInset);
    // also update when focusing inputs (some browsers change sizes on focus)
    window.addEventListener('focusin', updateKeyboardInset);
    window.addEventListener('focusout', updateKeyboardInset);

    // initial call
    updateKeyboardInset();

    return () => {
      try {
        if (vv && typeof vv.removeEventListener === 'function') {
          vv.removeEventListener('resize', updateKeyboardInset);
          vv.removeEventListener('scroll', updateKeyboardInset);
        }
      } catch {}
      window.removeEventListener('resize', updateKeyboardInset);
      window.removeEventListener('focusin', updateKeyboardInset);
      window.removeEventListener('focusout', updateKeyboardInset);
      // reset variable
      document.documentElement.style.setProperty('--kbd-height', `0px`);
    };
  }, []);

  return (
    <div className="full-screen-memo-input">
      <div className="inputs">
        <textarea className="content" placeholder="メモを入力..." value={content} onChange={e => setContent(e.target.value)} />
      </div>
      <div className="actions">
        <button className="save" onClick={handleSave} disabled={isSaving}>{isSaving ? '保存中...' : '保存'}</button>
      </div>
    </div>
  );
};

export default FullScreenMemoInput;
