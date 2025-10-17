const express = require("express");
const router = express.Router();

const { createFAQ, getAllFAQs, deletefaq, updatefaq, getPagination } = require("../controller/faq-Controller");
const { protect, allowRoles } = require("../middleware/auth-middleware");

router.post('/createfaq', allowRoles("admin"), createFAQ);
router.get('/getallfaq', getAllFAQs);
router.delete('/deletefaq/:id', protect, allowRoles("admin"), deletefaq)
router.put('/updatefaq/:id', protect, allowRoles("admin"), updatefaq)
router.get('/getPagination', getPagination)
module.exports = router;
