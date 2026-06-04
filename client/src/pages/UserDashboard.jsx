import { useEffect, useRef, useState } from "react";
import PhoneInputPkg from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useNavigate } from "react-router-dom";
import VideoRecorder from "../components/VideoRecorder";
import VoiceRecorder from "../components/VoiceRecorder";
import useAudioCall from "../hooks/useAudioCall";
import useGroupCall from "../hooks/useGroupCall";
import api from "../services/api";
import socket from "../services/socket";
import "./UserDashboard.css";

const PhoneInput = PhoneInputPkg.default || PhoneInputPkg;

function GroupAudioPlayer({ stream, userId }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current || !stream) return;

    console.log("GROUP AUDIO STREAM:", {
      userId,
      audioTracks: stream.getAudioTracks().map((track) => ({
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
      })),
    });

    audioRef.current.srcObject = stream;
    audioRef.current.muted = false;
    audioRef.current.volume = 1;

    audioRef.current.play?.().catch((err) => {
      console.log("Group audio play blocked:", err);
    });
  }, [stream, userId]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}

function UserDashboard() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchType, setSearchType] = useState("username");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupCallSeconds, setGroupCallSeconds] = useState(0);
const [groupName, setGroupName] = useState("");
const [addMemberId, setAddMemberId] = useState("");
const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
const [incomingGroupCall, setIncomingGroupCall] = useState(null);
const [showGroupCallModal, setShowGroupCallModal] = useState(false);
const [showGroupProfile, setShowGroupProfile] = useState(false);
const [editGroupName, setEditGroupName] = useState("");
const [editGroupImageFile, setEditGroupImageFile] = useState(null);
const [editGroupImagePreview, setEditGroupImagePreview] = useState("");
const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  const [selectedFriend, setSelectedFriend] = useState(null);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);

  const [typingUser, setTypingUser] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const searchBoxRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatHistoryRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const prevLastMessageId = useRef(null);

  const getToken = () => localStorage.getItem("token");
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const currentUserId = currentUser?._id || currentUser?.id;
  const currentUserName = currentUser?.displayName || currentUser?.username;

const {
  callState,
  incomingCallData,
  callStartedAt,
  localStream,
  remoteStream,
  callType,
  startCall,
  answerCall,
  rejectCall,
  endCall,
  isMuted,
  isCameraOff,
  toggleMute,
  toggleCamera,
  switchToVideo,
  remoteCameraOff
} = useAudioCall(socket, currentUserId, currentUserName, currentUser?.profilePic);

const {
  groupCallState,
  groupCallType,
  groupCallInfo,
  groupLocalStream,
  groupRemoteStreams,
  groupMuted,
  groupCameraOff,
  groupConnectedAt,
  startGroupCall: startRealGroupCall,
  joinGroupCall,
  toggleGroupMute,
  toggleGroupCamera,
  endGroupCall,
  switchGroupToVideo,
} = useGroupCall(socket, currentUserId, currentUserName, currentUser?.profilePic);

  const remoteAudioRef = useRef(null);
  const [callSeconds, setCallSeconds] = useState(0);

const formatCallTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const callDisplayName =
  incomingCallData?.name ||
  selectedFriend?.displayName ||
  selectedFriend?.username ||
  "Calling...";

const callDisplayPic =
  incomingCallData?.profilePic ||
  selectedFriend?.profilePic ||
  "";

const callDisplayInitial =
  callDisplayName?.charAt(0)?.toUpperCase() || "U"; 
  const localVideoRef = useRef(null);
const remoteVideoRef = useRef(null);
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

const showOneToOneVideoUI =
  callType === "video" && !(isCameraOff && remoteCameraOff);

const showGroupVideoUI =
  groupCallType === "video" &&
  !(
    groupCameraOff &&
    groupRemoteStreams.length > 0 &&
    groupRemoteStreams.every((item) => item.cameraOff)
  );

  useEffect(() => {
  let timer;

  if (callState === "connected" && callStartedAt) {
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - callStartedAt) / 1000);
      setCallSeconds(elapsed >= 0 ? elapsed : 0);
    };

    updateTimer();
    timer = setInterval(updateTimer, 1000);
  } else {
    setCallSeconds(0);
  }

  return () => {
    if (timer) clearInterval(timer);
  };
}, [callState, callStartedAt]);

  useEffect(() => {
  if (localVideoRef.current && localStream) {
    localVideoRef.current.srcObject = localStream;

    localVideoRef.current.play?.().catch((err) => {
      console.log("Local video play blocked:", err);
    });
  }
}, [localStream, callState, callType]);

useEffect(() => {
  if (remoteVideoRef.current && remoteStream) {
    remoteVideoRef.current.srcObject = remoteStream;

    remoteVideoRef.current.play?.().catch((err) => {
      console.log("Remote video play blocked:", err);
    });
  }
}, [remoteStream, callState, callType]);

useEffect(() => {
  const handleGroupCallStarted = (data) => {
    alert(`Calling ${data.onlineCount} online group member(s)`);
  };

  const handleIncomingGroupCall = (data) => {
  setIncomingGroupCall(data);
  setShowGroupCallModal(true);
};

  socket.on("groupCallStarted", handleGroupCallStarted);
  socket.on("incomingGroupCall", handleIncomingGroupCall);

  return () => {
    socket.off("groupCallStarted", handleGroupCallStarted);
    socket.off("incomingGroupCall", handleIncomingGroupCall);
  };
}, []);

