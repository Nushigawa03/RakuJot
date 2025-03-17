import { MetaFunction } from "@remix-run/node";
import { NoteList } from "~/features/notes/components/NoteList";

export const meta: MetaFunction = () => {
  return [
    { title: "メモ - RakuJot" },
    { name: "description", content: "メモ一覧" },
  ];
};

export default function NotesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">メモ</h1>
        <p className="text-gray-600 mt-2">メモを作成・管理できます</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <NoteList />
      </div>
    </div>
  );
}