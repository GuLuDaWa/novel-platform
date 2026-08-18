const express = require("express");
const { authenticate } = require("../middleware/auth");
const favoriteController = require("../controllers/favoriteController");

const router = express.Router();

// 所有收藏操作均需登录
router.use(authenticate);

router.get("/my", favoriteController.myFavorites);
router.get("/check/:novelId", favoriteController.check);
router.post("/:novelId", favoriteController.add);
router.delete("/:novelId", favoriteController.remove);

module.exports = router;
