import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TrashPage from './TrashPage';
import { memoService } from '../../services/memoService';

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
}));


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

vi.mock('../../services/memoService', () => ({
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
        });

        alertMock.mockRestore();
    });

    it('完全削除ボタンをクリックすると確認後にメモが削除される', async () => {
        (memoService.getTrashedMemos as any).mockResolvedValue(mockTrashedMemos);
        (memoService.permanentlyDeleteMemo as any).mockResolvedValue({ ok: true });

        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => { });

        render(<TrashPage />);

        await waitFor(() => {
            expect(screen.getByText('テストメモ1')).toBeInTheDocument();
        });

        const deleteButton = screen.getByText('完全削除');
        fireEvent.click(deleteButton);

        // ConfirmModalが表示されるのを待つ
        await waitFor(() => {
            expect(screen.getByText('メモの完全削除')).toBeInTheDocument();
        });

        // モーダル内の「削除する」ボタンをクリック
        const confirmButton = screen.getByRole('button', { name: '削除する' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(memoService.permanentlyDeleteMemo).toHaveBeenCalledWith('trash-1');
            // expect(alertMock).toHaveBeenCalledWith('メモを完全削除しました'); // removed from implementation
        });

        alertMock.mockRestore();
    });

    it('残り日数が正しく表示される', async () => {
        (memoService.getTrashedMemos as any).mockResolvedValue(mockTrashedMemos);

        render(<TrashPage />);

        await waitFor(() => {
            expect(screen.getByText(/残り 25 日/)).toBeInTheDocument();
        });
    });

    it('戻るボタンをクリックすると前のページに戻る', async () => {
        (memoService.getTrashedMemos as any).mockResolvedValue(mockTrashedMemos);

        render(<TrashPage />);

        await waitFor(() => {
            expect(screen.getByText('ゴミ箱を空にする')).toBeInTheDocument();
        });

        const backButton = screen.getByRole('button', { name: '戻る' });
        fireEvent.click(backButton);

        expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('ゴミ箱を空にするボタンで一括削除される', async () => {
        const twoMemos = [
            ...mockTrashedMemos,
            { ...mockTrashedMemos[0], id: 'trash-2', originalId: 'memo-2' }
        ];
        (memoService.getTrashedMemos as any).mockResolvedValue(twoMemos);
        (memoService.permanentlyDeleteMemo as any).mockResolvedValue({ ok: true });

        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => { });

        render(<TrashPage />);

        await waitFor(() => {
            expect(screen.getByText('ゴミ箱を空にする')).toBeInTheDocument();
        });

        const emptyButton = screen.getByText('ゴミ箱を空にする');
        fireEvent.click(emptyButton);

        // ConfirmModalが表示されるのを待つ
        await waitFor(() => {
            expect(screen.getByText('ゴミ箱を空にする', { selector: 'h2' })).toBeInTheDocument();
        });

        // モーダル内の「削除する」ボタンをクリック
        const confirmButton = screen.getByRole('button', { name: '削除する' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(memoService.permanentlyDeleteMemo).toHaveBeenCalledWith('trash-1');
            expect(memoService.permanentlyDeleteMemo).toHaveBeenCalledWith('trash-2');
        });

        alertMock.mockRestore();
    });
});
