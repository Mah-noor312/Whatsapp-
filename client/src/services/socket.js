import { io } from "socket.io-client";

const socket = io("http://192.168.15.206:5000", {
  transports: ["websocket", "polling"],
  withCredentials: true,
});

export default socket;