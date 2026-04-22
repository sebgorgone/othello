import type { Express } from "express";
import type { Server } from "socket.io";
import { createRoom, listRooms, MAX_PLAYERS_PER_ROOM, ROOM_TTL_MS, sweepExpiredRooms } from "./socket-helper.js";
import { getBoard, turn } from "./db-query.js";

type CheckDbFn = () => Promise<unknown>;

export function registerApiRoutes(app: Express, io: Server, checkDB: CheckDbFn): void {
	app.get("/health", async (req, res) => {
		try {
			const db = await checkDB();

			const health = {
				server: "up",
				db,
			};
			res.json(health);
		} catch (err) {
			console.error("/health failed:", err);
			res.status(500).json({ error: "health-check-failed" });
		}
	});

	app.post("/rooms", async (req, res) => {
		try {
			const room = await createRoom();

			res.status(201).json({
				ok: true,
				roomCode: room.code,
				maxPlayers: MAX_PLAYERS_PER_ROOM,
				joinEvent: "join-room",
				ttlMs: ROOM_TTL_MS,
				expiresAt: room.expiresAt,
			});
		} catch (err) {
			console.error("POST /rooms failed:", err);
			res.status(500).json({ error: "create-room-failed" });
		}
	});

	app.get("/rooms", async (req, res) => {
		try {
			await sweepExpiredRooms(io);

			res.json({
				rooms: listRooms().map(({ code, playerCount, expiresAt }) => ({
					code,
					playerCount,
					expiresAt,
				})),
			});
		} catch (err) {
			console.error("GET /rooms failed:", err);
			res.status(500).json({ error: "list-rooms-failed" });
		}
	});

   app.get("/board", async (req, res) => {
      try {
         const game_id = String(req.query.game_id ?? "");
         const socket_id = String(req.query.socket_id ?? "");

         if (!game_id || !socket_id) {
            return res.status(400).json({ error: "game_id-or-socket_id-malformed" });
         }

         const board = await getBoard(game_id, socket_id);
         return res.status(200).json({ board });
      } catch (err: any) {
         console.error("GET /board failed:", err);

         if (err?.message === "game not found") {
            return res.status(404).json({ error: "game-not-found" });
         }

         return res.status(500).json({ error: "get-board-failed" });
      }
   });

	app.post("/turn", async (req, res) => {
		try {
			const game_id = String(req.body?.game_id ?? "");
			const socket_id = String(req.body?.socket_id ?? "");
			const x = Number(req.body?.x);
			const y = Number(req.body?.y);

			if (!game_id || !socket_id || !Number.isInteger(x) || !Number.isInteger(y)) {
				return res.status(400).json({ error: "turn-malformed" });
			}

			await turn(game_id, x, y, socket_id);
			io.to(game_id).emit("refresh-board", { game_id });

			return res.status(200).json({ ok: true });
		} catch (err) {
			console.error("POST /turn failed:", err);
			return res.status(500).json({ error: "turn-failed" });
		}
	});
}
