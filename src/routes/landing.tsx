import { Link, redirect } from "react-router";
import { Icon } from "~/components";
import type { LoaderFunction, MetaFunction } from "react-router";
import { getCurrentUser } from "~/features/auth/utils/authMode.server";

export const loader: LoaderFunction = async ({ request }) => {
  const currentUser = await getCurrentUser(request);
  if (currentUser) {
    throw redirect('/app');
  }

  return null;
};

export const meta: MetaFunction = () => {
  return [
    { title: "RakuJot - 思考を整理する、AIメモアプリ" },
    { name: "description", content: "思いついたことをすぐに記録。タグで整理、AIで発見。あなたの第二の脳、RakuJot。" },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* ヘッダー */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Icon name="pen-tool" className="text-5xl" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">RakuJot</span>
          </div>
          <Link 
            to="/login" 
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            ログイン
          </Link>
        </nav>
      </header>

      {/* ヒーローセクション */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            思考を整理する、<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">AIメモアプリ</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            思いついたことをすぐに記録。タグで整理、AIで発見。<br />
            あなたの第二の脳、RakuJot。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/login" 
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Googleで始める
            </Link>
          </div>
        </div>

        {/* 特徴セクション */}
        <div className="mt-32 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
              <Icon name="zap" className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">瞬速メモ</h3>
            <p className="text-gray-600 dark:text-gray-300">
              思いついた瞬間にメモ。シンプルなUIで、考えを妨げません。
            </p>
          </div>

          <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
              <Icon name="tag" className="text-2xl text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">スマートタグ</h3>
            <p className="text-gray-600 dark:text-gray-300">
              タグで整理、タグ式で検索。あなた独自の知識ベースを構築。
            </p>
          </div>

          <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
              <Icon name="lightbulb" className="text-2xl text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AI推薦</h3>
            <p className="text-gray-600 dark:text-gray-300">
              AIが関連するメモを発見。忘れていた気づきと再会できます。
            </p>
          </div>
        </div>

        {/* CTAセクション */}
        <div className="mt-32 text-center max-w-3xl mx-auto p-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            思考を止めない、記録しよう
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            今すぐRakuJotで、あなたのアイデアを整理し始めましょう
          </p>
          <Link 
            to="/login" 
            className="inline-block px-8 py-4 bg-white hover:bg-gray-100 text-blue-600 rounded-lg font-bold text-lg transition-colors shadow-lg"
          >
            ログインして始める
          </Link>
        </div>
      </main>

      {/* フッター */}
      <footer className="container mx-auto px-4 py-12 mt-32 border-t border-gray-200 dark:border-gray-800">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2025 RakuJot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}