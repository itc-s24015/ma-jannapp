"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { isWinningHand } from "../../lib/mahjong/winJudge";
import { calculateFinalScore } from "../../lib/mahjong/score";
import { decideDealer } from "../../lib/mahjong/gameManager";
import { createWall } from "../../lib/tiles";
import TileImage from "../../components/TileImage";

function sortTiles(tiles: string[]) {
  const order = { m: 0, p: 1, s: 2, z: 3 };
  return [...tiles].sort((a, b) => {
    const suitA = a[a.length - 1] as keyof typeof order;
    const suitB = b[b.length - 1] as keyof typeof order;
    if (order[suitA] !== order[suitB]) return order[suitA] - order[suitB];
    return parseInt(a) - parseInt(b);
  });
}

function River({
  tiles,
  cols = 6,
  tileW = 30,
  tileH = 40,
}: {
  tiles: { tile: string; isRiichiTile?: boolean }[];
  cols?: number;
  tileW?: number;
  tileH?: number;
}) {
  return (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {tiles.slice(0, cols * 3).map((t, i) => (
        <TileImage
          key={i}
          tile={t.tile}
          className={`transition-all duration-300 ease-out ${t.isRiichiTile ? "rotate-90" : ""}`}
          style={{
            width: tileW,
            height: tileH,
            filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.5))",
          }}
        />
      ))}
    </div>
  );
}

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
  const [rivers, setRivers] = useState<
    { tile: string; isRiichiTile?: boolean }[][]
  >(() => Array.from({ length: players }, () => []));
  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState(() =>
    Array.from({ length: players }, () => 25000),
  );
  const [isRiichi, setIsRiichi] = useState(false);
  const [honba] = useState(0);

  type Result = {
    winner: number;
    type: "tsumo" | "ron" | "draw";
    score: number;
  };
  const [result, setResult] = useState<Result | null>(null);

  // クライアントのみで乱数を使って初期化（hydration error 回避）
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
    if (!initialized || turn !== 0 || result) return;
    if (hands[0].length === 13) {
      if (wallRef.current.length === 0) {
        endGame(0, "draw");
        return;
      }
      const tile = wallRef.current.shift()!;
      setHands((prev) => {
        const next = prev.map((h) => [...h]);
        next[0] = [...next[0], tile];
        return next;
      });
    }
  }, [turn, result, initialized]);

  // ── CPUターン ────────────────────────────────────
  useEffect(() => {
    if (!initialized || turn === 0 || result) return;

    const timer = setTimeout(() => {
      const newHand = drawTile(turn);
      if (result) return;
      if (newHand.length === 14 && isWinningHand(newHand)) {
        endGame(turn, "tsumo");
        return;
      }
      const discardIdx = Math.floor(Math.random() * newHand.length);
      const discarded = newHand[discardIdx];
      setHands((prev) => {
        const next = prev.map((h) => [...h]);
        next[turn] = newHand.filter((_, i) => i !== discardIdx);
        return next;
      });
      setRivers((prev) => {
        const next = prev.map((r) => [...r]);
        next[turn] = [...next[turn], { tile: discarded }];
        return next;
      });
      if (!checkRon(discarded, turn)) {
        setTurn((prev) => (prev + 1) % players);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [turn, result, initialized]);

  // ── 初期化待ち ───────────────────────────────────
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 to-green-800" />
    );
  }

  const isMyTurn = turn === 0;
  const myHand = hands[0];
  const sortedHand = sortTiles(
    myHand.length > 13 ? myHand.slice(0, -1) : myHand,
  );
  const tsumoTile =
    isMyTurn && myHand.length > 13 ? myHand[myHand.length - 1] : null;

  // ── 終了処理 ──────────────────────────────────────
  function endGame(winner: number, type: "tsumo" | "ron" | "draw") {
    if (result) return;
    const isWinnerDealer = winner === dealer;
    const winScore =
      type === "draw" ? 0 : calculateFinalScore(1, 30, isWinnerDealer);
    setResult({ winner, type, score: winScore });
    if (type !== "draw") {
      setScores((prev) => {
        const next = [...prev];
        next[winner] += winScore;
        return next;
      });
    }
  }

  // ── ツモ牌を引く ─────────────────────────────────
  function drawTile(player: number): string[] {
    if (wallRef.current.length === 0) {
      endGame(0, "draw");
      return hands[player];
    }
    const tile = wallRef.current.shift()!;
    const newHand = [...hands[player], tile];
    setHands((prev) => {
      const next = prev.map((h) => [...h]);
      next[player] = newHand;
      return next;
    });
    return newHand;
  }

  // ── ロン判定 ─────────────────────────────────────
  function checkRon(tile: string, discarder: number) {
    for (let i = 0; i < players; i++) {
      if (i === discarder) continue;
      const testHand = [...hands[i], tile];
      if (testHand.length === 14 && isWinningHand(testHand)) {
        endGame(i, "ron");
        return true;
      }
    }
    return false;
  }

  // ── プレイヤー打牌 ───────────────────────────────
  function discard(tile: string) {
    if (!isMyTurn || result) return;
    setHands((prev) => {
      const next = prev.map((h) => [...h]);
      const idx = next[0].indexOf(tile);
      if (idx === -1) return prev;
      next[0].splice(idx, 1);
      return next;
    });
    setRivers((prev) => {
      const next = prev.map((r) => [...r]);
      next[0] = [...next[0], { tile, isRiichiTile: isRiichi }];
      return next;
    });
    if (!checkRon(tile, 0)) {
      setTurn((prev) => (prev + 1) % players);
    }
  }

  // ── リーチ ───────────────────────────────────────
  function handleRiichi() {
    if (isRiichi || scores[0] < 1000 || !isMyTurn || result) return;
    setScores((prev) => {
      const n = [...prev];
      n[0] -= 1000;
      return n;
    });
    setIsRiichi(true);
  }

  // ── ツモ宣言 ─────────────────────────────────────
  function checkTsumo() {
    if (!tsumoTile || result) return;
    const fullHand = [...sortedHand, tsumoTile];
    if (isWinningHand(fullHand)) {
      endGame(0, "tsumo");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 to-green-800 flex items-center justify-center">
      <div className="w-[850px] h-[850px] bg-green-700 rounded-full shadow-[0_0_60px_rgba(0,0,0,0.8)] border-[25px] border-amber-900 relative">
        {/* 内側フェルト */}
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
            <div className="mt-2 text-yellow-400 font-bold">
              残り牌: {wallRef.current.length}
            </div>
          </div>
        </div>

        {/* 上プレイヤー（CPU1） */}
        <div
          className={`absolute top-24 left-1/2 -translate-x-1/2 text-sm z-10 ${turn === 1 ? "text-yellow-300 font-bold" : "text-white"}`}
        >
          {playerNames[1]}
          {dealer === 1 && " 👑"}
        </div>

        {/* 左プレイヤー（CPU2） */}
        {players >= 3 && (
          <div
            className={`absolute left-14 top-1/2 -translate-y-1/2 text-sm rotate-90 z-10 ${turn === 2 ? "text-yellow-300 font-bold" : "text-white"}`}
          >
            {playerNames[2]}
            {dealer === 2 && " 👑"}
          </div>
        )}

        {/* 右プレイヤー（CPU3、四麻のみ） */}
        {players === 4 && (
          <div
            className={`absolute right-14 top-1/2 -translate-y-1/2 text-sm -rotate-90 z-10 ${turn === 3 ? "text-yellow-300 font-bold" : "text-white"}`}
          >
            {playerNames[3]}
            {dealer === 3 && " 👑"}
          </div>
        )}

        {/* リーチ表示 */}
        {isRiichi && (
          <div className="absolute top-24 left-16 bg-red-600 px-4 py-1 rounded-lg font-bold animate-pulse z-10">
            リーチ
          </div>
        )}

        {/* リーチ棒 */}
        {isRiichi && (
          <div className="absolute top-[280px] left-1/2 -translate-x-1/2 bg-white w-28 h-2 rounded-full shadow-md z-10" />
        )}

        {/* 上河（CPU1） */}
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-10">
          <River tiles={rivers[1] ?? []} cols={6} tileW={30} tileH={40} />
        </div>

        {/* 左河（CPU2） */}
        {players >= 3 && (
          <div className="absolute left-10 top-1/2 -translate-y-1/2 z-10 rotate-90">
            <River tiles={rivers[2] ?? []} cols={6} tileW={28} tileH={37} />
          </div>
        )}

        {/* 右河（CPU3、四麻のみ） */}
        {players === 4 && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 z-10 -rotate-90">
            <River tiles={rivers[3] ?? []} cols={6} tileW={28} tileH={37} />
          </div>
        )}

        {/* 下河（自分） */}
        <div className="absolute bottom-48 left-1/2 -translate-x-1/2 z-10">
          <River tiles={rivers[0] ?? []} cols={6} tileW={30} tileH={40} />
        </div>

        {/* 手牌 */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-end z-10">
          <div className="flex gap-1">
            {sortedHand.map((tile, index) => (
              <TileImage
                key={index}
                tile={tile}
                onClick={() => discard(tile)}
                className="cursor-pointer transition-all duration-200 ease-out hover:-translate-y-3"
                style={{ filter: "drop-shadow(2px 4px 4px rgba(0,0,0,0.6))" }}
              />
            ))}
          </div>

          {tsumoTile && (
            <div className="ml-4 -translate-y-3">
              <TileImage
                tile={tsumoTile}
                onClick={() => discard(tsumoTile)}
                className="cursor-pointer transition-all duration-200 ease-out hover:-translate-y-3"
                style={{ filter: "drop-shadow(2px 6px 6px rgba(0,0,0,0.8))" }}
              />
            </div>
          )}
        </div>

        {/* ボタン群 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10">
          <div className="text-white text-sm font-bold">
            {playerNames[0]}
            {dealer === 0 && " 👑"}
            {isMyTurn ? " ◀ あなたのターン" : " ⌛ 待機中"}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRiichi}
              disabled={isRiichi || !isMyTurn || !!result}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 px-5 py-2 rounded-lg font-bold transition-all duration-200"
            >
              リーチ
            </button>
            <button
              onClick={checkTsumo}
              disabled={!isMyTurn || !tsumoTile || !!result}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black px-5 py-2 rounded-lg font-bold transition-all duration-200"
            >
              ツモ
            </button>
          </div>
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
                  <p className="text-xl mb-2">
                    {result.type === "tsumo" ? "ツモ" : "ロン"}
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {result.score}点
                  </p>
                </>
              )}
              <p className="text-lg mt-3 mb-6">最終点数: {scores[0]}</p>
              <button
                onClick={() => location.reload()}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:scale-105 transition"
              >
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
