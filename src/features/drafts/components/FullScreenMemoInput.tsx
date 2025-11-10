import React, { useState, useEffect } from 'react';
import { useEffect as useEffectOnce } from 'react';
import { normalizeTagName } from '../utils/normalizeTagName';
import './FullScreenMemoInput.css';

const FullScreenMemoInput: React.FC = () => {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [availableTags, setAvailableTags] = useState<{ id: string; name: string }[]>([]);

  // タグ一覧を初回取得
  useEffectOnce(() => {
    fetch('/api/tags')
      .then(res => res.ok ? res.json() : [])
      .then(tags => setAvailableTags(Array.isArray(tags) ? tags : []));
  }, []);

  const handleSave = async () => {
    console.log('[FullScreenMemoInput] handleSave called');
    if (!content.trim()) {
      alert('メモを入力してください。');
      return;
    }
    setIsSaving(true);
    try {
      // 1) Call AI endpoint to get suggested metadata
      let aiResult: any = {};
      try {
        const aiResp = await fetch('/api/memos/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() }),
        });
        console.log('[FullScreenMemoInput] aiResp.status=', aiResp.status);
        if (aiResp.ok) {
          try {
            aiResult = await aiResp.json();
            console.log('[FullScreenMemoInput] aiResult=', aiResult);
          } catch (e) {
            const rawText = await aiResp.text().catch(() => '<<no-body>>');
            console.log('[FullScreenMemoInput] aiResp json parse failed, raw body=', rawText);
          }
        } else {
          const errText = await aiResp.text().catch(() => '<<no-body>>');
          console.warn('[FullScreenMemoInput] AI endpoint returned', aiResp.status, errText);
        }
      } catch (e) {
        console.warn('[FullScreenMemoInput] AI call failed', e);
      }
      console.log('[FullScreenMemoInput] using aiResult=', aiResult);

      // 2) Build payload for existing /api/memos
      const fallbackTitle = content.trim().split('\n')[0].slice(0, 80) || '無題';
      // タグ名を正規化して既存タグとマージ
      let aiTags: string[] = Array.isArray(aiResult?.tags) ? aiResult.tags : [];
      const normalizedAvailable = availableTags.map(t => ({ ...t, _norm: normalizeTagName(t.name) }));
      const mergedTags = aiTags.map(tag => {
        const norm = normalizeTagName(tag);
        const found = normalizedAvailable.find(t => t._norm === norm);
        return found ? found.name : tag;
      });
      const payload: any = {
        title: aiResult?.title || fallbackTitle,
        body: content.trim(),
        tags: mergedTags,
        date: aiResult?.date || '',
      };

      const response = await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        alert(error?.error || '保存に失敗しました。');
        return;
      }

      setContent('');
    } catch (e) {
      console.error(e);
      alert('保存中にエラーが発生しました');
    } finally {
      setIsSaving(false);
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
