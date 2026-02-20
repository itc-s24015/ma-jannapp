import { Meld, tileToIndex } from "./agari";
import { YakuResult } from "./types";

const isTerminal = (tile: number) =>
  tile % 9 === 0 || tile % 9 === 8 || tile >= 27;

const isEdgeWait = (tile: number, meld: Meld) => {
  if (meld.type !== "shuntsu") return false;
  const nums = meld.tiles.map((t) => t % 9);
  return (nums[0] === 0 && tile % 9 === 2) || (nums[0] === 6 && tile % 9 === 6);
};

const isClosedWait = (tile: number, meld: Meld) => {
  if (meld.type !== "shuntsu") return false;
  const sorted = [...meld.tiles].sort((a, b) => a - b);
  return sorted[1] === tile;
};

export const calculateScore = (
  yaku: YakuResult[],
  melds: Meld[],
  isTsumo: boolean,
  isMenzen: boolean,
  isDealer: boolean,
  lastTile: string | null,
) => {
  const han = yaku.reduce((s, y) => s + y.han, 0);
  let fu = 20;

  const lastIndex = lastTile ? tileToIndex(lastTile.replace("r", "")) : -1;

  let hasKotsu = false;

  for (const meld of melds) {
    // ===== 刻子 =====
    if (meld.type === "kotsu") {
      hasKotsu = true;

      const tile = meld.tiles[0];
      const open = meld.open ?? false;

      if (open) {
        fu += isTerminal(tile) ? 4 : 2;
      } else {
        fu += isTerminal(tile) ? 8 : 4;
      }
    }

    // ===== 槓子 =====
    if (meld.type === "kantsu") {
      const tile = meld.tiles[0];
      const open = meld.open ?? false;

      if (open) {
        fu += isTerminal(tile) ? 16 : 8;
      } else {
        fu += isTerminal(tile) ? 32 : 16;
      }
    }

    // ===== 雀頭 =====
    if (meld.type === "pair") {
      const tile = meld.tiles[0];

      if (tile >= 31) fu += 2;

      if (tile === lastIndex) fu += 2; // 単騎
    }

    // ===== 待ち符 =====
    if (meld.type === "shuntsu" && lastIndex >= 0) {
      if (isClosedWait(lastIndex, meld)) fu += 2;
      if (isEdgeWait(lastIndex, meld)) fu += 2;
    }
  }

  // ===== 平和例外 =====
  const isPinfu = yaku.some((y) => y.name === "平和");

  if (isPinfu && isMenzen && isTsumo) {
    fu = 20;
  } else {
    if (isTsumo) fu += 2;
    if (!isTsumo && isMenzen) fu += 10;

    fu = Math.ceil(fu / 10) * 10;
  }

  // ===== 満貫処理 =====
  let base = fu * Math.pow(2, han + 2);
  let title = "";

  const yakumanCount =
    yaku.filter((y) => y.yakuman).length +
    yaku.filter((y) => y.doubleYakuman).length * 2;

  if (yakumanCount > 0) {
    base = 8000 * yakumanCount;
    title = yakumanCount > 1 ? `${yakumanCount}倍役満` : "役満";
  } else if (han >= 13) {
    base = 8000;
    title = "役満";
  } else if (han >= 11) {
    base = 6000;
    title = "三倍満";
  } else if (han >= 8) {
    base = 4000;
    title = "倍満";
  } else if (han >= 6) {
    base = 3000;
    title = "跳満";
  } else if (han >= 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70)) {
    base = 2000;
    title = "満貫";
  }

  let total = 0;

  if (isDealer) {
    total = isTsumo
      ? Math.ceil((base * 2) / 100) * 100 * 3
      : Math.ceil((base * 6) / 100) * 100;
  } else {
    total = isTsumo
      ? Math.ceil(base / 100) * 100 * 2 + Math.ceil((base * 2) / 100) * 100
      : Math.ceil((base * 4) / 100) * 100;
  }

  return { han, fu, base, total, title };
};

// シンプルな点数計算（翻・符 → 点)
export function calculateFinalScore(
  han: number,
  fu: number,
  isDealer: boolean,
): number {
  let base = fu * Math.pow(2, han + 2);
  if (han >= 13) base = 8000;
  else if (han >= 11) base = 6000;
  else if (han >= 8) base = 4000;
  else if (han >= 6) base = 3000;
  else if (han >= 5 || base >= 2000) base = 2000;
  const total = base * (isDealer ? 6 : 4);
  return Math.ceil(total / 100) * 100;
}

export function calculateTsumoPayment(
  han: number,
  fu: number,
  isDealer: boolean,
): { dealer: number; child: number } {
  let base = fu * Math.pow(2, han + 2);
  if (han >= 13) base = 8000;
  else if (han >= 11) base = 6000;
  else if (han >= 8) base = 4000;
  else if (han >= 6) base = 3000;
  else if (han >= 5 || base >= 2000) base = 2000;
  if (isDealer) {
    const pay = Math.ceil((base * 2) / 100) * 100;
    return { dealer: 0, child: pay };
  } else {
    return {
      dealer: Math.ceil((base * 2) / 100) * 100,
      child: Math.ceil(base / 100) * 100,
    };
  }
}
