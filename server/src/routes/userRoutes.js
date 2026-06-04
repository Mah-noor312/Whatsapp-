const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  searchUsers,
  sendFriendRequest,
  getIncomingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendsList,
  getProfile,
  updateProfile,
  blockUser,
  unblockUser,
  getBlocklist,
  cancelFriendRequest,
} = require("../controllers/userController");


router.get(
  "/search",
  authMiddleware,
  roleMiddleware("user"),
  searchUsers
);

router.get(
  "/profile",
  authMiddleware,
  roleMiddleware("user"),
  getProfile
);
router.delete(
  "/friend-request/cancel/:requestId",
  authMiddleware,
  roleMiddleware("user"),
  cancelFriendRequest
);
router.put(
  "/profile",
  authMiddleware,
  roleMiddleware("user"),
  updateProfile
);

router.post(
  "/friend-request/:receiverId",
  authMiddleware,
  roleMiddleware("user"),
  sendFriendRequest
);

router.get(
  "/friend-requests",
  authMiddleware,
  roleMiddleware("user"),
  getIncomingRequests
);

router.post(
  "/friend-request/accept/:requestId",
  authMiddleware,
  roleMiddleware("user"),
  acceptFriendRequest
);

router.post(
  "/friend-request/reject/:requestId",
  authMiddleware,
  roleMiddleware("user"),
  rejectFriendRequest
);

router.get(
  "/friends",
  authMiddleware,
  roleMiddleware("user"),
  getFriendsList
);

router.put(
  "/profile",
  authMiddleware,
  roleMiddleware("user"),
  updateProfile
);

router.post(
  "/block/:targetId",
  authMiddleware,
  roleMiddleware("user"),
  blockUser
);

router.post(
  "/unblock/:targetId",
  authMiddleware,
  roleMiddleware("user"),
  unblockUser
);

router.get(
  "/blocklist",
  authMiddleware,
  roleMiddleware("user"),
  getBlocklist
);

module.exports = router;