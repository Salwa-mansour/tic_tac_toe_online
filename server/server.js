// server.js
import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from './config/dbConn.js';
import authRouter from './routes/auth.js';
import { setupSocket } from './config/socket.js';

dotenv.config();

const app = express();

// Middleware

app.use(cors({
  origin: process.env.Client_URL || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const server = http.createServer(app);
// Initialize Socket.io
const io = setupSocket(server);

// Database Connection
connectDB();

// Test Route
app.get('/', (req, res) => {
  res.send('Online Game Server Running...');
});
app.use('/auth', authRouter);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});