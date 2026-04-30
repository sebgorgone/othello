import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { checkDB, initDB } from "./db-connect.js";
import cors from "cors";
import { registerApiRoutes } from "./api.js";
import { registerSocketHandlers } from "./socket-helper.js";
import { gameTruncate } from "./db-query.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: path.resolve(__dirname, "../.env")});
const app = express();
app.use(cors({
  origin: '*'
}));

initDB();

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

registerApiRoutes(app, io, checkDB);
registerSocketHandlers(io);

gameTruncate();

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});
