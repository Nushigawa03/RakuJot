import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, type LinksFunction } from "react-router";
import "./app.css";

export const links: LinksFunction = () => [
  { rel: "manifest", href: "/manifest.json" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
        <meta name="description" content="AIを搭載した高速メモ管理アプリケーション" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RakuJot" />
        <link rel="apple-touch-icon" href="/logo-light.png" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const details = notFound
    ? "ページが見つかりません。"
    : isRouteErrorResponse(error)
      ? error.statusText || "エラーが発生しました。"
      : import.meta.env.DEV && error instanceof Error ? error.message : "予期しないエラーが発生しました。";
  return (
    <main className="loading">
      <h1>{notFound ? "404" : "エラー"}</h1>
      <p>{details}</p>
      {import.meta.env.DEV && error instanceof Error && <pre className="error-stack">{error.stack}</pre>}
      <a className="btn btn--secondary" href="/app">ホームへ戻る</a>
    </main>
  );
}
