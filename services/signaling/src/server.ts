import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";

type Role = "host" | "client";
type SocketMessage =
  | { readonly type: "create-room" }
  | { readonly type: "join-room"; readonly roomCode: string }
  | { readonly type: "reconnect"; readonly roomCode: string; readonly token: string }
  | { readonly type: "offer" | "answer" | "ice-candidate"; readonly payload: unknown };

interface Participant {
  socket: WebSocket | null;
  readonly token: string;
}

interface Room {
  readonly code: string;
  readonly expiresAt: number;
  readonly host: Participant;
  client: Participant | null;
}

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
const ROOM_TTL_MS = Number.parseInt(process.env.ROOM_TTL_MS ?? "600000", 10);
const ROOM_CODE_BYTES = 5;
const CLEANUP_INTERVAL_MS = 60_000;
const HEALTH_STATUS_CODE = 200;
const NOT_FOUND_STATUS_CODE = 404;
const rooms = new Map<string, Room>();

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(HEALTH_STATUS_CODE, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }
  response.writeHead(NOT_FOUND_STATUS_CODE).end();
});
const webSocketServer = new WebSocketServer({ server: httpServer });

webSocketServer.on("connection", (socket) => {
  let attachment: { roomCode: string; role: Role } | null = null;
  socket.on("message", (raw) => {
    attachment = handleSocketMessage(socket, attachment, raw.toString());
  });
  socket.on("close", () => {
    if (!attachment) return;
    const room = rooms.get(attachment.roomCode);
    if (!room) return;
    const participant = attachment.role === "host" ? room.host : room.client;
    if (participant?.socket === socket) participant.socket = null;
    notifyPeer(room, attachment.role, { type: "peer-disconnected" });
  });
});

function handleSocketMessage(
  socket: WebSocket,
  attachment: { roomCode: string; role: Role } | null,
  raw: string,
): { roomCode: string; role: Role } | null {
  const message = parseMessage(raw);
  if (!message) return reportAttachmentError(socket, attachment, "invalid-message");
  if (message.type === "create-room") return createHostAttachment(socket, attachment);
  if (message.type === "join-room" || message.type === "reconnect")
    return joinRoom(socket, message, attachment);
  return relayMessage(socket, message, attachment);
}

function createHostAttachment(
  socket: WebSocket,
  attachment: { roomCode: string; role: Role } | null,
): { roomCode: string; role: Role } | null {
  if (attachment) return reportAttachmentError(socket, attachment, "already-joined");
  const room = createRoom(socket);
  send(socket, { type: "room-created", roomCode: room.code, token: room.host.token });
  return { roomCode: room.code, role: "host" };
}

function joinRoom(
  socket: WebSocket,
  message: Extract<SocketMessage, { type: "join-room" | "reconnect" }>,
  attachment: { roomCode: string; role: Role } | null,
): { roomCode: string; role: Role } | null {
  if (attachment) return reportAttachmentError(socket, attachment, "already-joined");
  const result = attachParticipant(socket, message);
  if (result.type === "error") return reportAttachmentError(socket, attachment, result.reason);
  send(socket, result.response);
  notifyPeer(result.room, result.attachment.role, { type: "peer-connected" });
  return result.attachment;
}

function relayMessage(
  socket: WebSocket,
  message: Extract<SocketMessage, { type: "offer" | "answer" | "ice-candidate" }>,
  attachment: { roomCode: string; role: Role } | null,
): { roomCode: string; role: Role } | null {
  if (!attachment) return reportAttachmentError(socket, attachment, "not-joined");
  const room = rooms.get(attachment.roomCode);
  if (!room) return reportAttachmentError(socket, attachment, "room-not-found");
  relay(room, attachment.role, message);
  return attachment;
}

function reportAttachmentError(
  socket: WebSocket,
  attachment: { roomCode: string; role: Role } | null,
  reason: string,
): { roomCode: string; role: Role } | null {
  send(socket, { type: "error", reason });
  return attachment;
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) if (room.expiresAt <= now) rooms.delete(code);
}, CLEANUP_INTERVAL_MS).unref();

httpServer.listen(PORT, () => console.log(`Signaling service listening on ${PORT}`));

function createRoom(socket: WebSocket): Room {
  let code = createCode();
  while (rooms.has(code)) code = createCode();
  const room: Room = {
    code,
    expiresAt: Date.now() + ROOM_TTL_MS,
    host: { socket, token: createToken() },
    client: null,
  };
  rooms.set(code, room);
  return room;
}

function attachParticipant(
  socket: WebSocket,
  message: Extract<SocketMessage, { type: "join-room" | "reconnect" }>,
):
  | { readonly type: "error"; readonly reason: string }
  | {
      readonly room: Room;
      readonly attachment: { roomCode: string; role: Role };
      readonly response: object;
    } {
  const room = rooms.get(message.roomCode.toUpperCase());
  if (!room || room.expiresAt <= Date.now()) return { type: "error", reason: "room-not-found" };
  if (message.type === "join-room") {
    if (room.client) return { type: "error", reason: "room-full" };
    room.client = { socket, token: createToken() };
    return {
      room,
      attachment: { roomCode: room.code, role: "client" },
      response: { type: "room-joined", roomCode: room.code, token: room.client.token },
    };
  }
  const role = tokenMatches(room.host.token, message.token)
    ? "host"
    : room.client && tokenMatches(room.client.token, message.token)
      ? "client"
      : null;
  if (!role) return { type: "error", reason: "invalid-token" };
  const participant = role === "host" ? room.host : room.client;
  if (!participant) return { type: "error", reason: "invalid-token" };
  participant.socket = socket;
  return {
    room,
    attachment: { roomCode: room.code, role },
    response: { type: "reconnected", roomCode: room.code },
  };
}

function relay(
  room: Room,
  sender: Role,
  message: Extract<SocketMessage, { type: "offer" | "answer" | "ice-candidate" }>,
): void {
  const recipient = sender === "host" ? room.client : room.host;
  if (recipient?.socket) send(recipient.socket, message);
}

function notifyPeer(room: Room, sender: Role, message: object): void {
  const recipient = sender === "host" ? room.client : room.host;
  if (recipient?.socket) send(recipient.socket, message);
}

function send(socket: WebSocket, message: object): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}
function parseMessage(raw: string): SocketMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSocketMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function isSocketMessage(value: unknown): value is SocketMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}
function createCode(): string {
  return randomBytes(ROOM_CODE_BYTES).toString("base64url").toUpperCase();
}
function createToken(): string {
  return randomBytes(24).toString("base64url");
}
function tokenMatches(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return (
    expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
  );
}
