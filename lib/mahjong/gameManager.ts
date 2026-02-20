// 親を決める（0〜players-1のランダム）
export function decideDealer(players: number = 4): number {
  return Math.floor(Math.random() * players);
}

// 局情報
export type GameState = {
  dealer: number; // 親のプレイヤーインデックス
  round: number; // 局数 (1〜4)
  honba: number; // 本場
  kyotaku: number; // 供託
};

export function initialGameState(): GameState {
  return {
    dealer: decideDealer(),
    round: 1,
    honba: 0,
    kyotaku: 0,
  };
}

// 次局へ（親が変わる場合）
export function nextRound(state: GameState): GameState {
  const nextDealer = (state.dealer + 1) % 4;
  return {
    ...state,
    dealer: nextDealer,
    round: state.round + 1,
    honba: 0,
  };
}

// 連荘（親が勝った場合）
export function renchan(state: GameState): GameState {
  return {
    ...state,
    honba: state.honba + 1,
  };
}