useEffect(() => {
  let timer;

  const bothConnected =
    groupCallState === "connected" &&
    groupRemoteStreams.length > 0 &&
    groupConnectedAt;

  if (bothConnected) {
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - groupConnectedAt) / 1000);
      setGroupCallSeconds(elapsed >= 0 ? elapsed : 0);
    };

    updateTimer();
    timer = setInterval(updateTimer, 1000);
  } else {
    setGroupCallSeconds(0);
  }

  return () => {
    if (timer) clearInterval(timer);
  };
}, [groupCallState, groupRemoteStreams.length, groupConnectedAt]);

 useEffect(() => {
  if (!currentUserId || !socket) return;

  const handleRegister = () => {
    const id = String(currentUserId);
    console.log("[Call System] Registering User:", id);
    socket.emit("registerUser", id);
  };

  const handleRegistrationStatus = (data) => {
    console.log("[Call System] Registered successfully:", data);
  };

  const handleIncomingDebug = (data) => {
    console.log("[Call System] Incoming call received in dashboard:", data);
  };

  handleRegister();

  socket.on("connect", handleRegister);
  socket.on("registrationStatus", handleRegistrationStatus);
  socket.on("incomingCall", handleIncomingDebug);

  return () => {
    socket.off("connect", handleRegister);
    socket.off("registrationStatus", handleRegistrationStatus);
    socket.off("incomingCall", handleIncomingDebug);
  };
}, [currentUserId]);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFriendProfile, setShowFriendProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;
    
    // 🔥 Sync latest user data from backend
    const syncProfile = async () => {
      try {
        const res = await api.get("/user/profile", {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.data) {
          localStorage.setItem("user", JSON.stringify(res.data));
          setCurrentUser(res.data);
        }
      } catch (err) {
        console.error("Profile sync failed", err);
      }
    };
    
    syncProfile();
    fetchIncomingRequests();
    fetchFriends();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      navigate("/");
    }
  }, [currentUserId, navigate]);

  if (!currentUser || !currentUserId) {
    return <div className="loading-state">Loading dashboard...</div>;
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Sync edit profile state when modal opens
  useEffect(() => {
    if (showEditProfile) {
      setEditDisplayName(currentUser?.displayName || currentUser?.username || "");
      setEditPhone(currentUser?.phone || "");
      setProfilePicPreview(currentUser?.profilePic || "");
      setEditPassword("");
    }
  }, [showEditProfile]);

  // ✅ Receive messages
  useEffect(() => {
    socket.on("receiveMessage", (newMessage) => {
      setMessages((prev) => {
        const exists = prev.some((msg) => msg._id === newMessage._id);
        if (exists) return prev;

        // allow real-time only for active chat
        if (
          conversationId &&
          newMessage.conversationId !== conversationId
        ) {
          return prev;
        }

        return [...prev, newMessage];
      });
    });

    return () => socket.off("receiveMessage");
  }, [conversationId]);
  useEffect(() => {
    if (!conversationId) return;

    socket.emit("markSeen", {
      conversationId,
      userId: currentUserId,
    });
  }, [conversationId]);

  useEffect(() => {
    socket.on("messagesSeen", ({ userId }) => {
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          seen: {
            status: true,
          },
        }))
      );
    });

    return () => socket.off("messagesSeen");
  }, []);

  // ✅ Auto scroll only on new messages at the bottom
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg._id !== prevLastMessageId.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      prevLastMessageId.current = lastMsg._id;
    }
  }, [messages]);

  // ✅ Typing receive
  useEffect(() => {
    socket.on("typing", (user) => {
      if (user !== currentUser.username) {
        setTypingUser(user);

        // 🔥 clear old timer
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // 🔥 set new timer
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUser("");
        }, 1500);
      }
    });

    return () => {
      socket.off("typing");

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // ✅ Receive message deletion
  useEffect(() => {
    socket.on("messageDeleted", (messageId) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    });

    return () => socket.off("messageDeleted");
  }, []);

  const fetchUsers = async (searchValue) => {
    try {
      const trimmed = searchValue.trim();

      if (!trimmed) {
        setUsers([]);
        setShowDropdown(false);
        return;
      }

      const res = await api.get(
        `/user/search?q=${encodeURIComponent(trimmed)}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      setUsers(res.data.users || []);
      setSearchType(res.data.type || "username");
      setShowDropdown(true);
    } catch (error) {
      console.log(error.response?.data || error.message);
    }
  };

  const fetchIncomingRequests = async () => {
    try {
      const res = await api.get("/user/friend-requests", {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      setIncomingRequests(res.data.incoming || []);
      setOutgoingRequests(res.data.outgoing || []);
    } catch (error) {
      console.log(error.response?.data || error.message);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await api.get("/user/friends", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setFriends(res.data);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const fetchBlocklist = async () => {
    try {
      const res = await api.get("/user/blocklist", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setBlockedUsers(res.data);
    } catch (error) {
      console.error("Error fetching blocklist:", error);
    }
  };

 const fetchConversations = async () => {
  try {
    const res = await api.get("/conversations", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    const sorted = [...res.data].sort((a, b) => {
      if (a.isGroup && !b.isGroup) return -1;
      if (!a.isGroup && b.isGroup) return 1;

      // one-to-one duplicates me old/original chat ko pehle rakho
      if (!a.isGroup && !b.isGroup) {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }

      // groups latest first
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    const uniqueConversations = [];
    const seenOneToOne = new Set();

    sorted.forEach((conv) => {
      if (conv.isGroup) {
        uniqueConversations.push(conv);
        return;
      }

      const otherMember = conv.members?.find(
        (m) => String(m?._id || m) !== String(currentUserId)
      );

      if (!otherMember) return;

      const key = String(otherMember?._id || otherMember);

      if (!seenOneToOne.has(key)) {
        seenOneToOne.add(key);
        uniqueConversations.push(conv);
      }
    });

    setConversations(uniqueConversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
  }
};

  useEffect(() => {
    fetchIncomingRequests();
    fetchFriends();
    fetchBlocklist();
    fetchConversations();
  }, []);

  const handleChange = async (e) => {
    const value = e.target.value;
    setQuery(value);
    await fetchUsers(value);
  };

  const sendRequest = async (receiverId) => {
    try {
      const res = await api.post(
        `/user/friend-request/${receiverId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      alert(res.data.message);
      fetchIncomingRequests();
      setShowDropdown(false);
      setQuery("");
      setUsers([]);
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

const cancelRequest = async (requestId) => {
  try {
    const res = await api.delete(
      `/user/friend-request/cancel/${requestId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    alert(res.data.message);
    fetchIncomingRequests();
  } catch (error) {
    alert(error.response?.data?.message || error.message);
  }
};

  const acceptRequest = async (requestId) => {
    try {
      const res = await api.post(
        `/user/friend-request/accept/${requestId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      alert(res.data.message);
      fetchIncomingRequests();
      fetchFriends();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      const res = await api.post(
        `/user/friend-request/reject/${requestId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      alert(res.data.message);
      fetchIncomingRequests();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

  const handleBlockUser = async (targetId) => {
    if (!window.confirm("Are you sure you want to block this user? They will be removed from your friends list.")) return;
    try {
      await api.post(`/user/block/${targetId}`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setShowFriendProfile(false);
      setSelectedFriend(null);
      fetchFriends();
      fetchBlocklist();
      fetchConversations();
    } catch (error) {
      alert(error.response?.data?.message || "Error blocking user");
    }
  };

  const handleUnblockUser = async (targetId) => {
    try {
      await api.post(`/user/unblock/${targetId}`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchBlocklist();
      fetchFriends();
      fetchConversations();
    } catch (error) {
      alert(error.response?.data?.message || "Error unblocking user");
    }
  };

  const openChat = async (friend) => {
    try {
      const res = await api.post(
        `/conversations/start/${friend._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      setSelectedFriend(friend);
      setConversationId(res.data._id);
      setHasMore(true);

      socket.emit("joinConversation", res.data._id);

      const msgRes = await api.get(`/conversations/messages/${res.data._id}?limit=10&skip=0`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      setMessages(msgRes.data);
      if (msgRes.data.length < 10) setHasMore(false);
      
      // Also ensure we have the latest friend data
      setSelectedFriend(friend);
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };



const openExistingConversation = async (conv) => {
  try {
    const friend = conv.members?.find(
      (m) => String(m?._id || m) !== String(currentUserId)
    );

    if (!friend) return;

    setSelectedFriend(friend);
    setConversationId(conv._id);
    setHasMore(true);

    socket.emit("joinConversation", conv._id);

    const msgRes = await api.get(
      `/conversations/messages/${conv._id}?limit=10&skip=0`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    setMessages(msgRes.data);
    if (msgRes.data.length < 10) setHasMore(false);
  } catch (error) {
    alert(error.response?.data?.message || error.message);
  }
};

 const openGroupChat = async (group) => {
  try {
    setSelectedFriend({
      _id: group._id,
      displayName: group.groupName,
      username: group.groupName,
      profilePic: group.groupImage,
      isGroup: true,
      members: group.members,
      groupAdmin: group.groupAdmin,
      groupAdmins: group.groupAdmins,
    });

    setConversationId(group._id);
    setHasMore(true);

    socket.emit("joinConversation", group._id);

    const msgRes = await api.get(
      `/conversations/messages/${group._id}?limit=10&skip=0`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    setMessages(msgRes.data);
    if (msgRes.data.length < 10) setHasMore(false);
  } catch (error) {
    alert(error.response?.data?.message || error.message);
  }
};

const startGroupCall = (groupId, type = "audio") => {
  if (!selectedFriend?.isGroup) return;

  startRealGroupCall(selectedFriend, type);
};

  const toggleGroupMember = (friendId) => {
  setSelectedGroupMembers((prev) =>
    prev.includes(friendId)
      ? prev.filter((id) => id !== friendId)
      : [...prev, friendId]
  );
};

const handleCreateGroup = async (e) => {
  e.preventDefault();

  if (!groupName.trim()) {
    alert("Group name is required");
    return;
  }

  if (selectedGroupMembers.length < 2) {
    alert("Select at least 2 friends");
    return;
  }

  try {
    const res = await api.post(
      "/conversations/group/create",
      {
        groupName: groupName.trim(),
        members: selectedGroupMembers,
      },
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    setConversations((prev) => [res.data, ...prev]);
    setShowCreateGroup(false);
    setGroupName("");
    setSelectedGroupMembers([]);

    alert("Group created successfully");
  } catch (error) {
    alert(error.response?.data?.message || error.message);
  }
};

  const loadMoreMessages = async () => {
    if (!hasMore || isLoadingMore || !conversationId) return;

    try {
      setIsLoadingMore(true);
      const container = chatHistoryRef.current;
      const currentScrollHeight = container.scrollHeight;

      const res = await api.get(
        `/conversations/messages/${conversationId}?limit=10&skip=${messages.length}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (res.data.length === 0) {
        setHasMore(false);
      } else {
        const newMessages = res.data;
        setMessages((prev) => [...newMessages, ...prev]);
        if (newMessages.length < 10) setHasMore(false);

        // 🔥 Maintain scroll position after prepending messages
        setTimeout(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - currentScrollHeight;
          }
        }, 0);
      }
      setIsLoadingMore(false);
    } catch (error) {
      console.error("LOAD MORE ERROR:", error);
      setIsLoadingMore(false);
    }
  };

  const handleScroll = (e) => {
    if (e.target.scrollTop === 0 && hasMore && !isLoadingMore) {
      loadMoreMessages();
    }
  };

  const handleVoiceRecording = (audioBlob) => {
    const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(audioBlob));
  };

  const handleVideoRecording = (videoBlob) => {
    const file = new File([videoBlob], `video-${Date.now()}.webm`, { type: "video/webm" });
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(videoBlob));
  };
 const handleDownloadFile = async (url, fileName = "download") => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.log("Download failed, opening file:", error);
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

  const handleDeleteMessage = async (messageId, type) => {
    try {
      await api.delete(`/conversations/messages/${messageId}?type=${type}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      // Update local state
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      setActiveMessageMenu(null);

      // Notify others via socket ONLY if deleted for everyone
      if (type === "everyone") {
        socket.emit("deleteMessage", { conversationId, messageId });
      }
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed");
    }
  };

const handleDeleteChat = async (convId) => {
  if (
    !window.confirm(
      "Delete this chat? All messages in this chat will be deleted."
    )
  ) {
    return;
  }

  try {
    const res = await api.delete(`/conversations/${convId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    setConversations((prev) => prev.filter((conv) => conv._id !== convId));

    if (conversationId === convId) {
      setSelectedFriend(null);
      setConversationId("");
      setMessages([]);
      setMessageText("");
      setSelectedFile(null);
      setFilePreviewUrl("");
    }

    alert(res.data.message);
  } catch (error) {
    alert(error.response?.data?.message || error.message);
  }
};

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageText.trim() && !selectedFile) return;
    if (!conversationId) return;

    try {
      let fileUrl = null;
      let fileType = "text";
      let fileName = null;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (!uploadRes.data?.url) {
          alert("Upload failed: no URL returned");
          return;
        }

        fileUrl = uploadRes.data.url;
        fileName = selectedFile.name;

        if (selectedFile.type.startsWith("image")) fileType = "image";
        else if (selectedFile.type.startsWith("video")) fileType = "video";
        else if (selectedFile.type.startsWith("audio")) fileType = "audio";
        else fileType = "file";
      }

      const res = await api.post(
        `/conversations/messages/${conversationId}`,
        {
          text: messageText,
          type: fileType,
          fileUrl,
          fileName
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      socket.emit("sendMessage", {
        ...res.data,
        conversationId,
      });

      setMessageText("");
      setSelectedFile(null);
      setFilePreviewUrl("");
      fetchConversations();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

const handleUpdateGroup = async (e) => {
  e.preventDefault();

  if (!selectedFriend?.isGroup) return;

  setIsUpdatingGroup(true);

  try {
    let finalGroupImage = selectedFriend?.profilePic || "";

    if (editGroupImageFile) {
      const formData = new FormData();
      formData.append("file", editGroupImageFile);

      const uploadRes = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      finalGroupImage = uploadRes.data.url;
    }

    const res = await api.put(
      `/conversations/group/${selectedFriend._id}/update`,
      {
        groupName: editGroupName,
        groupImage: finalGroupImage,
      },
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    const updatedGroup = res.data.group;

    syncUpdatedGroup(updatedGroup);

    setShowGroupProfile(false);
    setEditGroupImageFile(null);
    setEditGroupImagePreview("");

    alert("Group updated successfully");
  } catch (error) {
    alert(error.response?.data?.message || error.message);
  } finally {
    setIsUpdatingGroup(false);
  }
};

const syncUpdatedGroup = (updatedGroup) => {
  const normalizedGroup = {
    _id: updatedGroup._id,
    displayName: updatedGroup.groupName,
    username: updatedGroup.groupName,
    profilePic: updatedGroup.groupImage,
    isGroup: true,
    members: updatedGroup.members,
    groupAdmin: updatedGroup.groupAdmin,
    groupAdmins: updatedGroup.groupAdmins,
  };

  setSelectedFriend(normalizedGroup);

  setConversations((prev) =>
    prev.map((conv) => (conv._id === updatedGroup._id ? updatedGroup : conv))
  );
};

const handleAddGroupMember = async () => {
  if (!addMemberId || !selectedFriend?.isGroup) return;

  try {
    const res = await api.post(
      `/conversations/group/${selectedFriend._id}/add-member`,
      { memberId: addMemberId },
      {
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    );

    syncUpdatedGroup(res.data.group);
    setAddMemberId("");
    alert(res.data.message);
  } catch (error) {
    alert(error.response?.data?.message || error.message);
  }
};

const handleRemoveGroupMember = async (memberId) => {
  if (!window.confirm("Remove this member from group?")) return;

  try {
    const res = await api.delete(
      `/conversations/group/${selectedFriend._id}/remove-member/${memberId}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    );

    syncUpdatedGroup(res.data.group);
    alert(res.data.message);
  } catch (error) {
    alert(error.response?.data?.message || error.message);
  }
};

const handleMakeGroupAdmin = async (memberId) => {
  try {
    const res = await api.put(
      `/conversations/group/${selectedFriend._id}/make-admin/${memberId}`,
      {},
      {
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    );

    syncUpdatedGroup(res.data.group);
    alert(res.data.message);
  } catch (error) {
    alert(error.response?.data?.message || error.message);
  }
};

const handleRemoveGroupAdmin = async (memberId) => {
  try {
    const res = await api.put(
      `/conversations/group/${selectedFriend._id}/remove-admin/${memberId}`,
      {},
      {
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    );

    syncUpdatedGroup(res.data.group);
    alert(res.data.message);
  } catch (error) {
    alert(error.response?.data?.message || error.message);
  }
};
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      let finalProfilePic = currentUser?.profilePic || "";

      if (profilePicFile) {
        const formData = new FormData();
        formData.append("file", profilePicFile);
        const uploadRes = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalProfilePic = uploadRes.data.url;
      }

      const payload = {
        displayName: editDisplayName,
        phone: editPhone,
        profilePic: finalProfilePic
      };
      if (editPassword) payload.password = editPassword;

      const res = await api.put("/user/profile", payload, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      alert(res.data.message);

      const updatedUser = { ...currentUser, ...res.data.user };
localStorage.setItem("user", JSON.stringify(updatedUser));
setCurrentUser(updatedUser);

setShowEditProfile(false);
setEditPassword("");
setProfilePicFile(null);
setProfilePicPreview("");
setIsUpdating(false);
    } catch (error) {
      setIsUpdating(false);
      alert(error.response?.data?.message || error.message);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Call UI Overlays */}
       
       {groupCallState !== "idle" && (
  <div className="call-screen-overlay">
    <div className={`call-screen ${groupCallState}`}>
      <div className="call-screen-top">
        <p className="call-type-label">
          {showGroupVideoUI ? "Group Video Call" : "Group Audio Call"}
        </p>

        <h2 className="call-person-name">
          {groupCallInfo?.groupName || "Group Call"}
        </h2>

        <p className="call-status-text">
          {(groupCallState === "calling" ||
  (groupCallState === "connected" && groupRemoteStreams.length === 0)) &&
  "Connecting..."}

{groupCallState === "connected" && groupRemoteStreams.length > 0 &&
  `Connected · ${formatCallTime(groupCallSeconds)} · ${
    groupRemoteStreams.length + 1
  } participant(s)`}
        </p>
      </div>

      <div className="call-avatar-area">
        {showGroupVideoUI ? (
          <div className="group-video-grid">
            <div className="group-video-tile local">
              <video
  autoPlay
  playsInline
  muted
  ref={(video) => {
    if (video && groupLocalStream) {
      video.srcObject = groupLocalStream;
      video.play?.().catch((err) => {
        console.log("Group local video play blocked:", err);
      });
    }
  }}
/>

              {groupCameraOff && (
                <div className="camera-off-badge">Camera Off</div>
              )}

              <span className="video-name">You</span>
            </div>

            {groupRemoteStreams.map((item) => (
              <div key={item.userId} className="group-video-tile">
                <video
  autoPlay
  playsInline
  ref={(video) => {
    if (video && item.stream) {
      video.srcObject = item.stream;
      video.play?.().catch((err) => {
        console.log("Group remote video play blocked:", err);
      });
    }
  }}
/>
                <span className="video-name">{item.name || "Member"}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="group-audio-members">
            <div className="call-avatar-pulse">
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay"></div>

              {groupCallInfo?.groupImage ? (
                <img
                  src={groupCallInfo.groupImage}
                  alt="Group"
                  className="call-avatar-img"
                />
              ) : (
                <div className="call-avatar-placeholder">👥</div>
              )}
            </div>

            <p className="call-status-text">
              {groupRemoteStreams.length + 1} member(s) in call
            </p>
          </div>
        )}
      </div>

      <div className="group-audio-players">
  {groupRemoteStreams.map((item) => (
    <GroupAudioPlayer
      key={item.userId}
      userId={item.userId}
      stream={item.stream}
    />
  ))}
</div>

      <div className="call-screen-actions">
        <button
          className={`call-action-btn control ${groupMuted ? "active" : ""}`}
          onClick={toggleGroupMute}
          title={groupMuted ? "Unmute" : "Mute"}
          type="button"
        >
          {groupMuted ? "🔇" : "🎙️"}
        </button>
          {groupCallType === "audio" &&
  groupCallState === "connected" &&
  groupRemoteStreams.length > 0 && (
    <button
      className="call-action-btn control"
      onClick={switchGroupToVideo}
      title="Switch to Video"
      type="button"
    >
      🎥
    </button>
  )}

        {groupCallType === "video" && (
  <button
    className={`call-action-btn control ${groupCameraOff ? "active" : ""}`}
    onClick={toggleGroupCamera}
    title={groupCameraOff ? "Turn Camera On" : "Turn Camera Off"}
    type="button"
  >
    {groupCameraOff ? "📷" : "🚫📷"}
  </button>
)}

        <button
          className="call-action-btn reject"
          onClick={endGroupCall}
          title="End Group Call"
          type="button"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
)}

       {callState !== "idle" && (
  <div className="call-screen-overlay">
    <div className={`call-screen ${callState}`}>
      <div className="call-screen-top">
        <p className="call-type-label">
          {showOneToOneVideoUI ? "Video Call" : "Audio Call"}
        </p>

        <h2 className="call-person-name">
  {callDisplayName}
</h2>

        <p className="call-status-text">
  {callState === "ringing" && "Ringing..."}
  {callState === "calling" && "Calling..."}
  {callState === "connected" && `Connected · ${formatCallTime(callSeconds)}`}
</p>
      </div>

    <div className="call-avatar-area">
  {showOneToOneVideoUI && callState === "connected" ? (
    <div className="call-video-wrapper">
      {!remoteStream && (
        <div className="video-loading">
          Connecting video...
        </div>
      )}

      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted
        className="call-remote-video"
      />

      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="call-local-video"
      />
       
       {isCameraOff && (
  <div className="camera-off-badge">
    Camera Off
  </div>
)}

    </div>
  ) : (
    <div className="call-avatar-pulse">
      <div className="pulse-ring"></div>
      <div className="pulse-ring delay"></div>

      {callDisplayPic ? (
  <img
    src={callDisplayPic}
    alt="Caller"
    className="call-avatar-img"
  />
) : (
  <div className="call-avatar-placeholder">
    {callDisplayInitial}
  </div>
)}
    </div>
  )}
</div>

     <div className="call-screen-actions">
  {callState === "ringing" ? (
    <>
      <button
        className="call-action-btn accept"
        onClick={answerCall}
        disabled={callState !== "ringing"}
        title="Accept Call"
      >
        📞
      </button>

      <button
        className="call-action-btn reject"
        onClick={rejectCall}
        title="Reject Call"
      >
        ✕
      </button>
    </>
  ) : (
    <>
      {(callState === "calling" || callState === "connected") && (
        <button
          className={`call-action-btn control ${isMuted ? "active" : ""}`}
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          type="button"
        >
          {isMuted ? "🔇" : "🎙️"}
        </button>
        
      )}
      {callType === "audio" && callState === "connected" && (
  <button
    className="call-action-btn control"
    onClick={switchToVideo}
    title="Switch to Video"
    type="button"
  >
    🎥
  </button>
)}

      {callType === "video" && callState === "connected" && (
        <button
          className={`call-action-btn control ${isCameraOff ? "active" : ""}`}
          onClick={toggleCamera}
          title={isCameraOff ? "Camera On" : "Camera Off"}
          type="button"
        >
          {isCameraOff ? "📷" : "🚫📷"}
        </button>
      )}

      <button
        className="call-action-btn reject"
        onClick={endCall}
        title="End Call"
        type="button"
      >
        ✕
      </button>
    </>
  )}
</div>

      <audio ref={remoteAudioRef} autoPlay style={{ display: "none" }} />
    </div>
  </div>
)}

      {/* Modals and Overlays */}
      {showGroupCallModal && incomingGroupCall && (
  <div className="call-modal">
    <div className="profile-card">
      <button
        className="close-profile"
        onClick={() => {
          setShowGroupCallModal(false);
          setIncomingGroupCall(null);
        }}
      >
        ×
      </button>

      <div className="profile-card-header">
        {incomingGroupCall.groupImage ? (
          <img
            src={incomingGroupCall.groupImage}
            alt="Group"
            className="large-avatar"
          />
        ) : (
          <div className="large-avatar-placeholder">👥</div>
        )}

        <h2>{incomingGroupCall.groupName}</h2>
        <p>
          {incomingGroupCall.name} started a {incomingGroupCall.callType} call
        </p>
      </div>

      <div className="profile-card-footer">
       <button
  className="btn-accept"
  onClick={() => {
    joinGroupCall(incomingGroupCall);
    setShowGroupCallModal(false);
    setIncomingGroupCall(null);
  }}
>
  Accept
</button>

        <button
          className="btn-reject"
          onClick={() => {
            setShowGroupCallModal(false);
            setIncomingGroupCall(null);
          }}
        >
          Reject
        </button>
      </div>
    </div>
  </div>
)}

{showGroupProfile && selectedFriend?.isGroup && (
  <div className="call-modal" onClick={() => setShowGroupProfile(false)}>
    <div
      className="profile-card group-profile-card"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="close-profile"
        onClick={() => setShowGroupProfile(false)}
      >
        ×
      </button>

      {(() => {
        const adminIds =
          selectedFriend.groupAdmins?.length > 0
            ? selectedFriend.groupAdmins.map((admin) =>
                String(admin?._id || admin)
              )
            : [String(selectedFriend.groupAdmin?._id || selectedFriend.groupAdmin)];

        const isCurrentUserAdmin = adminIds.includes(String(currentUserId));

        const availableFriendsToAdd = friends?.filter((friend) => {
          const isAlreadyMember = selectedFriend.members?.some(
            (member) => String(member?._id || member) === String(friend._id)
          );

          const isBlocked = blockedUsers?.some(
            (blocked) => String(blocked?._id || blocked) === String(friend._id)
          );

          return !isAlreadyMember && !isBlocked;
        });

        return (
          <>
            <div className="profile-card-header">
              {editGroupImagePreview ? (
                <img
                  src={editGroupImagePreview}
                  alt="Group"
                  className="large-avatar"
                />
              ) : (
                <div className="large-avatar-placeholder">👥</div>
              )}

              <h2>{selectedFriend.displayName}</h2>

              <p>{selectedFriend.members?.length || 0} members</p>
            </div>

            {isCurrentUserAdmin ? (
              <>
                <form onSubmit={handleUpdateGroup}>
                  <div className="form-group">
                    <label>Group Name</label>
                    <input
                      type="text"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      placeholder="Enter group name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Group Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        setEditGroupImageFile(file);
                        setEditGroupImagePreview(URL.createObjectURL(file));
                      }}
                    />
                  </div>

                  <div className="modal-actions">
                    <button
                      type="submit"
                      className="btn-save"
                      disabled={isUpdatingGroup}
                    >
                      {isUpdatingGroup ? "Saving..." : "Save Group"}
                    </button>

                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setShowGroupProfile(false)}
                      disabled={isUpdatingGroup}
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                <div className="group-members-box">
                  <h3>Add Member</h3>

                  <div className="form-group">
                    <select
                      value={addMemberId}
                      onChange={(e) => setAddMemberId(e.target.value)}
                    >
                      <option value="">Select friend to add</option>

                      {availableFriendsToAdd?.map((friend) => (
                        <option key={friend._id} value={friend._id}>
                          {friend.displayName || friend.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn-save"
                    onClick={handleAddGroupMember}
                    disabled={!addMemberId}
                  >
                    Add Member
                  </button>
                </div>
              </>
            ) : (
              <p style={{ textAlign: "center", color: "#6b7280" }}>
                Only admin can edit group, add members, remove members, and manage admins.
              </p>
            )}

            <div className="group-members-box">
              <h3>Members</h3>

              {selectedFriend.members?.map((member) => {
                const memberId = String(member._id);
                const isAdmin = adminIds.includes(memberId);
                const isMe = memberId === String(currentUserId);

                return (
                  <div key={member._id} className="group-member-row">
                    <div className="item-avatar">
                      {member.profilePic ? (
                        <img src={member.profilePic} alt="Member" />
                      ) : (
                        <div className="avatar-placeholder-sm">
                          {member.displayName?.charAt(0) ||
                            member.username?.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="item-info">
                      <span className="friend-name">
                        {member.displayName || member.username}
                        {isMe ? " (You)" : ""}
                      </span>

                      <span className="search-sub">
                        {isAdmin ? "Admin" : "Member"}
                      </span>
                    </div>

                    {isCurrentUserAdmin && !isMe && (
                      <div className="request-actions">
                        {isAdmin ? (
                          <button
                            type="button"
                            className="btn-reject"
                            onClick={() => handleRemoveGroupAdmin(member._id)}
                          >
                            Remove Admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-accept"
                            onClick={() => handleMakeGroupAdmin(member._id)}
                          >
                            Make Admin
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-reject"
                          onClick={() => handleRemoveGroupMember(member._id)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
    </div>
  </div>
)}
      {showFriendProfile && selectedFriend && (
        <div className="call-modal" onClick={() => setShowFriendProfile(false)}>
          <div className="profile-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-profile" onClick={() => setShowFriendProfile(false)}>×</button>
            <div className="profile-card-header">
              {selectedFriend.profilePic ? (
                <img src={selectedFriend.profilePic} alt="Profile" className="large-avatar" />
              ) : (
                <div className="large-avatar-placeholder">
                  {selectedFriend.displayName?.charAt(0) || selectedFriend.username?.charAt(0)}
                </div>
              )}
              <h2>{selectedFriend.displayName || selectedFriend.username}</h2>
            </div>
            <div className="profile-card-body">
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{selectedFriend.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Phone</span>
                <span className="info-value">{selectedFriend.phone || "Not provided"}</span>
              </div>
            </div>
            <div className="profile-card-footer">
              {blockedUsers?.some(u => String(u?._id || u) === String(selectedFriend?._id)) ? (
                <button className="btn-unblock-large" onClick={() => handleUnblockUser(selectedFriend._id)}>Unblock User</button>
              ) : (
                <button className="btn-block" onClick={() => handleBlockUser(selectedFriend._id)}>Block User</button>
              )}
            </div>
          </div>
        </div>
      )}


      

      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-user-info">
            <div className="user-avatar-container" onClick={() => setShowEditProfile(true)}>
              {currentUser?.profilePic ? (
                <img src={currentUser.profilePic} alt="Me" className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">{currentUser?.displayName?.charAt(0) || currentUser?.username?.charAt(0)}</div>
              )}
            </div>
            <div className="sidebar-user-details">
              <h1 className="sidebar-title">Messages</h1>
              <span className="user-display-name">{currentUser?.displayName || currentUser?.username}</span>
            </div>
            <button onClick={() => setShowEditProfile(true)} className="btn-edit-profile" title="Settings">⚙️</button>
          </div>
          <div className="search-container" ref={searchBoxRef}>
            <input
              type="text"
              placeholder="Search users..."
              value={query}
              onChange={handleChange}
              onFocus={() => {
                if (users.length > 0) setShowDropdown(true);
              }}
              className="search-input"
            />
            {showDropdown && query.trim() && (
              <div className="search-dropdown">
                {users.map((user) => (
                  <div key={user._id} className="search-item">
                    <div className="item-avatar">
                      {user.profilePic ? (
                        <img src={user.profilePic} alt="User" />
                      ) : (
                        <div className="avatar-placeholder-sm">{user.displayName?.charAt(0) || user.username?.charAt(0)}</div>
                      )}
                    </div>
                    <div className="item-info">
                      <span className="search-username">{user.displayName || user.username}</span>
                      <span className="search-sub">@{user.username}</span>
                    </div>
                    <button onClick={() => sendRequest(user._id)} className="btn-add">Add</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-content">
          <button
  className="btn-create-group"
  onClick={() => setShowCreateGroup(true)}
>
  + Create Group
</button>
          <div className="requests-section">
            <h2 className="section-title">Friend Requests ({incomingRequests.length})</h2>
            {incomingRequests.length > 0 ? (
              <div className="requests-list">
                {incomingRequests.map((req) => (
                  <div key={req._id} className="request-item">
                    <div className="item-avatar">
                      {req.senderId.profilePic ? (
                        <img src={req.senderId.profilePic} alt="Sender" />
                      ) : (
                        <div className="avatar-placeholder-sm">{req.senderId.displayName?.charAt(0) || req.senderId.username?.charAt(0)}</div>
                      )}
                    </div>
                    <div className="item-info">
                      <span className="request-name">{req.senderId.displayName || req.senderId.username}</span>
                    </div>
                    <div className="request-actions">
                      <button onClick={() => acceptRequest(req._id)} className="btn-accept">Accept</button>
                      <button onClick={() => rejectRequest(req._id)} className="btn-reject">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "#6b7280" }}>No pending requests</div>
            )}
          </div>

<div className="requests-section" style={{ marginTop: "20px" }}>
  <h2 className="section-title">
    Sent Requests ({outgoingRequests.length})
  </h2>

  {outgoingRequests.length > 0 ? (
    <div className="requests-list">
      {outgoingRequests.map((req) => (
        <div key={req._id} className="request-item">
          <div className="item-avatar">
            {req.receiverId?.profilePic ? (
              <img src={req.receiverId.profilePic} alt="Receiver" />
            ) : (
              <div className="avatar-placeholder-sm">
                {req.receiverId?.displayName?.charAt(0) ||
                  req.receiverId?.username?.charAt(0) ||
                  "U"}
              </div>
            )}
          </div>

          <div className="item-info">
            <span className="request-name">
              {req.receiverId?.displayName || req.receiverId?.username}
            </span>
            <span className="search-sub">Request sent</span>
          </div>
          <button
    onClick={() => cancelRequest(req._id)}
    className="btn-reject"
  >
    Cancel
  </button>
        </div>
      ))}
    </div>
  ) : (
    <div style={{ fontSize: "13px", color: "#6b7280" }}>
      No sent requests
    </div>
  )}
</div>
          <div className="requests-section" style={{ marginTop: "20px" }}>
  <h2 className="section-title">
    GROUPS ({conversations?.filter((c) => c.isGroup).length || 0})
  </h2>

  <div className="friends-list">
    {conversations
      ?.filter((conv) => conv.isGroup)
      .map((group) => (
        <div
          key={group._id}
          className={`friend-item ${conversationId === group._id ? "active" : ""}`}
          onClick={() => openGroupChat(group)}
        >
          <div className="item-avatar">
            {group.groupImage ? (
              <img src={group.groupImage} alt="Group" />
            ) : (
              <div className="avatar-placeholder-sm">👥</div>
            )}
          </div>

          <div className="item-info">
            <span className="friend-name">👥 {group.groupName}</span>
            <p className="last-msg-preview">
              {group.lastMessage || "No messages yet"}
            </p>
          </div>
        </div>
      ))}
  </div>
</div>

<div className="requests-section" style={{ marginTop: "20px" }}>
  <h2 className="section-title">
    CHATS ({conversations?.filter((c) => !c.isGroup).length || 0})
  </h2>

  <div className="friends-list">
    {conversations
      ?.filter((conv) => !conv.isGroup)
      .map((conv) => {
        const friend = conv.members?.find(
          (m) => String(m?._id || m) !== String(currentUserId)
        );

        if (!friend) return null;

        return (
          <div
            key={conv._id}
            className={`friend-item ${conversationId === conv._id ? "active" : ""}`}
            onClick={() => openExistingConversation(conv)}
          >
            <div className="item-avatar">
              {friend.profilePic ? (
                <img src={friend.profilePic} alt="Friend" />
              ) : (
                <div className="avatar-placeholder-sm">
                  {friend.displayName?.charAt(0) || friend.username?.charAt(0)}
                </div>
              )}
            </div>

            <div className="item-info">
              <span className="friend-name">
                {friend.displayName || friend.username}
              </span>
              <p className="last-msg-preview">
                {conv.lastMessage || "No messages yet"}
              </p>
            </div>
             <button
    type="button"
    className="chat-delete-btn"
    onClick={(e) => {
      e.stopPropagation();
      handleDeleteChat(conv._id);
    }}
    title="Delete Chat"
  >
    🗑
  </button>
          </div>
        );
      })}
  </div>
</div>

          <h2 className="section-title" style={{ marginTop: "20px" }}>Friends ({friends?.filter(f => !blockedUsers?.some(b => String(b?._id || b) === String(f?._id || f))).length || 0})</h2>
          <div className="friends-list">
            {friends
              ?.filter(f => !blockedUsers?.some(b => String(b?._id || b) === String(f?._id || f)))
              .map((f) => (
              <div
                key={f._id}
                className={`friend-item ${selectedFriend?._id === f._id ? "active" : ""}`}
                onClick={() => openChat(f)}
              >
                <div className="item-avatar" onClick={(e) => { e.stopPropagation(); setSelectedFriend(f); setShowFriendProfile(true); }}>
                  {f.profilePic ? (
                    <img src={f.profilePic} alt="Friend" />
                  ) : (
                    <div className="avatar-placeholder-sm">{f.displayName?.charAt(0) || f.username?.charAt(0)}</div>
                  )}
                </div>
                <div className="item-info">
                  <span className="friend-name">{f.displayName || f.username}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="requests-section" style={{ marginTop: "30px" }}>
            <h2 className="section-title">Blocklist ({blockedUsers?.length || 0})</h2>
            {blockedUsers.length > 0 ? (
              <div className="requests-list">
                {blockedUsers.map((user) => (
                  <div key={user._id} className="request-item">
                    <div className="item-avatar">
                      {user.profilePic ? (
                        <img src={user.profilePic} alt="Blocked" />
                      ) : (
                        <div className="avatar-placeholder-sm">{user.displayName?.charAt(0) || user.username?.charAt(0)}</div>
                      )}
                    </div>
                    <div className="item-info">
                      <span className="request-name">{user.displayName || user.username}</span>
                    </div>
                    <button onClick={() => handleUnblockUser(user._id)} className="btn-unblock">Unblock</button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "#6b7280" }}>No blocked users</div>
            )}
          </div>
        </div>
      </div>

      <div className="main-chat">
        {selectedFriend ? (
          <>
            <div
  className="chat-header"
  onClick={() => {
  if (selectedFriend?.isGroup) {
    setEditGroupName(selectedFriend.displayName || "");
    setEditGroupImagePreview(selectedFriend.profilePic || "");
    setEditGroupImageFile(null);
    setShowGroupProfile(true);
  } else {
    setShowFriendProfile(true);
  }
}}
style={{ cursor: "pointer" }}
>
              <div className="chat-header-avatar">
                {selectedFriend.profilePic ? (
                  <img src={selectedFriend.profilePic} alt="Friend" />
                ) : (
                  <div className="avatar-placeholder-sm">{selectedFriend.displayName?.charAt(0) || selectedFriend.username?.charAt(0)}</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h2 className="chat-friend-name">{selectedFriend.displayName || selectedFriend.username}</h2>
                <span className="chat-friend-status">Online</span>
              </div>
               {selectedFriend?.isGroup ? (
  <>
    <button
      className="btn-call"
      onClick={(e) => {
        e.stopPropagation();

        console.log("GROUP AUDIO CALL:", {
          groupId: selectedFriend?._id,
          groupName: selectedFriend?.displayName || selectedFriend?.username,
        });

        startGroupCall(selectedFriend._id, "audio");
      }}
      title="Group Audio Call"
      disabled={callState !== "idle"}
    >
      📞
    </button>

    <button
      className="btn-call"
      onClick={(e) => {
        e.stopPropagation();

        console.log("GROUP VIDEO CALL:", {
          groupId: selectedFriend?._id,
          groupName: selectedFriend?.displayName || selectedFriend?.username,
        });

        startGroupCall(selectedFriend._id, "video");
      }}
      title="Group Video Call"
      disabled={callState !== "idle"}
    >
      🎥
    </button>
  </>
) : (
  <>
    <button
      className="btn-call"
      onClick={(e) => {
        e.stopPropagation();

        if (
          blockedUsers.some(
            (u) => String(u?._id || u) === String(selectedFriend?._id)
          )
        ) {
          alert("You have blocked this user. Unblock to call.");
          return;
        }

        console.log("AUDIO CALLING USER:", {
          myId: currentUser?._id || currentUser?.id,
          targetId: selectedFriend?._id || selectedFriend?.id,
          targetName: selectedFriend?.displayName || selectedFriend?.username,
        });

        startCall(selectedFriend._id, "audio");
      }}
      title="Audio Call"
      disabled={callState !== "idle"}
    >
      📞
    </button>

    <button
      className="btn-call"
      onClick={(e) => {
        e.stopPropagation();

        if (
          blockedUsers.some(
            (u) => String(u?._id || u) === String(selectedFriend?._id)
          )
        ) {
          alert("You have blocked this user. Unblock to call.");
          return;
        }

        console.log("VIDEO CALLING USER:", {
          myId: currentUser?._id || currentUser?.id,
          targetId: selectedFriend?._id || selectedFriend?.id,
          targetName: selectedFriend?.displayName || selectedFriend?.username,
        });

        startCall(selectedFriend._id, "video");
      }}
      title="Video Call"
      disabled={callState !== "idle"}
    >
      🎥
    </button>
  </>
)}
            </div>

            <div className="chat-history" ref={chatHistoryRef} onScroll={handleScroll}>
              {isLoadingMore && <div className="loading-more">Loading older messages...</div>}
              {messages.map((msg) => {
                const isSent = msg.senderId._id === currentUserId;
                return (
                  <div key={msg._id} className={`message-wrapper ${isSent ? "sent" : "received"}`}>
                    {!isSent && (
                      <div className="message-avatar">
                        {msg.senderId.profilePic ? (
                          <img src={msg.senderId.profilePic} alt="Sender" />
                        ) : (
                          <div className="avatar-placeholder-xs">{msg.senderId.displayName?.charAt(0) || msg.senderId.username?.charAt(0)}</div>
                        )}
                      </div>
                    )}
                    <div className="message-bubble">
                      {msg.type === "text" && msg.text}

                      {msg.type === "image" && (
  <div className="message-media image-message">
    <img src={msg.fileUrl} alt={msg.fileName || "attachment"} />

    <button
      type="button"
      className="media-save-btn"
      onClick={() =>
        handleDownloadFile(
          msg.fileUrl,
          msg.fileName || `image-${msg._id}.jpg`
        )
      }
    >
      Save
    </button>
  </div>
)}

                      {msg.type === "video" && (
                        <div className="message-media">
                          <video src={msg.fileUrl} controls />
                        </div>
                      )}

                      {msg.type === "audio" && (
                        <div className="message-media">
                          <audio src={msg.fileUrl} controls />
                        </div>
                      )}

                      {msg.type === "file" && (
                        <div className="message-media">
                          {(msg.fileUrl.match(/\.(pdf)$/i) || msg.fileName?.match(/\.(pdf)$/i)) ? (
                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                              <div className="file-content-preview">
                                <img
                                  src={msg.fileUrl.replace("/raw/upload/", "/image/upload/").replace(".pdf", ".jpg")}
                                  alt="PDF Preview"
                                  style={{ width: "100%", height: "auto" }}
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "flex";
                                  }}
                                />
                                <div className="pdf-fallback" style={{ display: "none", alignItems: "center", justifyContent: "center", height: "140px", fontSize: "40px" }}>📄</div>
                              </div>
                              <div className="file-preview-label">
                                <span>📄</span>
                                <span>{msg.fileName || "Document.pdf"}</span>
                              </div>
                            </a>
                          ) : (
                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="message-file-card-universal">
                              <div className="file-card-icon">
                                {msg.fileUrl.match(/\.(doc|docx)$/i) ? "📝" :
                                 msg.fileUrl.match(/\.(xls|xlsx)$/i) ? "📊" :
                                 msg.fileUrl.match(/\.(zip|rar|7z)$/i) ? "📦" :
                                 msg.fileUrl.match(/\.(txt)$/i) ? "📃" : "📁"}
                              </div>
                              <div className="file-card-details">
                                <span className="file-card-name">{msg.fileName || "Download File"}</span>
                                <span className="file-card-action">Click to Download</span>
                              </div>
                            </a>
                          )}
                        </div>
                      )}

                      <button
                        className="msg-delete-btn"
                        onClick={() => setActiveMessageMenu(activeMessageMenu === msg._id ? null : msg._id)}
                        title="Delete options"
                      >
                        ×
                      </button>

                      {activeMessageMenu === msg._id && (
                        <div className="msg-delete-menu">
                          <button onClick={() => handleDeleteMessage(msg._id, "me")}>
                            Delete for me
                          </button>
                          {isSent && (
                            <button className="danger" onClick={() => handleDeleteMessage(msg._id, "everyone")}>
                              Delete for everyone
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {isSent && (
                      <div className="message-status">
                        {msg.createdAt && (
                          <span style={{ marginRight: "6px", fontSize: "10px" }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {msg.seen?.status ? (
                          <span style={{ color: "#3b82f6", fontWeight: "900", fontSize: "14px", letterSpacing: "-2px" }}>✓✓</span>
                        ) : (
                          <span style={{ color: "#9ca3af", fontWeight: "900", fontSize: "14px", letterSpacing: "-2px" }}>✓✓</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={chatEndRef}></div>
            </div>

            <div className="typing-indicator">
              {typingUser ? `${typingUser} is typing...` : ""}
            </div>

            {blockedUsers?.some(u => String(u?._id || u) === String(selectedFriend?._id)) ? (
              <div className="blocked-message-notice">
                You have blocked this user. <span onClick={() => handleUnblockUser(selectedFriend._id)}>Unblock</span> to resume conversation.
              </div>
            ) : (
              <div className="chat-input-area">
                {/* ✅ Attachment Preview */}
                {selectedFile && (
                  <div className="attachment-preview">
                    {selectedFile.type.startsWith("image") ? (
                      <img src={filePreviewUrl} alt="preview" />
                    ) : selectedFile.type.startsWith("audio") ? (
                      <div className="audio-preview-container">
                        <audio src={filePreviewUrl} controls />
                      </div>
                    ) : selectedFile.type.startsWith("video") ? (
                      <div className="video-preview-container">
                        <video src={filePreviewUrl} controls />
                      </div>
                    ) : selectedFile.type === "application/pdf" ? (
                      <div className="pdf-attachment-preview">
                        <iframe src={filePreviewUrl + "#toolbar=0&navpanes=0&scrollbar=0"} title="PDF Preview"></iframe>
                        <div className="pdf-overlay-click-shield"></div>
                      </div>
                    ) : (
                      <span className="attachment-name">📎 {selectedFile.name}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); setFilePreviewUrl(""); }}
                      className="btn-remove-attachment"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="chat-form">
                  <label className="btn-attach" title="Send Image">
                    🖼️
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setSelectedFile(file);
                        setFilePreviewUrl(URL.createObjectURL(file));
                        e.target.value = "";
                      }}
                    />
                  </label>

                  <label className="btn-attach" title="Attach File">
                    📎
                    <input
                      type="file"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        setSelectedFile(file);

                        if (file.type.startsWith("image") || file.type === "application/pdf") {
                          setFilePreviewUrl(URL.createObjectURL(file));
                        } else {
                          setFilePreviewUrl("");
                        }

                        e.target.value = "";
                      }}
                    />
                  </label>

                  <VoiceRecorder onRecordingComplete={handleVoiceRecording} />
                  <VideoRecorder onRecordingComplete={handleVideoRecording} />

                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      socket.emit("typing", {
                        conversationId,
                        user: currentUser.username,
                      });
                    }}
                    className="chat-input"
                  />

                  <button type="submit" className="btn-send" disabled={!messageText.trim() && !selectedFile}>
                    Send
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="empty-chat-state">
            Select a friend to start chatting
          </div>
        )}
      </div>

      {showCreateGroup && (
  <div className="modal-overlay">
    <div className="modal-content group-modal">
      <h2>Create Group</h2>

      <form onSubmit={handleCreateGroup}>
        <div className="form-group">
          <label>Group Name</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
          />
        </div>

        <div className="form-group">
          <label>Select Friends</label>

          <div className="group-members-list">
            {friends
              ?.filter(
                (f) =>
                  !blockedUsers?.some(
                    (b) => String(b?._id || b) === String(f?._id || f)
                  )
              )
              .map((friend) => (
                <label key={friend._id} className="group-member-item">
                  <input
                    type="checkbox"
                    checked={selectedGroupMembers.includes(friend._id)}
                    onChange={() => toggleGroupMember(friend._id)}
                  />

                  <div className="item-avatar">
                    {friend.profilePic ? (
                      <img src={friend.profilePic} alt="Friend" />
                    ) : (
                      <div className="avatar-placeholder-sm">
                        {friend.displayName?.charAt(0) ||
                          friend.username?.charAt(0)}
                      </div>
                    )}
                  </div>

                  <span>{friend.displayName || friend.username}</span>
                </label>
              ))}
          </div>
        </div>

        <div className="modal-actions">
          <button type="submit" className="btn-save">
            Create
          </button>

          <button
            type="button"
            className="btn-cancel"
            onClick={() => {
              setShowCreateGroup(false);
              setGroupName("");
              setSelectedGroupMembers([]);
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="modal-overlay">
          <div className="modal-content profile-modal">
            <h2>Edit Profile</h2>
            <form onSubmit={handleUpdateProfile}>
              <div className="profile-pic-section">
                <div className="profile-pic-container">
                  {profilePicPreview ? (
                    <img src={profilePicPreview} alt="Profile" className="profile-pic-preview" />
                  ) : (
                    <div className="profile-pic-placeholder">{editDisplayName?.charAt(0) || currentUser?.username?.charAt(0)}</div>
                  )}
                  <label className="profile-pic-upload">
                    <span>Change Photo</span>
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setProfilePicFile(file);
                          setProfilePicPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Username (Internal)</label>
                  <input type="text" value={currentUser?.username} disabled className="input-disabled" />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="text" value={currentUser?.email} disabled className="input-disabled" />
                </div>
                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    required
                    placeholder="Enter display name"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <PhoneInput
                    country={"pk"}
                    value={editPhone}
                    onChange={(phone) => setEditPhone(phone)}
                    enableSearch={true}
                    prefix="+"
                    containerClass="phone-input-container"
                    inputClass="phone-input-field"
                    buttonClass="phone-input-button"
                    dropdownClass="phone-input-dropdown"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="form-group full-width">
                  <label>New Password (optional)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-save" disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowEditProfile(false)} disabled={isUpdating}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;

//https://chatgpt.com/share/69eae63c-0a24-8324-a5b4-fd0c8efcdb6c
//npm run dev -- --host 0.0.0.0