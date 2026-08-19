import { Hono } from "hono";
import {
  hashPassword,
  verifyPassword,
  signJWT,
  authenticate,
  requireRole,
} from "./auth.js";

const app = new Hono();

// ========== CORS ==========
app.use("*", async (c, next) => {
  const origin = c.req.header("Origin");
  const allowed = (c.env.CORS_ORIGIN || "*").split(",").map((s) => s.trim());
  if (allowed.includes("*") || !origin || allowed.includes(origin)) {
    if (origin) c.header("Access-Control-Allow-Origin", origin);
    else c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

// ========== Helpers ==========
function formatUser(row) {
  if (!row) return null;
  return {
    id: row.id, username: row.username, email: row.email,
    role: row.role, avatar: row.avatar, bio: row.bio,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function formatNovel(row) {
  if (!row) return null;
  return {
    id: row.id, title: row.title, description: row.description,
    coverUrl: row.coverUrl, category: row.category,
    status: row.status, reviewStatus: row.reviewStatus,
    authorId: row.authorId, publishedAt: row.publishedAt,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
    author: { id: row.authorId, username: row.authorUsername, avatar: row.authorAvatar, bio: row.authorBio },
    _count: { chapters: row.chapterCount, favorites: row.favoriteCount },
  };
}

// ========== Health & Seed ==========
app.get("/api/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

app.post("/api/seed", async (c) => {
  const existing = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM users").first();
  if (existing.cnt > 0) return c.json({ message: "数据库已有数据，跳过种子" });

  const seeds = [
    { email: "admin@novel.com", username: "管理员", password: "admin123", role: "ADMIN", bio: "平台管理员" },
    { email: "author@novel.com", username: "墨白", password: "author123", role: "AUTHOR", bio: "签约作者，擅长玄幻修仙" },
    { email: "reader@novel.com", username: "书虫小王", password: "reader123", role: "USER", bio: "热爱网络小说的普通读者" },
  ];
  for (const s of seeds) {
    const hash = await hashPassword(s.password);
    await c.env.DB.prepare(
      "INSERT INTO users (email, username, password, role, bio) VALUES (?,?,?,?,?)"
    ).bind(s.email, s.username, hash, s.role, s.bio).run();
  }

  const novel = await c.env.DB.prepare(
    `INSERT INTO novels (title, description, coverUrl, category, status, reviewStatus, authorId, publishedAt)
     VALUES (?,?,?,?,?,?,?,datetime('now'))`
  ).bind("万古神帝", "少年自微末崛起，踏天道，逆苍穹，万古独尊！", "https://placehold.co/300x400?text=WGSD", "玄幻", "ONGOING", "APPROVED", 2).run();
  const novelId = novel.meta.last_row_id;

  await c.env.DB.prepare(
    `INSERT INTO chapters (novelId, serialNumber, title, content, publishedAt) VALUES (?,?,?,?,datetime('now'))`
  ).bind(novelId, 1, "第一章 少年崛起", "清晨的阳光洒在...（正文内容）").run();

  await c.env.DB.prepare(
    `INSERT INTO chapters (novelId, serialNumber, title, content, publishedAt) VALUES (?,?,?,?,datetime('now'))`
  ).bind(novelId, 2, "第二章 天赋觉醒", "丹田之中，一道金光...").run();

  await c.env.DB.prepare(
    `INSERT INTO comments (content, userId, novelId) VALUES (?,?,?)`
  ).bind("这本书太好看了，催更！", 3, novelId).run();

  return c.json({ message: "种子数据创建成功" });
});

// ========== Auth Routes ==========
app.post("/api/auth/register", async (c) => {
  const { email, password, username } = await c.req.json();
  if (!email || !password || !username) return c.json({ error: "邮箱、用户名和密码不能为空" }, 400);

  const dup = await c.env.DB.prepare("SELECT id FROM users WHERE email = ? OR username = ?").bind(email, username).first();
  if (dup) return c.json({ error: "邮箱或用户名已被注册" }, 409);

  const hash = await hashPassword(password);
  const result = await c.env.DB.prepare(
    "INSERT INTO users (email, username, password) VALUES (?,?,?)"
  ).bind(email, username, hash).run();
  const user = await c.env.DB.prepare("SELECT id,username,email,role,avatar,bio,createdAt FROM users WHERE id = ?").bind(result.meta.last_row_id).first();
  const token = await signJWT({ userId: user.id, username: user.username, role: user.role }, c.env.JWT_SECRET);
  return c.json({ user: formatUser(user), token });
});

app.post("/api/auth/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: "邮箱和密码不能为空" }, 400);

  const row = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!row) return c.json({ error: "邮箱或密码错误" }, 401);

  const valid = await verifyPassword(password, row.password);
  if (!valid) return c.json({ error: "邮箱或密码错误" }, 401);

  const token = await signJWT({ userId: row.id, username: row.username, role: row.role }, c.env.JWT_SECRET);
  const user = await c.env.DB.prepare("SELECT id,username,email,role,avatar,bio,createdAt FROM users WHERE id = ?").bind(row.id).first();
  return c.json({ user: formatUser(user), token });
});

app.get("/api/auth/me", authenticate, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});

app.put("/api/auth/profile", authenticate, async (c) => {
  const user = c.get("user");
  const { avatar, bio } = await c.req.json();
  await c.env.DB.prepare("UPDATE users SET avatar = ?, bio = ?, updatedAt = datetime('now') WHERE id = ?")
    .bind(avatar ?? null, bio ?? null, user.id).run();
  const updated = await c.env.DB.prepare("SELECT id,username,email,role,avatar,bio,createdAt FROM users WHERE id = ?").bind(user.id).first();
  return c.json({ user: formatUser(updated), message: "个人信息更新成功" });
});

// ========== Novel Routes ==========
app.get("/api/novels", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const category = c.req.query("category");
  const search = c.req.query("search");
  const offset = (page - 1) * limit;

  let where = "n.reviewStatus = 'APPROVED'";
  const binds = [];
  if (category && category !== "全部") { where += " AND n.category = ?"; binds.push(category); }
  if (search) { where += ` AND (n.title LIKE ? OR n.description LIKE ?)`; binds.push(`%${search}%`, `%${search}%`); }

  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM novels n WHERE ${where}`).bind(...binds).first();
  const rows = await c.env.DB.prepare(
    `SELECT n.*, u.username as authorUsername, u.avatar as authorAvatar, u.bio as authorBio,
       (SELECT COUNT(*) FROM chapters WHERE novelId = n.id) as chapterCount,
       (SELECT COUNT(*) FROM favorites WHERE novelId = n.id) as favoriteCount
     FROM novels n JOIN users u ON n.authorId = u.id
     WHERE ${where}
     ORDER BY n.createdAt DESC
     LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();

  return c.json({ novels: rows.results.map(formatNovel), total: countRow.total, page, limit });
});

app.get("/api/novels/author/my-novels", authenticate, requireRole("AUTHOR", "ADMIN"), async (c) => {
  const user = c.get("user");
  const rows = await c.env.DB.prepare(
    `SELECT n.*, u.username as authorUsername, u.avatar as authorAvatar, u.bio as authorBio,
       (SELECT COUNT(*) FROM chapters WHERE novelId = n.id) as chapterCount,
       (SELECT COUNT(*) FROM favorites WHERE novelId = n.id) as favoriteCount
     FROM novels n JOIN users u ON n.authorId = u.id
     WHERE n.authorId = ?
     ORDER BY n.createdAt DESC`
  ).bind(user.id).all();
  return c.json({ novels: rows.results.map(formatNovel) });
});

app.get("/api/novels/:id", authenticate, async (c) => {
  const id = parseInt(c.req.param("id"));
  const user = c.get("user");

  const row = await c.env.DB.prepare(
    `SELECT n.*, u.username as authorUsername, u.avatar as authorAvatar, u.bio as authorBio,
       (SELECT COUNT(*) FROM chapters WHERE novelId = n.id) as chapterCount,
       (SELECT COUNT(*) FROM favorites WHERE novelId = n.id) as favoriteCount
     FROM novels n JOIN users u ON n.authorId = u.id
     WHERE n.id = ?`
  ).bind(id).first();
  if (!row) return c.json({ error: "小说不存在" }, 404);

  if (row.reviewStatus !== "APPROVED" && user.id !== row.authorId && user.role !== "ADMIN") {
    return c.json({ error: "该小说尚未通过审核" }, 403);
  }

  const chapters = await c.env.DB.prepare(
    "SELECT id, serialNumber, title, publishedAt FROM chapters WHERE novelId = ? ORDER BY serialNumber ASC"
  ).bind(id).all();

  const novel = formatNovel(row);
  novel.chapters = chapters.results;
  return c.json({ novel });
});

app.post("/api/novels", authenticate, requireRole("AUTHOR", "ADMIN"), async (c) => {
  const user = c.get("user");
  const { title, description, coverUrl, category, status } = await c.req.json();
  if (!title || !description || !category) return c.json({ error: "标题、简介和分类不能为空" }, 400);

  const result = await c.env.DB.prepare(
    `INSERT INTO novels (title, description, coverUrl, category, status, reviewStatus, authorId, publishedAt)
     VALUES (?,?,?,?,?,?,?,datetime('now'))`
  ).bind(title, description, coverUrl || null, category, status || "ONGOING", user.role === "ADMIN" ? "APPROVED" : "PENDING", user.id).run();

  const row = await c.env.DB.prepare(
    `SELECT n.*, u.username as authorUsername, u.avatar as authorAvatar, u.bio as authorBio,
       (SELECT COUNT(*) FROM chapters WHERE novelId = n.id) as chapterCount,
       (SELECT COUNT(*) FROM favorites WHERE novelId = n.id) as favoriteCount
     FROM novels n JOIN users u ON n.authorId = u.id WHERE n.id = ?`
  ).bind(result.meta.last_row_id).first();

  return c.json({ novel: formatNovel(row), message: "小说创建成功" }, 201);
});

app.put("/api/novels/:id", authenticate, requireRole("AUTHOR", "ADMIN"), async (c) => {
  const user = c.get("user");
  const id = parseInt(c.req.param("id"));
  const existing = await c.env.DB.prepare("SELECT * FROM novels WHERE id = ?").bind(id).first();
  if (!existing) return c.json({ error: "小说不存在" }, 404);
  if (existing.authorId !== user.id && user.role !== "ADMIN") return c.json({ error: "无权修改" }, 403);

  const { title, description, coverUrl, category, status } = await c.req.json();
  await c.env.DB.prepare(
    `UPDATE novels SET title=?, description=?, coverUrl=?, category=?, status=?, updatedAt=datetime('now') WHERE id=?`
  ).bind(
    title ?? existing.title, description ?? existing.description,
    coverUrl ?? existing.coverUrl, category ?? existing.category,
    status ?? existing.status, id
  ).run();

  const row = await c.env.DB.prepare(
    `SELECT n.*, u.username as authorUsername, u.avatar as authorAvatar, u.bio as authorBio,
       (SELECT COUNT(*) FROM chapters WHERE novelId = n.id) as chapterCount,
       (SELECT COUNT(*) FROM favorites WHERE novelId = n.id) as favoriteCount
     FROM novels n JOIN users u ON n.authorId = u.id WHERE n.id = ?`
  ).bind(id).first();
  return c.json({ novel: formatNovel(row), message: "小说更新成功" });
});

app.delete("/api/novels/:id", authenticate, requireRole("AUTHOR", "ADMIN"), async (c) => {
  const user = c.get("user");
  const id = parseInt(c.req.param("id"));
  const existing = await c.env.DB.prepare("SELECT * FROM novels WHERE id = ?").bind(id).first();
  if (!existing) return c.json({ error: "小说不存在" }, 404);
  if (existing.authorId !== user.id && user.role !== "ADMIN") return c.json({ error: "无权删除" }, 403);

  await c.env.DB.prepare("DELETE FROM novels WHERE id = ?").bind(id).run();
  return c.json({ message: "小说删除成功" });
});

// ========== Chapter Routes ==========
app.get("/api/chapters/novel/:novelId", async (c) => {
  const novelId = parseInt(c.req.param("novelId"));
  const rows = await c.env.DB.prepare(
    "SELECT id, novelId, serialNumber, title, publishedAt FROM chapters WHERE novelId = ? ORDER BY serialNumber ASC"
  ).bind(novelId).all();
  return c.json({ chapters: rows.results });
});

app.get("/api/chapters/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const row = await c.env.DB.prepare(
    `SELECT c.*, n.title as novelTitle, n.authorId as novelAuthorId, n.reviewStatus as novelReviewStatus
     FROM chapters c JOIN novels n ON c.novelId = n.id WHERE c.id = ?`
  ).bind(id).first();
  if (!row) return c.json({ error: "章节不存在" }, 404);

  return c.json({
    chapter: {
      id: row.id, novelId: row.novelId, serialNumber: row.serialNumber,
      title: row.title, content: row.content, publishedAt: row.publishedAt,
      createdAt: row.createdAt, updatedAt: row.updatedAt,
      novel: { id: row.novelId, title: row.novelTitle, authorId: row.novelAuthorId, reviewStatus: row.novelReviewStatus },
    },
  });
});

