const express = require("express");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const chapterController = require("../controllers/chapterController");

const router = express.Router();

// 公开路由
router.get("/novel/:novelId", chapterController.listByNovel);
router.get("/:id", chapterController.detail);

// 作者路由
router.post("/novel/:novelId", authenticate, requireRole("AUTHOR", "ADMIN"), chapterController.create);
router.put("/:id", authenticate, requireRole("AUTHOR", "ADMIN"), chapterController.update);
router.delete("/:id", authenticate, requireRole("AUTHOR", "ADMIN"), chapterController.remove);

module.exports = router;
