import React, { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { GameBoard } from './GameBoard'; 

export function LoginAndLobby() {
  // Step 1: User Identifier Input
  const [usernameInput, setUsernameInput] = useState('');
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('game_user') ? JSON.parse(localStorage.getItem('game_user')).identifier : null);
  const [isLogingIn, setIsLogingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
 // const [playerStats, setPlayerStats] = useState({ wins: 0, losses: 0, draws: 0 });

  // Step 2: Selected Game Mode ('NONE', 'AI', or 'ONLINE')
  const [gameMode, setGameMode] = useState('NONE');

  // Socket Hook - activates only when currentUser is set AND mode is 'ONLINE'
  const activeIdentifier = gameMode === 'ONLINE' ? currentUser : null;
  const {
    isConnected,
    onlinePlayers,
    incomingChallenge,
    gameState,
    statusMessage,
    sendChallenge,
    respondToChallenge,
    makeMove,
    resetGameLocalState
  } = useSocket(activeIdentifier);

// Handle Login Submit with Backend API Request
const handleLoginSubmit = async (e) => {
  e.preventDefault();

  const cleanIdentifier = usernameInput.trim();
  if (!cleanIdentifier) return;

  setIsLogingIn(true);
  setLoginError('');

  try {
    // 1. Send authentication request to Express backend
    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register-or-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ identifier: cleanIdentifier })
    });

    const data = await response.json();
   
    // 2. Handle server validation or database errors
    if (!response.ok) {
      throw new Error(data.error || 'Failed to authenticate player.');
    }

    // 3. Persist session token and player profile to localStorage
    localStorage.setItem('game_token', data.token);
    localStorage.setItem('game_user', JSON.stringify(data.player));

    // 4. Update React states with logged-in user details
    setCurrentUser(data.player.identifier);
    setPlayerStats({
      wins: data.player.wins,
      losses: data.player.losses,
      draws: data.player.draws
    });

  } catch (error) {
    console.error('Login Error:', error);
    setLoginError(error.message);
  } finally {
    setIsLogingIn(false);
  }
};
const handleLogout = () => {
  localStorage.removeItem('game_token');
  localStorage.removeItem('game_user');
  setCurrentUser(null);
  setPlayerStats(null);
  setGameMode('NONE');
  if (resetGameLocalState) resetGameLocalState();
};
  // --------------------------------------------------------------------------
  // SCREEN 1: LOGIN FORM
  // --------------------------------------------------------------------------

