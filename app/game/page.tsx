"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { isWinningHand } from "../../lib/mahjong/winJudge";
import { calculateFinalScore } from "../../lib/mahjong/score";
import { decideDealer } from "../../lib/mahjong/gameManager";
import { createWall } from "../../lib/tiles";
import TileImage from "../../components/TileImage";

// ── ユーティリティ ──────────────────────────────────

function sortTiles(tiles: string[]) {
  const order = { m: 0, p: 1, s: 2, z: 3 };
  return [...tiles].sort((a, b) => {
    const suitA = a[a.length - 1] as keyof typeof order;
    const suitB = b[b.length - 1] as keyof typeof order;
    if (order[suitA] !== order[suitB]) return order[suitA] - order[suitB];
    return parseInt(a) - parseInt(b);
  });
}

/** 13枚の手牌がテンパイかどうか */
function isTenpai(hand13: string[]): boolean {
  const ALL_TILES = [
    ...["m", "p", "s"].flatMap((s) =>
      Array.from({ length: 9 }, (_, i) => `${i + 1}${s}`),
    ),
    ...Array.from({ length: 7 }, (_, i) => `${i + 1}z`),
  ];
  return ALL_TILES.some((t) => isWinningHand([...hand13, t]));
}

/** 手牌からチーできる組み合わせを返す（2枚ずつ）*/
function getChiOptions(hand: string[], tile: string): string[][] {
  const suit = tile[tile.length - 1];
  if (suit === "z") return [];
  const num = parseInt(tile);
  const opts: string[][] = [];
  if (num >= 3 && hand.includes(`${num - 2}${suit}`) && hand.includes(`${num - 1}${suit}`))
    opts.push([`${num - 2}${suit}`, `${num - 1}${suit}`]);
  if (num >= 2 && num <= 8 && hand.includes(`${num - 1}${suit}`) && hand.includes(`${num + 1}${suit}`))
    opts.push([`${num - 1}${suit}`, `${num + 1}${suit}`]);
  if (num <= 7 && hand.includes(`${num + 1}${suit}`) && hand.includes(`${num + 2}${suit}`))
    opts.push([`${num + 1}${suit}`, `${num + 2}${suit}`]);
  return opts;
}

// ── 河コンポーネント ────────────────────────────────

type RiverTile = { tile: string; isRiichiTile?: boolean };

function River({
  tiles,
  cols = 6,
  tileW = 30,
  tileH = 40,
}: {
  tiles: RiverTile[];
  cols?: number;
  tileW?: number;
  tileH?: number;
}) {
  return (
    <div className="flex flex-wrap" style={{ width: cols * (tileW + 2) }}>
      {tiles.slice(0, cols * 3).map((t, i) =>
        t.isRiichiTile ? (
          <div
            key={i}
            style={{ width: tileH, height: tileW, flexShrink: 0 }}
            className="flex items-center justify-center"
          >
            <TileImage
              tile={t.tile}
              style={{
                width: tileW,
                height: tileH,
                transform: "rotate(90deg)",
                filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.5))",
              }}
            />
          </div>
        ) : (
          <TileImage
            key={i}
            tile={t.tile}
            style={{
              width: tileW,
              height: tileH,
              margin: 1,
              filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.5))",
            }}
          />
        ),
      )}
    </div>
  );
}

// ── 副露表示コンポーネント ──────────────────────────

type MeldEntry = { type: "pon" | "chi" | "kan"; tiles: string[] };

