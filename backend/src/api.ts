import type { Express } from "express";
import type { Server } from "socket.io";
import { createRoom, listRooms, MAX_PLAYERS_PER_ROOM, ROOM_TTL_MS, sweepExpiredRooms } from "./socket-helper.js";

type CheckDbFn = () => Promise<unknown>;

export function registerApiRoutes(app: Express, io: Server, checkDB: CheckDbFn): void {
	app.get("/health", async (req, res) => {
		const db = await checkDB();

		const health = {
			server: "up",
			db,
		};
		res.json(health);
	});

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
		sweepExpiredRooms(io);

		res.json({
			rooms: listRooms().map(({ code, playerCount, expiresAt }) => ({
				code,
				playerCount,
				expiresAt,
			})),
		});
	});
}
