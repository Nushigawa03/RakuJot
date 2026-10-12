import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TagSettingsModal from './TagSettingsModal';
import { expressionService } from '../services/tagService';

const tags = ['A', 'B', 'C', 'D'].map((name) => ({ id: name.toLowerCase(), name, _syncStatus: 'synced' }));

vi.mock('../hooks/useLocalData', () => ({
  useTags: () => tags,
  useExpressions: () => [],
  useTagNameOf: () => (id: string) => id.toUpperCase(),
}));
vi.mock('../services/tagService', () => ({
  tagService: {},
  expressionService: { create: vi.fn(async () => {}), update: vi.fn(), delete: vi.fn() },
}));

const addTag = (input: HTMLElement, name: string) => {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: name } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('TagSettingsModal 分類', () => {
  beforeEach(() => vi.clearAllMocks());

  it('横に並べたタグは AND、「または」で行を分け、チップの NOT ボタンで除外にできる', async () => {
    render(<TagSettingsModal onClose={() => {}} initialTab="expressions" />);
    fireEvent.click(screen.getByRole('button', { name: /分類を作成/ }));
    fireEvent.change(screen.getByLabelText('分類名'), { target: { value: '仕事' } });

    addTag(screen.getByPlaceholderText('タグを追加'), 'A');
    addTag(screen.getByPlaceholderText('タグを追加'), 'B');
    fireEvent.click(screen.getByRole('button', { name: /または/ }));
    addTag(screen.getAllByPlaceholderText('タグを追加')[1], 'C');
    addTag(screen.getAllByPlaceholderText('タグを追加')[1], 'D');
    const notD = screen.getByRole('button', { name: 'Dを NOT にする' });
    fireEvent.click(notD);
    expect(notD).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await vi.waitFor(() => expect(expressionService.create).toHaveBeenCalled());
    expect(expressionService.create).toHaveBeenCalledWith({
      name: '仕事',
      color: null,
      orTerms: [
        { include: ['a', 'b'], exclude: [] },
        { include: ['c'], exclude: ['d'] },
      ],
    });
  });

  it('「-タグ名」と入力すると NOT 付きで追加する', () => {
    render(<TagSettingsModal onClose={() => {}} initialTab="expressions" />);
    fireEvent.click(screen.getByRole('button', { name: /分類を作成/ }));
    addTag(screen.getByPlaceholderText('タグを追加'), '-B');
    expect(screen.getByRole('button', { name: 'Bを NOT にする' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('最後の行が空なら「または」は押せない', () => {
    render(<TagSettingsModal onClose={() => {}} initialTab="expressions" />);
    fireEvent.click(screen.getByRole('button', { name: /分類を作成/ }));
    expect(screen.getByRole('button', { name: /または/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
  });
});
