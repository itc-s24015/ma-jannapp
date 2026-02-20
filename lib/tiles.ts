export type Tile = string;

const SUITS = ["m", "p", "s"];
const HONORS = ["1z", "2z", "3z", "4z", "5z", "6z", "7z"];

export function createTiles(): string[] {
  const tiles: string[] = [];
  for (const suit of SUITS) {
    for (let i = 1; i <= 9; i++) {
      for (let j = 0; j < 4; j++) {
        tiles.push(`${i}${suit}`);
      }
    }
  }
  return tiles;
}

export function createWall(): string[] {
  const wall: string[] = [];
  // 数牌 (萬子・筒子・索子)
  for (const suit of SUITS) {
    for (let i = 1; i <= 9; i++) {
      for (let j = 0; j < 4; j++) wall.push(`${i}${suit}`);
    }
  }
  // 字牌
  for (const code of HONORS) {
    for (let j = 0; j < 4; j++) wall.push(code);
  }
  return shuffle(wall);
}

export function shuffle(array: string[]): string[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
