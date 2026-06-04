const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const startConversation = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { friendId } = req.params;

    let conversations = await Conversation.find({
  isGroup: { $ne: true },
  members: { $all: [currentUserId, friendId], $size: 2 },
})
  .populate("members", "username email displayName profilePic")
  .sort({ createdAt: 1 });

    let conversation = conversations[0];

    if (!conversation) {
      conversation = await Conversation.create({
        isGroup: false,
        members: [currentUserId, friendId],
      });

      conversation = await Conversation.findById(conversation._id).populate(
        "members",
        "username email displayName profilePic"
      );
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createGroupConversation = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupName, members, groupImage } = req.body;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    if (!members || !Array.isArray(members) || members.length < 2) {
      return res.status(400).json({
        message: "Select at least 2 friends to create a group",
      });
    }

    const uniqueMembers = [
      ...new Set([currentUserId, ...members.map((id) => String(id))]),
    ];

    const group = await Conversation.create({
      isGroup: true,
      groupName: groupName.trim(),
      groupImage: groupImage || "",

      // old single admin field
      groupAdmin: currentUserId,

      // new multiple admins field
      groupAdmins: [currentUserId],

      members: uniqueMembers,
      lastMessage: "Group created",
      lastMessageAt: new Date(),
    });

    const populatedGroup = await Conversation.findById(group._id)
      .populate("members", "username email displayName profilePic")
      .populate("groupAdmin", "username email displayName profilePic")
      .populate("groupAdmins", "username email displayName profilePic");

    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const populateGroup = async (groupId) => {
  return Conversation.findById(groupId)
    .populate("members", "username email displayName profilePic")
    .populate("groupAdmin", "username displayName profilePic")
    .populate("groupAdmins", "username displayName profilePic");
};

const getAdminIds = (group) => {
  if (group.groupAdmins && group.groupAdmins.length > 0) {
    return group.groupAdmins.map((id) => String(id?._id || id));
  }

  if (group.groupAdmin) {
    return [String(group.groupAdmin?._id || group.groupAdmin)];
  }

  return [];
};

const isGroupAdmin = (group, userId) => {
  return getAdminIds(group).includes(String(userId));
};

