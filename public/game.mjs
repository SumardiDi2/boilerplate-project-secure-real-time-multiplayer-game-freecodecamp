import Player from './Player.mjs';

const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const players = {};
let collectibles = [];

const keys = { up: false, down: false, left: false, right: false };

const keyDirections = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right'
};

socket.on('currentPlayers', data => {
  Object.keys(players).forEach(id => delete players[id]);
  Object.assign(players, data.players || {});
  collectibles = data.collectibles || [];
  updateHud();
});

socket.on('newPlayer', player => {
  players[player.id] = player;
  updateHud();
});

socket.on('playerMoved', data => {
  const player = players[data.id];
  if (player) {
    player.x = data.x;
    player.y = data.y;
    player.score = data.score;
  }
});

socket.on('itemCollected', data => {
  collectibles = data.collectibles || collectibles;
  const player = players[data.playerId];
  if (player) player.score = data.score;
  updateHud();
});

socket.on('playerDisconnected', id => {
  delete players[id];
  updateHud();
});

window.addEventListener('keydown', event => {
  const direction = keyDirections[event.key];
  if (direction) {
    keys[direction] = true;
    event.preventDefault();
  }
});

window.addEventListener('keyup', event => {
  const direction = keyDirections[event.key];
  if (direction) {
    keys[direction] = false;
    event.preventDefault();
  }
});

function updateHud() {
  const list = Object.values(players);
  const me = players[socket.id] || list[0];
  const scoreEl = document.getElementById('score');
  const rankEl = document.getElementById('rank');
  const countEl = document.getElementById('players-count');

  if (scoreEl) scoreEl.textContent = me ? `Score: ${me.score}` : 'Score: 0';
  if (rankEl) rankEl.textContent = me ? new Player(me).calculateRank(list) : 'Rank: 0/0';
  if (countEl) countEl.textContent = `Players: ${list.length}`;
}

function drawCollectibles() {
  collectibles.forEach(item => {
    context.save();
    context.translate(item.x, item.y);
    context.rotate(Math.PI / 4);
    context.fillStyle = '#f1c40f';
    context.shadowColor = '#f1c40f';
    context.shadowBlur = 10;
    context.fillRect(-7, -7, 14, 14);
    context.restore();
  });
}

function drawPlayers() {
  const list = Object.values(players);
  list.forEach(player => {
    context.beginPath();
    context.arc(player.x, player.y, 12, 0, Math.PI * 2);
    context.fillStyle = player.color || '#ffffff';
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#ecf0f1';
    context.stroke();

    context.fillStyle = '#0b0b1a';
    context.font = 'bold 12px monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(player.score), player.x, player.y);

    const rank = new Player(player).calculateRank(list);
    context.fillStyle = '#ecf0f1';
    context.font = '10px monospace';
    context.fillText(rank, player.x, player.y - 24);

    if (player.id === socket.id) {
      context.strokeStyle = '#ffffff';
      context.lineWidth = 1;
      context.beginPath();
      context.arc(player.x, player.y, 17, 0, Math.PI * 2);
      context.stroke();
    }
  });
}

function draw() {
  context.fillStyle = '#11122b';
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  context.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 40) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, HEIGHT);
    context.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 40) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y);
    context.stroke();
  }

  drawCollectibles();
  drawPlayers();
}

let lastMove = 0;
function gameLoop(timestamp) {
  if (timestamp - lastMove >= 40) {
    ['up', 'down', 'left', 'right'].forEach(direction => {
      if (keys[direction]) {
        socket.emit('playerMovement', { direction, speed: 5 });
      }
    });
    lastMove = timestamp;
  }
  draw();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
