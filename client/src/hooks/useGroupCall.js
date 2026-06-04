import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";

const useGroupCall = (socket, currentUserId, currentUserName, currentUserPic) => {
  const [groupCallState, setGroupCallState] = useState("idle"); // idle, calling, connected
  const [groupCallType, setGroupCallType] = useState("audio");
  const [groupCallInfo, setGroupCallInfo] = useState(null);
  const [groupLocalStream, setGroupLocalStream] = useState(null);
  const [groupRemoteStreams, setGroupRemoteStreams] = useState([]);
  const [groupMuted, setGroupMuted] = useState(false);
  const [groupCameraOff, setGroupCameraOff] = useState(false);
  const [groupConnectedAt, setGroupConnectedAt] = useState(null);

  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const groupInfoRef = useRef(null);

const groupCallTypeRef = useRef("audio");

useEffect(() => {
  groupCallTypeRef.current = groupCallType;
}, [groupCallType]);

const saveGroupRemoteStream = (userId, name, profilePic, remoteStream) => {
  const updateStream = () => {
    setGroupCallState("connected");

    setGroupRemoteStreams((prev) => {
      const clonedStream = new MediaStream(remoteStream.getTracks());

      const exists = prev.some((item) => item.userId === userId);

      if (exists) {
        return prev.map((item) =>
          item.userId === userId
            ? {
                ...item,
                stream: clonedStream,
              }
            : item
        );
      }

      return [
  ...prev,
  {
    userId,
    name,
    profilePic,
    stream: clonedStream,
    cameraOff: false,
  },
];
    });
  };

  updateStream();

  remoteStream.onaddtrack = updateStream;
  remoteStream.onremovetrack = updateStream;
};

  const getGroupMedia = async (type = "audio") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });

      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      stream.getVideoTracks().forEach((track) => {
        track.enabled = type === "video";
      });

      localStreamRef.current = stream;
      setGroupLocalStream(stream);

      return stream;
    } catch (error) {
      console.error("Group media error:", error);
      alert(
        type === "video"
          ? "Could not access camera/microphone."
          : "Could not access microphone."
      );
      return null;
    }
  };

  const startGroupCall = async (group, type = "audio") => {
    if (!group?._id || !currentUserId) return;

    const stream = await getGroupMedia(type);
    if (!stream) return;

    const info = {
      groupId: group._id,
      groupName: group.displayName || group.groupName || group.username,
      groupImage: group.profilePic || group.groupImage || "",
      callType: type,
    };

    groupInfoRef.current = info;
    setGroupCallInfo(info);
    setGroupCallType(type);
    setGroupConnectedAt(null);
    setGroupRemoteStreams([]);
    setGroupCallState("calling");

    socket.emit("startGroupCall", {
      groupId: group._id,
      from: currentUserId,
      name: currentUserName,
      profilePic: currentUserPic,
      callType: type,
    });
  };

  const joinGroupCall = async (callData) => {
    if (!callData?.groupId || !currentUserId) return;

    const type = callData.callType || "audio";
    const stream = await getGroupMedia(type);
    if (!stream) return;

    const info = {
      groupId: callData.groupId,
      groupName: callData.groupName,
      groupImage: callData.groupImage,
      callType: type,
      callerId: callData.from,
    };

    groupInfoRef.current = info;
    setGroupCallInfo(info);
    setGroupCallType(type);
    setGroupConnectedAt(null);
    setGroupRemoteStreams([]);
    setGroupCallState("calling");

    socket.emit("joinGroupCall", {
      groupId: callData.groupId,
      from: currentUserId,
      name: currentUserName,
      profilePic: currentUserPic,
      callType: type,
    });

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
    });

    peersRef.current[callData.from] = peer;

    peer.on("signal", (signal) => {
      socket.emit("groupCallAnswer", {
        groupId: callData.groupId,
        from: currentUserId,
        to: callData.from,
        signal,
      });
    });

    peer.on("stream", (remoteStream) => {
  saveGroupRemoteStream(
    callData.from,
    callData.name || "User",
    callData.profilePic || "",
    remoteStream
  );
});

    peer.on("error", (err) => {
      console.log("[GROUP PEER ERROR - JOIN]", err);
    });

    peer.on("close", () => {
      console.log("[GROUP PEER CLOSED - JOIN]");
    });
  };

  const createPeerForUser = (targetUserId, type = "audio") => {
    const stream = localStreamRef.current;
    const info = groupInfoRef.current;

    if (!stream || !info?.groupId || !targetUserId) return;
    if (peersRef.current[targetUserId]) return;

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
    });

    peersRef.current[targetUserId] = peer;

    peer.on("signal", (signal) => {
      socket.emit("groupCallSignal", {
        groupId: info.groupId,
        from: currentUserId,
        to: targetUserId,
        signal,
        callType: groupCallTypeRef.current || type,
      });
    });

    peer.on("stream", (remoteStream) => {
  saveGroupRemoteStream(
    targetUserId,
    "Group Member",
    "",
    remoteStream
  );
});

    peer.on("error", (err) => {
      console.log("[GROUP PEER ERROR - CREATE]", err);
    });

    peer.on("close", () => {
      console.log("[GROUP PEER CLOSED - CREATE]");
    });
  };

  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleGroupUserJoined = (data) => {
      const info = groupInfoRef.current;
      if (!info || data.groupId !== info.groupId) return;

      createPeerForUser(data.userId, data.callType || groupCallType);
    };

    const handleGroupCallSignal = (data) => {
      const info = groupInfoRef.current;
      if (!info || data.groupId !== info.groupId) return;
      if (data.callType === "video") {
  setGroupCallType("video");
  groupCallTypeRef.current = "video";

}
      const stream = localStreamRef.current;
      if (!stream) return;

      let peer = peersRef.current[data.from];

      if (!peer) {
        peer = new Peer({
          initiator: false,
          trickle: false,
          stream,
          config: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          },
        });

        peersRef.current[data.from] = peer;

        peer.on("signal", (signal) => {
          socket.emit("groupCallAnswer", {
            groupId: data.groupId,
            from: currentUserId,
            to: data.from,
            signal,
          });
        });

        peer.on("stream", (remoteStream) => {
  saveGroupRemoteStream(
    data.from,
    "Group Member",
    "",
    remoteStream
  );
});

        peer.on("error", (err) => {
          console.log("[GROUP PEER ERROR - SIGNAL]", err);
        });

        peer.on("close", () => {
          console.log("[GROUP PEER CLOSED - SIGNAL]");
        });
      }

      peer.signal(data.signal);
    };

    const handleGroupCallAnswer = (data) => {
      const peer = peersRef.current[data.from];

      if (peer) {
        peer.signal(data.signal);

        if (data.connectedAt) {
          const localConnectedAt = data.serverNow
  ? Date.now() - (data.serverNow - data.connectedAt)
  : Date.now();

setGroupConnectedAt(localConnectedAt);
        }
      }
    };

    const handleGroupCallConnected = (data) => {
      const info = groupInfoRef.current;
      if (!info || data.groupId !== info.groupId) return;

      if (data.connectedAt) {
       const localConnectedAt = data.serverNow
  ? Date.now() - (data.serverNow - data.connectedAt)
  : Date.now();

setGroupConnectedAt(localConnectedAt);
      }
    };

    const handleGroupCameraStatusChanged = (data) => {
  const info = groupInfoRef.current;
  if (!info || data.groupId !== info.groupId) return;

  setGroupRemoteStreams((prev) =>
    prev.map((item) =>
      String(item.userId) === String(data.from)
        ? { ...item, cameraOff: Boolean(data.cameraOff) }
        : item
    )
  );
};

    const handleGroupUserLeft = (data) => {
      const peer = peersRef.current[data.userId];

      if (peer) {
        try {
          peer.destroy();
        } catch (err) {
          console.log("Peer destroy error:", err);
        }

        delete peersRef.current[data.userId];
      }

      setGroupRemoteStreams((prev) => {
        const next = prev.filter((item) => item.userId !== data.userId);

        if (next.length === 0) {
          setTimeout(() => {
            setGroupCallState("idle");
            setGroupCallInfo(null);
            setGroupLocalStream(null);
            setGroupRemoteStreams([]);
            setGroupMuted(false);
            setGroupCameraOff(false);
            setGroupConnectedAt(null);

            Object.values(peersRef.current).forEach((p) => {
              try {
                p.destroy();
              } catch {}
            });

            peersRef.current = {};

            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach((track) => {
                track.stop();
              });
            }

            localStreamRef.current = null;
            groupInfoRef.current = null;
          }, 0);
        }

        return next;
      });
    };

    socket.on("groupUserJoinedCall", handleGroupUserJoined);
    socket.on("groupCallSignal", handleGroupCallSignal);
    socket.on("groupCallAnswer", handleGroupCallAnswer);
    socket.on("groupCallConnected", handleGroupCallConnected);
    socket.on("groupUserLeftCall", handleGroupUserLeft);
  socket.on("groupCameraStatusChanged", handleGroupCameraStatusChanged);

    return () => {
      socket.off("groupUserJoinedCall", handleGroupUserJoined);
      socket.off("groupCallSignal", handleGroupCallSignal);
      socket.off("groupCallAnswer", handleGroupCallAnswer);
      socket.off("groupCallConnected", handleGroupCallConnected);
      socket.off("groupUserLeftCall", handleGroupUserLeft);
      socket.off("groupCameraStatusChanged", handleGroupCameraStatusChanged);
    };
  }, [socket, currentUserId, currentUserName, currentUserPic, groupCallType]);

  const toggleGroupMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    const nextMuted = !groupMuted;

    audioTracks.forEach((track) => {
      track.enabled = !nextMuted;
    });

    setGroupMuted(nextMuted);
  };

