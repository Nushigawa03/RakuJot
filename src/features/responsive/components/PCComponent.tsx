import useAuth from "../../App/hooks/useAuth";

const PCComponent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>; // 認証状態を確認中のローディング表示
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4 border rounded shadow">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p>You must be logged in to view this content.</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded shadow">
      <h2 className="text-xl font-semibold">PC View</h2>
      <p>This is the layout optimized for PC screens.</p>
    </div>
  );
};

export default PCComponent;