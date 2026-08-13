import { Player } from "../models/Player.js";
import jwt from 'jsonwebtoken';
import { validateIdentifier } from '../utils/validate.js';

export const registerOrLogin = async (req, res) => {
  console.log('Register/Login Request:', req.body);
  try {
    const { identifier } = req.body;

    // 1. Validate if it's an email or phone number
    const result = validateIdentifier(identifier);
    if (!result) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address or phone number.' 
      });
    }

    const { cleanIdentifier, type } = result;

    // 2. Find existing player OR create new
    let player = await Player.findOne({ identifier: cleanIdentifier });

    if (!player) {
      player = await Player.create({ 
        identifier: cleanIdentifier, 
        type 
      });
      console.log(`New player registered (${type}): ${cleanIdentifier}`);
    } else {
      console.log(`Player logged in (${type}): ${cleanIdentifier}`);
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { 
        playerId: player._id, 
        identifier: player.identifier 
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 4. Return response
    return res.status(200).json({
      message: 'Success',
      token,
      player: {
        id: player._id,
        identifier: player.identifier,
        type: player.type,
        wins: player.wins,
        losses: player.losses,
        draws: player.draws
      }
    });

  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
}