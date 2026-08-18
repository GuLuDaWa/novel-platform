import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { novelAPI } from "../api";

const CATEGORIES = ["玄幻", "武侠", "都市", "科幻", "言情", "悬疑", "历史", "其他"];
const STATUSES = [
  { value: "ONGOING", label: "连载中" },
  { value: "COMPLETED", label: "完结" },
];

const reviewStatusMap = {
  PENDING: { label: "待审核", color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  APPROVED: { label: "已通过", color: "text-green-700 bg-green-50 border-green-200" },
  REJECTED: { label: "已驳回", color: "text-red-700 bg-red-50 border-red-200" },
};

const emptyForm = {
  title: "",
  description: "",
  coverUrl: "",
  category: "玄幻",
  status: "ONGOING",
};

export default function AuthorNovels() {
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchNovels = async () => {
    setLoading(true);
    try {
      const res = await novelAPI.myNovels();
      setNovels(res.data.novels);
    } catch (err) {
      console.error("获取我的小说失败", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNovels();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await novelAPI.create(form);
      resetForm();
      fetchNovels();
    } catch (err) {
      setError(err.response?.data?.error || "创建失败");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (novel) => {
    setEditingId(novel.id);
    setForm({
      title: novel.title,
      description: novel.description,
      coverUrl: novel.coverUrl || "",
      category: novel.category,
      status: novel.status,
    });
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await novelAPI.update(editingId, form);
      resetForm();
      fetchNovels();
    } catch (err) {
      setError(err.response?.data?.error || "更新失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("确定删除这本小说及其所有章节？此操作不可恢复。")) return;
    try {
      await novelAPI.remove(id);
      fetchNovels();
    } catch (err) {
      alert(err.response?.data?.error || "删除失败");
    }
  };

  return (
    <div>
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">小说管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理你的所有作品</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setError(""); }}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
          >
            + 新建小说
          </button>
        )}
      </div>

      {/* 新建/编辑表单 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {editingId ? "编辑小说" : "新建小说"}
          </h2>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标题 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="请输入小说标题"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                简介 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                rows="4"
                placeholder="请输入小说简介..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类 <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">封面 URL</label>
                <input
                  type="url"
                  value={form.coverUrl}
                  onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>

            {form.coverUrl && (
              <div className="flex items-center gap-3">
                <img src={form.coverUrl} alt="封面预览" className="w-20 h-28 object-cover rounded-lg border border-gray-200" />
                <span className="text-sm text-gray-400">封面预览</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition disabled:opacity-50"
              >
                {saving ? "保存中..." : editingId ? "保存修改" : "提交审核"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                取消
              </button>
            </div>

            {!editingId && (
              <p className="text-xs text-gray-400">
                提示：新建小说默认审核状态为"待审核"，管理员审核通过后才会在前台展示。
              </p>
            )}
          </form>
        </div>
      )}

      {/* 小说列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : novels.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-400 mb-4">你还没有发布任何小说</p>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setForm(emptyForm); }}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
            >
              发布第一本小说
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {novels.map((novel) => {
            const rs = reviewStatusMap[novel.reviewStatus];
            const st = STATUSES.find((s) => s.value === novel.status);
            return (
              <div key={novel.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1 min-w-0">
                    {/* 封面缩略图 */}
                    <div className="w-16 h-22 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      {novel.coverUrl ? (
                        <img src={novel.coverUrl} alt={novel.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">无封面</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/novel/${novel.id}`} className="font-semibold text-gray-800 hover:text-brand-600 truncate">
                          {novel.title}
                        </Link>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${rs.color}`}>{rs.label}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{st?.label}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{novel.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{novel.category}</span>
                        <span>{novel._count?.chapters || 0} 章</span>
                        <span>{new Date(novel.createdAt).toLocaleDateString("zh-CN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex flex-col gap-2 ml-4">
                    <Link
                      to={`/author/novels/${novel.id}/chapters`}
                      className="px-3 py-1.5 text-sm text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition text-center"
                    >
                      管理章节
                    </Link>
                    <button
                      onClick={() => handleEdit(novel)}
                      className="px-3 py-1.5 text-sm text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50 transition"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(novel.id)}
                      className="px-3 py-1.5 text-sm text-red-500 border border-red-300 rounded-lg hover:bg-red-50 transition"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {novel.reviewStatus === "REJECTED" && (
                  <div className="mt-3 px-3 py-2 bg-red-50 rounded text-sm text-red-600">
                    该小说已被驳回，请修改后重新提交审核
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
