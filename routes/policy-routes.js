const express = require("express");
const router = express.Router();
const policyController = require("../controller/policy-controller");
const { protect, allowRoles } = require("../middleware/auth-middleware");

// Public
router.get("/policy/:slug", policyController.getPolicyBySlug);

// Admin
router.get("/admin/policy", protect, allowRoles("admin"), policyController.getAllPolicySlugs);
router.put("/admin/policy/:slug", protect, allowRoles("admin"), policyController.updatePolicyBySlug);

module.exports = router;