import { WebSocketServer } from "ws";
import { verifyUserToken } from "./verify-user";
import {
  updateSessionHeartbeat,
  endSession,
  startSession,
  createSession,
} from "./session-service";

const PORT = process.env.WS_PORT;
const wss = new WebSocketServer({ port: Number(PORT) });

wss.on("connection", async (ws, req) => {
  const params = new URLSearchParams(req.url?.split("?")[1]);
  const token = params.get("token");

  if (!token) {
    ws.close();
    return;
  }

  const user = await verifyUserToken(token);
  if (!user) {
    ws.close();
    return;
  }

  ws.on("message", async (msg) => {
    const data = JSON.parse(msg.toString());
    console.log("Received WebSocket message:", data);

    if (!data.type && typeof data.type !== "string") {
      console.error("Invalid message type:", data);
      return;
    }

    switch (data.type) {
      case "create-session":
        console.log("Creating session for user:", user.id);
        await createSession(user.id, "from_zero", null);
      case "start-session":
        console.log("Starting session for user:", user.id);
        await startSession(user.id);
        break;
      case "end-session":
        console.log("Ending session for user:", user.id);
        await endSession(user.id);
        break;
      case "heartbeat":
        console.log("Updating heartbeat for user:", user.id);
        await updateSessionHeartbeat(user.id);
      default:
        break;
    }
  });
});

console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
