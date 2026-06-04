import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";

const useAudioCall = (
  socket,
  currentUserId,
  currentUserName,
  currentUserProfilePic
) => {
  const [callState, setCallState] = useState("idle");
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [targetUserId, setTargetUserId] = useState(null);
  const [callType, setCallType] = useState("audio");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
const [remoteCameraOff, setRemoteCameraOff] = useState(false);
  const connectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callStateRef = useRef("idle");
  const callTypeRef = useRef("audio");
  const targetUserIdRef = useRef(null);

  const isStartingCallRef = useRef(false);
  const isAnsweringCallRef = useRef(false);
  const hasAnsweredCallRef = useRef(false);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  useEffect(() => {
    targetUserIdRef.current = targetUserId;
  }, [targetUserId]);

  const updateRemoteStream = (stream) => {
    if (!stream) return;

    const update = () => {
      setRemoteStream(new MediaStream(stream.getTracks()));
    };

    update();

    stream.onaddtrack = update;
    stream.onremovetrack = update;
  };

  const resetCallState = () => {
    isStartingCallRef.current = false;
    isAnsweringCallRef.current = false;
    hasAnsweredCallRef.current = false;
    
    setCallState("idle");
    setIncomingCallData(null);
    setTargetUserId(null);
    setCallType("audio");
    setCallStartedAt(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
setRemoteCameraOff(false);

    callStateRef.current = "idle";
    callTypeRef.current = "audio";
    targetUserIdRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    localStreamRef.current = null;
    setLocalStream(null);

    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }

    if (socket) {
      socket.off("callAccepted");
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data) => {
      console.log("[HOOK] Incoming call:", data);

      setIncomingCallData(data);
      setTargetUserId(data.from);
      targetUserIdRef.current = data.from;

      setCallType(data.callType || "audio");
      callTypeRef.current = data.callType || "audio";

      setCallStartedAt(null);
      setCallState("ringing");
      callStateRef.current = "ringing";
    };

    const handleCallEnded = () => {
      console.log("[HOOK] Call ended by remote peer");
      resetCallState();
    };

    const handleCallFailed = (data) => {
      console.log("[HOOK] Call failed:", data);
      alert(data?.message || "Call failed");
      resetCallState();
    };

    const handleCallConnected = ({ acceptedAt }) => {
      console.log("[HOOK] Call connected at:", acceptedAt);

      setCallStartedAt(Date.now());
      setCallState("connected");
      callStateRef.current = "connected";
    };


    const handleCameraStatusChanged = (data) => {
  setRemoteCameraOff(Boolean(data.cameraOff));
};

    const handleCallUpgradeSignal = (data) => {
      console.log("[HOOK] Call upgrade signal:", data);

      if (data.callType === "video") {
        setCallType("video");
        callTypeRef.current = "video";
      }

      if (connectionRef.current && data.signal) {
        connectionRef.current.signal(data.signal);
      }
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callEnded", handleCallEnded);
    socket.on("callFailed", handleCallFailed);
    socket.on("callConnected", handleCallConnected);
    socket.on("callUpgradeSignal", handleCallUpgradeSignal);
    socket.on("cameraStatusChanged", handleCameraStatusChanged);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callEnded", handleCallEnded);
      socket.off("callFailed", handleCallFailed);
      socket.off("callConnected", handleCallConnected);
      socket.off("callUpgradeSignal", handleCallUpgradeSignal);
      socket.off("cameraStatusChanged", handleCameraStatusChanged);
    };
  }, [socket]);

  const getMediaStream = async (type = "audio") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Error accessing media devices.", error);

      if (type === "video") {
        alert("Could not access camera or microphone.");
      } else {
        alert("Could not access microphone.");
      }

      return null;
    }
  };

  const startCall = async (friendId, type = "audio") => {
    if (!friendId || !socket || !currentUserId) return;

    if (isStartingCallRef.current) return;
    isStartingCallRef.current = true;

    setTargetUserId(friendId);
    targetUserIdRef.current = friendId;

    setCallType(type);
    callTypeRef.current = type;

    setCallStartedAt(null);

    const stream = await getMediaStream(type);

    if (!stream) {
      isStartingCallRef.current = false;
      return;
    }

    setCallState("calling");
    callStateRef.current = "calling";

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
    });

    let initialSignalSent = false;

    peer.on("signal", (signalData) => {
      if (!initialSignalSent) {
        initialSignalSent = true;

        socket.emit("callUser", {
          userToCall: friendId,
          signalData,
          from: currentUserId,
          name: currentUserName,
          profilePic: currentUserProfilePic,
          callType: type,
        });

        return;
      }

      socket.emit("callUpgradeSignal", {
        to: friendId,
        from: currentUserId,
        signal: signalData,
        callType: callTypeRef.current,
      });
    });

    peer.on("stream", (stream) => {
      console.log("[HOOK] Remote stream received", {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
      });

      updateRemoteStream(stream);
    });

    peer.on("error", (err) => {
      console.error("[HOOK] Peer error:", err);
      resetCallState();
    });

    const handleCallAccepted = ({ signal, acceptedAt }) => {
      console.log("[HOOK] Call accepted:", acceptedAt);

      setCallStartedAt(Date.now());
      setCallState("connected");
      callStateRef.current = "connected";

      peer.signal(signal);
      socket.off("callAccepted", handleCallAccepted);
    };

    socket.on("callAccepted", handleCallAccepted);

    connectionRef.current = peer;
  };

  const answerCall = async () => {
    if (!incomingCallData || !socket) return;

    if (isAnsweringCallRef.current || hasAnsweredCallRef.current) {
      console.log("[HOOK] Answer already in progress, ignoring duplicate click");
      return;
    }

    isAnsweringCallRef.current = true;
    hasAnsweredCallRef.current = true;

    const type = incomingCallData.callType || "audio";
    const callerId = incomingCallData.from;

    setCallType(type);
    callTypeRef.current = type;

    setTargetUserId(callerId);
    targetUserIdRef.current = callerId;

    setCallStartedAt(null);

    const stream = await getMediaStream(type);

    if (!stream) {
      isAnsweringCallRef.current = false;
      hasAnsweredCallRef.current = false;
      rejectCall();
      return;
    }

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
    });

    let initialAnswerSent = false;

    peer.on("signal", (signal) => {
      if (!initialAnswerSent) {
        initialAnswerSent = true;

        socket.emit("answerCall", {
          signal,
          to: callerId,
        });

        return;
      }

      socket.emit("callUpgradeSignal", {
        to: callerId,
        from: currentUserId,
        signal,
        callType: callTypeRef.current,
      });
    });

    peer.on("stream", (stream) => {
      console.log("[HOOK] Remote stream received after answer", {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
      });

      updateRemoteStream(stream);
    });

    peer.on("error", (err) => {
      console.error("[HOOK] Peer error:", err);
    });

    peer.signal(incomingCallData.signal);

    connectionRef.current = peer;
  };

  const switchToVideo = async () => {
    if (callTypeRef.current === "video") return;

    if (!connectionRef.current || !localStreamRef.current) {
      alert("Call is not connected yet");
      return;
    }

    try {
      const currentStream = localStreamRef.current;

      const existingVideoTrack = currentStream.getVideoTracks()[0];

      if (existingVideoTrack) {
        existingVideoTrack.enabled = true;
        setCallType("video");
        callTypeRef.current = "video";
        setIsCameraOff(false);
        socket.emit("cameraStatusChanged", {
  to: targetUserIdRef.current,
  from: currentUserId,
  cameraOff: false,
});
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

      setCallType("video");
      callTypeRef.current = "video";
      setIsCameraOff(false);

      currentStream.addTrack(videoTrack);

      connectionRef.current.addTrack(videoTrack, currentStream);

      localStreamRef.current = currentStream;
      setLocalStream(new MediaStream(currentStream.getTracks()));
      socket.emit("cameraStatusChanged", {
  to: targetUserIdRef.current,
  from: currentUserId,
  cameraOff: false,
});
    } catch (error) {
      console.error("Switch to video error:", error);
      alert("Could not switch to video call.");
    }
  };

  const rejectCall = () => {
    if (incomingCallData?.from) {
      socket.emit("endCall", { to: incomingCallData.from });
    }

    resetCallState();
  };

  const endCall = () => {
    if (targetUserIdRef.current) {
      socket.emit("endCall", { to: targetUserIdRef.current });
    }

    resetCallState();
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();

    audioTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    const mutedNow = audioTracks.length > 0 ? !audioTracks[0].enabled : false;
    setIsMuted(mutedNow);
  };

 const toggleCamera = async () => {
  const stream = localStreamRef.current;
  if (!stream) return;

  try {
    const existingVideoTrack = stream.getVideoTracks()[0];

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

      setCallType("video");
      callTypeRef.current = "video";
      setIsCameraOff(false);

      stream.addTrack(videoTrack);

      if (connectionRef.current) {
        connectionRef.current.addTrack(videoTrack, stream);
      }

      localStreamRef.current = stream;
      setLocalStream(new MediaStream(stream.getTracks()));

      socket.emit("cameraStatusChanged", {
        to: targetUserIdRef.current,
        from: currentUserId,
        cameraOff: false,
      });

      return;
    }

    const nextCameraOff = existingVideoTrack.enabled;

    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });

    setIsCameraOff(nextCameraOff);
    setLocalStream(new MediaStream(stream.getTracks()));

    socket.emit("cameraStatusChanged", {
      to: targetUserIdRef.current,
      from: currentUserId,
      cameraOff: nextCameraOff,
    });
  } catch (error) {
    console.error("Toggle camera error:", error);
    alert("Could not access camera.");
  }
};

  return {
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
    remoteCameraOff,
  };
};

export default useAudioCall;