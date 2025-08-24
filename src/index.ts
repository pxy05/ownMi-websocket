import { WebSocketServer } from "ws";
import { verifyUserToken } from "./verify-user";
import {
  updateSessionHeartbeat,
  endSession,
  startSession,
  createSession,
  verifySession,
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

    if (!data.type && typeof data.type !== "string") {
      console.error("Invalid message type:", data);
      return;
    }

    switch (data.type) {
      case "create-session":
        console.log(new Date(), "Creating session for user:", user.id);
        await createSession(user.id, "from_zero", null);
        ws.send(JSON.stringify({ type: "sessionCreated" }));
        break;

      case "start-session":
        console.log(new Date(), "Starting session for user:", user.id);
        await startSession(user.id);
        ws.send(JSON.stringify({ type: "sessionStarted" }));
        break;

      case "end-session":
        console.log(new Date(), "Ending session for user:", user.id);
        await endSession(user.id);
        ws.send(JSON.stringify({ type: "sessionEnded" }));
        break;

      case "heartbeat":
        await updateSessionHeartbeat(user.id);
        break;

      case "session-check":
        const exists = await verifySession(user.id);
        if (exists) {
          ws.send(JSON.stringify({ type: "sessionExists" }));
        } else {
          ws.send(JSON.stringify({ type: "noSessionExists" }));
        }
        break;

      default:
        break;
    }
  });

  ws.on("close", async () => {
    console.log("WebSocket connection closed for user:", user.id);
    await endSession(user.id);
  });
});

console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