function MeldDisplay({ melds }: { melds: MeldEntry[] }) {
  if (melds.length === 0) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {melds.map((m, mi) => (
        <div key={mi} className="flex gap-0.5 bg-black bg-opacity-30 px-1 py-0.5 rounded">
          {m.tiles.map((t, ti) => (
            <TileImage
              key={ti}
              tile={t}
              style={{ width: 22, height: 30, filter: "drop-shadow(1px 1px 2px rgba(0,0,0,0.5))" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── メインコンポーネント ────────────────────────────

type PendingAction = {
  tile: string;
  discarder: number;
  canRon: boolean;
  canPon: boolean;
  chiOptions: string[][];
  canMinkan: boolean;
};

type Result = {
  winner: number;
  type: "tsumo" | "ron" | "draw";
  score: number;
  yakuName?: string;
};

function GameInner() {
  const searchParams = useSearchParams();
  const players = Number(searchParams.get("players") || 4);

  const playerNames =
    players === 3
      ? ["あなた", "CPU1", "CPU2"]
      : ["あなた", "CPU1", "CPU2", "CPU3"];

  const [initialized, setInitialized] = useState(false);
  const [dealer, setDealer] = useState(0);
  const wallRef = useRef<string[]>([]);

  const [hands, setHands] = useState<string[][]>(() =>
    Array.from({ length: players }, () => []),
  );
  const [rivers, setRivers] = useState<RiverTile[][]>(() =>
    Array.from({ length: players }, () => []),
  );
  const [melds, setMelds] = useState<MeldEntry[][]>(() =>
    Array.from({ length: players }, () => []),
  );

  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState(() =>
    Array.from({ length: players }, () => 25000),
  );

  const [isRiichi, setIsRiichi] = useState(false);
  const [riichiTilePlaced, setRiichiTilePlaced] = useState(false);
  const [honba] = useState(0);

  const [result, setResult] = useState<Result | null>(null);

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [chiChoice, setChiChoice] = useState<string[][] | null>(null);

  // ── 初期化（クライアントのみ） ─────────────────────
  useEffect(() => {
    const d = decideDealer(players);
    const w = createWall();
    const temp: string[][] = [];
    let idx = 0;
    for (let i = 0; i < players; i++) {
      const count = i === d ? 14 : 13;
      temp.push(w.slice(idx, idx + count));
      idx += count;
    }
    wallRef.current = w.slice(idx);
    setDealer(d);
    setHands(temp);
    setTurn(d);
    setInitialized(true);
  }, []);

  // ── プレイヤーターンに自動ツモ ──────────────────
  useEffect(() => {
    if (!initialized || turn !== 0 || result || pendingAction) return;
    // length % 3 === 1 のとき（13, 10, 7…）がツモ待ち状態
    // length % 3 === 2 のとき（14, 11, 8…）はすでに牌を持っている（打牌待ち）
    if (hands[0].length % 3 === 1) {
      if (wallRef.current.length === 0) { endGame(0, "draw"); return; }
      const tile = wallRef.current.shift()!;
      setHands((prev) => {
        const next = prev.map((h) => [...h]);
        next[0] = [...next[0], tile];
        return next;
      });
    }
  }, [turn, result, initialized, pendingAction]);

  // ── CPUターン ──────────────────────────────────
  useEffect(() => {
    if (!initialized || turn === 0 || result || pendingAction) return;

    const timer = setTimeout(() => {
      if (wallRef.current.length === 0) { endGame(0, "draw"); return; }
      const tile = wallRef.current.shift()!;
      const prevHands = hands;
      const newHand = [...prevHands[turn], tile];

      if (isWinningHand(newHand)) {
        setHands((prev) => { const n = prev.map(h => [...h]); n[turn] = newHand; return n; });
        endGame(turn, "tsumo");
        return;
      }

      const discardIdx = Math.floor(Math.random() * newHand.length);
      const discarded = newHand[discardIdx];
      const afterHand = newHand.filter((_, i) => i !== discardIdx);

      setHands((prev) => { const n = prev.map(h => [...h]); n[turn] = afterHand; return n; });
      setRivers((prev) => { const n = prev.map(r => [...r]); n[turn] = [...n[turn], { tile: discarded }]; return n; });

      const playerHand = prevHands[0];
      const canRon = isWinningHand([...playerHand, discarded]);
      const canPon = playerHand.filter((t) => t === discarded).length >= 2;
      const isKamicha = turn === players - 1;
      const chiOptions = (!isRiichi && isKamicha) ? getChiOptions(playerHand, discarded) : [];
      const canMinkan = !isRiichi && playerHand.filter((t) => t === discarded).length >= 3;

      if (canRon || canPon || chiOptions.length > 0 || canMinkan) {
        setPendingAction({ tile: discarded, discarder: turn, canRon, canPon, chiOptions, canMinkan });
      } else {
        setTurn((prev) => (prev + 1) % players);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [turn, result, initialized, pendingAction]);

  // ── 初期化待ち ───────────────────────────────────
  if (!initialized) {
    return <div className="min-h-screen bg-gradient-to-b from-green-950 to-green-800" />;
  }

  const isMyTurn = turn === 0 && !pendingAction;
  const myHand = hands[0];
  // length % 3 === 2 → ツモ牌あり（14, 11, 8…）  % 3 === 1 → ツモ前（13, 10, 7…）
  const hasTsumoTile = isMyTurn && myHand.length % 3 === 2;
  const sortedHand = sortTiles(hasTsumoTile ? myHand.slice(0, -1) : myHand);
  const tsumoTile = hasTsumoTile ? myHand[myHand.length - 1] : null;

  // リーチ：門前（副露なし）かつテンパイ（ツモ前の状態）
  const canDeclareRiichi =
    !isRiichi && isMyTurn && myHand.length % 3 === 1 &&
    melds[0].length === 0 && scores[0] >= 1000 && isTenpai(myHand);

  function getAnkanTile(): string | null {
    const counts: Record<string, number> = {};
    for (const t of myHand) counts[t] = (counts[t] || 0) + 1;
    for (const [t, c] of Object.entries(counts)) if (c === 4) return t;
    return null;
  }
  const ankanTile = isMyTurn && myHand.length % 3 === 2 ? getAnkanTile() : null;
  const canTsumo = isMyTurn && tsumoTile !== null && isWinningHand([...sortedHand, tsumoTile]);

  // ── 終了処理 ─────────────────────────────────────
  function endGame(winner: number, type: "tsumo" | "ron" | "draw", yakuName?: string) {
    if (result) return;
    const isWinnerDealer = winner === dealer;
    const winScore = type === "draw" ? 0 : calculateFinalScore(1, 30, isWinnerDealer);
    setResult({ winner, type, score: winScore, yakuName });
    if (type !== "draw") {
      setScores((prev) => { const n = [...prev]; n[winner] += winScore; return n; });
    }
  }

  function handleTsumo() {
    if (!canTsumo || result) return;
    endGame(0, "tsumo", isRiichi ? "リーチ・門前清自摸和" : "門前清自摸和");
  }

  function handleRiichi() {
    if (!canDeclareRiichi || result) return;
    setScores((prev) => { const n = [...prev]; n[0] -= 1000; return n; });
    setIsRiichi(true);
  }

  function handleAnkan() {
    if (!ankanTile || result) return;
    const newHand = myHand.filter((t) => t !== ankanTile);
    setHands((prev) => { const n = prev.map(h => [...h]); n[0] = newHand; return n; });
    setMelds((prev) => {
      const n = prev.map(m => [...m]);
      n[0] = [...n[0], { type: "kan", tiles: [ankanTile, ankanTile, ankanTile, ankanTile] }];
      return n;
    });
    if (wallRef.current.length === 0) { endGame(0, "draw"); return; }
    const rinshan = wallRef.current.shift()!;
    setHands((prev) => { const n = prev.map(h => [...h]); n[0] = [...n[0], rinshan]; return n; });
  }

  function discard(tile: string) {
    if (!isMyTurn || pendingAction || result) return;
    setHands((prev) => {
      const n = prev.map((h) => [...h]);
      const idx = n[0].indexOf(tile);
      if (idx === -1) return prev;
      n[0].splice(idx, 1);
      return n;
    });
    const markAsRiichi = isRiichi && !riichiTilePlaced;
    if (markAsRiichi) setRiichiTilePlaced(true);
    setRivers((prev) => {
      const n = prev.map((r) => [...r]);
      n[0] = [...n[0], { tile, isRiichiTile: markAsRiichi }];
      return n;
    });
    let ronDeclared = false;
    for (let i = 1; i < players; i++) {
      if (isWinningHand([...hands[i], tile])) {
        endGame(i, "ron");
        ronDeclared = true;
        break;
      }
    }
    if (!ronDeclared) {
      setTurn((prev) => (prev + 1) % players);
    }
  }

  function handleRon() {
    if (!pendingAction?.canRon || result) return;
    setPendingAction(null);
    endGame(0, "ron", isRiichi ? "リーチ・ロン" : "ロン");
  }

  function handlePon() {
    if (!pendingAction?.canPon || result) return;
    const { tile } = pendingAction;
    setPendingAction(null);
    setHands((prev) => {
      const n = prev.map(h => [...h]);
      const i1 = n[0].indexOf(tile); n[0].splice(i1, 1);
      const i2 = n[0].indexOf(tile); n[0].splice(i2, 1);
      return n;
    });
    setMelds((prev) => {
      const n = prev.map(m => [...m]);
      n[0] = [...n[0], { type: "pon", tiles: [tile, tile, tile] }];
      return n;
    });
    setTurn(0);
  }

  function handleChi(option: string[]) {
    if (!pendingAction || result) return;
    const { tile } = pendingAction;
    setPendingAction(null);
    setChiChoice(null);
    setHands((prev) => {
      const n = prev.map(h => [...h]);
      for (const t of option) {
        const idx = n[0].indexOf(t);
        if (idx !== -1) n[0].splice(idx, 1);
      }
      return n;
    });
    setMelds((prev) => {
      const n = prev.map(m => [...m]);
      n[0] = [...n[0], { type: "chi", tiles: sortTiles([...option, tile]) }];
      return n;
    });
    setTurn(0);
  }

  function handleMinkan() {
    if (!pendingAction?.canMinkan || result) return;
    const { tile } = pendingAction;
    setPendingAction(null);
    setHands((prev) => {
      const n = prev.map(h => [...h]);
      let removed = 0;
      n[0] = n[0].filter(t => { if (t === tile && removed < 3) { removed++; return false; } return true; });
      return n;
    });
    setMelds((prev) => {
      const n = prev.map(m => [...m]);
      n[0] = [...n[0], { type: "kan", tiles: [tile, tile, tile, tile] }];
      return n;
    });
    if (wallRef.current.length === 0) { endGame(0, "draw"); return; }
    const rinshan = wallRef.current.shift()!;
    setHands((prev) => { const n = prev.map(h => [...h]); n[0] = [...n[0], rinshan]; return n; });
    setTurn(0);
  }

  function handlePass() {
    const discarder = pendingAction?.discarder ?? 0;
    setPendingAction(null);
    setChiChoice(null);
    setTurn((discarder + 1) % players);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 to-green-800 flex items-center justify-center">
      <div className="w-[850px] h-[850px] bg-green-700 rounded-full shadow-[0_0_60px_rgba(0,0,0,0.8)] border-[25px] border-amber-900 relative">
        <div className="absolute inset-6 bg-green-800 rounded-full shadow-inner" />

        {/* 点数 */}
        <div className="absolute top-16 right-16 bg-black bg-opacity-70 px-4 py-2 rounded-lg text-sm text-white z-10">
          点数: {scores[0]}
        </div>

        {/* 中央情報パネル */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-black bg-opacity-80 text-white px-8 py-6 rounded-xl shadow-2xl text-center">
            <div className="text-2xl font-bold mb-2">東1局</div>
            <div className="text-lg">親: {playerNames[dealer]}</div>
            <div className="mt-2 text-yellow-400 font-bold">残り牌: {wallRef.current.length}</div>
          </div>
        </div>

        {/* 上プレイヤー（CPU1） */}
        <div className={`absolute top-24 left-1/2 -translate-x-1/2 text-sm z-10 ${turn === 1 ? "text-yellow-300 font-bold" : "text-white"}`}>
          {playerNames[1]}{dealer === 1 && " 👑"}
        </div>

        {/* 左プレイヤー（CPU2） */}
        {players >= 3 && (
          <div className={`absolute left-14 top-1/2 -translate-y-1/2 text-sm rotate-90 z-10 ${turn === 2 ? "text-yellow-300 font-bold" : "text-white"}`}>
            {playerNames[2]}{dealer === 2 && " 👑"}
          </div>
        )}

        {/* 右プレイヤー（CPU3） */}
        {players === 4 && (
          <div className={`absolute right-14 top-1/2 -translate-y-1/2 text-sm -rotate-90 z-10 ${turn === 3 ? "text-yellow-300 font-bold" : "text-white"}`}>
            {playerNames[3]}{dealer === 3 && " 👑"}
          </div>
        )}

        {/* リーチ棒 */}
        {isRiichi && (
          <div className="absolute top-[290px] left-1/2 -translate-x-1/2 bg-white w-28 h-2 rounded-full shadow-md z-10" />
        )}

        {/* 上河 */}
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-10">
          <River tiles={rivers[1] ?? []} cols={6} tileW={30} tileH={40} />
        </div>
        {melds[1]?.length > 0 && (
          <div className="absolute top-28 right-36 z-10"><MeldDisplay melds={melds[1]} /></div>
        )}

        {/* 左河 */}
        {players >= 3 && (
          <div className="absolute left-10 top-1/2 -translate-y-1/2 z-10 rotate-90">
            <River tiles={rivers[2] ?? []} cols={6} tileW={28} tileH={37} />
          </div>
        )}

        {/* 右河 */}
        {players === 4 && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 z-10 -rotate-90">
            <River tiles={rivers[3] ?? []} cols={6} tileW={28} tileH={37} />
          </div>
        )}

        {/* 下河 */}
        <div className="absolute bottom-48 left-1/2 -translate-x-1/2 z-10">
          <River tiles={rivers[0] ?? []} cols={6} tileW={30} tileH={40} />
        </div>
        {melds[0]?.length > 0 && (
          <div className="absolute bottom-44 right-16 z-10"><MeldDisplay melds={melds[0]} /></div>
        )}

        {/* 手牌 */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-end z-10">
          <div className="flex gap-1">
            {sortedHand.map((tile, index) => (
              <TileImage
                key={index}
                tile={tile}
                onClick={() => isMyTurn ? discard(tile) : undefined}
                className={`transition-all duration-200 ease-out ${isMyTurn ? "cursor-pointer hover:-translate-y-3" : "opacity-80"}`}
                style={{ filter: "drop-shadow(2px 4px 4px rgba(0,0,0,0.6))" }}
              />
            ))}
          </div>
          {tsumoTile && (
            <div className="ml-4 -translate-y-3">
              <TileImage
                tile={tsumoTile}
                onClick={() => isMyTurn ? discard(tsumoTile) : undefined}
                className={`transition-all duration-200 ease-out ${isMyTurn ? "cursor-pointer hover:-translate-y-3" : ""}`}
                style={{ filter: "drop-shadow(2px 6px 6px rgba(0,0,0,0.8))" }}
              />
            </div>
          )}
        </div>

        {/* ボタン群 */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10">
          <div className="text-white text-sm font-bold">
            {playerNames[0]}{dealer === 0 && " 👑"}
            {isMyTurn && " ◀ あなたのターン"}
            {pendingAction && <span className="text-yellow-300"> ▶ アクション選択</span>}
            {!isMyTurn && !pendingAction && " ⌛ 待機中"}
            {isRiichi && <span className="ml-2 text-red-400">[リーチ中]</span>}
          </div>

          {/* 自分のターン */}
          {isMyTurn && !pendingAction && (
            <div className="flex gap-2">
              {canTsumo && (
                <button onClick={handleTsumo}
                  className="bg-yellow-400 hover:bg-yellow-300 text-black px-5 py-2 rounded-lg font-bold shadow-lg animate-pulse">
                  ツモ
                </button>
              )}
              {canDeclareRiichi && (
                <button onClick={handleRiichi}
                  className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg font-bold shadow-lg">
                  リーチ
                </button>
              )}
              {ankanTile && (
                <button onClick={handleAnkan}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-lg font-bold shadow-lg">
                  カン
                </button>
              )}
            </div>
          )}

          {/* CPU打牌後のアクション選択 */}
          {pendingAction && !chiChoice && (
            <div className="flex gap-2 flex-wrap justify-center">
              {pendingAction.canRon && (
                <button onClick={handleRon}
                  className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg font-bold shadow-lg animate-pulse">
                  ロン
                </button>
              )}
              {pendingAction.canPon && (
                <button onClick={handlePon}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-bold shadow-lg">
                  ポン
                </button>
              )}
              {pendingAction.chiOptions.length > 0 && (
                <button
                  onClick={() =>
                    pendingAction.chiOptions.length === 1
                      ? handleChi(pendingAction.chiOptions[0])
                      : setChiChoice(pendingAction.chiOptions)
                  }
                  className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg font-bold shadow-lg">
                  チー
                </button>
              )}
              {pendingAction.canMinkan && (
                <button onClick={handleMinkan}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-lg font-bold shadow-lg">
                  カン
                </button>
              )}
              <button onClick={handlePass}
                className="bg-gray-600 hover:bg-gray-500 text-white px-5 py-2 rounded-lg font-bold shadow-lg">
                スルー
              </button>
            </div>
          )}

          {/* チー候補選択 */}
          {chiChoice && pendingAction && (
            <div className="flex gap-2 flex-wrap justify-center items-center">
              <span className="text-white text-sm">どのチー?</span>
              {chiChoice.map((opt, i) => (
                <button key={i} onClick={() => handleChi(opt)}
                  className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold shadow-lg flex gap-0.5 items-center">
                  {opt.map((t) => (
                    <TileImage key={t} tile={t} style={{ width: 22, height: 30 }} />
                  ))}
                </button>
              ))}
              <button onClick={handlePass}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-bold">
                やめる
              </button>
            </div>
          )}
        </div>

        {/* 結果パネル */}
        {result && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center rounded-full animate-fadeIn z-20">
            <div className="bg-white text-black p-10 rounded-2xl shadow-2xl text-center animate-scaleUp">
              <h2 className="text-4xl font-bold mb-4 text-red-600">
                {result.type === "draw"
                  ? "流局"
                  : result.winner === 0
                    ? "和了！"
                    : `${playerNames[result.winner]}の和了`}
              </h2>
              {result.type !== "draw" && (
                <>
                  <p className="text-xl mb-1">
                    {result.type === "tsumo" ? "ツモ" : "ロン"}
                  </p>
                  {result.yakuName && (
                    <p className="text-sm text-gray-500 mb-2">{result.yakuName}</p>
                  )}
                  <p className="text-2xl font-bold text-red-600">{result.score}点</p>
                </>
              )}
              <p className="text-lg mt-3 mb-6">最終点数: {scores[0]}</p>
              <button
                onClick={() => location.reload()}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:scale-105 transition">
                もう一局
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-green-900" />}>
      <GameInner />
    </Suspense>
  );
}
