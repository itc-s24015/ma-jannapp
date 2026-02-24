// lib/mahjong/types.ts

export type Meld = {
  type: 'shuntsu' | 'kotsu' | 'pair';
  tiles: number[];
};

export type AgariPattern = {
  melds: Meld[];
  pair: Meld;
};

export type YakuResult = {
  name: string;
  han: number;
  yakuman?: boolean;
  doubleYakuman?: boolean;
};
