import { MetaFunction } from "@remix-run/node";
import NotesPage from "~/features/notes/components/NotesPage";

export const meta: MetaFunction = () => {
  return [
    { title: "メモ - RakuJot" },
    { name: "description", content: "メモ一覧" },
  ];
};

export default NotesPage;