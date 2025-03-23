export const login = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", token);
  }
};

export const logout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
  }
};

export const isLoggedIn = (): boolean => {
  if (typeof window !== "undefined") {
    return !!localStorage.getItem("authToken");
  }
  return false; // サーバーサイドでは未ログインとみなす
};