const addGroupMember = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupId } = req.params;
    const { memberId } = req.body;

    const group = await Conversation.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!isGroupAdmin(group, currentUserId)) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    const alreadyMember = group.members.some(
      (id) => String(id) === String(memberId)
    );

    if (alreadyMember) {
      return res.status(400).json({ message: "User already in group" });
    }

    group.members.push(memberId);
    await group.save();

    const updatedGroup = await populateGroup(groupId);

    res.json({
      message: "Member added successfully",
      group: updatedGroup,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeGroupMember = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupId, memberId } = req.params;

    const group = await Conversation.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!isGroupAdmin(group, currentUserId)) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }

    if (String(memberId) === String(currentUserId)) {
      return res.status(400).json({ message: "Admin cannot remove self" });
    }

    group.members = group.members.filter(
      (id) => String(id) !== String(memberId)
    );

    group.groupAdmins = (group.groupAdmins || []).filter(
      (id) => String(id) !== String(memberId)
    );

    await group.save();

    const updatedGroup = await populateGroup(groupId);

    res.json({
      message: "Member removed successfully",
      group: updatedGroup,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const makeGroupAdmin = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupId, memberId } = req.params;

    const group = await Conversation.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!isGroupAdmin(group, currentUserId)) {
      return res.status(403).json({ message: "Only admin can make admin" });
    }

    const isMember = group.members.some(
      (id) => String(id) === String(memberId)
    );

    if (!isMember) {
      return res.status(400).json({ message: "User is not a group member" });
    }

    if (!group.groupAdmins || group.groupAdmins.length === 0) {
      group.groupAdmins = group.groupAdmin ? [group.groupAdmin] : [currentUserId];
    }

    const alreadyAdmin = group.groupAdmins.some(
      (id) => String(id) === String(memberId)
    );

    if (!alreadyAdmin) {
      group.groupAdmins.push(memberId);
    }

    await group.save();

    const updatedGroup = await populateGroup(groupId);

    res.json({
      message: "Member is now admin",
      group: updatedGroup,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeGroupAdmin = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupId, memberId } = req.params;

    const group = await Conversation.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!isGroupAdmin(group, currentUserId)) {
      return res.status(403).json({ message: "Only admin can remove admin" });
    }

    if (!group.groupAdmins || group.groupAdmins.length === 0) {
      group.groupAdmins = group.groupAdmin ? [group.groupAdmin] : [currentUserId];
    }

    if (group.groupAdmins.length <= 1) {
      return res.status(400).json({
        message: "At least one admin is required",
      });
    }

    group.groupAdmins = group.groupAdmins.filter(
      (id) => String(id) !== String(memberId)
    );

    await group.save();

    const updatedGroup = await populateGroup(groupId);

    res.json({
      message: "Admin removed successfully",
      group: updatedGroup,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateGroupConversation = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupId } = req.params;
    const { groupName, groupImage } = req.body;

    const group = await Conversation.findOne({
      _id: groupId,
      isGroup: true,
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

   if (!isGroupAdmin(group, currentUserId)) {
  return res.status(403).json({
    message: "Only group admin can edit group",
  });
}

    if (groupName !== undefined) {
      if (!groupName.trim()) {
        return res.status(400).json({ message: "Group name is required" });
      }
      group.groupName = groupName.trim();
    }

    if (groupImage !== undefined) {
      group.groupImage = groupImage || "";
    }

    await group.save();

    const updatedGroup = await Conversation.findById(group._id)
  .populate("members", "username email displayName profilePic")
  .populate("groupAdmin", "username email displayName profilePic")
  .populate("groupAdmins", "username email displayName profilePic");

    res.json({
      message: "Group updated successfully",
      group: updatedGroup,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserConversations = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

   const conversations = await Conversation.find({
  members: currentUserId,
})
  .populate("members", "username email displayName profilePic")
  .populate("groupAdmin", "username email displayName profilePic")
  .populate("groupAdmins", "username email displayName profilePic")
  .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const messages = await Message.find({ 
      conversationId,
      deletedBy: { $ne: currentUserId }
    })
      .populate("senderId", "username email displayName profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { conversationId } = req.params;
    const { text, type, fileUrl, fileName } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    // Check blocks only for one-to-one chats
if (!conversation.isGroup) {
  const User = require("../models/User");
  const otherMemberId = conversation.members.find(
    (m) => m.toString() !== currentUserId
  );

  const isBlocked = await User.findOne({
    _id: otherMemberId,
    blockedUsers: currentUserId,
  });

  const hasBlocked = await User.findOne({
    _id: currentUserId,
    blockedUsers: otherMemberId,
  });

  if (isBlocked || hasBlocked) {
    return res.status(403).json({
      message: "Messaging is blocked for this user",
    });
  }
}

    if (!type || type === "text") {
      if (!text || !text.trim()) {
        return res.status(400).json({ message: "Message text is required" });
      }
    }

    const message = await Message.create({
      conversationId,
      senderId: currentUserId,
      text: text ? text.trim() : "",
      type: type || "text",
      fileUrl: fileUrl || null,
      fileName: fileName || null,
    });

    let lastMessageText = text ? text.trim() : "";
    if (!lastMessageText && type !== "text") {
      lastMessageText = `[${type}] ${fileName || "Media"}`;
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: lastMessageText,
      lastMessageAt: new Date(),
    });

    const populatedMessage = await Message.findById(message._id).populate(
      "senderId",
      "username email displayName profilePic"
    );

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { type } = req.query; // 'me' or 'everyone'
    const currentUserId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (type === "everyone") {
      if (message.senderId.toString() !== currentUserId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      await Message.findByIdAndDelete(messageId);
    } else {
      // Delete for me
      if (!message.deletedBy.includes(currentUserId)) {
        message.deletedBy.push(currentUserId);
        await message.save();
      }
    }

    const lastMsg = await Message.findOne({ 
      conversationId: message.conversationId,
      deletedBy: { $ne: currentUserId }
    }).sort({ createdAt: -1 });
    
    await Conversation.findByIdAndUpdate(message.conversationId, {
      lastMessage: lastMsg ? lastMsg.text || `[${lastMsg.type}]` : "No messages",
      lastMessageAt: lastMsg ? lastMsg.createdAt : new Date(),
    });

    res.json({ message: "Success", messageId, type });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isMember = conversation.members.some(
      (memberId) => String(memberId) === String(currentUserId)
    );

    if (!isMember) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    res.json({
      message: "Chat deleted successfully",
      conversationId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  startConversation,
  getUserConversations,
  createGroupConversation,
  updateGroupConversation,
  getMessages,
  sendMessage,
  deleteMessage,
  deleteConversation,
  addGroupMember,
  removeGroupMember,
  makeGroupAdmin,
  removeGroupAdmin,
};