const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());

const PORT = 4000;
const PIN = '1234';

let players = {};
let questions = require('./questions');
let currentQuestion = 0;
let gameStarted = false;

io.on('connection', (socket) => {
  socket.on('join_game', ({ name, pin }) => {
    if (pin !== PIN || gameStarted) return;
    players[socket.id] = { name, score: 0, time: 0 };
    socket.emit('joined_successfully');
    io.emit('players_update', Object.values(players));
  });

  socket.on('start_game', () => {
    if (gameStarted) return;
    gameStarted = true;
    currentQuestion = 0;
    io.emit('game_started');
    sendQuestion();
  });

  socket.on('answer', ({ answer, time }) => {
    if (!players[socket.id]) return;
    const correct = questions[currentQuestion].correct === answer;
    if (correct) {
      players[socket.id].score += 1;
      players[socket.id].time += time;
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('players_update', Object.values(players));
  });
});

function sendQuestion() {
  if (currentQuestion >= questions.length) return endGame();
  const question = questions[currentQuestion];
  io.emit('question', { question: question.text, options: question.options });

  setTimeout(() => {
    io.emit('reveal_answer', questions[currentQuestion].correct);
    currentQuestion++;
    setTimeout(sendQuestion, 3000);
  }, 10000);
}

function endGame() {
  const result = Object.values(players).sort((a, b) => b.score - a.score || a.time - b.time);
  io.emit('game_over', result);
  players = {};
  gameStarted = false;
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
