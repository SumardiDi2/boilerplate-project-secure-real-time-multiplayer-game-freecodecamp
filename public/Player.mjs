class Player {
  constructor({ x = 0, y = 0, score = 0, id, color } = {}) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.id = id;
    this.color = color;
  }

  movePlayer(dir, speed) {
    switch (dir) {
      case 'up':
        this.y -= speed;
        break;
      case 'down':
        this.y += speed;
        break;
      case 'left':
        this.x -= speed;
        break;
      case 'right':
        this.x += speed;
        break;
      default:
        break;
    }
  }

  collision(item) {
    const dx = this.x - item.x;
    const dy = this.y - item.y;
    return Math.sqrt(dx * dx + dy * dy) < 20;
  }

  calculateRank(arr) {
    const total = arr.length;
    const rank = arr.filter(player => player.score > this.score).length + 1;
    return `Rank: ${rank}/${total}`;
  }
}

try {
  module.exports = Player;
} catch (e) {}

export default Player;
