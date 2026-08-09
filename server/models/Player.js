// models/Player.js
import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
   // Holds either an email ("user@test.com") or phone ("+1234567890")
    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    // Optional tag to know if it's phone or email
    type: {
      type: String,
      enum: ['email', 'phone'],
      required: true
    },
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    draws: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export const Player = mongoose.model('Player', playerSchema);