const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const { JWT_SECRET } = require("../middleware/auth");

exports.register = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: "邮箱、用户名和密码均为必填项" });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      return res.status(409).json({ error: "邮箱或用户名已被注册" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: "USER",
      },
      select: { id: true, username: true, email: true, role: true, avatar: true, bio: true },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: "注册失败: " + err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "邮箱和密码均为必填项" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "邮箱或密码错误" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "邮箱或密码错误" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: "登录失败: " + err.message });
  }
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};

// 更新个人资料（头像、简介）
exports.updateProfile = async (req, res) => {
  try {
    const { avatar, bio } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(avatar !== undefined && { avatar }),
        ...(bio !== undefined && { bio }),
      },
      select: { id: true, username: true, email: true, role: true, avatar: true, bio: true },
    });

    res.json({ user: updated, message: "个人资料已更新" });
  } catch (err) {
    res.status(500).json({ error: "更新资料失败: " + err.message });
  }
};
