// lib/mahjong/agari.ts

export type Meld =
  | { type: "shuntsu"; tiles: number[]; open?: boolean }
  | { type: "kotsu"; tiles: number[]; open?: boolean }
  | { type: "kantsu"; tiles: number[]; open?: boolean }
  | { type: "pair"; tiles: number[] };

export const tileToIndex = (tile: string): number => {
  const suit = tile[tile.length - 1];
  const num = parseInt(tile[0]);

  if (suit === "m") return num - 1;
  if (suit === "p") return 9 + num - 1;
  if (suit === "s") return 18 + num - 1;
  if (suit === "z") return 27 + num - 1;

  throw new Error("Invalid tile");
};

export const toCounts = (tiles: string[]) => {
  const counts = new Array(34).fill(0);
  for (const tile of tiles) {
    counts[tileToIndex(tile)]++;
  }
  return counts;
};

export const getAgariPattern = (tiles: string[]): Meld[] | null => {
  if (tiles.length !== 14) return null;

  const counts = toCounts(tiles);

  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) {
      counts[i] -= 2;

      const result = extractMelds(counts);
      if (result) {
        return [{ type: "pair", tiles: [i, i] }, ...result];
      }

      counts[i] += 2;
    }
  }

  return null;
};

const extractMelds = (counts: number[], melds: Meld[] = []): Meld[] | null => {
  for (let i = 0; i < 34; i++) {
    if (counts[i] > 0) {
      // 刻子
      if (counts[i] >= 3) {
        counts[i] -= 3;
        const res = extractMelds(counts, [
          ...melds,
          { type: "kotsu", tiles: [i, i, i] },
        ]);
        if (res) return res;
        counts[i] += 3;
      }

      // 順子
      if (i < 27 && i % 9 <= 6) {
        if (counts[i] && counts[i + 1] && counts[i + 2]) {
          counts[i]--;
          counts[i + 1]--;
          counts[i + 2]--;

          const res = extractMelds(counts, [
            ...melds,
            { type: "shuntsu", tiles: [i, i + 1, i + 2] },
          ]);
          if (res) return res;

          counts[i]++;
          counts[i + 1]++;
          counts[i + 2]++;
        }
      }

      return null;
    }
  }

  return melds;
};
