type YakuResult = {
  name: string;
  han: number;
  yakuman?: boolean;
  doubleYakuman?: boolean;
};

type ScoreResult = {
  base: number;
  total: number;
  title: string;
};

type Player = {
  name: string;
  score: number;
};

type Props = {
  yaku: YakuResult[];
  fu: number;
  score: ScoreResult;
  onNext?: () => void;
  players?: Player[];
};

export default function ResultPanel({
  yaku,
  fu,
  score,
  onNext,
  players,
}: Props) {
  const totalHan = yaku.reduce((sum, y) => {
    if (y.yakuman) return sum + 13;
    if (y.doubleYakuman) return sum + 26;
    return sum + y.han;
  }, 0);

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white w-[500px] rounded-2xl shadow-2xl p-6">
        <h2 className="text-3xl font-bold mb-4 text-center">和了</h2>

        {/* 役一覧 */}
        <div className="space-y-2 mb-4">
          {yaku.map((y, i) => (
            <div
              key={i}
              className={`flex justify-between text-lg ${
                y.yakuman || y.doubleYakuman
                  ? "text-red-400 font-bold"
                  : "text-white"
              }`}
            >
              <span>{y.name}</span>
              <span>
                {y.yakuman
                  ? "役満"
                  : y.doubleYakuman
                    ? "ダブル役満"
                    : `${y.han}翻`}
              </span>
            </div>
          ))}
        </div>

        {/* 合計翻・符 */}
        <div className="border-t border-gray-700 pt-3 mb-3 text-center">
          <div className="text-xl">
            {totalHan}翻 {fu}符
          </div>
          <div className="text-yellow-400 text-2xl font-bold mt-1">
            {score.title}
          </div>
        </div>

        {/* 点数 */}
        <div className="text-center text-3xl font-bold text-green-400">
          {score.total.toLocaleString()} 点
        </div>

        <button
          onClick={() => (onNext ? onNext() : window.location.reload())}
          className="mt-6 w-full bg-blue-600 py-2 rounded-xl text-white font-bold"
        >
          次の局へ
        </button>

        {players && (
          <div className="mt-6 border-t border-gray-700 pt-4">
            <div className="text-xl font-bold mb-2 text-center">最終点数</div>
            {[...players]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div key={i} className="flex justify-between px-6 text-lg">
                  <span>{p.name}</span>
                  <span>{p.score.toLocaleString()} 点</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
