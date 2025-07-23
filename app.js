const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chessGame = new Chess();
let players = {};
const TIME_LIMIT = 5 * 60; // 5 minutes in seconds

let timers = {
  white: { time: TIME_LIMIT, interval: null },
  black: { time: TIME_LIMIT, interval: null }
};

app.set('view engine', 'ejs');
app.set('views', __dirname);
app.use(express.static(__dirname));

app.get('/', (req, res) => res.render('index', { title: 'Chess Game' }));

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const updateTimers = () => {
  io.emit('timerUpdate', {
    white: formatTime(timers.white.time),
    black: formatTime(timers.black.time)
  });
};

const startTimer = (color) => {
  // Stop both timers first
  stopAllTimers();
  
  timers[color].interval = setInterval(() => {
    timers[color].time--;
    updateTimers();
    
    if (timers[color].time <= 0) {
      clearInterval(timers[color].interval);
      io.emit('timeout', { winner: color === 'white' ? 'black' : 'white' });
      chessGame.reset();
    }
  }, 1000);
};

const stopAllTimers = () => {
  clearInterval(timers.white.interval);
  clearInterval(timers.black.interval);
  timers.white.interval = null;
  timers.black.interval = null;
};

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('player-join', ({ name }) => {
    socket.username = name;
    if (!players.white) {
      players.white = { id: socket.id, name };
      socket.emit('playerRole', 'w');
      io.emit('playerUpdate', players);
    } else if (!players.black) {
      players.black = { id: socket.id, name };
      socket.emit('playerRole', 'b');
      io.emit('playerUpdate', players);
      
      // Start game with white's turn
      startTimer('white');
    } else {
      socket.emit('spectator');
    }

    socket.emit("boardState", chessGame.fen());
    updateTimers();
  });

  socket.on('movePiece', (move) => {
    try {
      if (chessGame.turn() === "w" && socket.id !== players.white.id) throw new Error("Not your turn");
      if (chessGame.turn() === "b" && socket.id !== players.black.id) throw new Error("Not your turn");

      const result = chessGame.move(move);
      if (result) {
        // Switch timers after move
        if (chessGame.turn() === 'w') {
          startTimer('white');
        } else {
          startTimer('black');
        }
        
        io.emit("boardState", chessGame.fen());
      } else {
        socket.emit("invalidMove");
      }
    } catch (err) {
      socket.emit("invalidMove");
    }
  });

  socket.on('disconnect', () => {
    if (socket.id === players.white?.id) {
      delete players.white;
      io.emit('playerUpdate', players);
      stopAllTimers();
    }
    if (socket.id === players.black?.id) {
      delete players.black;
      io.emit('playerUpdate', players);
      stopAllTimers();
    }
    socket.broadcast.emit('playerLeft', { player: socket.username || "Unknown" });
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));