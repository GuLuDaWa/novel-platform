const prisma = require("../utils/prisma");

// 获取已审核通过的小说列表（公开）
exports.list = async (req, res) => {
  try {
    const { category, status, keyword, page = 1, limit = 10 } = req.query;
    const where = { reviewStatus: "APPROVED" };

    if (category) where.category = category;
    if (status) where.status = status;
    if (keyword) {
      where.title = { contains: keyword };
    }

    const novels = await prisma.novel.findMany({
      where,
      include: {
        author: { select: { id: true, username: true } },
        _count: { select: { chapters: true, favorites: true } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.novel.count({ where });

    res.json({ novels, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: "获取小说列表失败: " + err.message });
  }
};

// 获取小说详情（含章节列表）
exports.detail = async (req, res) => {
  try {
    const { id } = req.params;

    const novel = await prisma.novel.findUnique({
      where: { id: Number(id) },
      include: {
        author: { select: { id: true, username: true, avatar: true, bio: true } },
        chapters: {
          orderBy: { serialNumber: "asc" },
          select: { id: true, serialNumber: true, title: true, publishedAt: true },
        },
      },
    });

    if (!novel) {
      return res.status(404).json({ error: "小说不存在" });
    }

    if (novel.reviewStatus !== "APPROVED" && (!req.user || (req.user.id !== novel.authorId && req.user.role !== "ADMIN"))) {
      return res.status(403).json({ error: "该小说尚未通过审核" });
    }

    res.json({ novel });
  } catch (err) {
    res.status(500).json({ error: "获取小说详情失败: " + err.message });
  }
};

// 作者发布新小说
exports.create = async (req, res) => {
  try {
    const { title, description, coverUrl, category, status } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: "标题、简介和分类均为必填项" });
    }

    const validStatuses = ["ONGOING", "COMPLETED"];
    const novelStatus = validStatuses.includes(status) ? status : "ONGOING";

    const novel = await prisma.novel.create({
      data: {
        title,
        description,
        coverUrl: coverUrl || null,
        category,
        status: novelStatus,
        reviewStatus: "PENDING",
        authorId: req.user.id,
      },
    });

    res.status(201).json({ novel });
  } catch (err) {
    res.status(500).json({ error: "创建小说失败: " + err.message });
  }
};

// 作者更新自己的小说
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, coverUrl, category, status } = req.body;

    const novel = await prisma.novel.findUnique({ where: { id: Number(id) } });

    if (!novel) {
      return res.status(404).json({ error: "小说不存在" });
    }

    if (novel.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "无权修改他人的小说" });
    }

    const updated = await prisma.novel.update({
      where: { id: Number(id) },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(category && { category }),
        ...(status && { status }),
      },
    });

    res.json({ novel: updated });
  } catch (err) {
    res.status(500).json({ error: "更新小说失败: " + err.message });
  }
};

// 作者删除自己的小说
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const novel = await prisma.novel.findUnique({ where: { id: Number(id) } });

    if (!novel) {
      return res.status(404).json({ error: "小说不存在" });
    }

    if (novel.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "无权删除他人的小说" });
    }

    await prisma.novel.delete({ where: { id: Number(id) } });

    res.json({ message: "小说已删除" });
  } catch (err) {
    res.status(500).json({ error: "删除小说失败: " + err.message });
  }
};

// 获取作者自己的小说列表（含所有审核状态）
exports.myNovels = async (req, res) => {
  try {
    const novels = await prisma.novel.findMany({
      where: { authorId: req.user.id },
      include: { _count: { select: { chapters: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({ novels });
  } catch (err) {
    res.status(500).json({ error: "获取我的小说列表失败: " + err.message });
  }
};
