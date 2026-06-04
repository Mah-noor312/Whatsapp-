import { useState, useRef, useEffect } from "react";

const VideoRecorder = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setShowModal(true);
      // Wait for modal to render and video element to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera/microphone. Please ensure permissions are granted.");
    }
  };

  const startRecording = () => {
    chunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      onRecordingComplete(blob);
      closeModal();
    };
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const closeModal = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowModal(false);
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingTime(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="video-recorder-container">
      <button type="button" onClick={startCamera} className="btn-camera" title="Record Video">
        📹
      </button>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content video-modal">
            <h2 className="modal-title">Record Video</h2>
            <div className="video-preview-wrapper">
              <video ref={videoRef} autoPlay muted playsInline className="live-video-preview" />
              {isRecording && (
                <div className="video-recording-indicator">
                  <span className="recording-dot"></span>
                  <span className="video-timer">{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>
            <div className="modal-actions">
              {!isRecording ? (
                <button type="button" onClick={startRecording} className="btn-record-action start">
                  Start Recording
                </button>
              ) : (
                <button type="button" onClick={stopRecording} className="btn-record-action stop">
                  Stop Recording
                </button>
              )}
              <button type="button" onClick={closeModal} className="btn-cancel-record" disabled={isRecording}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;
