const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  startConversation,
  createGroupConversation,
  getUserConversations,
  updateGroupConversation,
  getMessages,
  sendMessage,
  deleteMessage,
  deleteConversation,
  addGroupMember,
removeGroupMember,
makeGroupAdmin,
removeGroupAdmin,

} = require("../controllers/conversationController");

router.post(
  "/start/:friendId",
  authMiddleware,
  roleMiddleware("user"),
  startConversation
);


router.post(
  "/group/:groupId/add-member",
  authMiddleware,
  roleMiddleware("user"),
  addGroupMember
);

router.delete(
  "/group/:groupId/remove-member/:memberId",
  authMiddleware,
  roleMiddleware("user"),
  removeGroupMember
);

router.put(
  "/group/:groupId/make-admin/:memberId",
  authMiddleware,
  roleMiddleware("user"),
  makeGroupAdmin
);

router.put(
  "/group/:groupId/remove-admin/:memberId",
  authMiddleware,
  roleMiddleware("user"),
  removeGroupAdmin
);
router.post(
  "/group/create",
  authMiddleware,
  roleMiddleware("user"),
  createGroupConversation
);

router.put(
  "/group/:groupId/update",
  authMiddleware,
  roleMiddleware("user"),
  updateGroupConversation
);
router.get(
  "/",
  authMiddleware,
  roleMiddleware("user"),
  getUserConversations
);

router.get(
  "/messages/:conversationId",
  authMiddleware,
  roleMiddleware("user"),
  getMessages
);

router.post(
  "/messages/:conversationId",
  authMiddleware,
  roleMiddleware("user"),
  sendMessage
);

router.delete(
  "/:conversationId",
  authMiddleware,
  roleMiddleware("user"),
  deleteConversation
);

router.delete(
  "/messages/:messageId",
  authMiddleware,
  roleMiddleware("user"),
  deleteMessage
);

module.exports = router;