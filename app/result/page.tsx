'use client';

type PlayerResult = {
  name: string;
  score: number;
};

const sampleResults: PlayerResult[] = [
  { name: '山田', score: 32000 },
  { name: '佐藤', score: 12000 },
  { name: '鈴木', score: -8000 },
  { name: '田中', score: -36000 },
];

export default function ResultPage() {
  const sorted = [...sampleResults].sort(
    (a, b) => b.score - a.score
  );

  return (
    <div className="min-h-screen bg-[#cfe3b4] flex items-center justify-center">
      <div className="w-[600px] bg-[#dbe8c8] rounded-2xl shadow-xl p-10">
        <h1 className="text-3xl font-bold text-center mb-8">
          結果
        </h1>

        <div className="space-y-4">
          {sorted.map((player, index) => (
            <div
              key={index}
              className="flex justify-between items-center bg-white/70 rounded-lg px-6 py-4"
            >
              <div className="text-lg font-medium">
                {index === 0 && '🥇 '}
                {index === 1 && '🥈 '}
                {index === 2 && '🥉 '}
                {player.name}
              </div>

              <div
                className={`text-lg font-semibold ${
                  player.score >= 0
                    ? 'text-green-600'
                    : 'text-red-500'
                }`}
              >
                {player.score > 0 && '+'}
                {player.score}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-4">
          <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg">
            もう一度遊ぶ
          </button>

          <button className="w-full bg-gray-300 hover:bg-gray-400 py-3 rounded-lg">
            ルームに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
