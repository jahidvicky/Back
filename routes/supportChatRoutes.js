const router = require("express").Router();
const ctrl = require("../controller/supportChatController");

router.post("/support/start", ctrl.startSupportChat);
router.get("/support/:chatId", ctrl.getChatMessages);
router.get("/support", ctrl.getAllChats);
router.patch("/support/:chatId/close", ctrl.closeChat);
router.patch("/support/:chatId/rating", ctrl.submitRating);

module.exports = router;
