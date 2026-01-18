/**
 * セッション管理ユーティリティ
 * Cookie ベースでユーザーセッションを管理
 */

const SESSION_COOKIE_NAME = "rakujot_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * ユーザーセッションを作成（Cookie に userId を保存）
 */
export const createUserSession = (userId: string): string => {
    // 本番では JWT や暗号化を使用すべきだが、
    // 開発用途でシンプルに userId を Base64 エンコード
    const sessionData = JSON.stringify({ userId, createdAt: Date.now() });
    return Buffer.from(sessionData).toString("base64");
};

/**
 * セッション Cookie のヘッダーを生成
 */
export const getSessionCookieHeader = (sessionValue: string): string => {
    const isProduction = process.env.NODE_ENV === "production";
    const cookieParts = [
        `${SESSION_COOKIE_NAME}=${sessionValue}`,
        `Path=/`,
        `HttpOnly`,
        `SameSite=Lax`,
        `Max-Age=${SESSION_MAX_AGE}`,
    ];

    if (isProduction) {
        cookieParts.push("Secure");
    }

    return cookieParts.join("; ");
};

/**
 * リクエストからユーザー ID を取得
 */
export const getUserIdFromSession = (request: Request): string | null => {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return null;

    const cookies = parseCookies(cookieHeader);
    const sessionValue = cookies[SESSION_COOKIE_NAME];
    if (!sessionValue) return null;

    try {
        const sessionData = JSON.parse(
            Buffer.from(sessionValue, "base64").toString("utf-8")
        );
        return sessionData.userId || null;
    } catch {
        return null;
    }
};

/**
 * ログアウト用の Cookie クリアヘッダー
 */
export const getLogoutCookieHeader = (): string => {
    return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
};

/**
 * Cookie ヘッダーをパース
 */
const parseCookies = (cookieHeader: string): Record<string, string> => {
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((cookie) => {
        const [name, ...valueParts] = cookie.trim().split("=");
        if (name) {
            cookies[name] = valueParts.join("=");
        }
    });
    return cookies;
};
