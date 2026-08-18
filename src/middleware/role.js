// 角色权限中间件
// 用法: router.post("/novels", authenticate, requireRole("AUTHOR"), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "请先登录" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `权限不足，需要角色: ${roles.join(", ")}` });
    }

    next();
  };
}

module.exports = { requireRole };
