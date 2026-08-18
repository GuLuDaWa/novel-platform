import { Link } from "react-router-dom";

export default function ChapterList({ chapters, novelId }) {
  if (!chapters || chapters.length === 0) {
    return <div className="text-gray-400 text-sm py-4">暂无章节</div>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {chapters.map((ch) => (
        <Link
          key={ch.id}
          to={`/novel/${novelId}/chapter/${ch.id}`}
          className="flex items-center justify-between py-3 hover:bg-gray-50 px-2 rounded transition"
        >
          <span className="text-gray-700">
            <span className="text-brand-500 font-medium mr-2">第 {ch.serialNumber} 章</span>
            {ch.title}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(ch.publishedAt).toLocaleDateString("zh-CN")}
          </span>
        </Link>
      ))}
    </div>
  );
}
