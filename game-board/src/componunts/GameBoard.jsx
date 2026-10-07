import React, { useState, useEffect } from 'react';

export function GameBoard({ gameState, onMakeMove, onReset, isAiMode }) {
  // Local state for Offline VS Computer Mode
  const [localBoard, setLocalBoard] = useState(Array(9).fill(null));
  const [localIsMyTurn, setLocalIsMyTurn] = useState(true);
  const [localWinnerInfo, setLocalWinnerInfo] = useState(null); // { winner, winningLine, isDraw }

  // --------------------------------------------------------------------------
  // AI LOGIC (VS COMPUTER MODE)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isAiMode || localIsMyTurn || localWinnerInfo) return;

    // Trigger AI move after a short realistic delay (500ms)
    const timer = setTimeout(() => {
      // Find all empty squares
      const emptyIndices = localBoard
        .map((val, idx) => (val === null ? idx : null))
        .filter((val) => val !== null);

      if (emptyIndices.length === 0) return;

      // Random move selector for simple AI
      const randomMove = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      
      const newBoard = [...localBoard];
      newBoard[randomMove] = 'O'; // Computer is 'O'

      // Check win condition for local game
      const result = checkWinner(newBoard);

      setLocalBoard(newBoard);
      if (result) {
        setLocalWinnerInfo(result);
      } else {
        setLocalIsMyTurn(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isAiMode, localIsMyTurn, localBoard, localWinnerInfo]);

  // Helper Win Checker for Local AI Mode
  const checkWinner = (board) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], winningLine: [a, b, c] };
      }
    }
    if (board.every((sq) => sq !== null)) return { isDraw: true };
    return null;
  };

  // --------------------------------------------------------------------------
  // HANDLE SQUARE CLICK
  // --------------------------------------------------------------------------
  const handleSquareClick = (index) => {
    // 1. ONLINE MODE
    if (!isAiMode) {
      if (!gameState || !gameState.isMyTurn || gameState.isGameOver) return;
      if (gameState.board[index] !== null) return;
      onMakeMove(index); // Sends move to Socket server
      return;
    }

    // 2. AI MODE
    if (!localIsMyTurn || localWinnerInfo || localBoard[index] !== null) return;

    const newBoard = [...localBoard];
    newBoard[index] = 'X'; // User is 'X'
    
    const result = checkWinner(newBoard);
    setLocalBoard(newBoard);

    if (result) {
      setLocalWinnerInfo(result);
    } else {
      setLocalIsMyTurn(false); // Switch turn to AI
    }
  };

  // Extract active values depending on game mode
  const currentBoard = isAiMode ? localBoard : gameState?.board || Array(9).fill(null);
  const isMyTurn = isAiMode ? localIsMyTurn : gameState?.isMyTurn;
  const isGameOver = isAiMode ? !!localWinnerInfo : gameState?.isGameOver;
  const winningLine = isAiMode ? localWinnerInfo?.winningLine || [] : gameState?.winningLine || [];

  // Determine game status text
 // Determine game status message with structured JSX
  const getStatusMessage = () => {
    if (isAiMode) {
      if (localWinnerInfo?.isDraw) return <span><span className="status-icon">🤝</span> It's a Draw!</span>;
      if (localWinnerInfo?.winner === 'X') return <span><span className="status-icon">🎉</span> You Won!</span>;
      if (localWinnerInfo?.winner === 'O') return <span><span className="status-icon">🤖</span> Computer Won!</span>;
      return <span>{localIsMyTurn ? 'Your Turn (X)' : <span><span className="status-icon">🤔</span> Computer is thinking...</span>}</span>;
    }

    if (!gameState) return 'Waiting for match...';
    if (gameState.isDraw) return <span><span className="status-icon">🤝</span> It's a Draw!</span>;
    if (gameState.isGameOver) {
      return gameState.didIWin 
        ? <span><span className="status-icon">🎉</span> You Won!</span> 
        : <span><span className="status-icon">❌</span> Opponent Won!</span>;
    }
    return gameState.isMyTurn ? 'Your Turn!' : <span>Waiting for {gameState.opponent}...</span>;
  };

  return (
    <div style={styles.boardContainer} className='board-container'>
      {/* MATCH HEADER INFO */}
      <div style={styles.header}>
        <div style={styles.playerTag}>
          <strong>You:</strong> {isAiMode ? 'X' : gameState?.mySymbol}
        </div>
        <div style={styles.statusText}>{getStatusMessage()}</div>
        <div style={styles.playerTag}>
          <strong>Opponent:</strong> {isAiMode ? 'Computer (O)' : `${gameState?.opponent} (${gameState?.mySymbol === 'X' ? 'O' : 'X'})`}
        </div>
      </div>

      {/* 3x3 GRID CONTAINER */}
      <div style={styles.grid} className='game-board'>
        
        {/* TURN OVERLAY (Shown when it's NOT your turn) */}
        {!isMyTurn && !isGameOver && (
          <div className='turn-data' >
            <h4>{getStatusMessage()}</h4>
          </div>
        )}

        {/* 9 SQUARES */}
        {currentBoard.map((square, index) => {
          const isWinningSquare = winningLine.includes(index);
          return (
            <button
              key={index}
              onClick={() => handleSquareClick(index)}
              disabled={isGameOver || square !== null || !isMyTurn}
              style={{
                ...styles.square,
                backgroundColor: isWinningSquare ? '#b2f2bb' : '#f8f9fa',
                color: square === 'X' ? '#1c7ed6' : '#e03131',
                cursor: !isGameOver && square === null && isMyTurn ? 'pointer' : 'not-allowed'
              }}
            >
              {square}
            </button>
          );
        })}
      </div>

      {/* GAME OVER OVERLAY / BANNER */}
      {isGameOver && (
        <div className='game-data' >
          <h4>{getStatusMessage()}</h4>
        </div>
      )}
        
      {/* LEAVE / RESET GAME BUTTON */}
      {isGameOver && (
        <button
          onClick={() => {
            if (isAiMode) {
              setLocalBoard(Array(9).fill(null));
              setLocalIsMyTurn(true);
              setLocalWinnerInfo(null);
            } else {
              onReset();
            }
          }}
          style={styles.resetButton}
        >
          {isAiMode ? 'Play Again' : 'Back to Lobby'}
        </button>
      )}
    </div>
  );
}

// Board Component Styles (Added basic relative positioning for overlays if your CSS file hasn't defined them yet)
const styles = {
  boardContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    maxWidth: '380px',
    margin: '0 auto'
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: '#e7f5ff',
    borderRadius: '8px',
    fontSize: '14px'
  },
  playerTag: {
    color: '#1864ab'
  },
  statusText: {
    fontWeight: 'bold',
    color: '#2b8a3e',
    fontSize: '15px'
  },
  grid: {
    position: 'relative', // Ensures absolute overlays stay inside the board grid
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: '10px',
    width: '100%',
    aspectRatio: '1/1'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderRadius: '8px',
    fontWeight: 'bold',
    color: '#333'
  },
  square: {
    width: '100%',
    height: '100%',
    fontSize: '36px',
    fontWeight: 'bold',
    border: '2px solid #dee2e6',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s ease'
  },
  gameOverBanner: {
    padding: '10px',
    backgroundColor: '#fff9db',
    border: '1px solid #fcc419',
    borderRadius: '6px',
    textAlign: 'center',
    width: '100%'
  },
  resetButton: {
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#228be6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    zIndex:30,
  }
};