const toggleGroupCamera = async () => {
  const stream = localStreamRef.current;
  if (!stream) return;

  try {
    const existingVideoTrack = stream.getVideoTracks()[0];

    // Agar video track exist nahi karta, camera start karo
    if (!existingVideoTrack) {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      const videoTrack = cameraStream.getVideoTracks()[0];

      if (!videoTrack) {
        alert("Camera not found");
        return;
      }

      setGroupCallType("video");
      groupCallTypeRef.current = "video";
      setGroupCameraOff(false);

      stream.addTrack(videoTrack);

      Object.values(peersRef.current).forEach((peer) => {
        try {
          peer.addTrack(videoTrack, stream);
        } catch (err) {
          console.log("Group camera addTrack error:", err);
        }
      });

      localStreamRef.current = stream;
      setGroupLocalStream(new MediaStream(stream.getTracks()));

      const info = groupInfoRef.current;

      if (info?.groupId) {
        socket.emit("groupCameraStatusChanged", {
          groupId: info.groupId,
          from: currentUserId,
          cameraOff: false,
        });
      }

      return;
    }

    // Agar video track exist karta hai, normal on/off karo
    const nextCameraOff = existingVideoTrack.enabled;

    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });

    setGroupCameraOff(nextCameraOff);
    setGroupLocalStream(new MediaStream(stream.getTracks()));

    const info = groupInfoRef.current;

    if (info?.groupId) {
      socket.emit("groupCameraStatusChanged", {
        groupId: info.groupId,
        from: currentUserId,
        cameraOff: nextCameraOff,
      });
    }
  } catch (error) {
    console.error("Toggle group camera error:", error);
    alert("Could not access camera.");
  }
};

  const switchGroupToVideo = async () => {
  if (groupCallTypeRef.current === "video") return;

  const stream = localStreamRef.current;

  if (!stream) {
    alert("Group call is not connected yet");
    return;
  }

  try {
    const existingVideoTrack = stream.getVideoTracks()[0];

    if (existingVideoTrack) {
  existingVideoTrack.enabled = true;
  setGroupCallType("video");
  groupCallTypeRef.current = "video";
  setGroupCameraOff(false);

  const info = groupInfoRef.current;

  if (info?.groupId) {
    socket.emit("groupCameraStatusChanged", {
      groupId: info.groupId,
      from: currentUserId,
      cameraOff: false,
    });
  }

  return;
}

    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    const videoTrack = cameraStream.getVideoTracks()[0];

    if (!videoTrack) {
      alert("Camera not found");
      return;
    }

    setGroupCallType("video");
    groupCallTypeRef.current = "video";
    setGroupCameraOff(false);

    stream.addTrack(videoTrack);

    Object.values(peersRef.current).forEach((peer) => {
      try {
        peer.addTrack(videoTrack, stream);
      } catch (err) {
        console.log("Group video addTrack error:", err);
      }
    });

    localStreamRef.current = stream;
    setGroupLocalStream(new MediaStream(stream.getTracks()));
    const info = groupInfoRef.current;

if (info?.groupId) {
  socket.emit("groupCameraStatusChanged", {
    groupId: info.groupId,
    from: currentUserId,
    cameraOff: false,
  });
}
  } catch (error) {
    console.error("Switch group to video error:", error);
    alert("Could not switch group call to video.");
  }
};


  const endGroupCall = () => {
    const info = groupInfoRef.current;

    setGroupCallState("idle");
    setGroupCallInfo(null);
    setGroupRemoteStreams([]);
    setGroupLocalStream(null);
    setGroupMuted(false);
    setGroupCameraOff(false);
    setGroupConnectedAt(null);

    if (info?.groupId && currentUserId) {
      socket.emit("leaveGroupCall", {
        groupId: info.groupId,
        from: currentUserId,
      });
    }

    Object.values(peersRef.current).forEach((peer) => {
      try {
        peer.destroy();
      } catch (err) {
        console.log("Peer destroy error:", err);
      }
    });

    peersRef.current = {};

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
    }

    localStreamRef.current = null;
    groupInfoRef.current = null;
  };

  return {
  groupCallState,
  groupCallType,
  groupCallInfo,
  groupLocalStream,
  groupRemoteStreams,
  groupMuted,
  groupCameraOff,
  groupConnectedAt,
  startGroupCall,
  joinGroupCall,
  toggleGroupMute,
  toggleGroupCamera,
  switchGroupToVideo,
  endGroupCall,
};
};

export default useGroupCall;