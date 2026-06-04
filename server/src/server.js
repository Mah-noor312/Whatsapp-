require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");
const seedAdmin = require("./utils/seedAdmin");
const Conversation = require("./models/Conversation");
const PORT = process.env.PORT || 5000;

connectDB();
seedAdmin();

const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.15.206:5173",
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

const userSocketMap = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("registerUser", (userId) => {
  if (!userId) return;

  const id = String(userId);
  const oldSocketId = userSocketMap.get(id);

  if (oldSocketId === socket.id) {
    return;
  }

  userSocketMap.set(id, socket.id);

  console.log("[REGISTER] User registered:", {
    userId: id,
    socketId: socket.id,
    activeUsers: Array.from(userSocketMap.entries()),
  });

  socket.emit("registrationStatus", {
    status: "success",
    userId: id,
    socketId: socket.id,
  });
});

  // WebRTC Signaling
  socket.on("callUser", ({ userToCall, signalData, from, name, callType, profilePic }) => {
  const targetId = String(userToCall);
  const callerId = String(from);

  console.log("[CALL USER EVENT]", {
    targetId,
    callerId,
    name,
    activeUsers: Array.from(userSocketMap.entries()),
  });

  const targetSocketId = userSocketMap.get(targetId);

  if (targetSocketId) {
    console.log("[CALL ROUTED]", {
      targetId,
      targetSocketId,
      callerId,
    });

    io.to(targetSocketId).emit("incomingCall", {
  signal: signalData,
  from: callerId,
  name,
  profilePic,
  callType: callType || "audio",
});
  } else {
    console.log("[CALL FAILED] Target user not online:", {
      targetId,
      callerId,
      activeUsers: Array.from(userSocketMap.entries()),
    });

    socket.emit("callFailed", {
      message: "Target user is not online",
      targetId,
    });
  }
});

  socket.on("answerCall", (data) => {
  const targetId = String(data.to);
  const targetSocketId = userSocketMap.get(targetId);
  const acceptedAt = Date.now();

  console.log("[ANSWER CALL]", {
    to: targetId,
    targetSocketId,
    acceptedAt,
  });

  if (targetSocketId) {
    io.to(targetSocketId).emit("callAccepted", {
      signal: data.signal,
      acceptedAt,
    });

    socket.emit("callConnected", {
      acceptedAt,
    });
  } else {
    socket.emit("callFailed", {
      message: "Caller is not online anymore",
      targetId,
    });
  }
});

  socket.on("endCall", ({ to }) => {
  const targetId = String(to);
  const targetSocketId = userSocketMap.get(targetId);

  console.log("[END CALL]", {
    to: targetId,
    targetSocketId,
  });

  if (targetSocketId) {
    io.to(targetSocketId).emit("callEnded");
  }
});

socket.on("callUpgradeSignal", ({ to, from, signal, callType }) => {
  const targetSocketId = userSocketMap.get(String(to));

  console.log("[CALL UPGRADE SIGNAL]", {
    from,
    to,
    targetSocketId,
    callType,
  });

  if (targetSocketId) {
    io.to(targetSocketId).emit("callUpgradeSignal", {
      from: String(from),
      signal,
      callType: callType || "video",
    });
  }
});

socket.on("cameraStatusChanged", ({ to, from, cameraOff }) => {
  const targetSocketId = userSocketMap.get(String(to));

  if (targetSocketId) {
    io.to(targetSocketId).emit("cameraStatusChanged", {
      from: String(from),
      cameraOff: Boolean(cameraOff),
    });
  }
});

