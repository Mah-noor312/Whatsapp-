const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const bcrypt = require("bcryptjs");
const { callWithRetry } = require("../utils/retryUtils");

const searchUsers = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const query = (req.query.q || "").trim();

    if (!query) {
      return res.json({
        type: "username",
        users: [],
      });
    }

    let users = [];

    if (query.includes("@")) {
      users = await User.find({
        _id: { $ne: currentUserId },
        email: query.toLowerCase(),
        role: "user",
      }).select("username email displayName profilePic");

      return res.json({
        type: "email",
        users,
      });
    }

    users = await User.find({
      _id: { $ne: currentUserId },
      role: "user",
      $or: [
        { username: { $regex: query, $options: "i" } },
        { displayName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("username email displayName profilePic");

    return res.json({
      type: "username",
      users,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiverId } = req.params;

    if (senderId === receiverId) {
      return res.status(400).json({ message: "You cannot send request to yourself" });
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    if (existing) {
      if (existing.status === "pending") {
        return res.status(400).json({ message: "Friend request already exists" });
      }
      if (existing.status === "accepted") {
        return res.status(400).json({ message: "Already friends" });
      }
    }

    // Check if either user has blocked the other
    const isBlocked = await User.findOne({
      _id: receiverId,
      blockedUsers: senderId
    });
    const hasBlocked = await User.findOne({
      _id: senderId,
      blockedUsers: receiverId
    });

    if (isBlocked || hasBlocked) {
      return res.status(400).json({ message: "Cannot send friend request" });
    }

    await FriendRequest.create({
      senderId,
      receiverId,
      status: "pending",
    });

    res.status(201).json({ message: "Friend request sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const cancelFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { requestId } = req.params;

    const FriendRequest = require("../models/FriendRequest");

    const request = await FriendRequest.findOne({
      _id: requestId,
      senderId: currentUserId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({
        message: "Friend request not found",
      });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    res.json({
      message: "Friend request cancelled",
      requestId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getIncomingRequests = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const incoming = await FriendRequest.find({
      receiverId: currentUserId,
      status: "pending",
    }).populate("senderId", "username email displayName profilePic");

    const outgoing = await FriendRequest.find({
      senderId: currentUserId,
      status: "pending",
    }).populate("receiverId", "username email displayName profilePic");

    res.json({ incoming, outgoing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const acceptFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { requestId } = req.params;

    const request = await FriendRequest.findOne({
      _id: requestId,
      receiverId: currentUserId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    request.status = "accepted";
    await request.save();

    res.json({ message: "Friend request accepted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rejectFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { requestId } = req.params;

    const request = await FriendRequest.findOne({
      _id: requestId,
      $or: [{ receiverId: currentUserId }, { senderId: currentUserId }],
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    res.json({ message: "Friend request removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFriendsList = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const relations = await FriendRequest.find({
      status: "accepted",
      $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
    })
      .populate("senderId", "username email displayName profilePic phone")
      .populate("receiverId", "username email displayName profilePic phone");

    const friends = relations.map((item) => {
      if (item.senderId._id.toString() === currentUserId) {
        return item.receiverId;
      }
      return item.senderId;
    });

    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { displayName, phone, profilePic, password } = req.body;

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (displayName) user.displayName = displayName;
    if (phone !== undefined) user.phone = phone;
    if (profilePic !== undefined) user.profilePic = profilePic;

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      user.passwordHash = hashedPassword;
      user.isPasswordSet = true;
    }

    await callWithRetry(() => user.save());

    const userObj = user.toObject();
    delete userObj.passwordHash;
    delete userObj.inviteTokenHash;

    res.json({
      message: "Profile updated successfully",
      user: userObj
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const user = await User.findById(currentUserId).select(
      "-passwordHash -inviteTokenHash"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const blockUser = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { targetId } = req.params;

    if (currentUserId === targetId) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    // Add to blockedUsers
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: targetId }
    });

    // Remove friendship relationship (Unfriend)
    const FriendRequest = require("../models/FriendRequest");
    await FriendRequest.deleteMany({
      $or: [
        { senderId: currentUserId, receiverId: targetId },
        { senderId: targetId, receiverId: currentUserId }
      ]
    });

    res.json({ message: "User blocked and removed from friends. Chat preserved in Chats section." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unblockUser = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { targetId } = req.params;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { blockedUsers: targetId }
    });

    res.json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBlocklist = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const user = await User.findById(currentUserId).populate("blockedUsers", "username displayName profilePic email");
    res.json(user.blockedUsers || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};