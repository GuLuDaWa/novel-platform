const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

// 验证 JWT token 并将 user 信息挂载到 req.user
async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未提供认证令牌" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true, role: true, avatar: true, bio: true },
    });

    if (!user) {
      return res.status(401).json({ error: "用户不存在" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "认证令牌无效或已过期" });
  }
}

module.exports = { authenticate, JWT_SECRET };
