const prisma = require("../utils/prisma");

// 收藏小说
exports.add = async (req, res) => {
  try {
    const { novelId } = req.params;

    const novel = await prisma.novel.findUnique({
      where: { id: Number(novelId) },
      select: { reviewStatus: true },
    });

    if (!novel) {
      return res.status(404).json({ error: "小说不存在" });
    }

    if (novel.reviewStatus !== "APPROVED") {
      return res.status(403).json({ error: "小说尚未通过审核" });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_novelId: {
          userId: req.user.id,
          novelId: Number(novelId),
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: "已收藏过该小说" });
    }

    await prisma.favorite.create({
      data: {
        userId: req.user.id,
        novelId: Number(novelId),
      },
    });

    res.status(201).json({ message: "收藏成功" });
  } catch (err) {
    res.status(500).json({ error: "收藏失败: " + err.message });
  }
};

// 取消收藏
exports.remove = async (req, res) => {
  try {
    const { novelId } = req.params;

    await prisma.favorite.deleteMany({
      where: {
        userId: req.user.id,
        novelId: Number(novelId),
      },
    });

    res.json({ message: "已取消收藏" });
  } catch (err) {
    res.status(500).json({ error: "取消收藏失败: " + err.message });
  }
};

// 获取我的收藏列表
exports.myFavorites = async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: {
        novel: {
          include: {
            author: { select: { id: true, username: true } },
            _count: { select: { chapters: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ favorites });
  } catch (err) {
    res.status(500).json({ error: "获取收藏列表失败: " + err.message });
  }
};

// 检查是否已收藏
exports.check = async (req, res) => {
  try {
    const { novelId } = req.params;

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_novelId: {
          userId: req.user.id,
          novelId: Number(novelId),
        },
      },
    });

    res.json({ favorited: !!favorite });
  } catch (err) {
    res.status(500).json({ error: "检查收藏状态失败: " + err.message });
  }
};
