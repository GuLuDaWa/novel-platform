import { useState, useEffect } from "react";
import { novelAPI } from "../api";
import NovelCard from "../components/NovelCard";

export default function Home() {
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");

  const fetchNovels = async () => {
    setLoading(true);
    try {
      const res = await novelAPI.list({ keyword, category, limit: 20 });
      setNovels(res.data.novels);
    } catch (err) {
      console.error("获取小说列表失败", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNovels();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchNovels();
  };

  const categories = ["玄幻", "武侠", "都市", "科幻", "言情", "悬疑", "历史", "其他"];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">发现好书</h1>
        <p className="text-gray-500">浏览已审核通过的小说作品</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="搜索小说标题..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="">全部分类</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
        >
          搜索
        </button>
      </form>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : novels.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无小说，快去创作吧！</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {novels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </div>
      )}
    </div>
  );
}
