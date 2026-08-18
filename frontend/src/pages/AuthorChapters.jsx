import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { novelAPI, chapterAPI } from "../api";

// 极简 Markdown 渲染（无需外部依赖）
function renderMarkdown(md) {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-3 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
  // 粗体/斜体
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // 行内代码
  html = html.replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-gray-100 rounded text-sm">$1</code>');
  // 引用
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-3 text-gray-600 my-2">$1</blockquote>');
  // 无序列表
  html = html.replace(/^- (.+)$/gm, '<li class="ml-5 list-disc">$1</li>');
  // 段落/换行
  html = html
    .split("\n")
    .map((line) => {
      if (line.match(/^<(h[1-3]|blockquote|li)/)) return line;
      if (line.trim() === "") return "";
      return `<p class="my-1">${line}</p>`;
    })
    .join("\n");

  return html;
}

function MarkdownEditor({ value, onChange, rows = 18 }) {
  const [showPreview, setShowPreview] = useState(false);

  const insertSyntax = (before, after = "", placeholder = "") => {
    const textarea = document.getElementById("chapter-content");
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || placeholder;
    const newText = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    }, 0);
  };

  const tools = [
    { label: "B", title: "粗体", action: () => insertSyntax("**", "**", "粗体文本") },
    { label: "I", title: "斜体", action: () => insertSyntax("*", "*", "斜体文本") },
    { label: "H1", title: "一级标题", action: () => insertSyntax("# ", "", "标题") },
    { label: "H2", title: "二级标题", action: () => insertSyntax("## ", "", "标题") },
    { label: "H3", title: "三级标题", action: () => insertSyntax("### ", "", "标题") },
    { label: "“”", title: "引用", action: () => insertSyntax("> ", "", "引用内容") },
    { label: "• 列表", title: "无序列表", action: () => insertSyntax("- ", "", "列表项") },
    { label: "</>", title: "行内代码", action: () => insertSyntax("`", "`", "code") },
  ];

  return (
    <div>
      {/* 工具栏 */}
      <div className="flex items-center gap-1 mb-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-t-lg">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.title}
            onClick={tool.action}
            className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded transition font-mono"
          >
            {tool.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="px-3 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded transition"
        >
          {showPreview ? "编辑" : "预览"}
        </button>
      </div>

      {showPreview ? (
        <div
          className="w-full px-4 py-3 border border-gray-300 rounded-b-lg bg-white min-h-96 overflow-auto text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      ) : (
        <textarea
          id="chapter-content"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder="在此输入章节正文，支持 Markdown 语法..."
          className="w-full px-4 py-3 border border-gray-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-y font-mono text-sm leading-relaxed"
        />
      )}
    </div>
  );
}

export default function AuthorChapters() {
  const { id } = useParams();
  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  // 表单状态
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ serialNumber: "", title: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [novelRes, chapterRes] = await Promise.all([
        novelAPI.detail(id),
        chapterAPI.listByNovel(id),
      ]);
      setNovel(novelRes.data.novel);
      setChapters(chapterRes.data.chapters);
    } catch (err) {
      console.error("获取数据失败", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm({ serialNumber: "", title: "", content: "" });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleCreateNew = () => {
    const nextSerial = chapters.length > 0 ? Math.max(...chapters.map((c) => c.serialNumber)) + 1 : 1;
    setForm({ serialNumber: String(nextSerial), title: "", content: "" });
    setEditingId(null);
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = async (chapterId) => {
    try {
      const res = await chapterAPI.detail(chapterId);
      const ch = res.data.chapter;
      setForm({
        serialNumber: String(ch.serialNumber),
        title: ch.title,
        content: ch.content,
      });
      setEditingId(chapterId);
      setShowForm(true);
      setError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      alert(err.response?.data?.error || "获取章节内容失败");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!form.title.trim() || !form.content.trim()) {
      setError("标题和正文不能为空");
      setSaving(false);
      return;
    }

    try {
      const data = {
        serialNumber: Number(form.serialNumber),
        title: form.title.trim(),
        content: form.content,
      };

      if (editingId) {
        await chapterAPI.update(editingId, data);
      } else {
        await chapterAPI.create(id, data);
      }
      resetForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "操作失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (chapterId, title) => {
    if (!confirm(`确定删除「${title}」？此操作不可恢复。`)) return;
    try {
      await chapterAPI.remove(chapterId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "删除失败");
    }
  };

  const reviewStatusMap = {
    PENDING: { label: "待审核", color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
    APPROVED: { label: "已通过", color: "text-green-700 bg-green-50 border-green-200" },
    REJECTED: { label: "已驳回", color: "text-red-700 bg-red-50 border-red-200" },
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>;
  }

  if (!novel) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">小说不存在或无权访问</p>
        <Link to="/author/novels" className="text-brand-500 hover:underline">返回小说管理</Link>
      </div>
    );
  }

  const rs = reviewStatusMap[novel.reviewStatus];

  return (
    <div>
      {/* 面包屑导航 */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/author/novels" className="hover:text-brand-600">小说管理</Link>
        <span>/</span>
        <Link to={`/novel/${novel.id}`} className="hover:text-brand-600 truncate max-w-xs">{novel.title}</Link>
        <span>/</span>
        <span className="text-gray-700">章节管理</span>
      </div>

      {/* 小说信息头 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">{novel.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${rs.color}`}>{rs.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {novel.status === "ONGOING" ? "连载中" : "完结"}
            </span>
          </div>
          <div className="text-sm text-gray-400">{chapters.length} 章</div>
        </div>
      </div>

      {/* 新建/编辑章节表单 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              {editingId ? "编辑章节" : "新建章节"}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 text-sm">✕ 关闭</button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  序号 <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  章节标题 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="请输入章节标题"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                正文 <span className="text-red-400">*</span>
                <span className="text-xs text-gray-400 ml-2 font-normal">支持 Markdown 语法</span>
              </label>
              <MarkdownEditor
                value={form.content}
                onChange={(content) => setForm({ ...form, content })}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition disabled:opacity-50"
              >
                {saving ? "保存中..." : editingId ? "保存修改" : "发布章节"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 章节列表 */}
      {!showForm && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">章节列表</h2>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
          >
            + 新建章节
          </button>
        </div>
      )}

      {chapters.length === 0 && !showForm ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-400 mb-4">暂无章节</p>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
          >
            创建第一章
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left w-20">序号</th>
                <th className="px-4 py-3 text-left">章节标题</th>
                <th className="px-4 py-3 text-left w-40">发布时间</th>
                <th className="px-4 py-3 text-left w-32">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {chapters.map((ch) => (
                <tr key={ch.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">第 {ch.serialNumber} 章</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {ch.title}
                    {editingId === ch.id && showForm && (
                      <span className="ml-2 text-xs text-brand-500">编辑中</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(ch.publishedAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(ch.id)}
                        className="px-3 py-1 text-xs text-brand-600 border border-brand-300 rounded hover:bg-brand-50"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(ch.id, ch.title)}
                        className="px-3 py-1 text-xs text-red-500 border border-red-300 rounded hover:bg-red-50"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 底部操作区 */}
      <div className="mt-6 flex justify-between">
        <Link
          to="/author/novels"
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          ← 返回小说列表
        </Link>
        <Link
          to={`/novel/${novel.id}`}
          className="px-4 py-2 text-sm text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50 transition"
        >
          查看小说前台 →
        </Link>
      </div>
    </div>
  );
}
