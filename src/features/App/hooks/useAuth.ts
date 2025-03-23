import { useState, useEffect } from "react";

const useAuth = (): { isAuthenticated: boolean; loading: boolean } => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);

      if (typeof window !== "undefined") {
        const token = localStorage.getItem("authToken");
        setIsAuthenticated(!!token);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  return { isAuthenticated, loading };
};

export default useAuth;