app.post("/api/chapters/novel/:novelId", authenticate, requireRole("AUTHOR", "ADMIN"), async (c) => {
  const user = c.get("user");
  const novelId = parseInt(c.req.param("novelId"));
  const novel = await c.env.DB.prepare("SELECT * FROM novels WHERE id = ?").bind(novelId).first();
  if (!novel) return c.json({ error: "小说不存在" }, 404);
  if (novel.authorId !== user.id && user.role !== "ADMIN") return c.json({ error: "无权操作" }, 403);

  const { title, content, serialNumber } = await c.req.json();
  if (!title || !content || !serialNumber) return c.json({ error: "标题、内容和序号不能为空" }, 400);

  const dup = await c.env.DB.prepare("SELECT id FROM chapters WHERE novelId = ? AND serialNumber = ?").bind(novelId, serialNumber).first();
  if (dup) return c.json({ error: "该序号已存在章节" }, 409);

  const result = await c.env.DB.prepare(
    "INSERT INTO chapters (novelId, serialNumber, title, content, publishedAt) VALUES (?,?,?,?,datetime('now'))"
  ).bind(novelId, serialNumber, title, content).run();

  const row = await c.env.DB.prepare(
    "SELECT id, novelId, serialNumber, title, content, publishedAt, createdAt FROM chapters WHERE id = ?"
  ).bind(result.meta.last_row_id).first();
  return c.json({ chapter: row, message: "章节创建成功" }, 201);
});

