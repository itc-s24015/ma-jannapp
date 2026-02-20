"use client";

import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();

  function startGame(players: number) {
    router.push(`/game?players=${players}`);
  }

  return (
    <div className="min-h-screen bg-green-900 flex flex-col items-center justify-center text-white">
      <h2 className="text-4xl mb-10">人数を選択</h2>

      <div className="flex gap-10">
        <button
          onClick={() => startGame(3)}
          className="bg-white text-black px-8 py-4 rounded-xl text-2xl hover:scale-105 transition"
        >
          三人麻雀
        </button>

        <button
          onClick={() => startGame(4)}
          className="bg-white text-black px-8 py-4 rounded-xl text-2xl hover:scale-105 transition"
        >
          四人麻雀
        </button>
      </div>
    </div>
  );
}
