// lib/mahjong/dora.ts

import { tileToIndex } from './agari';

const nextIndex = (i: number): number => {
  // 数牌
  if (i < 27) {
    const base = Math.floor(i / 9) * 9;
    const num = i % 9;
    return base + ((num + 1) % 9);
  }

  // 字牌
  const honors = [27,28,29,30,31,32,33];
  const pos = honors.indexOf(i);
  return honors[(pos + 1) % honors.length];
};

export const getDoraTile = (indicator: string): number => {
  const index = tileToIndex(indicator);
  return nextIndex(index);
};

export const countDora = (
  hand: string[],
  doraIndicators: string[]
): number => {

  let count = 0;

  const doraIndices = doraIndicators.map(i =>
    getDoraTile(i)
  );

  for (const tile of hand) {

    // 赤ドラ
    if (tile === '5mr' || tile === '5pr' || tile === '5sr') {
      count++;
      continue;
    }

    const index = tileToIndex(tile.replace('r',''));

    if (doraIndices.includes(index)) {
      count++;
    }
  }

  return count;
};
