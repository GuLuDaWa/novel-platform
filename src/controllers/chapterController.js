const prisma = require("../utils/prisma");

// 获取指定小说的章节列表
exports.listByNovel = async (req, res) => {
  try {
    const { novelId } = req.params;

    const chapters = await prisma.chapter.findMany({
      where: { novelId: Number(novelId) },
      orderBy: { serialNumber: "asc" },
      select: { id: true, serialNumber: true, title: true, publishedAt: true },
    });

    res.json({ chapters });
  } catch (err) {
    res.status(500).json({ error: "获取章节列表失败: " + err.message });
  }
};

// 获取章节正文
exports.detail = async (req, res) => {
  try {
    const { id } = req.params;

    const chapter = await prisma.chapter.findUnique({
      where: { id: Number(id) },
      include: { novel: { select: { id: true, title: true, authorId: true, reviewStatus: true } } },
    });

    if (!chapter) {
      return res.status(404).json({ error: "章节不存在" });
    }

    res.json({ chapter });
  } catch (err) {
    res.status(500).json({ error: "获取章节详情失败: " + err.message });
  }
};

// 作者创建新章节
exports.create = async (req, res) => {
  try {
    const { novelId } = req.params;
    const { serialNumber, title, content } = req.body;

    if (!title || !content || serialNumber === undefined) {
      return res.status(400).json({ error: "序号、标题和正文均为必填项" });
    }

    const novel = await prisma.novel.findUnique({ where: { id: Number(novelId) } });

    if (!novel) {
      return res.status(404).json({ error: "小说不存在" });
    }

    if (novel.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "只能为自己的小说添加章节" });
    }

    const chapter = await prisma.chapter.create({
      data: {
        novelId: Number(novelId),
        serialNumber: Number(serialNumber),
        title,
        content,
        publishedAt: new Date(),
      },
    });

    res.status(201).json({ chapter });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "该序号已存在，请使用不同的序号" });
    }
    res.status(500).json({ error: "创建章节失败: " + err.message });
  }
};

// 作者更新章节
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { serialNumber, title, content } = req.body;

    const chapter = await prisma.chapter.findUnique({
      where: { id: Number(id) },
      include: { novel: { select: { authorId: true } } },
    });

    if (!chapter) {
      return res.status(404).json({ error: "章节不存在" });
    }

    if (chapter.novel.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "无权修改他人小说的章节" });
    }

    const updated = await prisma.chapter.update({
      where: { id: Number(id) },
      data: {
        ...(serialNumber !== undefined && { serialNumber: Number(serialNumber) }),
        ...(title && { title }),
        ...(content && { content }),
      },
    });

    res.json({ chapter: updated });
  } catch (err) {
    res.status(500).json({ error: "更新章节失败: " + err.message });
  }
};

// 作者删除章节
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const chapter = await prisma.chapter.findUnique({
      where: { id: Number(id) },
      include: { novel: { select: { authorId: true } } },
    });

    if (!chapter) {
      return res.status(404).json({ error: "章节不存在" });
    }

    if (chapter.novel.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "无权删除他人小说的章节" });
    }

    await prisma.chapter.delete({ where: { id: Number(id) } });

    res.json({ message: "章节已删除" });
  } catch (err) {
    res.status(500).json({ error: "删除章节失败: " + err.message });
  }
};
