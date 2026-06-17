import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
    user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    account: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock('~/db.server', () => ({
    prisma: mockPrisma,
}));

import {
    findUserByEmail,
    findUserByAccount,
    createUser,
    findOrCreateUserByEmail,
    getUserSettings,
    syncDevUser,
    syncGoogleUser,
    updateUserSettings,
} from './user.server';

const coreUserSelect = {
    id: true,
    email: true,
    name: true,
    picture: true,
    createdAt: true,
    updatedAt: true,
};

describe('user.server', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('findUserByEmail', () => {
        it('メールアドレスでユーザーを検索する', async () => {
            const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
            mockPrisma.user.findFirst.mockResolvedValueOnce(mockUser);

            const user = await findUserByEmail('test@example.com');

            expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
                select: coreUserSelect,
            });
            expect(user).toEqual(mockUser);
        });

        it('ユーザーが見つからない場合は null を返す', async () => {
            mockPrisma.user.findFirst.mockResolvedValueOnce(null);

            const user = await findUserByEmail('notfound@example.com');

            expect(user).toBeNull();
        });

        it('エラー時は null を返す', async () => {
            mockPrisma.user.findFirst.mockRejectedValueOnce(new Error('DB Error'));

            const user = await findUserByEmail('test@example.com');

            expect(user).toBeNull();
        });
    });

    describe('findUserByAccount', () => {
        it('外部アカウントでユーザーを検索する', async () => {
            const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
            mockPrisma.account.findUnique.mockResolvedValueOnce({ user: mockUser });

            const user = await findUserByAccount('google', 'google-123');

            expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
                where: {
                    provider_providerAccountId: {
                        provider: 'google',
                        providerAccountId: 'google-123',
                    },
                },
                select: {
                    user: {
                        select: coreUserSelect,
                    },
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
            };
            mockPrisma.user.create.mockResolvedValueOnce(newUser);

            const user = await createUser({
                email: 'new@example.com',
                name: 'New User',
            });

            expect(mockPrisma.user.create).toHaveBeenCalledWith({
                data: {
                    email: 'new@example.com',
                    name: 'New User',
                    picture: undefined,
                },
                select: coreUserSelect,
            });
            expect(user).toEqual(newUser);
        });

        it('エラー時は例外をスローする', async () => {
            mockPrisma.user.create.mockRejectedValueOnce(new Error('DB Error'));

            await expect(createUser({
                email: 'test@example.com',
            })).rejects.toThrow('DB Error');
        });
    });

    describe('findOrCreateUserByEmail', () => {
        it('既存ユーザーが見つかる場合はそれを返す', async () => {
            const existingUser = { id: '1', email: 'existing@example.com' };
            mockPrisma.user.findFirst.mockResolvedValueOnce(existingUser);

            const user = await findOrCreateUserByEmail({
                email: 'existing@example.com',
            });

            expect(mockPrisma.user.findFirst).toHaveBeenCalled();
            expect(mockPrisma.user.create).not.toHaveBeenCalled();
            expect(user).toEqual(existingUser);
        });

        it('ユーザーが見つからない場合は新規作成する', async () => {
            const newUser = { id: '2', email: 'new@example.com' };
            mockPrisma.user.findFirst.mockResolvedValueOnce(null);
            mockPrisma.user.create.mockResolvedValueOnce(newUser);

            const user = await findOrCreateUserByEmail({
                email: 'new@example.com',
            });

            expect(mockPrisma.user.findFirst).toHaveBeenCalled();
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
        it('Google アカウントが既存ならプロフィールを更新する', async () => {
            mockPrisma.account.findUnique.mockResolvedValueOnce({
                id: 'account-1',
                userId: 'user-1',
            });
            mockPrisma.account.update.mockResolvedValueOnce({});
            mockPrisma.user.update.mockResolvedValueOnce({
                id: 'user-1',
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

            expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
                where: {
                    provider_providerAccountId: {
                        provider: 'google',
                        providerAccountId: 'google-123',
                    },
                },
                select: { id: true, userId: true },
            });
            expect(mockPrisma.account.update).toHaveBeenCalledWith({
                where: { id: 'account-1' },
                data: {
                    email: 'updated@example.com',
                    emailVerified: true,
                    name: 'Updated User',
                    picture: 'https://example.com/avatar.png',
                },
            });
            expect(user).toEqual({
                id: 'user-1',
                email: 'updated@example.com',
                name: 'Updated User',
                picture: 'https://example.com/avatar.png',
            });
        });

        it('Google アカウントがなければユーザーとアカウントを作成する', async () => {
            mockPrisma.account.findUnique.mockResolvedValueOnce(null);
            mockPrisma.user.create.mockResolvedValueOnce({
                id: 'user-2',
                email: 'new@example.com',
                name: 'New User',
            });

            const user = await syncGoogleUser({
                email: 'new@example.com',
                name: 'New User',
                googleId: 'google-456',
            });

            expect(mockPrisma.user.create).toHaveBeenCalledWith({
                data: {
                    email: 'new@example.com',
                    name: 'New User',
                    picture: null,
                    accounts: {
                        create: {
                            provider: 'google',
                            providerAccountId: 'google-456',
                            email: 'new@example.com',
                            emailVerified: true,
                            name: 'New User',
                            picture: null,
                        },
                    },
                },
                select: coreUserSelect,
            });
            expect(user).toEqual({
                id: 'user-2',
                email: 'new@example.com',
                name: 'New User',
            });
        });
    });

    describe('syncDevUser', () => {
        it('dev アカウントがない既存ユーザーには dev アカウントを追加する', async () => {
            const existingUser = {
                id: 'user-1',
                email: 'dev@example.com',
                name: 'Dev User',
            };
            mockPrisma.account.findUnique.mockResolvedValueOnce(null);
            mockPrisma.user.findFirst.mockResolvedValueOnce(existingUser);
            mockPrisma.account.create.mockResolvedValueOnce({});
            mockPrisma.user.update.mockResolvedValueOnce(existingUser);

            const user = await syncDevUser({
                email: 'dev@example.com',
                name: 'Dev User',
                accountId: 'dev-google-id',
            });

            expect(mockPrisma.account.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-1',
                    provider: 'dev',
                    providerAccountId: 'dev-google-id',
                    email: 'dev@example.com',
                    emailVerified: true,
                    name: 'Dev User',
                    picture: null,
                },
            });
            expect(user).toEqual(existingUser);
        });
    });
});
