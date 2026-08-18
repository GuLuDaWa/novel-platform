const express = require("express");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const adminController = require("../controllers/adminController");

const router = express.Router();

// 所有管理后台路由均需管理员权限
router.use(authenticate, requireRole("ADMIN"));

router.get("/stats", adminController.stats);
router.get("/novels", adminController.allNovels);
router.get("/novels/pending", adminController.pendingNovels);
router.put("/novels/:id/approve", adminController.approveNovel);
router.put("/novels/:id/reject", adminController.rejectNovel);
router.get("/users", adminController.allUsers);
router.put("/users/:id/role", adminController.updateUserRole);

// 作者申请审核
router.get("/applications", adminController.allApplications);
router.get("/applications/pending", adminController.pendingApplications);
router.put("/applications/:id/approve", adminController.approveApplication);
router.put("/applications/:id/reject", adminController.rejectApplication);

module.exports = router;
