import { login, logout, isLoggedIn } from "../utils/AuthManager";
import { useState } from "react";
import DarkModeToggle from "./DarkModeToggle";

const AuthButtons = () => {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  const handleLogin = () => {
    login("dummyToken"); // ダミートークンを設定
    setLoggedIn(true);
  };

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
  };

  return (
    <div className="flex space-x-4 items-center">
      <DarkModeToggle />
      {loggedIn ? (
        <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded">
          Logout
        </button>
      ) : (
        <button onClick={handleLogin} className="px-4 py-2 bg-blue-500 text-white rounded">
          Login
        </button>
      )}
    </div>
  );
};

export default AuthButtons;