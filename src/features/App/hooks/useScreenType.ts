import { useLayoutEffect, useState } from "react";

type ScreenType = "pc" | "tablet" | "smartphone" | "other";

const useScreenType = (): ScreenType | null => {
  const getScreenType = (): ScreenType => {
    if (typeof window === "undefined") return "other";

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

    const tabletMedia = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const smartphoneMedia = window.matchMedia("(max-width: 767px)");

    if (isPC()) return "pc";
    if (smartphoneMedia.matches) return "smartphone";
    if (tabletMedia.matches) return "tablet";
    return "other";
  };

  // SSR時は判定できないのでnullで返し、クライアント初回レイアウト前に確定させる
  const [screenType, setScreenType] = useState<ScreenType | null>(() =>
    typeof window === "undefined" ? null : getScreenType(),
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const tabletMedia = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const smartphoneMedia = window.matchMedia("(max-width: 767px)");

    const updateScreenType = () => setScreenType(getScreenType());

    // 初期化: hydration後の初回ペイント前に判定することでPC/スマホのちらつきを抑える
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