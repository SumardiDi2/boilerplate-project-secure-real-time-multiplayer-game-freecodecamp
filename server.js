require('@babel/register')({ extensions: ['.js', '.mjs'] });
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const socket = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const PlayerModule = require('./public/Player.mjs');
const CollectibleModule = require('./public/Collectible.mjs');
const Player = PlayerModule.default || PlayerModule;
const Collectible = CollectibleModule.default || CollectibleModule;

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('X-Powered-By', 'PHP 7.4.3');
  next();
});

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// For FCC testing purposes and enables user to connect from outside the hosting platform
app.use(cors({ origin: '*' }));

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

app.use((req, res, next) => {
  if (!res._headers) {
    Object.defineProperty(res, '_headers', {
      configurable: true,
      get: () => res.getHeaders()
    });
  }
  next();
});

// For FCC testing purposes
fccTestingRoutes(app);

// 404 Not Found Middleware
app.use(function (req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const WIDTH = 640;
const HEIGHT = 480;
const PLAYER_RADIUS = 10;
const ITEM_COUNT = 5;
const COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f',
  '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1'
];

const players = {};
let collectibles = [];
let itemCounter = 0;
let colorCounter = 0;

function nextItemId() {
  itemCounter += 1;
  return `item-${Date.now().toString(36)}-${itemCounter}`;
}

function nextColor() {
  const color = COLORS[colorCounter % COLORS.length];
  colorCounter += 1;
  return color;
}

function randomPosition() {
  return {
    x: Math.floor(Math.random() * (WIDTH - 40)) + 20,
    y: Math.floor(Math.random() * (HEIGHT - 40)) + 20
  };
}

function createCollectible() {
  const position = randomPosition();
  return new Collectible({
    x: position.x,
    y: position.y,
    value: Math.floor(Math.random() * 9) + 1,
    id: nextItemId()
  });
}

for (let i = 0; i < ITEM_COUNT; i += 1) {
  collectibles.push(createCollectible());
}

const portNum = process.env.PORT || 3000;

// Set up server and tests
const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

const io = socket(server);

io.on('connection', client => {
  const position = randomPosition();
  const player = new Player({
    x: position.x,
    y: position.y,
    score: 0,
    id: client.id,
    color: nextColor()
  });

  players[client.id] = player;

  client.emit('currentPlayers', {
    players,
    collectibles,
    yourId: client.id
  });
  client.broadcast.emit('newPlayer', player);

  client.on('playerMovement', data => {
    const current = players[client.id];
    if (!current || !data) return;

    const speed = typeof data.speed === 'number' && data.speed > 0
      ? Math.min(data.speed, 10)
      : 5;

    current.movePlayer(data.direction, speed);
    current.x = Math.max(PLAYER_RADIUS, Math.min(WIDTH - PLAYER_RADIUS, current.x));
    current.y = Math.max(PLAYER_RADIUS, Math.min(HEIGHT - PLAYER_RADIUS, current.y));

    const itemIndex = collectibles.findIndex(item => current.collision(item));
    if (itemIndex !== -1) {
      current.score += collectibles[itemIndex].value;
      collectibles.splice(itemIndex, 1, createCollectible());
      io.emit('itemCollected', {
        playerId: client.id,
        score: current.score,
        collectibles
      });
    }

    io.emit('playerMoved', {
      id: current.id,
      x: current.x,
      y: current.y,
      score: current.score
    });
  });

  client.on('disconnect', () => {
    delete players[client.id];
    io.emit('playerDisconnected', client.id);
  });
});

module.exports = app; // For testing
