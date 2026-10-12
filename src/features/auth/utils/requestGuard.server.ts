/**
 * CSRF 対策: 状態を変えるリクエストが自サイトから送られたものか確認する
 * （SameSite=Lax Cookie に加えた多層防御）
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const forbidden = () => new Response("Forbidden", { status: 403 });

export const assertSameOrigin = (request: Request): void => {
    if (SAFE_METHODS.has(request.method.toUpperCase())) return;

    // モダンブラウザは Sec-Fetch-Site を付ける。別サイトからのリクエストは拒否
    const fetchSite = request.headers.get("Sec-Fetch-Site");
    if (fetchSite) {
        if (fetchSite !== "same-origin" && fetchSite !== "none") throw forbidden();
        return;
    }

    // 古いブラウザ向け: Origin のホストがリクエスト先と一致するか
    const origin = request.headers.get("Origin");
    if (!origin) return;
    try {
        if (new URL(origin).host !== new URL(request.url).host) throw forbidden();
    } catch (error) {
        if (error instanceof Response) throw error;
        throw forbidden();
    }
};
