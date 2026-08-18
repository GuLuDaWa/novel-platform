import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import NovelDetail from "./pages/NovelDetail";
import AuthorNovels from "./pages/AuthorNovels";
import AuthorChapters from "./pages/AuthorChapters";
import AdminPanel from "./pages/AdminPanel";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 text-lg">加载中...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 text-lg">无权访问该页面</div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/novel/:id" element={<NovelDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/author"
            element={
              <ProtectedRoute roles={["AUTHOR", "ADMIN"]}>
                <Navigate to="/author/novels" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/author/novels"
            element={
              <ProtectedRoute roles={["AUTHOR", "ADMIN"]}>
                <AuthorNovels />
              </ProtectedRoute>
            }
          />
          <Route
            path="/author/novels/:id/chapters"
            element={
              <ProtectedRoute roles={["AUTHOR", "ADMIN"]}>
                <AuthorChapters />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
