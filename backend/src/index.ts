import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { checkDB, initDB } from "./db-connect.js";
import pool from "./db-connect.js";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: path.resolve(__dirname, "../.env")});
const app = express();
app.use(cors({
  origin: '*'
}));

type Room = {
  code: string;
  sockets: Set<string>;
  createdAt: number;
  expiresAt: number;
};


await initDB();

app.get("/health", async (req, res) => {
  const db = await checkDB();

  const health = {
    server: 'up',
    db
  }
  res.json(health);
});


const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

const MAX_PLAYERS_PER_ROOM = 2;
const ROOM_TTL_MS = 10 * 60 * 1000;
const ROOM_SWEEP_INTERVAL_MS = 30 * 1000;

function isRoomExpired(room: Room, now = Date.now()): boolean {
  return room.expiresAt <= now;
}

// Reusable helper: call this from any endpoint/event that updates a room.
function refreshRoomTtl(roomCode: string): boolean {
  const room = rooms.get(roomCode);

  if (!room) {
    return false;
  }

  room.expiresAt = Date.now() + ROOM_TTL_MS;
  return true;
}

function generateRoomCode(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * alphabet.length);
    result += alphabet[idx];
  }

  return result;
}

function createRoom(): Room {
  let code = generateRoomCode();

  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const room: Room = {
    code,
    sockets: new Set<string>(),
    createdAt: Date.now(),
    expiresAt: Date.now() + ROOM_TTL_MS,
  };

  rooms.set(code, room);

  return room;
}

function leaveCurrentRoom(socketId: string): { roomCode: string; before: number; after: number; deleted: boolean } | null {
  const currentRoomCode = socketToRoom.get(socketId);

  if (!currentRoomCode) {
    return null;
  }

  const room = rooms.get(currentRoomCode);

  if (!room) {
    socketToRoom.delete(socketId);
    return null;
  }

  const before = room.sockets.size;

  room.sockets.delete(socketId);
  socketToRoom.delete(socketId);

  const after = room.sockets.size;

  if (room.sockets.size === 0) {
    rooms.delete(currentRoomCode);
    return {
      roomCode: currentRoomCode,
      before,
      after,
      deleted: true,
    };
  }

  refreshRoomTtl(currentRoomCode);

  return {
    roomCode: currentRoomCode,
    before,
    after,
    deleted: false,
  };
}

function listRooms() {
  return Array.from(rooms.values())
    .map((room) => ({
      code: room.code,
      playerCount: room.sockets.size,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
    }))
    .sort((a, b) => a.createdAt - b.createdAt);
}

app.use(express.json());




app.post("/rooms", (req, res) => {
  const room = createRoom();

  res.status(201).json({
    ok: true,
    roomCode: room.code,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    joinEvent: "join-room",
    ttlMs: ROOM_TTL_MS,
    expiresAt: room.expiresAt,
  });
});


app.get("/rooms", (req, res) => {
  sweepExpiredRooms();

  res.json({
    rooms: listRooms().map(({ code, playerCount, expiresAt }) => ({
      code,
      playerCount,
      expiresAt,
    })),
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

function expireRoom(roomCode: string, reason: string): void {
  const room = rooms.get(roomCode);

  if (!room) {
    return;
  }

  io.to(roomCode).emit("room-closed", { roomCode, reason });

  for (const socketId of room.sockets) {
    socketToRoom.delete(socketId);
    const roomSocket = io.sockets.sockets.get(socketId);
    roomSocket?.leave(roomCode);
  }

  rooms.delete(roomCode);
}

function sweepExpiredRooms(): void {
  const now = Date.now();

  for (const [roomCode, room] of rooms.entries()) {
    if (isRoomExpired(room, now)) {
      expireRoom(roomCode, "ttl-expired");
    }
  }
}

const sweepTimer = setInterval(() => {
  sweepExpiredRooms();
}, ROOM_SWEEP_INTERVAL_MS);

sweepTimer.unref();

io.on("connection", (socket) => {
  const remoteAddress = socket.handshake.headers["x-forwarded-for"] ?? socket.handshake.address;
  const initialRoomQuery = typeof socket.handshake.query.roomCode === "string" ? socket.handshake.query.roomCode : "";

  console.log(`[socket-connect] id=${socket.id} ip=${remoteAddress} requestedRoom=${initialRoomQuery || "none"}`);

  const tryJoinRoom = (rawRoomCode: unknown) => {
    const roomCode = typeof rawRoomCode === "string" ? rawRoomCode.trim().toUpperCase() : "";
    const existingRoomCode = socketToRoom.get(socket.id);

    console.log(
      `[room-join-attempt] id=${socket.id} ip=${remoteAddress} requestedRoom=${roomCode || "none"} existingRoom=${existingRoomCode ?? "none"}`,
    );

    if (!roomCode) {
      console.log(`[room-join-fail] id=${socket.id} reason=roomCode-required`);
      socket.emit("room-error", { message: "roomCode is required" });
      return;
    }

    if (existingRoomCode && existingRoomCode !== roomCode) {
      console.log(
        `[room-join-fail] id=${socket.id} room=${roomCode} reason=socket-already-joined existingRoom=${existingRoomCode}`,
      );
      socket.emit("room-error", { message: "socket already joined a room", roomCode: existingRoomCode });
      return;
    }

    const room = rooms.get(roomCode);

    if (!room) {
      console.log(`[room-join-fail] id=${socket.id} room=${roomCode} reason=room-not-found`);
      socket.emit("room-error", { message: "room not found", roomCode });
      return;
    }

    if (isRoomExpired(room)) {
      console.log(`[room-join-fail] id=${socket.id} room=${roomCode} reason=room-expired`);
      expireRoom(roomCode, "ttl-expired");
      socket.emit("room-error", { message: "room has expired", roomCode });
      return;
    }

    if (room.sockets.size >= MAX_PLAYERS_PER_ROOM && !room.sockets.has(socket.id)) {
      console.log(
        `[room-join-fail] id=${socket.id} room=${roomCode} reason=room-full occupancy=${room.sockets.size}/${MAX_PLAYERS_PER_ROOM}`,
      );
      socket.emit("room-error", { message: "room is full", roomCode });
      return;
    }

    const before = room.sockets.size;
    room.sockets.add(socket.id);
    socketToRoom.set(socket.id, roomCode);
    socket.join(roomCode);
    refreshRoomTtl(roomCode);
    const after = room.sockets.size;

    console.log(
      `[room-join-success] id=${socket.id} ip=${remoteAddress} room=${roomCode} occupancy=${before}->${after}/${MAX_PLAYERS_PER_ROOM} expiresAt=${room.expiresAt}`,
    );

    socket.emit("room-joined", {
      roomCode,
      playerCount: room.sockets.size,
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      expiresAt: room.expiresAt,
    });
  };

  socket.on("join-room", (payload?: { roomCode?: string }) => {
    tryJoinRoom(payload?.roomCode);
  });

  const handshakeRoomCode = socket.handshake.query.roomCode;
  if (typeof handshakeRoomCode === "string") {
    tryJoinRoom(handshakeRoomCode);
  }

  socket.on("disconnect", () => {
    const leaveResult = leaveCurrentRoom(socket.id);

    if (leaveResult) {
      console.log(
        `[socket-disconnect] id=${socket.id} ip=${remoteAddress} room=${leaveResult.roomCode} occupancy=${leaveResult.before}->${leaveResult.after} deleted=${leaveResult.deleted}`,
      );
      return;
    }

    console.log(`[socket-disconnect] id=${socket.id} ip=${remoteAddress} room=none`);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});