app.put("/api/chapters/:id", authenticate, requireRole("AUTHOR", "ADMIN"), async (c) => {
  const user = c.get("user");
  const id = parseInt(c.req.param("id"));
  const chapter = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?").bind(id).first();
  if (!chapter) return c.json({ error: "章节不存在" }, 404);

  const novel = await c.env.DB.prepare("SELECT authorId FROM novels WHERE id = ?").bind(chapter.novelId).first();
  if (novel.authorId !== user.id && user.role !== "ADMIN") return c.json({ error: "无权操作" }, 403);

  const { title, content, serialNumber } = await c.req.json();
  await c.env.DB.prepare(
    "UPDATE chapters SET title=?, content=?, serialNumber=?, updatedAt=datetime('now') WHERE id=?"
  ).bind(title ?? chapter.title, content ?? chapter.content, serialNumber ?? chapter.serialNumber, id).run();

  const row = await c.env.DB.prepare(
    "SELECT id, novelId, serialNumber, title, content, publishedAt, createdAt FROM chapters WHERE id = ?"
  ).bind(id).first();
  return c.json({ chapter: row, message: "章节更新成功" });
});

app.delete("/api/chapters/:id", authenticate, requireRole("AUTHOR", "ADMIN"), async (c) => {
  const user = c.get("user");
  const id = parseInt(c.req.param("id"));
  const chapter = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?").bind(id).first();
  if (!chapter) return c.json({ error: "章节不存在" }, 404);

  const novel = await c.env.DB.prepare("SELECT authorId FROM novels WHERE id = ?").bind(chapter.novelId).first();
  if (novel.authorId !== user.id && user.role !== "ADMIN") return c.json({ error: "无权操作" }, 403);

  await c.env.DB.prepare("DELETE FROM chapters WHERE id = ?").bind(id).run();
  return c.json({ message: "章节删除成功" });
});

