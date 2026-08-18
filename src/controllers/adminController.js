const prisma = require("../utils/prisma");

// 获取待审核小说列表
exports.pendingNovels = async (req, res) => {
  try {
    const novels = await prisma.novel.findMany({
      where: { reviewStatus: "PENDING" },
      include: {
        author: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ novels });
  } catch (err) {
    res.status(500).json({ error: "获取待审核小说失败: " + err.message });
  }
};

// 审核小说 — 通过
exports.approveNovel = async (req, res) => {
  try {
    const { id } = req.params;

    const novel = await prisma.novel.update({
      where: { id: Number(id) },
      data: {
        reviewStatus: "APPROVED",
        publishedAt: new Date(),
      },
    });

    res.json({ novel, message: "小说已通过审核" });
  } catch (err) {
    res.status(500).json({ error: "审核操作失败: " + err.message });
  }
};

// 审核小说 — 驳回
exports.rejectNovel = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const novel = await prisma.novel.update({
      where: { id: Number(id) },
      data: { reviewStatus: "REJECTED" },
    });

    res.json({ novel, message: "小说已驳回", reason: reason || null });
  } catch (err) {
    res.status(500).json({ error: "审核操作失败: " + err.message });
  }
};

// 获取所有小说（管理员视角，含所有状态）
exports.allNovels = async (req, res) => {
  try {
    const { reviewStatus, page = 1, limit = 20 } = req.query;
    const where = {};

    if (reviewStatus) where.reviewStatus = reviewStatus;

    const novels = await prisma.novel.findMany({
      where,
      include: {
        author: { select: { id: true, username: true, email: true } },
        _count: { select: { chapters: true, comments: true, favorites: true } },
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

// 获取所有用户列表
exports.allUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        bio: true,
        createdAt: true,
        _count: {
          select: { novels: true, comments: true, favorites: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "获取用户列表失败: " + err.message });
  }
};

// 修改用户角色
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ["USER", "AUTHOR", "ADMIN"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "无效的角色值" });
    }

    if (Number(id) === req.user.id && role !== "ADMIN") {
      return res.status(400).json({ error: "不能取消自己的管理员权限" });
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { role },
      select: { id: true, username: true, email: true, role: true },
    });

    res.json({ user, message: "用户角色已更新" });
  } catch (err) {
    res.status(500).json({ error: "更新用户角色失败: " + err.message });
  }
};

// 获取平台统计数据
exports.stats = async (req, res) => {
  try {
    const [userCount, novelCount, chapterCount, commentCount, pendingCount, pendingAppCount] = await Promise.all([
      prisma.user.count(),
      prisma.novel.count(),
      prisma.chapter.count(),
      prisma.comment.count(),
      prisma.novel.count({ where: { reviewStatus: "PENDING" } }),
      prisma.authorApplication.count({ where: { status: "PENDING" } }),
    ]);

    res.json({
      stats: {
        users: userCount,
        novels: novelCount,
        chapters: chapterCount,
        comments: commentCount,
        pendingReview: pendingCount,
        pendingApplications: pendingAppCount,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "获取统计数据失败: " + err.message });
  }
};

// ========================== 作者申请审核 ==========================

// 获取待审核的作者申请列表
exports.pendingApplications = async (req, res) => {
  try {
    const applications = await prisma.authorApplication.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { id: true, username: true, email: true, role: true, createdAt: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ applications });
  } catch (err) {
    res.status(500).json({ error: "获取待审核申请失败: " + err.message });
  }
};

// 获取所有作者申请（含所有状态）
exports.allApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};

    if (status) where.status = status;

    const applications = await prisma.authorApplication.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
        reviewedBy: { select: { id: true, username: true } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.authorApplication.count({ where });

    res.json({ applications, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: "获取申请列表失败: " + err.message });
  }
};

// 审核作者申请 — 通过
exports.approveApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const application = await prisma.authorApplication.findUnique({
      where: { id: Number(id) },
    });

    if (!application) {
      return res.status(404).json({ error: "申请记录不存在" });
    }

    if (application.status !== "PENDING") {
      return res.status(400).json({ error: "该申请已处理过" });
    }

    // 事务：同时更新申请状态和用户角色
    const [updatedApp] = await prisma.$transaction([
      prisma.authorApplication.update({
        where: { id: Number(id) },
        data: {
          status: "APPROVED",
          reviewNote: reviewNote || "审核通过",
          reviewedById: req.user.id,
          reviewedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: application.userId },
        data: { role: "AUTHOR" },
      }),
    ]);

    res.json({ application: updatedApp, message: "申请已通过，用户已成为作者" });
  } catch (err) {
    res.status(500).json({ error: "审核操作失败: " + err.message });
  }
};

// 审核作者申请 — 驳回
exports.rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const application = await prisma.authorApplication.findUnique({
      where: { id: Number(id) },
    });

    if (!application) {
      return res.status(404).json({ error: "申请记录不存在" });
    }

    if (application.status !== "PENDING") {
      return res.status(400).json({ error: "该申请已处理过" });
    }

    const updatedApp = await prisma.authorApplication.update({
      where: { id: Number(id) },
      data: {
        status: "REJECTED",
        reviewNote: reviewNote || "申请理由不充分",
        reviewedById: req.user.id,
        reviewedAt: new Date(),
      },
    });

    res.json({ application: updatedApp, message: "申请已驳回" });
  } catch (err) {
    res.status(500).json({ error: "审核操作失败: " + err.message });
  }
};
