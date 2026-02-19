// server/src/server.ts
import { createServer } from "http";
import { Server } from "socket.io";
const rooms = {};
const httpServer = createServer();
const io = new Server(httpServer, {
    cors: { origin: "*" },
});
io.on("connection", (socket) => {
    console.log("connected:", socket.id);
    let currentRoomId = null;
    // ===== ルーム参加 =====
    socket.on("joinRoom", (roomId, config) => {
        currentRoomId = roomId;
        socket.join(roomId);
        const playerCount = config?.playerCount ?? 4;
        // ルームがなければ指定人数席作る
        if (!rooms[roomId]) {
            rooms[roomId] = Array.from({ length: playerCount }, () => ({
                socketId: null,
                name: "",
                confirmed: false,
            }));
        }
        const players = rooms[roomId];
        // ★ 上から順番に空席を探す
        let index = -1;
        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            if (!p)
                continue;
            if (p.socketId === null) {
                index = i;
                break;
            }
        }
        if (index === -1)
            return;
        const assigned = players[index];
        if (!assigned)
            return;
        assigned.socketId = socket.id;
        socket.emit("assigned", index);
        io.to(roomId).emit("playersUpdate", rooms[roomId].map(({ name, confirmed }) => ({
            name,
            confirmed,
        })));
    });
    // ===== 名前更新 =====
    socket.on("updateName", (index, name) => {
        if (!currentRoomId)
            return;
        const players = rooms[currentRoomId];
        if (!players)
            return;
        const player = players[index];
        if (!player)
            return;
        if (player.socketId === socket.id) {
            player.name = name;
            io.to(currentRoomId).emit("playersUpdate", players);
        }
    });
    // ===== 確定 / キャンセル =====
    socket.on("confirm", (index) => {
        if (!currentRoomId)
            return;
        const players = rooms[currentRoomId];
        if (!players)
            return;
        const player = players[index];
        if (!player)
            return;
        if (player.socketId === socket.id) {
            player.confirmed = !player.confirmed;
            io.to(currentRoomId).emit("playersUpdate", players);
        }
    });
    // ===== 切断 =====
    socket.on("disconnect", () => {
        if (!currentRoomId)
            return;
        const players = rooms[currentRoomId];
        if (!players)
            return;
        const player = players.find((p) => p.socketId === socket.id);
        if (player) {
            player.socketId = null;
            player.name = "";
            player.confirmed = false;
            io.to(currentRoomId).emit("playersUpdate", players);
        }
    });
    // ===== ゲーム開始 =====
    socket.on("startGame", (roomId) => {
        const players = rooms[roomId];
        if (!players)
            return;
        // 参加している人数（socketIdあり）
        const activePlayers = players.filter((p) => p.socketId !== null);
        // 3人以上いるか
        if (activePlayers.length < 3)
            return;
        // 参加者全員 confirmed しているか
        const allConfirmed = activePlayers.every((p) => p.confirmed);
        if (!allConfirmed)
            return;
        // ホスト（index 0）のみ開始可能
        if (players[0]?.socketId !== socket.id)
            return;
        io.to(roomId).emit("gameStarted");
    });
});
httpServer.listen(3001, () => {
    console.log("Socket.IO running on :3001");
});
//# sourceMappingURL=server.js.map