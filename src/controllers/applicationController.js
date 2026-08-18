const prisma = require("../utils/prisma");

// 提交作者申请
exports.apply = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "请填写申请理由" });
    }

    if (req.user.role === "AUTHOR") {
      return res.status(400).json({ error: "您已经是作者，无需重复申请" });
    }

    if (req.user.role === "ADMIN") {
      return res.status(400).json({ error: "管理员无需申请成为作者" });
    }

    // 检查是否已有待审核或已通过的申请
    const existing = await prisma.authorApplication.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      if (existing.status === "PENDING") {
        return res.status(409).json({ error: "您已提交过申请，正在等待审核" });
      }
      if (existing.status === "APPROVED") {
        return res.status(409).json({ error: "您的申请已通过" });
      }
    }

    const application = await prisma.authorApplication.create({
      data: {
        userId: req.user.id,
        reason: reason.trim(),
        status: "PENDING",
      },
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
      },
    });

    res.status(201).json({ application, message: "申请已提交，请等待管理员审核" });
  } catch (err) {
    res.status(500).json({ error: "提交申请失败: " + err.message });
  }
};

// 获取我的申请记录
exports.myApplications = async (req, res) => {
  try {
    const applications = await prisma.authorApplication.findMany({
      where: { userId: req.user.id },
      include: {
        reviewedBy: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ applications });
  } catch (err) {
    res.status(500).json({ error: "获取申请记录失败: " + err.message });
  }
};

// 获取我的最新申请状态
exports.myLatestApplication = async (req, res) => {
  try {
    const application = await prisma.authorApplication.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        reviewedBy: { select: { id: true, username: true } },
      },
    });

    res.json({ application });
  } catch (err) {
    res.status(500).json({ error: "获取申请状态失败: " + err.message });
  }
};
