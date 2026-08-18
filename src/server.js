const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const novelRoutes = require("./routes/novels");
const chapterRoutes = require("./routes/chapters");
const commentRoutes = require("./routes/comments");
const favoriteRoutes = require("./routes/favorites");
const applicationRoutes = require("./routes/applications");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件 — CORS：生产环境通过 CORS_ORIGIN 限制允许的前端来源
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use("/api/auth", authRoutes);
app.use("/api/novels", novelRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "接口不存在" });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "服务器内部错误", detail: err.message });
});

app.listen(PORT, () => {
  console.log(`\n  📖 小说平台后端服务已启动`);
  console.log(`  📍 http://localhost:${PORT}`);
  console.log(`  📡 API 地址: http://localhost:${PORT}/api\n`);
});