// ========== Comment Routes ==========
app.get("/api/comments/novel/:novelId", async (c) => {
  const novelId = parseInt(c.req.param("novelId"));
  const rows = await c.env.DB.prepare(
    `SELECT c.*, u.id as userId, u.username, u.avatar
     FROM comments c JOIN users u ON c.userId = u.id
     WHERE c.novelId = ? ORDER BY c.createdAt DESC`
  ).bind(novelId).all();

  return c.json({
    comments: rows.results.map((r) => ({
      id: r.id, content: r.content, userId: r.userId, novelId: r.novelId,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      user: { id: r.userId, username: r.username, avatar: r.avatar },
    })),
  });
});

app.post("/api/comments/novel/:novelId", authenticate, async (c) => {
  const user = c.get("user");
  const novelId = parseInt(c.req.param("novelId"));
  const { content } = await c.req.json();
  if (!content) return c.json({ error: "评论内容不能为空" }, 400);

  const novel = await c.env.DB.prepare("SELECT id FROM novels WHERE id = ?").bind(novelId).first();
  if (!novel) return c.json({ error: "小说不存在" }, 404);

  const result = await c.env.DB.prepare(
    "INSERT INTO comments (content, userId, novelId) VALUES (?,?,?)"
  ).bind(content, user.id, novelId).run();

  return c.json({
    comment: {
      id: result.meta.last_row_id, content, userId: user.id, novelId,
      createdAt: new Date().toISOString(), user: { id: user.id, username: user.username, avatar: user.avatar },
    },
    message: "评论成功",
  }, 201);
});

