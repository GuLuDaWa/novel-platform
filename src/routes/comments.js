const express = require("express");
const { authenticate } = require("../middleware/auth");
const commentController = require("../controllers/commentController");

const router = express.Router();

// 公开路由
router.get("/novel/:novelId", commentController.listByNovel);

// 需要登录
router.post("/novel/:novelId", authenticate, commentController.create);
router.delete("/:id", authenticate, commentController.remove);

module.exports = router;
