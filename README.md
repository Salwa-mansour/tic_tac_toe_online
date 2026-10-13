<div align="center">

# 🎮 Minimalist Tic-Tac-Toe Online

A clean, real-time two-player Tic-Tac-Toe game featuring instant room pairing, score tracking, and a distraction-free minimalist interface.

[**Explore Live Demo**](https://tic-tac-toe-online-henna-phi.vercel.app/) · [**Report Bug**](https://github.com/Salwa-mansour/tic_tac_toe_online/issues)

</div>

<br>

---

## ⚡ About The Project

A lightweight, real-time multiplayer web game built for quick matches. It features a modern, minimal aesthetic that focuses purely on the gameplay experience, backed by WebSockets for instant synchronization and a database to track historical wins.

### ✨ Key Features
* **Real-Time Multiplayer:** Instant move updates and turn syncing using Socket.io.
* **Minimalist UI:** Clean, distraction-free design focused on smooth UX.
* **Room Management:** Easily create or join private matches via room codes.

---

## 🛠️ Tech Stack

* **Frontend:** React, Vite, CSS 
* **Backend:** Node.js, Express.js, Socket.io
* **Database:** MongoDB, Mongoose

---

## 📂 Getting Started

To run this project locally:

1. **Clone the repo:**
   ```bash
   git clone [https://github.com/Salwa-mansour/tic_tac_toe_online.git](https://github.com/Salwa-mansour/tic_tac_toe_online.git)Backend Setup:

Bash
```
cd backend
pnpm install
# Add your PORT and MONGO_URI in a .env file
pnpm run dev
```
Frontend Setup:

Bash
```
cd ../frontend
pnpm install
```
# Add your VITE_SOCKET_URL in a .env file
```
pnpm run dev
```
💡 What I Learned
Building this project sharpened my skills in setting up event-driven WebSocket architectures, handling server-authoritative game state, and persisting user stats with MongoDB.

📝 License
Distributed under the MIT License.
