export type TrashedMemo = {
    id: string;
    originalId: string;
    title: string;
    date?: string | null;
    tagNames: string[];
    body?: string | null;
    embedding?: any;
    createdAt: string;
    updatedAt: string;
    deletedAt: string;
};
