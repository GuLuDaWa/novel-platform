import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { novelAPI, chapterAPI, commentAPI, favoriteAPI } from "../api";
import { useAuth } from "../context/AuthContext";
import ChapterList from "../components/ChapterList";

export default function NovelDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [favorited, setFavorited] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [novelRes, chapterRes] = await Promise.all([
        novelAPI.detail(id),
        chapterAPI.listByNovel(id),
      ]);
      setNovel(novelRes.data.novel);
      setChapters(novelRes.data.novel.chapters || chapterRes.data.chapters);

      const commentRes = await commentAPI.listByNovel(id);
      setComments(commentRes.data.comments);
    } catch (err) {
      console.error("获取小说信息失败", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (user) {
      favoriteAPI.check(id).then((res) => setFavorited(res.data.favorited)).catch(() => {});
    }
  }, [user, id]);

  const handleFavorite = async () => {
    try {
      if (favorited) {
        await favoriteAPI.remove(id);
        setFavorited(false);
      } else {
        await favoriteAPI.add(id);
        setFavorited(true);
      }
    } catch (err) {
      alert(err.response?.data?.error || "操作失败");
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await commentAPI.create(id, { content: newComment });
      setComments([res.data.comment, ...comments]);
      setNewComment("");
    } catch (err) {
      alert(err.response?.data?.error || "评论失败");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentAPI.remove(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(err.response?.data?.error || "删除失败");
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">加载中...</div>;
  if (!novel) return <div className="text-center py-12 text-gray-400">小说不存在</div>;

  const reviewStatusMap = {
    PENDING: { label: "待审核", color: "bg-yellow-100 text-yellow-700" },
    APPROVED: { label: "已通过", color: "bg-green-100 text-green-700" },
    REJECTED: { label: "已驳回", color: "bg-red-100 text-red-700" },
  };
  const rs = reviewStatusMap[novel.reviewStatus];

  return (
    <div>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-6">
          <div className="w-40 h-56 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
            {novel.coverUrl ? (
              <img src={novel.coverUrl} alt={novel.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">暂无封面</div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-800">{novel.title}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${rs.color}`}>{rs.label}</span>
            </div>
            <p className="text-gray-500 text-sm mb-3">
              作者：<span className="font-medium text-gray-700">{novel.author?.username}</span>
            </p>
            <div className="flex gap-4 mb-3 text-sm">
              <span className="px-3 py-1 bg-brand-50 text-brand-600 rounded-full">{novel.category}</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                {novel.status === "ONGOING" ? "连载中" : "完结"}
              </span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">{novel.description}</p>
            {user && (
              <button
                onClick={handleFavorite}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  favorited
                    ? "bg-brand-100 text-brand-600"
                    : "bg-brand-500 text-white hover:bg-brand-600"
                }`}
              >
                {favorited ? "已收藏" : "收藏"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">章节列表</h2>
            <ChapterList chapters={chapters} novelId={novel.id} />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">评论 ({comments.length})</h2>

            {user ? (
              <form onSubmit={handleComment} className="mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="写下你的评论..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
                <button
                  type="submit"
                  className="mt-2 px-4 py-1.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition"
                >
                  发表评论
                </button>
              </form>
            ) : (
              <p className="text-sm text-gray-400 mb-4">
                <Link to="/login" className="text-brand-500">登录</Link> 后可评论
              </p>
            )}

            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="border-b border-gray-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{c.user?.username}</span>
                    {user && (user.id === c.userId || user.role === "ADMIN") && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{c.content}</p>
                  <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString("zh-CN")}</span>
                </div>
              ))}
              {comments.length === 0 && <p className="text-sm text-gray-400">暂无评论</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
