const prisma = require("../utils/prisma");

// 获取某小说的评论列表
exports.listByNovel = async (req, res) => {
  try {
    const { novelId } = req.params;

    const comments = await prisma.comment.findMany({
      where: { novelId: Number(novelId) },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: "获取评论失败: " + err.message });
  }
};

// 用户发表评论
exports.create = async (req, res) => {
  try {
    const { novelId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "评论内容不能为空" });
    }

    const novel = await prisma.novel.findUnique({
      where: { id: Number(novelId) },
      select: { reviewStatus: true },
    });

    if (!novel) {
      return res.status(404).json({ error: "小说不存在" });
    }

    if (novel.reviewStatus !== "APPROVED") {
      return res.status(403).json({ error: "小说尚未通过审核，无法评论" });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: req.user.id,
        novelId: Number(novelId),
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: "发表评论失败: " + err.message });
  }
};

// 用户删除自己的评论（管理员也可删除）
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({ where: { id: Number(id) } });

    if (!comment) {
      return res.status(404).json({ error: "评论不存在" });
    }

    if (comment.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "无权删除他人的评论" });
    }

    await prisma.comment.delete({ where: { id: Number(id) } });

    res.json({ message: "评论已删除" });
  } catch (err) {
    res.status(500).json({ error: "删除评论失败: " + err.message });
  }
};