app.delete("/api/comments/:id", authenticate, async (c) => {
  const user = c.get("user");
  const id = parseInt(c.req.param("id"));
  const comment = await c.env.DB.prepare("SELECT * FROM comments WHERE id = ?").bind(id).first();
  if (!comment) return c.json({ error: "评论不存在" }, 404);
  if (comment.userId !== user.id && user.role !== "ADMIN") return c.json({ error: "无权删除" }, 403);

  await c.env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
  return c.json({ message: "评论删除成功" });
});

// ========== Favorite Routes ==========
app.get("/api/favorites/my", authenticate, async (c) => {
  const user = c.get("user");
  const rows = await c.env.DB.prepare(
    `SELECT f.*, n.*, u.username as authorUsername, u.avatar as authorAvatar, u.bio as authorBio,
       (SELECT COUNT(*) FROM chapters WHERE novelId = n.id) as chapterCount,
       (SELECT COUNT(*) FROM favorites WHERE novelId = n.id) as favoriteCount
     FROM favorites f
     JOIN novels n ON f.novelId = n.id
     JOIN users u ON n.authorId = u.id
     WHERE f.userId = ? ORDER BY f.createdAt DESC`
  ).bind(user.id).all();

  return c.json({
    favorites: rows.results.map((r) => ({
      id: r.id, userId: r.userId, novelId: r.novelId, createdAt: r.createdAt,
      novel: formatNovel(r),
    })),
  });
});

