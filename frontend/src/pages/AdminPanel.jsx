import { useState, useEffect } from "react";
import { adminAPI } from "../api";

export default function AdminPanel() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [novels, setNovels] = useState([]);
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await adminAPI.stats();
      setStats(res.data.stats);
    } catch (err) {
      console.error("获取统计数据失败", err);
    }
  };

  const fetchNovels = async () => {
    try {
      const res = await adminAPI.allNovels({ limit: 50 });
      setNovels(res.data.novels);
    } catch (err) {
      console.error("获取小说列表失败", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await adminAPI.allUsers();
      setUsers(res.data.users);
    } catch (err) {
      console.error("获取用户列表失败", err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await adminAPI.allApplications({ limit: 50 });
      setApplications(res.data.applications);
    } catch (err) {
      console.error("获取申请列表失败", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchNovels(), fetchUsers(), fetchApplications()]).finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveNovel(id);
      fetchNovels();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || "操作失败");
    }
  };

  const handleReject = async (id) => {
    if (!confirm("确定驳回这本小说？")) return;
    try {
      await adminAPI.rejectNovel(id);
      fetchNovels();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || "操作失败");
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await adminAPI.updateUserRole(userId, role);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || "操作失败");
    }
  };

  const handleApproveApp = async (id) => {
    const reviewNote = prompt("审核备注（可选）：", "审核通过");
    if (reviewNote === null) return;
    try {
      await adminAPI.approveApplication(id, { reviewNote });
      fetchApplications();
      fetchStats();
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || "操作失败");
    }
  };

  const handleRejectApp = async (id) => {
    const reviewNote = prompt("请输入驳回理由：", "");
    if (reviewNote === null) return;
    try {
      await adminAPI.rejectApplication(id, { reviewNote: reviewNote || "申请理由不充分" });
      fetchApplications();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || "操作失败");
    }
  };

  const reviewStatusMap = {
    PENDING: { label: "待审核", color: "text-yellow-600 bg-yellow-50" },
    APPROVED: { label: "已通过", color: "text-green-600 bg-green-50" },
    REJECTED: { label: "已驳回", color: "text-red-600 bg-red-50" },
  };

  const statCards = stats
    ? [
        { label: "总用户数", value: stats.users, color: "text-blue-600" },
        { label: "总小说数", value: stats.novels, color: "text-brand-600" },
        { label: "总章节数", value: stats.chapters, color: "text-purple-600" },
        { label: "总评论数", value: stats.comments, color: "text-green-600" },
        { label: "小说待审核", value: stats.pendingReview, color: "text-orange-600" },
        { label: "申请待审核", value: stats.pendingApplications, color: "text-amber-600" },
      ]
    : [];

  const tabs = [
    { key: "overview", label: "概览" },
    { key: "novels", label: "小说管理" },
    { key: "applications", label: "作者申请" },
    { key: "users", label: "用户管理" },
  ];

  if (loading) return <div className="text-center py-12 text-gray-400">加载中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">管理后台</h1>

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

      {tab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-sm text-gray-500 mt-1">{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "novels" && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">标题</th>
                <th className="px-4 py-3 text-left">作者</th>
                <th className="px-4 py-3 text-left">分类</th>
                <th className="px-4 py-3 text-left">审核状态</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {novels.map((novel) => {
                const rs = reviewStatusMap[novel.reviewStatus];
                return (
                  <tr key={novel.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{novel.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{novel.title}</td>
                    <td className="px-4 py-3 text-gray-600">{novel.author?.username}</td>
                    <td className="px-4 py-3 text-gray-600">{novel.category}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${rs.color}`}>{rs.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {novel.reviewStatus === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(novel.id)}
                            className="px-3 py-1 text-xs text-green-600 border border-green-300 rounded hover:bg-green-50"
                          >
                            通过
                          </button>
                          <button
                            onClick={() => handleReject(novel.id)}
                            className="px-3 py-1 text-xs text-red-500 border border-red-300 rounded hover:bg-red-50"
                          >
                            驳回
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "applications" && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">申请人</th>
                <th className="px-4 py-3 text-left">邮箱</th>
                <th className="px-4 py-3 text-left">申请理由</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-left">审核备注</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">暂无申请记录</td>
                </tr>
              ) : (
                applications.map((app) => {
                  const rs = reviewStatusMap[app.status];
                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{app.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{app.user?.username}</td>
                      <td className="px-4 py-3 text-gray-600">{app.user?.email}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs">
                        <div className="truncate" title={app.reason}>{app.reason}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${rs.color}`}>{rs.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs">
                        <div className="truncate" title={app.reviewNote || ""}>{app.reviewNote || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        {app.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveApp(app.id)}
                              className="px-3 py-1 text-xs text-green-600 border border-green-300 rounded hover:bg-green-50"
                            >
                              通过
                            </button>
                            <button
                              onClick={() => handleRejectApp(app.id)}
                              className="px-3 py-1 text-xs text-red-500 border border-red-300 rounded hover:bg-red-50"
                            >
                              驳回
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {app.reviewedBy?.username ? `审核人: ${app.reviewedBy.username}` : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "users" && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">用户名</th>
                <th className="px-4 py-3 text-left">邮箱</th>
                <th className="px-4 py-3 text-left">当前角色</th>
                <th className="px-4 py-3 text-left">小说数</th>
                <th className="px-4 py-3 text-left">注册时间</th>
                <th className="px-4 py-3 text-left">修改角色</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{u.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{u.username}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {u.role === "USER" ? "普通用户" : u.role === "AUTHOR" ? "作者" : "管理员"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u._count?.novels || 0}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(u.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    >
                      <option value="USER">普通用户</option>
                      <option value="AUTHOR">作者</option>
                      <option value="ADMIN">管理员</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
