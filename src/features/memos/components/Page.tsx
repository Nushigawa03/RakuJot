import React from "react";
import useScreenType from "../../App/hooks/useScreenType";
import PagePC from "./PagePC";
import PageMobile from "./PageMobile";

const Page: React.FC = () => {
  const screenType = useScreenType();
  if (!screenType) return null; // 判定が付くまで描画を遅延してちらつきを防止

  // スマホ判定のみ PC とそれ以外で分岐（必要なら tablet も分ける）
  return screenType === "smartphone" ? <PageMobile /> : <PagePC />;
};

export default Page;