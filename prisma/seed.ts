import 'dotenv/config';
import prismaPackage from "@prisma/client";
const { PrismaClient } = prismaPackage;
import { PrismaPg } from "@prisma/adapter-pg";
// @ts-expect-error type definition missing
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 開発者ユーザー情報
const DEV_USER = {
    email: "dev@example.com",
    name: "Dev User",
    googleId: "dev-google-id",
};

// サンプルタグデータ
const SAMPLE_TAGS = [
    { name: "仕事", description: "仕事に関連するメモ" },
    { name: "重要", description: "重要なメモ" },
    { name: "アイデア", description: "アイデアに関するメモ" },
    { name: "プライベート", description: "プライベートなメモ。日記など" },
    { name: "TODO", description: "やるべきこと" },
];

// サンプルメモデータ
const SAMPLE_MEMOS = [
    {
        title: "重要な会議メモ",
        body: "来週の企画会議について\n- 新機能の提案\n- 予算確認\n- スケジュール調整",
        date: "2025-03-20",
        tagNames: ["仕事", "重要"],
    },
    {
        title: "旅行計画",
        body: "夏休みの旅行プラン\n- 宿泊先の予約\n- 観光地リスト\n- 持ち物チェック",
        date: "2024-spring",
        tagNames: ["プライベート"],
    },
    {
        title: "アプリ改善アイデア",
        body: "RakuJotの新機能案\n- タグ機能の強化\n- 検索機能の改善\n- UIの見直し",
        date: "2024",
        tagNames: ["アイデア", "TODO"],
    },
    {
        title: "明日の予定",
        body: "明日のスケジュール\n- 9:00 朝礼\n- 10:30 開発作業\n- 14:00 ミーティング",
        date: "2024-11-11",
        tagNames: ["仕事"],
    },
    {
        title: "読書ノート",
        body: "「プログラマが知るべき97のこと」\n- 良いコードの書き方\n- チーム開発のコツ\n- 継続的学習の重要性",
        date: "2023-winter",
        tagNames: ["重要", "アイデア"],
    },
];

// サンプルTagExpression（フィルタ・カテゴリ）データ
const SAMPLE_TAG_EXPRESSIONS = [
    {
        name: null,
        orTerms: [{ include: ["仕事"], exclude: [] }],
    },
    {
        name: null,
        orTerms: [
            { include: ["プライベート"], exclude: [] },
            { include: ["アイデア"], exclude: [] },
        ],
    },
    {
        name: null,
        orTerms: [{ include: ["アイデア"], exclude: ["TODO"] }],
    },
    {
        name: null,
        orTerms: [{ include: ["TODO"], exclude: [] }],
    },
    {
        name: "重要なアイデア",
        orTerms: [{ include: ["重要", "アイデア"], exclude: [] }],
        color: "#ff6b6b",
    },
    {
        name: "仕事関連",
        orTerms: [
            { include: ["仕事"], exclude: [] },
            { include: ["TODO"], exclude: ["プライベート"] },
        ],
        color: "#4ecdc4",
    },
];

async function main() {
    console.log("🌱 Seeding database...");

    // 1. 開発者ユーザーを作成または取得
    let user = await prisma.user.findUnique({
        where: { email: DEV_USER.email },
    });

    if (!user) {
        user = await prisma.user.create({
            data: DEV_USER,
        });
        console.log(`✅ Created dev user: ${user.email}`);
    } else {
        console.log(`ℹ️ Dev user already exists: ${user.email}`);
    }

    // 2. タグを作成
    const tagMap = new Map<string, string>(); // name -> id
    for (const tagData of SAMPLE_TAGS) {
        const existing = await prisma.tag.findFirst({
            where: { userId: user.id, name: tagData.name },
        });

        if (existing) {
            tagMap.set(tagData.name, existing.id);
            console.log(`ℹ️ Tag already exists: ${tagData.name}`);
        } else {
            const tag = await prisma.tag.create({
                data: {
                    userId: user.id,
                    name: tagData.name,
                    description: tagData.description,
                },
            });
            tagMap.set(tagData.name, tag.id);
            console.log(`✅ Created tag: ${tagData.name}`);
        }
    }

    // 3. メモを作成
    for (const memoData of SAMPLE_MEMOS) {
        const existing = await prisma.memo.findFirst({
            where: { userId: user.id, title: memoData.title },
        });

        if (existing) {
            console.log(`ℹ️ Memo already exists: ${memoData.title}`);
        } else {
            const tagIds = memoData.tagNames
                .map((name) => tagMap.get(name))
                .filter((id): id is string => id !== undefined);

            await prisma.memo.create({
                data: {
                    userId: user.id,
                    title: memoData.title,
                    body: memoData.body,
                    date: memoData.date,
                    tags: {
                        connect: tagIds.map((id) => ({ id })),
                    },
                },
            });
            console.log(`✅ Created memo: ${memoData.title}`);
        }
    }

    // 4. TagExpressionを作成（タグ名をタグIDに変換）
    // まず既存のTagExpressionを全て削除（壊れたデータをクリーンアップ）
    const deletedCount = await prisma.tagExpression.deleteMany({
        where: { userId: user.id },
    });
    if (deletedCount.count > 0) {
        console.log(`🗑️ Deleted ${deletedCount.count} existing TagExpressions`);
    }

    for (const exprData of SAMPLE_TAG_EXPRESSIONS) {
        const displayName = exprData.name || JSON.stringify(exprData.orTerms);

        // タグ名をタグIDに変換
        const convertedOrTerms = exprData.orTerms.map((term) => ({
            include: term.include
                .map((name) => tagMap.get(name))
                .filter((id): id is string => id !== undefined),
            exclude: term.exclude
                .map((name) => tagMap.get(name))
                .filter((id): id is string => id !== undefined),
        }));

        await prisma.tagExpression.create({
            data: {
                userId: user.id,
                orTerms: convertedOrTerms,
                name: exprData.name,
                color: exprData.color || null,
            },
        });
        console.log(`✅ Created TagExpression: ${displayName}`);
    }

    console.log("🌱 Seeding complete!");
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
