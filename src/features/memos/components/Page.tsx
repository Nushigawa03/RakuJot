import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { LocalMemo } from '~/features/sync/localDb';
import { useTagNameOf } from '../hooks/useLocalData';
import { searchActions, useSearch } from '../searchStore';
import NavigationBar from './NavigationBar';
import MemoList from './MemoList';
import { FilterPills, Sidebar } from './Sidebar';
import { QuickMemoInput } from './MemoInputs';

const MOBILE_QUERY = '(max-width: 767px)';

/** 幅で PC / スマホのレイアウトを切り替える（判定前は描画しない＝ちらつき防止） */
const Page = () => {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  if (mobile === null) return null;
  return mobile ? <PageMobile /> : <PagePC />;
};

export default Page;

// ─── PC ──────────────────────────────────────────────
const PagePC = () => {
  const [hovered, setHovered] = useState<LocalMemo | null>(null);
  return (
    <div className="page-pc">
      <header className="page-pc__header"><NavigationBar /></header>
      <aside className="page-pc__sidebar"><Sidebar /></aside>
      <main className="page-pc__main"><MemoList onHover={setHovered} /></main>
      <aside className="page-pc__preview"><MemoPreview memo={hovered} /></aside>
      <footer className="page-pc__footer"><QuickMemoInput /></footer>
    </div>
  );
};

const MemoPreview = ({ memo }: { memo: LocalMemo | null }) => {
  const nameOf = useTagNameOf();
  if (!memo) {
    return <div className="preview preview--empty" aria-hidden="true">📝</div>;
  }
  return (
    <div className="preview">
      <h2>{memo.title}</h2>
      {memo.date && <div className="muted">{memo.date}</div>}
      {memo.tags.length > 0 && <div className="tags">{memo.tags.map((id) => <span key={id} className="tag">{nameOf(id)}</span>)}</div>}
      <div className="preview__body">{memo.body}</div>
    </div>
  );
};

// ─── スマホ ──────────────────────────────────────────
/**
 * 入力画面（前面）をドラッグ・タップで下げるとメモ一覧（背面）が見える。
 * offset: 0 = 入力画面を全面表示, 1 = 一覧を表示
 */
let lastOffset = 0; // 編集画面から戻ったときに直前の表示を復元する

const PageMobile = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(lastOffset);
  const drag = useRef<{ startY: number; startOffset: number; moved: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { revision } = useSearch();

  // 検索を実行したら一覧を表示する（マウント時は直前の表示を保つ）
  const mountedRevision = useRef(revision);
  useEffect(() => { if (revision !== mountedRevision.current) setOffset(1); }, [revision]);
  useEffect(() => { lastOffset = offset; }, [offset]);

  // ソフトウェアキーボードの高さを CSS 変数に反映する
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () =>
      document.documentElement.style.setProperty('--kbd-height', `${vv ? Math.max(0, window.innerHeight - vv.height) : 0}px`);
    update();
    vv?.addEventListener('resize', update);
    window.addEventListener('focusin', update);
    window.addEventListener('focusout', update);
    return () => {
      vv?.removeEventListener('resize', update);
      window.removeEventListener('focusin', update);
      window.removeEventListener('focusout', update);
      document.documentElement.style.setProperty('--kbd-height', '0px');
    };
  }, []);

  useEffect(() => {
    if (!tracking) return;
    const move = (y: number) => {
      const d = drag.current;
      const height = containerRef.current?.clientHeight;
      if (!d || !height) return;
      const next = Math.min(1, Math.max(0, d.startOffset + (y - d.startY) / height));
      d.moved = Math.max(d.moved, Math.abs(next - d.startOffset));
      // タップや指の小さな揺れでは transition を無効にしない。
      if (d.moved < 0.01) return;
      setDragging(true);
      setOffset(next);
    };
    const end = () => {
      const d = drag.current;
      drag.current = null;
      setTracking(false);
      setDragging(false);
      // ほとんど動いていなければタップとして一覧を開く。ドラッグなら 20% 以上で下に吸着
      setOffset((current) => (d && d.moved < 0.01 ? (d.startOffset < 0.5 ? 1 : current) : current > 0.2 ? 1 : 0));
    };
    const onMouseMove = (e: MouseEvent) => move(e.clientY);
    const onTouchMove = (e: TouchEvent) => e.touches.length === 1 && move(e.touches[0].clientY);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', end);
    };
  }, [tracking]);

  const startDrag = (y: number) => {
    drag.current = { startY: y, startOffset: offset, moved: 0 };
    setTracking(true);
  };

  const backToInput = () => {
    setOffset(0);
    searchActions.clear();
  };

  return (
    <div className="page-mobile" ref={containerRef}>
      <div className="page-mobile__list">
        <header><NavigationBar variant="mobile" onBack={backToInput} /></header>
        <main>
          <FilterPills />
          <MemoList />
        </main>
        <footer><QuickMemoInput /></footer>
      </div>

      <div
        className={`page-mobile__overlay ${dragging ? 'is-dragging' : ''} ${tracking || offset > 0 ? 'is-active' : ''}`}
        style={{ '--offset': offset } as CSSProperties}
        aria-hidden={offset === 1}
      >
        <div
          className="page-mobile__handle"
          onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientY); }}
          onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); if (e.touches.length === 1) startDrag(e.touches[0].clientY); }}
        >
          <span className="page-mobile__grip" />
          メモ一覧
        </div>
        <QuickMemoInput fullScreen />
      </div>
    </div>
  );
};