// SCREEN 1: LOGIN FORM
if (!currentUser) {
  return (
    <div style={styles.card}>
      <h2>Welcome to Tic-Tac-Toe</h2>
      
      {loginError && <div style={styles.errorBox}>{loginError}</div>}

      <form onSubmit={handleLoginSubmit} style={styles.form}>
        <label style={styles.label}>Enter Email or Phone Number:</label>
        <input
          type="text"
          placeholder="e.g. example@gmail.com or +123456789"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          style={styles.input}
          disabled={isLogingIn}
          required
        />
        <button 
          type="submit" 
          style={{ 
            ...styles.button, 
            backgroundColor: isLogingIn ? '#888' : '#228be6',
            cursor: isLogingIn ? 'not-allowed' : 'pointer'
          }}
          disabled={isLogingIn}
        >
          {isLogingIn ? 'Connecting to Database...' : 'Register / Login'}
        </button>
      </form>
    </div>
  );
}
  // --------------------------------------------------------------------------
  // SCREEN 2: MODE SELECTION (COMPUTER VS ONLINE PLAYER)
  // --------------------------------------------------------------------------
  if (gameMode === 'NONE') {
    return (
      <div style={styles.card}>
        <h2>Hello, {currentUser}!</h2>
        <p>Select how you want to play:</p>

        <div style={styles.buttonGroup}>
          <button
            onClick={() => setGameMode('AI')}
            style={{ ...styles.button, backgroundColor: '#2b8a3e' }}
          >
            🤖 Play vs Computer
          </button>

          <button
            onClick={() => setGameMode('ONLINE')}
            style={{ ...styles.button, backgroundColor: '#1864ab' }}
          >
            👥 Play vs Online Player
          </button>
        </div>

        <button
          onClick={() => setCurrentUser(null)}
          style={styles.textButton}
        >
          ← Switch User
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 3A: PLAY AGAINST COMPUTER (OFFLINE)
  // --------------------------------------------------------------------------
// Inside LoginAndLobby component...

// 1. Render AI Game Mode
if (gameMode === 'AI') {
  return (
    <div style={styles.card}>
      <h2>🤖 VS Computer Mode</h2>
      <GameBoard isAiMode={true} />
      <button onClick={() => setGameMode('NONE')} style={styles.textButton}>
        ← Back to Mode Selection
      </button>
    </div>
  );
}

// 2. Render Online Match Active Screen
if (gameState) {
  return (
    <div style={styles.card}>
      <h2>⚔️ Online Match</h2>
      <GameBoard
        isAiMode={false}
        gameState={gameState}
        onMakeMove={makeMove}
        onReset={resetGameLocalState}
      />
    </div>
  );
}
  // --------------------------------------------------------------------------
  // SCREEN 3B: ONLINE LOBBY & MATCHMAKING (SOCKET.IO)
  // --------------------------------------------------------------------------
  return (
    <div style={styles.card}>
      <div style={styles.headerBar}>
        <h3>Online Lobby ({currentUser})</h3>
        <span style={{ color: isConnected ? '#2b8a3e' : '#e03131', fontWeight: 'bold' }}>
          {isConnected ? '🟢 Connected' : '🔴 Connecting...'}
        </span>
      </div>

      {statusMessage && <div style={styles.alertBox}>{statusMessage}</div>}

      {/* INCOMING CHALLENGE MODAL POPUP */}
      {incomingChallenge && (
        <div style={styles.challengeBox}>
          <h4>⚔️ Challenge Received!</h4>
          <p><strong>{incomingChallenge.from}</strong> has invited you to a match.</p>
          <div style={styles.buttonGroupRow}>
            <button
              onClick={() => respondToChallenge(incomingChallenge.from, true)}
              style={{ ...styles.button, backgroundColor: '#2b8a3e' }}
            >
              Accept
            </button>
            <button
              onClick={() => respondToChallenge(incomingChallenge.from, false)}
              style={{ ...styles.button, backgroundColor: '#c92a2a' }}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* ONLINE PLAYERS LIST */}
      <h4>Available Players Online ({onlinePlayers.length})</h4>
      {onlinePlayers.length === 0 ? (
        <p style={{ color: '#666' }}>No other players available. Open another browser tab to test!</p>
      ) : (
        <ul style={styles.playerList}>
          {onlinePlayers.map((player) => (
            <li key={player} style={styles.playerItem}>
              <span>👤 {player}</span>
              <button
                onClick={() => sendChallenge(player)}
                style={styles.smallButton}
              >
                Challenge
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => {
          setGameMode('NONE');
          resetGameLocalState();
        }}
        style={styles.textButton}
      >
        ← Back to Mode Selection
      </button>
    </div>
  );
}

// Simple Inline Styles
const styles = {
  card: {
    maxWidth: '450px',
    margin: '40px auto',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontFamily: 'sans-serif',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  label: {
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333'
  },
  input: {
    padding: '10px 14px',
    fontSize: '16px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    outline: 'none'
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#228be6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  smallButton: {
    padding: '6px 12px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#228be6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    margin: '20px 0'
  },
  buttonGroupRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px'
  },
  textButton: {
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    marginTop: '16px',
    textDecoration: 'underline'
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px'
  },
  alertBox: {
    backgroundColor: '#fff9db',
    border: '1px solid #fcc419',
    padding: '10px',
    borderRadius: '6px',
    margin: '12px 0',
    fontSize: '14px',
    color: '#856404'
  },
  challengeBox: {
    backgroundColor: '#e7f5ff',
    border: '1px solid #74c0fc',
    padding: '16px',
    borderRadius: '8px',
    margin: '16px 0'
  },
  playerList: {
    listStyle: 'none',
    padding: 0,
    margin: '16px 0'
  },
  playerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #f1f1f1'
  }
};