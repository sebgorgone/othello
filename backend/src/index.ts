import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("server alive");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("user connected:", socket.id);

  socket.on("message", (data) => {
    console.log("message:", data);

    io.emit("message", data);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});
