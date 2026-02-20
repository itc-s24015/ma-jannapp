"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-green-900 flex flex-col items-center justify-center text-black">
      <h1 className="text-5xl font-bold mb-10">一局麻雀</h1>

      <button
        onClick={() => router.push("/create")}
        className="bg-white px-8 py-4 rounded-xl text-2xl shadow-lg hover:scale-105 transition"
      >
        CPUと対戦
      </button>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "14px 36px",
  fontSize: "20px",
  backgroundColor: "#ffffff",
  color: "black",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
};
