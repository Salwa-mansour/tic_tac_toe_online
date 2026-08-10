import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: { identifier: "player1@example.com" }
});

socket.on("presence:online_players", (players) => {
  console.log("Online Players List:", players);
});