app.get("/api/favorites/check/:novelId", authenticate, async (c) => {
  const user = c.get("user");
  const novelId = parseInt(c.req.param("novelId"));
  const row = await c.env.DB.prepare("SELECT id FROM favorites WHERE userId = ? AND novelId = ?").bind(user.id, novelId).first();
  return c.json({ isFavorite: !!row, favoriteId: row?.id || null });
});

app.post("/api/favorites/:novelId", authenticate, async (c) => {
  const user = c.get("user");
  const novelId = parseInt(c.req.param("novelId"));
  const novel = await c.env.DB.prepare("SELECT id FROM novels WHERE id = ?").bind(novelId).first();
  if (!novel) return c.json({ error: "小说不存在" }, 404);

  const existing = await c.env.DB.prepare("SELECT id FROM favorites WHERE userId = ? AND novelId = ?").bind(user.id, novelId).first();
  if (existing) return c.json({ error: "已收藏过该小说" }, 409);

  const result = await c.env.DB.prepare("INSERT INTO favorites (userId, novelId) VALUES (?,?)").bind(user.id, novelId).run();
  return c.json({ favoriteId: result.meta.last_row_id, message: "收藏成功" }, 201);
});

app.delete("/api/favorites/:novelId", authenticate, async (c) => {
  const user = c.get("user");
  const novelId = parseInt(c.req.param("novelId"));
  await c.env.DB.prepare("DELETE FROM favorites WHERE userId = ? AND novelId = ?").bind(user.id, novelId).run();
  return c.json({ message: "取消收藏成功" });
});

// ========== Application Routes ==========
app.post("/api/applications/apply", authenticate, async (c) => {
  const user = c.get("user");
  if (user.role === "AUTHOR" || user.role === "ADMIN") {
    return c.json({ error: "您已经是作者或管理员，无需申请" }, 400);
  }

  const pending = await c.env.DB.prepare(
    "SELECT id FROM author_applications WHERE userId = ? AND status = 'PENDING'"
  ).bind(user.id).first();
  if (pending) return c.json({ error: "您已有一个待审核的申请" }, 409);

  const { reason } = await c.req.json();
  if (!reason) return c.json({ error: "申请理由不能为空" }, 400);

  const result = await c.env.DB.prepare(
    "INSERT INTO author_applications (userId, reason) VALUES (?,?)"
  ).bind(user.id, reason).run();

  return c.json({
    application: {
      id: result.meta.last_row_id, userId: user.id, status: "PENDING",
      reason, createdAt: new Date().toISOString(),
    },
    message: "申请提交成功",
  }, 201);
});

app.get("/api/applications/my-applications", authenticate, async (c) => {
  const user = c.get("user");
  const rows = await c.env.DB.prepare(
    "SELECT * FROM author_applications WHERE userId = ? ORDER BY createdAt DESC"
  ).bind(user.id).all();
  return c.json({ applications: rows.results });
});

app.get("/api/applications/my-latest", authenticate, async (c) => {
  const user = c.get("user");
  const row = await c.env.DB.prepare(
    "SELECT * FROM author_applications WHERE userId = ? ORDER BY createdAt DESC LIMIT 1"
  ).bind(user.id).first();
  return c.json({ application: row || null });
});

