// models/Game.js
import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema(
  {
    gameType: {
      type: String,
      default: 'TicTacToe'
    },
    player1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    player2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null // null if the game is a draw or ongoing
    },
    isDraw: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['ONGOING', 'COMPLETED'],
      default: 'COMPLETED'
    }
  },
  { timestamps: true }
);

export const Game = mongoose.model('Game', gameSchema);