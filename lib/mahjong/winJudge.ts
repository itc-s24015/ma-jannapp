export function isWinningHand(tiles: string[]): boolean {
  if (tiles.length !== 14) return false;

  const counts: Record<string, number> = {};

  for (const t of tiles) {
    counts[t] = (counts[t] || 0) + 1;
  }

  // 七対子チェック
  const pairs = Object.values(counts).filter((v) => v === 2).length;
  if (pairs === 7) return true;

  // 国士チェック
  const terminals = [
    "1m",
    "9m",
    "1p",
    "9p",
    "1s",
    "9s",
    "1z",
    "2z",
    "3z",
    "4z",
    "5z",
    "6z",
    "7z",
  ];
  const hasAll = terminals.every((t) => counts[t] >= 1);
  const hasPair = terminals.some((t) => counts[t] >= 2);
  if (hasAll && hasPair) return true;

  // 通常形チェック
  for (const tile in counts) {
    if (counts[tile] >= 2) {
      counts[tile] -= 2;
      if (canFormMelds({ ...counts })) return true;
      counts[tile] += 2;
    }
  }

  return false;
}

function canFormMelds(counts: Record<string, number>): boolean {
  const tiles = Object.keys(counts).filter((t) => counts[t] > 0);
  if (tiles.length === 0) return true;

  const tile = tiles[0];

  // 刻子
  if (counts[tile] >= 3) {
    const next = { ...counts };
    next[tile] -= 3;
    if (canFormMelds(next)) return true;
  }

  // 順子
  const suit = tile[tile.length - 1];
  const num = parseInt(tile);

  if (suit !== "z" && num <= 7) {
    const t2 = `${num + 1}${suit}`;
    const t3 = `${num + 2}${suit}`;
    if (counts[t2] && counts[t3]) {
      const next = { ...counts };
      next[tile]--;
      next[t2]--;
      next[t3]--;
      if (canFormMelds(next)) return true;
    }
  }

  return false;
}
