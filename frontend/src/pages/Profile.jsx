import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { authAPI, applicationAPI, favoriteAPI } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState("info");

  // 资料编辑
  const [profileForm, setProfileForm] = useState({ avatar: "", bio: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  // 作者申请
  const [reason, setReason] = useState("");
  const [applying, setApplying] = useState(false);
  const [latestApp, setLatestApp] = useState(null);
  const [myApps, setMyApps] = useState([]);
  const [appMsg, setAppMsg] = useState({ type: "", text: "" });

  // 收藏列表
  const [favorites, setFavorites] = useState([]);

  const fetchLatestApp = useCallback(async () => {
    try {
      const res = await applicationAPI.myLatest();
      setLatestApp(res.data.application);
    } catch (err) {
      console.error("获取申请状态失败", err);
    }
  }, []);

  const fetchMyApps = useCallback(async () => {
    try {
      const res = await applicationAPI.myApplications();
      setMyApps(res.data.applications);
    } catch (err) {
      console.error("获取申请记录失败", err);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await favoriteAPI.myFavorites();
      setFavorites(res.data.favorites);
    } catch (err) {
      console.error("获取收藏失败", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm({ avatar: user.avatar || "", bio: user.bio || "" });
      fetchLatestApp();
      fetchMyApps();
      fetchFavorites();
    }
  }, [user, fetchLatestApp, fetchMyApps, fetchFavorites]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg({ type: "", text: "" });
    try {
      const res = await authAPI.updateProfile({
        avatar: profileForm.avatar,
        bio: profileForm.bio,
      });
      setUser(res.data.user);
      setProfileMsg({ type: "success", text: "个人资料已更新" });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.error || "更新失败" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setApplying(true);
    setAppMsg({ type: "", text: "" });
    try {
      await applicationAPI.apply({ reason });
      setReason("");
      setAppMsg({ type: "success", text: "申请已提交，请等待管理员审核" });
      fetchLatestApp();
      fetchMyApps();
    } catch (err) {
      setAppMsg({ type: "error", text: err.response?.data?.error || "提交申请失败" });
    } finally {
      setApplying(false);
    }
  };

  const roleLabel = (role) => {
    const map = { USER: "普通用户", AUTHOR: "作者", ADMIN: "管理员" };
    return map[role] || role;
  };

  const statusMap = {
    PENDING: { label: "审核中", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    APPROVED: { label: "已通过", color: "bg-green-100 text-green-700 border-green-200" },
    REJECTED: { label: "已驳回", color: "bg-red-100 text-red-700 border-red-200" },
  };

  const tabs = [
    { key: "info", label: "个人资料" },
    { key: "application", label: "作者申请" },
    { key: "favorites", label: "我的收藏" },
  ];

  return (
    <div>
      {/* 用户信息卡片 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-2xl font-bold overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="头像" className="w-full h-full object-cover" />
            ) : (
              user?.username?.[0]?.toUpperCase() || "?"
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{user?.username}</h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">
              {roleLabel(user?.role)}
            </span>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
              tab === t.key
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 个人资料编辑 */}
      {tab === "info" && (
        <div className="bg-white rounded-lg shadow-md p-6 max-w-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-4">编辑个人资料</h2>

          {profileMsg.text && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                profileMsg.type === "success"
                  ? "bg-green-50 text-green-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">头像 URL</label>
              <input
                type="url"
                value={profileForm.avatar}
                onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                placeholder="介绍一下自己吧..."
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition disabled:opacity-50"
            >
              {savingProfile ? "保存中..." : "保存"}
            </button>
          </form>
        </div>
      )}

      {/* 作者申请 */}
      {tab === "application" && (
        <div className="space-y-6">
          {/* 当前申请状态 */}
          {latestApp && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">最新申请状态</h2>
              <div className={`inline-block px-3 py-1 rounded-full text-sm border ${statusMap[latestApp.status].color}`}>
                {statusMap[latestApp.status].label}
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-gray-600">
                  <span className="text-gray-400">申请理由：</span>
                  {latestApp.reason}
                </p>
                {latestApp.reviewNote && (
                  <p className="text-gray-600">
                    <span className="text-gray-400">审核备注：</span>
                    {latestApp.reviewNote}
                  </p>
                )}
                {latestApp.reviewedBy && (
                  <p className="text-gray-600">
                    <span className="text-gray-400">审核人：</span>
                    {latestApp.reviewedBy.username}
                  </p>
                )}
                <p className="text-gray-400">
                  提交时间：{new Date(latestApp.createdAt).toLocaleString("zh-CN")}
                </p>
                {latestApp.reviewedAt && (
                  <p className="text-gray-400">
                    审核时间：{new Date(latestApp.reviewedAt).toLocaleString("zh-CN")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 申请表单 — 仅普通用户且无待审核申请时显示 */}
          {user?.role === "USER" && latestApp?.status !== "PENDING" && (
            <div className="bg-white rounded-lg shadow-md p-6 max-w-lg">
              <h2 className="text-lg font-bold text-gray-800 mb-2">申请成为作者</h2>
              <p className="text-sm text-gray-500 mb-4">
                成为作者后，你可以发布小说、管理章节，与读者分享你的故事。
              </p>

              {appMsg.text && (
                <div
                  className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                    appMsg.type === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                  }`}
                >
                  {appMsg.text}
                </div>
              )}

              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    申请理由 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="请说明你为什么想成为作者，以及你计划创作什么类型的小说..."
                    rows="4"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={applying}
                  className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition disabled:opacity-50"
                >
                  {applying ? "提交中..." : "提交申请"}
                </button>
              </form>
            </div>
          )}

          {/* 已是作者 */}
          {user?.role === "AUTHOR" && (
            <div className="bg-green-50 rounded-lg p-6 text-center">
              <p className="text-green-600 font-medium">您已经是作者啦！</p>
              <Link
                to="/author/novels"
                className="inline-block mt-2 px-4 py-2 text-sm text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition"
              >
                前往作者中心
              </Link>
            </div>
          )}

          {/* 等待审核中 */}
          {user?.role === "USER" && latestApp?.status === "PENDING" && (
            <div className="bg-yellow-50 rounded-lg p-6 text-center">
              <p className="text-yellow-700 font-medium">您的申请正在审核中，请耐心等待。</p>
            </div>
          )}

          {/* 申请历史 */}
          {myApps.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">申请历史</h2>
              <div className="space-y-3">
                {myApps.map((app) => (
                  <div key={app.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusMap[app.status].color}`}>
                        {statusMap[app.status].label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(app.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{app.reason}</p>
                    {app.reviewNote && (
                      <p className="text-sm text-gray-400 mt-1">审核备注：{app.reviewNote}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 我的收藏 */}
      {tab === "favorites" && (
        <div>
          {favorites.length === 0 ? (
            <div className="text-center py-12 text-gray-400">暂无收藏</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {favorites.map((fav) => (
                <Link
                  key={fav.id}
                  to={`/novel/${fav.novel.id}`}
                  className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition flex gap-3"
                >
                  <div className="w-16 h-22 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    {fav.novel.coverUrl ? (
                      <img src={fav.novel.coverUrl} alt={fav.novel.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">无封面</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{fav.novel.title}</h3>
                    <p className="text-sm text-gray-500">{fav.novel.author?.username}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {fav.novel._count?.chapters || 0} 章 · {fav.novel.status === "ONGOING" ? "连载中" : "完结"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