// ========== Admin Routes ==========
app.get("/api/admin/stats", authenticate, requireRole("ADMIN"), async (c) => {
  const users = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM users").first();
  const novels = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM novels").first();
  const chapters = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM chapters").first();
  const comments = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM comments").first();
  const pendingNovels = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM novels WHERE reviewStatus = 'PENDING'").first();
  const pendingApps = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM author_applications WHERE status = 'PENDING'").first();

  return c.json({
    stats: {
      users: users.cnt, novels: novels.cnt, chapters: chapters.cnt,
      comments: comments.cnt, pendingNovels: pendingNovels.cnt, pendingApplications: pendingApps.cnt,
    },
  });
});

app.get("/api/admin/novels", authenticate, requireRole("ADMIN"), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT n.*, u.username as authorUsername, u.avatar as authorAvatar, u.bio as authorBio,
       (SELECT COUNT(*) FROM chapters WHERE novelId = n.id) as chapterCount,
       (SELECT COUNT(*) FROM favorites WHERE novelId = n.id) as favoriteCount
     FROM novels n JOIN users u ON n.authorId = u.id ORDER BY n.createdAt DESC`
  ).all();
  return c.json({ novels: rows.results.map(formatNovel) });
});

app.get("/api/admin/novels/pending", authenticate, requireRole("ADMIN"), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT n.*, u.username as authorUsername, u.avatar as authorAvatar, u.bio as authorBio,
       (SELECT COUNT(*) FROM chapters WHERE novelId = n.id) as chapterCount,
       (SELECT COUNT(*) FROM favorites WHERE novelId = n.id) as favoriteCount
     FROM novels n JOIN users u ON n.authorId = u.id WHERE n.reviewStatus = 'PENDING' ORDER BY n.createdAt DESC`
  ).all();
  return c.json({ novels: rows.results.map(formatNovel) });
});

app.put("/api/admin/novels/:id/approve", authenticate, requireRole("ADMIN"), async (c) => {
  const id = parseInt(c.req.param("id"));
  await c.env.DB.prepare("UPDATE novels SET reviewStatus='APPROVED', updatedAt=datetime('now') WHERE id=?").bind(id).run();
  const row = await c.env.DB.prepare(
    `SELECT n.*, u.username as authorUsername, u.avatar as authorAvatar, u.bio as authorBio,
       (SELECT COUNT(*) FROM chapters WHERE novelId = n.id) as chapterCount,
       (SELECT COUNT(*) FROM favorites WHERE novelId = n.id) as favoriteCount
     FROM novels n JOIN users u ON n.authorId = u.id WHERE n.id = ?`
  ).bind(id).first();
  return c.json({ novel: formatNovel(row), message: "小说审核通过" });
});

app.put("/api/admin/novels/:id/reject", authenticate, requireRole("ADMIN"), async (c) => {
  const id = parseInt(c.req.param("id"));
  await c.env.DB.prepare("UPDATE novels SET reviewStatus='REJECTED', updatedAt=datetime('now') WHERE id=?").bind(id).run();
  const row = await c.env.DB.prepare(
    `SELECT n.*, u.username as authorUsername, u.avatar as authorAvatar, u.bio as authorBio,
       (SELECT COUNT(*) FROM chapters WHERE novelId = n.id) as chapterCount,
       (SELECT COUNT(*) FROM favorites WHERE novelId = n.id) as favoriteCount
     FROM novels n JOIN users u ON n.authorId = u.id WHERE n.id = ?`
  ).bind(id).first();
  return c.json({ novel: formatNovel(row), message: "小说已拒绝" });
});

