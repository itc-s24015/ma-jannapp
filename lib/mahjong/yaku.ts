// lib/mahjong/yaku.ts

import { toCounts } from "./agari";
import { YakuResult } from "./types";
import { countDora } from "./dora";

// リーチ
export const checkRiichi = (isRiichi: boolean): YakuResult | null => {
  if (!isRiichi) return null;
  return { name: "リーチ", han: 1 };
};

// タンヤオ
export const checkTanyao = (tiles: string[]): YakuResult | null => {
  for (const tile of tiles) {
    const num = parseInt(tile[0]);
    const suit = tile[tile.length - 1];

    if (suit === "z") return null;
    if (num === 1 || num === 9) return null;
  }

  return { name: "タンヤオ", han: 1 };
};

// 役牌（白發中 + 場風自風は後で拡張）
export const checkYakuhai = (tiles: string[]): YakuResult | null => {
  const counts = toCounts(tiles);

  // 白=31 發=32 中=33
  const yakuhaiIndices = [31, 32, 33];

  let han = 0;

  for (const i of yakuhaiIndices) {
    if (counts[i] >= 3) han++;
  }

  if (han === 0) return null;

  return { name: "役牌", han };
};

// 一盃口（超簡易版）
export const checkIipeiko = (tiles: string[]): YakuResult | null => {
  const counts = toCounts(tiles);

  for (let i = 0; i < 27; i++) {
    if (i % 9 <= 6) {
      if (counts[i] >= 2 && counts[i + 1] >= 2 && counts[i + 2] >= 2) {
        return { name: "一盃口", han: 1 };
      }
    }
  }

  return null;
};

// 平和（超簡易：刻子なし & 字牌雀頭なし）
export const checkPinfu = (tiles: string[]): YakuResult | null => {
  const counts = toCounts(tiles);

  // 刻子あればダメ
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 3) return null;
  }

  // 字牌雀頭ダメ
  for (let i = 27; i < 34; i++) {
    if (counts[i] === 2) return null;
  }

  return { name: "平和", han: 1 };
};

// 一発
export const checkIppatsu = (
  isRiichi: boolean,
  ippatsu: boolean,
): YakuResult | null => {
  if (isRiichi && ippatsu) {
    return { name: "一発", han: 1 };
  }
  return null;
};

// 海底河底
export const checkHaitei = (
  isLastTile: boolean,
  isTsumo: boolean,
): YakuResult | null => {
  if (!isLastTile) return null;
  return {
    name: isTsumo ? "海底摸月" : "河底撈魚",
    han: 1,
  };
};

// 清一色
export const checkChinitsu = (tiles: string[]): YakuResult | null => {
  const suit = tiles[0][tiles[0].length - 1];
  for (const t of tiles) {
    if (t[t.length - 1] !== suit) return null;
  }
  return { name: "清一色", han: 6 };
};

// 混一色
export const checkHonitsu = (tiles: string[]): YakuResult | null => {
  let suit = "";
  let hasHonor = false;

  for (const t of tiles) {
    const s = t[t.length - 1];
    if (s === "z") {
      hasHonor = true;
    } else {
      if (!suit) suit = s;
      if (s !== suit) return null;
    }
  }

  return hasHonor ? { name: "混一色", han: 3 } : null;
};

// 小三元
export const checkShousangen = (counts: number[]): YakuResult | null => {
  const dragons = [31, 32, 33];
  let pair = false;
  let trip = 0;

  for (const d of dragons) {
    if (counts[d] === 2) pair = true;
    if (counts[d] >= 3) trip++;
  }

  if (pair && trip === 2) {
    return { name: "小三元", han: 2 };
  }
  return null;
};

// 四暗刻
export const checkSuankou = (melds: any[]): YakuResult | null => {
  const concealedKotsu = melds.filter(
    (m) => m.type === "kotsu" && !m.open,
  ).length;

  if (concealedKotsu === 4) {
    return { name: "四暗刻", han: 13, yakuman: true };
  }

  return null;
};

// 総合役判定
export const calculateYaku = (
  tiles: string[],
  isRiichi: boolean,
  doraIndicators: string[],
  uraIndicators: string[],
  melds: any[],
  ippatsu: boolean,
  isLastTile: boolean,
  isTsumo: boolean,
): YakuResult[] => {
  const results: YakuResult[] = [];
  const counts = toCounts(tiles);

  const riichi = checkRiichi(isRiichi);
  if (riichi) results.push(riichi);

  const ipp = checkIppatsu(isRiichi, ippatsu);
  if (ipp) results.push(ipp);

  const haitei = checkHaitei(isLastTile, isTsumo);
  if (haitei) results.push(haitei);

  const chinitsu = checkChinitsu(tiles);
  if (chinitsu) results.push(chinitsu);

  const honitsu = checkHonitsu(tiles);
  if (honitsu) results.push(honitsu);

  const shousangen = checkShousangen(counts);
  if (shousangen) results.push(shousangen);

  const suankou = checkSuankou(melds);
  if (suankou) results.push(suankou);

  // ===== ドラ =====
  const dora = countDora(tiles, doraIndicators);
  if (dora > 0) results.push({ name: "ドラ", han: dora });

  // ===== 裏ドラ（リーチ時のみ）=====
  if (isRiichi) {
    const ura = countDora(tiles, uraIndicators);
    if (ura > 0) {
      results.push({ name: "裏ドラ", han: ura });
    }
  }

  return results;
};
