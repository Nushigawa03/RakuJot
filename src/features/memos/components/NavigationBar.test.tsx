import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NavigationBar from './NavigationBar';
import { getSearchState, searchActions } from '../searchStore';

vi.mock('../hooks/useLocalData', () => ({
  useTags: () => [{ id: '1', name: 'Work', _syncStatus: 'synced' }],
}));
vi.mock('~/features/sync/SyncStatusIndicator', () => ({ SyncStatusIndicator: () => null }));
vi.mock('~/features/auth/components/UserMenu', () => ({ UserAvatarButton: () => null }));
vi.mock('~/features/settings/useSettings', () => ({ useSettings: () => ({ settings: { detailSearchAlwaysVisible: false } }) }));

describe('NavigationBar', () => {
  beforeEach(() => searchActions.clear());

  it('検索欄を表示する', () => {
    render(<NavigationBar />);
    expect(screen.getByPlaceholderText('さがす...')).toBeInTheDocument();
  });

  it('Enter で検索を実行し、タグと残りのテキストを適用する', () => {
    render(<NavigationBar />);
    const input = screen.getByPlaceholderText('さがす...');
    fireEvent.change(input, { target: { value: 'Work 会議' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(getSearchState().textQuery).toBe('会議');
    expect(getSearchState().tags.map((t) => t.name)).toEqual(['Work']);
    expect(screen.getByText('Work')).toBeInTheDocument(); // 検索欄のタグチップ
  });

  it('🔍 ボタンでも検索できる', () => {
    render(<NavigationBar />);
    fireEvent.change(screen.getByPlaceholderText('さがす...'), { target: { value: 'メモ' } });
    fireEvent.click(screen.getByRole('button', { name: '検索' }));
    expect(getSearchState().textQuery).toBe('メモ');
  });

  it('入力中の N キーでは新規メモを開かない', () => {
    render(<NavigationBar />);
    const input = screen.getByPlaceholderText('さがす...');
    fireEvent.keyDown(input, { key: 'n' });
    expect(screen.queryByText('新規メモ作成')).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'n' });
    expect(screen.getByText('新規メモ作成')).toBeInTheDocument();
  });
});
