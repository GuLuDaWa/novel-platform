import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-brand-600">
          墨海
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-700 hover:text-brand-600 transition">
            首页
          </Link>

          {user ? (
            <>
              {(user.role === "AUTHOR" || user.role === "ADMIN") && (
                <Link to="/author/novels" className="text-gray-700 hover:text-brand-600 transition">
                  作者中心
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link to="/admin" className="text-gray-700 hover:text-brand-600 transition">
                  管理后台
                </Link>
              )}
              <Link to="/profile" className="text-gray-700 hover:text-brand-600 transition">
                个人中心
              </Link>
              <span className="text-gray-600">{user.username}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-700 hover:text-brand-600 transition">
                登录
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
