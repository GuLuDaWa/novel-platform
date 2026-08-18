const express = require("express");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const novelController = require("../controllers/novelController");

const router = express.Router();

// 公开路由
router.get("/", novelController.list);
router.get("/:id", authenticate, novelController.detail);

// 作者路由
router.get("/author/my-novels", authenticate, requireRole("AUTHOR", "ADMIN"), novelController.myNovels);
router.post("/", authenticate, requireRole("AUTHOR", "ADMIN"), novelController.create);
router.put("/:id", authenticate, requireRole("AUTHOR", "ADMIN"), novelController.update);
router.delete("/:id", authenticate, requireRole("AUTHOR", "ADMIN"), novelController.remove);

module.exports = router;