app.get("/api/admin/users", authenticate, requireRole("ADMIN"), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.email, u.role, u.avatar, u.bio, u.createdAt,
       (SELECT COUNT(*) FROM novels WHERE authorId = u.id) as novelCount,
       (SELECT COUNT(*) FROM comments WHERE userId = u.id) as commentCount
     FROM users u ORDER BY u.createdAt DESC`
  ).all();
  return c.json({
    users: rows.results.map((r) => ({
      ...r, _count: { novels: r.novelCount, comments: r.commentCount },
    })),
  });
});

app.put("/api/admin/users/:id/role", authenticate, requireRole("ADMIN"), async (c) => {
  const id = parseInt(c.req.param("id"));
  const { role } = await c.req.json();
  if (!["USER", "AUTHOR", "ADMIN"].includes(role)) return c.json({ error: "无效的角色" }, 400);

  await c.env.DB.prepare("UPDATE users SET role=?, updatedAt=datetime('now') WHERE id=?").bind(role, id).run();
  const user = await c.env.DB.prepare("SELECT id,username,email,role,avatar,bio,createdAt FROM users WHERE id=?").bind(id).first();
  return c.json({ user: formatUser(user), message: "用户角色更新成功" });
});

app.get("/api/admin/applications", authenticate, requireRole("ADMIN"), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT a.*, u.username, u.email, u.avatar
     FROM author_applications a JOIN users u ON a.userId = u.id
     ORDER BY a.createdAt DESC`
  ).all();
  return c.json({
    applications: rows.results.map((r) => ({
      ...r, user: { id: r.userId, username: r.username, email: r.email, avatar: r.avatar },
    })),
  });
});

app.get("/api/admin/applications/pending", authenticate, requireRole("ADMIN"), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT a.*, u.username, u.email, u.avatar
     FROM author_applications a JOIN users u ON a.userId = u.id
     WHERE a.status = 'PENDING' ORDER BY a.createdAt DESC`
  ).all();
  return c.json({
    applications: rows.results.map((r) => ({
      ...r, user: { id: r.userId, username: r.username, email: r.email, avatar: r.avatar },
    })),
  });
});

app.put("/api/admin/applications/:id/approve", authenticate, requireRole("ADMIN"), async (c) => {
  const user = c.get("user");
  const id = parseInt(c.req.param("id"));
  const { reviewNote } = await c.req.json().catch(() => ({}));

  const application = await c.env.DB.prepare("SELECT * FROM author_applications WHERE id=?").bind(id).first();
  if (!application) return c.json({ error: "申请不存在" }, 404);
  if (application.status !== "PENDING") return c.json({ error: "该申请已处理" }, 400);

  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE author_applications SET status='APPROVED', reviewNote=?, reviewedById=?, reviewedAt=datetime('now'), updatedAt=datetime('now') WHERE id=?"
    ).bind(reviewNote || null, user.id, id),
    c.env.DB.prepare("UPDATE users SET role='AUTHOR', updatedAt=datetime('now') WHERE id=?").bind(application.userId),
  ]);

  const updated = await c.env.DB.prepare("SELECT * FROM author_applications WHERE id=?").bind(id).first();
  return c.json({ application: updated, message: "申请已通过，用户已升级为作者" });
});

app.put("/api/admin/applications/:id/reject", authenticate, requireRole("ADMIN"), async (c) => {
  const user = c.get("user");
  const id = parseInt(c.req.param("id"));
  const { reviewNote } = await c.req.json().catch(() => ({}));

  const application = await c.env.DB.prepare("SELECT * FROM author_applications WHERE id=?").bind(id).first();
  if (!application) return c.json({ error: "申请不存在" }, 404);
  if (application.status !== "PENDING") return c.json({ error: "该申请已处理" }, 400);

  await c.env.DB.prepare(
    "UPDATE author_applications SET status='REJECTED', reviewNote=?, reviewedById=?, reviewedAt=datetime('now'), updatedAt=datetime('now') WHERE id=?"
  ).bind(reviewNote || null, user.id, id).run();

  const updated = await c.env.DB.prepare("SELECT * FROM author_applications WHERE id=?").bind(id).first();
  return c.json({ application: updated, message: "申请已拒绝" });
});

// ========== 404 ==========
app.all("*", (c) => c.json({ error: "接口不存在" }, 404));

export default app;
