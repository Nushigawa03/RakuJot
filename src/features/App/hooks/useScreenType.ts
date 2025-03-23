import { useState, useEffect } from "react";

type ScreenType = "pc" | "tablet" | "smartphone" | "other";

const useScreenType = (): ScreenType => {
  const [screenType, setScreenType] = useState<ScreenType>("other");

  // PC判定用の関数
  const isPC = (): boolean => {
    if (navigator.userAgentData) {
      // userAgentData.mobileがfalseならPCと判定
      return !navigator.userAgentData.mobile;
    } else {
      // フォールバックとしてuserAgentを使用
      const userAgent = navigator.userAgent.toLowerCase();
      return !/mobile|android|iphone|ipad|tablet/.test(userAgent);
    }
  };

  useEffect(() => {
    const tabletMedia = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const smartphoneMedia = window.matchMedia("(max-width: 767px)");

    const updateScreenType = () => {
      if (isPC()) {
        setScreenType("pc");
      } else if (tabletMedia.matches) {
        setScreenType("tablet");
      } else if (smartphoneMedia.matches) {
        setScreenType("smartphone");
      } else {
        setScreenType("other");
      }
    };

    // 初期化
    updateScreenType();

    // リスナーを追加
    tabletMedia.addEventListener("change", updateScreenType);
    smartphoneMedia.addEventListener("change", updateScreenType);

    // クリーンアップ
    return () => {
      tabletMedia.removeEventListener("change", updateScreenType);
      smartphoneMedia.removeEventListener("change", updateScreenType);
    };
  }, []);

  return screenType;
};

export default useScreenType;