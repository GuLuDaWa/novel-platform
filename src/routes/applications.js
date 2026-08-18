const express = require("express");
const { authenticate } = require("../middleware/auth");
const applicationController = require("../controllers/applicationController");

const router = express.Router();

// 所有申请路由均需登录
router.use(authenticate);

router.post("/apply", applicationController.apply);
router.get("/my-applications", applicationController.myApplications);
router.get("/my-latest", applicationController.myLatestApplication);

module.exports = router;
