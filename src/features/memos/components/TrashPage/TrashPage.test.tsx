import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TrashPage from '../TrashPage';
import { memoService } from '../../../services/memoService';

// モックデータ
const mockTrashedMemos = [
    {
        id: 'trash-1',
        originalId: 'memo-1',
        title: 'テストメモ1',
        body: 'これはテストメモです',
        tagNames: ['test', 'trash'],
        date: '2026-01-01',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-05T00:00:00Z',
        deletedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5日前
    },
];

vi.mock('../../../services/memoService', () => ({
    memoService: {
        getTrashedMemos: vi.fn(),
        restoreMemo: vi.fn(),
        permanentlyDeleteMemo: vi.fn(),
    },
}));

describe('TrashPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ゴミ箱のメモ一覧を表示する', async () => {
        (memoService.getTrashedMemos as any).mockResolvedValue(mockTrashedMemos);

        render(<TrashPage />);

        await waitFor(() => {
            expect(screen.getByText('テストメモ1')).toBeInTheDocument();
        });

        expect(screen.getByText(/これはテストメモです/)).toBeInTheDocument();
        expect(screen.getByText('test')).toBeInTheDocument();
        expect(screen.getByText('trash')).toBeInTheDocument();
    });

    it('ゴミ箱が空の場合、空メッセージを表示する', async () => {
        (memoService.getTrashedMemos as any).mockResolvedValue([]);

        render(<TrashPage />);

        await waitFor(() => {
            expect(screen.getByText('ゴミ箱は空です')).toBeInTheDocument();
        });
    });

    it('復元ボタンをクリックするとメモが復元される', async () => {
        (memoService.getTrashedMemos as any).mockResolvedValue(mockTrashedMemos);
        (memoService.restoreMemo as any).mockResolvedValue({ ok: true });

        // window.alert をモック
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => { });

        render(<TrashPage />);

        await waitFor(() => {
            expect(screen.getByText('テストメモ1')).toBeInTheDocument();
        });

        const restoreButton = screen.getByText('復元');
        fireEvent.click(restoreButton);

        await waitFor(() => {
            expect(memoService.restoreMemo).toHaveBeenCalledWith('memo-1');
            expect(alertMock).toHaveBeenCalledWith('メモを復元しました');
        });

        alertMock.mockRestore();
    });

    it('完全削除ボタンをクリックすると確認後にメモが削除される', async () => {
        (memoService.getTrashedMemos as any).mockResolvedValue(mockTrashedMemos);
        (memoService.permanentlyDeleteMemo as any).mockResolvedValue({ ok: true });

        // window.confirm と window.alert をモック
        const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => { });

        render(<TrashPage />);

        await waitFor(() => {
            expect(screen.getByText('テストメモ1')).toBeInTheDocument();
        });

        const deleteButton = screen.getByText('完全削除');
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(confirmMock).toHaveBeenCalled();
            expect(memoService.permanentlyDeleteMemo).toHaveBeenCalledWith('trash-1');
            expect(alertMock).toHaveBeenCalledWith('メモを完全削除しました');
        });

        confirmMock.mockRestore();
        alertMock.mockRestore();
    });

    it('残り日数が正しく表示される', async () => {
        (memoService.getTrashedMemos as any).mockResolvedValue(mockTrashedMemos);

        render(<TrashPage />);

        await waitFor(() => {
            expect(screen.getByText(/残り 25 日/)).toBeInTheDocument();
        });
    });
});
