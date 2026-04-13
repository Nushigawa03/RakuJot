import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock はホイスティングされるため、vi.hoisted() でモックを定義
const mockPrisma = vi.hoisted(() => ({
    user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock('~/db.server', () => ({
    prisma: mockPrisma,
}));

// モック後にインポート
import {
    findUserByEmail,
    findUserByGoogleId,
    createUser,
    findOrCreateUserByEmail,
    getUserSettings,
    syncGoogleUser,
    updateUserSettings,
} from './user.server';

describe('user.server', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('findUserByEmail', () => {
        it('メールアドレスでユーザーを検索する', async () => {
            const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
            mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

            const user = await findUserByEmail('test@example.com');

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    picture: true,
                    googleId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            expect(user).toEqual(mockUser);
        });

        it('ユーザーが見つからない場合は null を返す', async () => {
            mockPrisma.user.findUnique.mockResolvedValueOnce(null);

            const user = await findUserByEmail('notfound@example.com');

            expect(user).toBeNull();
        });

        it('エラー時は null を返す', async () => {
            mockPrisma.user.findUnique.mockRejectedValueOnce(new Error('DB Error'));

            const user = await findUserByEmail('test@example.com');

            expect(user).toBeNull();
        });
    });

    describe('findUserByGoogleId', () => {
        it('Google IDでユーザーを検索する', async () => {
            const mockUser = { id: '1', googleId: 'google-123', email: 'test@example.com' };
            mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

            const user = await findUserByGoogleId('google-123');

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { googleId: 'google-123' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    picture: true,
                    googleId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            expect(user).toEqual(mockUser);
        });
    });

    describe('createUser', () => {
        it('新しいユーザーを作成する', async () => {
            const newUser = {
                id: '1',
                email: 'new@example.com',
                name: 'New User',
                googleId: 'google-456',
            };
            mockPrisma.user.create.mockResolvedValueOnce(newUser);

            const user = await createUser({
                email: 'new@example.com',
                name: 'New User',
                googleId: 'google-456',
            });

            expect(mockPrisma.user.create).toHaveBeenCalledWith({
                data: {
                    email: 'new@example.com',
                    name: 'New User',
                    googleId: 'google-456',
                    picture: undefined,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    picture: true,
                    googleId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            expect(user).toEqual(newUser);
        });

        it('エラー時は例外をスローする', async () => {
            mockPrisma.user.create.mockRejectedValueOnce(new Error('Duplicate email'));

            await expect(createUser({
                email: 'test@example.com',
                googleId: 'google-789',
            })).rejects.toThrow('Duplicate email');
        });
    });

    describe('findOrCreateUserByEmail', () => {
        it('既存ユーザーが見つかる場合はそれを返す', async () => {
            const existingUser = { id: '1', email: 'existing@example.com' };
            mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);

            const user = await findOrCreateUserByEmail({
                email: 'existing@example.com',
                googleId: 'google-123',
            });

            expect(mockPrisma.user.findUnique).toHaveBeenCalled();
            expect(mockPrisma.user.create).not.toHaveBeenCalled();
            expect(user).toEqual(existingUser);
        });

        it('ユーザーが見つからない場合は新規作成する', async () => {
            const newUser = { id: '2', email: 'new@example.com', googleId: 'google-456' };
            mockPrisma.user.findUnique.mockResolvedValueOnce(null);
            mockPrisma.user.create.mockResolvedValueOnce(newUser);

            const user = await findOrCreateUserByEmail({
                email: 'new@example.com',
                googleId: 'google-456',
            });

            expect(mockPrisma.user.findUnique).toHaveBeenCalled();
            expect(mockPrisma.user.create).toHaveBeenCalled();
            expect(user).toEqual(newUser);
        });
    });

    describe('getUserSettings', () => {
        it('保存済みの設定を返す', async () => {
            mockPrisma.user.findUnique.mockResolvedValueOnce({
                settings: { aiUsageEnabled: false },
            });

            const result = await getUserSettings('user-1');

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                select: { settings: true },
            });
            expect(result).toEqual({
                settings: { aiUsageEnabled: false, detailSearchAlwaysVisible: false },
                hasStoredSettings: true,
            });
        });

        it('設定がない場合はデフォルトを返す', async () => {
            mockPrisma.user.findUnique.mockResolvedValueOnce({ settings: null });

            const result = await getUserSettings('user-1');

            expect(result).toEqual({
                settings: { aiUsageEnabled: true, detailSearchAlwaysVisible: false },
                hasStoredSettings: false,
            });
        });
    });

    describe('updateUserSettings', () => {
        it('既存設定にパッチをマージして保存する', async () => {
            mockPrisma.user.findUnique.mockResolvedValueOnce({
                settings: { aiUsageEnabled: true },
            });
            mockPrisma.user.update.mockResolvedValueOnce({
                settings: { aiUsageEnabled: false },
            });

            const result = await updateUserSettings('user-1', {
                aiUsageEnabled: false,
            });

            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: {
                    settings: { aiUsageEnabled: false, detailSearchAlwaysVisible: false },
                },
                select: { settings: true },
            });
            expect(result).toEqual({ aiUsageEnabled: false, detailSearchAlwaysVisible: false });
        });
    });

    describe('syncGoogleUser', () => {
        it('Google IDが既存ならプロフィールを更新する', async () => {
            mockPrisma.user.findUnique.mockResolvedValueOnce({
                id: '1',
                googleId: 'google-123',
                email: 'test@example.com',
            });
            mockPrisma.user.update.mockResolvedValueOnce({
                id: '1',
                googleId: 'google-123',
                email: 'updated@example.com',
                name: 'Updated User',
                picture: 'https://example.com/avatar.png',
            });

            const user = await syncGoogleUser({
                email: 'updated@example.com',
                name: 'Updated User',
                googleId: 'google-123',
                picture: 'https://example.com/avatar.png',
            });

            expect(user).toEqual({
                id: '1',
                googleId: 'google-123',
                email: 'updated@example.com',
                name: 'Updated User',
                picture: 'https://example.com/avatar.png',
            });
        });
    });
});