socket.on("groupCameraStatusChanged", ({ groupId, from, cameraOff }) => {
  socket.to(String(groupId)).emit("groupCameraStatusChanged", {
    groupId: String(groupId),
    from: String(from),
    cameraOff: Boolean(cameraOff),
  });
});


  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`Socket joined conversation: ${conversationId}`);
  });

  socket.on("sendMessage", (messageData) => {
    io.to(messageData.conversationId).emit("receiveMessage", messageData);
  });

  socket.on("typing", ({ conversationId, user }) => {
    socket.to(conversationId).emit("typing", user);
  });

  socket.on("deleteMessage", ({ conversationId, messageId }) => {
    io.to(conversationId).emit("messageDeleted", messageId);
  });

  socket.on("markSeen", ({ conversationId, userId }) => {
    socket.to(conversationId).emit("messagesSeen", { userId });
  });
  
  socket.on("startGroupCall", async ({ groupId, from, name, profilePic, callType }) => {
  try {
    const callerId = String(from);

    const group = await Conversation.findOne({
      _id: groupId,
      isGroup: true,
      members: callerId,
    }).populate("members", "username displayName profilePic email");

    if (!group) {
      socket.emit("callFailed", {
        message: "Group not found",
      });
      return;
    }

    const onlineMembers = group.members.filter((member) => {
      const memberId = String(member._id);
      return memberId !== callerId && userSocketMap.has(memberId);
    });

    if (onlineMembers.length === 0) {
  socket.emit("callFailed", {
    message: "No group member is online",
  });
  return;
}

socket.join(`group-call-${groupId}`);

onlineMembers.forEach((member) => {
      const memberId = String(member._id);
      const targetSocketId = userSocketMap.get(memberId);

      io.to(targetSocketId).emit("incomingGroupCall", {
        groupId: String(group._id),
        groupName: group.groupName,
        groupImage: group.groupImage,
        from: callerId,
        name,
        profilePic,
        callType: callType || "audio",
      });
    });

    socket.emit("groupCallStarted", {
      groupId: String(group._id),
      groupName: group.groupName,
      onlineCount: onlineMembers.length,
      totalMembers: group.members.length - 1,
      callType: callType || "audio",
    });
  } catch (error) {
    console.log("[GROUP CALL ERROR]", error);
    socket.emit("callFailed", {
      message: error.message,
    });
  }
});

socket.on("joinGroupCall", ({ groupId, from, name, profilePic, callType }) => {
  const joinerId = String(from);

  console.log("[JOIN GROUP CALL]", {
    groupId,
    joinerId,
    name,
    callType,
  });

  socket.join(`group-call-${groupId}`);

  socket.to(`group-call-${groupId}`).emit("groupUserJoinedCall", {
    groupId,
    userId: joinerId,
    name,
    profilePic,
    callType,
  });
});

socket.on("groupCallSignal", ({ groupId, from, to, signal, callType }) => {
  const targetSocketId = userSocketMap.get(String(to));

  console.log("[GROUP CALL SIGNAL]", {
    groupId,
    from,
    to,
    targetSocketId,
    callType,
  });

  if (targetSocketId) {
    io.to(targetSocketId).emit("groupCallSignal", {
      groupId,
      from: String(from),
      signal,
      callType,
    });
  }
});

socket.on("groupCallAnswer", ({ groupId, from, to, signal }) => {
  const targetSocketId = userSocketMap.get(String(to));

  const connectedAt = Date.now();
  const serverNow = Date.now();

  console.log("[GROUP CALL ANSWER]", {
    groupId,
    from,
    to,
    targetSocketId,
    connectedAt,
    serverNow,
  });

  if (targetSocketId) {
    io.to(targetSocketId).emit("groupCallAnswer", {
      groupId,
      from: String(from),
      signal,
      connectedAt,
      serverNow,
    });

    socket.emit("groupCallConnected", {
      groupId,
      connectedAt,
      serverNow,
    });
  }
});

socket.on("leaveGroupCall", ({ groupId, from }) => {
  const leaverId = String(from);

  console.log("[LEAVE GROUP CALL]", {
    groupId,
    leaverId,
  });

  socket.to(`group-call-${groupId}`).emit("groupUserLeftCall", {
    groupId,
    userId: leaverId,
  });

  socket.leave(`group-call-${groupId}`);
});

  socket.on("disconnect", () => {
  console.log("[DISCONNECT] Socket disconnected:", socket.id);

  for (const [id, sId] of userSocketMap.entries()) {
    if (sId === socket.id) {
      userSocketMap.delete(id);
      console.log("[DISCONNECT] Removed user from map:", id);
      break;
    }
  }

  console.log("[ACTIVE USERS AFTER DISCONNECT]", Array.from(userSocketMap.entries()));
});
});

server.listen(5000, "0.0.0.0", () => {
  console.log("Server running on http://192.168.15.206:5000");
});