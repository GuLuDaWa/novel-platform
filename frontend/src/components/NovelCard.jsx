import { Link } from "react-router-dom";

export default function NovelCard({ novel }) {
  const statusLabel = novel.status === "ONGOING" ? "连载中" : "完结";
  const statusColor = novel.status === "ONGOING" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600";

  return (
    <Link
      to={`/novel/${novel.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden"
    >
      <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
        {novel.coverUrl ? (
          <img src={novel.coverUrl} alt={novel.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            暂无封面
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-800 truncate">{novel.title}</h3>
        <p className="text-sm text-gray-500 mt-1 truncate">
          {novel.author?.username || "未知作者"}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">
            {novel.category}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span>{novel._count?.chapters || 0} 章</span>
          <span>{novel._count?.favorites || 0} 收藏</span>
        </div>
      </div>
    </Link>
  );
}
