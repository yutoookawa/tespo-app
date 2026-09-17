"use client";

import React, { useState } from "react";

// テスト用のダミーデータ（後でSupabaseのデータベースと繋ぎます）
const INITIAL_PROJECTS = [
  {
    id: "1",
    title: "HabitForge - 習慣化トラッカー",
    description: "シンプルな習慣記録アプリです。毎日のチェック機能とグラフ表示の動作確認をお願いします。",
    targetTesters: 20,
    currentTesters: 14,
    rewardPoints: 10,
    joinUrl: "https://play.google.com/apps/testing/example",
  },
  {
    id: "2",
    title: "QuickMemo AI",
    description: "音声から自動でタスクを抽出するメモ帳。14日間の継続利用テストをお願いしたいです。",
    targetTesters: 20,
    currentTesters: 8,
    rewardPoints: 10,
    joinUrl: "https://play.google.com/apps/testing/example2",
  },
];

export default function Home() {
  const [projects] = useState(INITIAL_PROJECTS);
  const [userPoints, setUserPoints] = useState(20); // 初期付与ポイント（仮）

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ナビゲーションバー */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-indigo-600">テスポ (仮)</h1>
            <p className="text-xs text-slate-500">20人・14日間のテスト相互支援プラットフォーム</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              保有ポイント: {userPoints} pt
            </span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* ヒーローエリア */}
        <section className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white shadow-sm">
          <h2 className="text-lg font-bold sm:text-xl">アプリをテストして、あなたのアプリもテストしてもらおう</h2>
          <p className="mt-1 text-sm text-indigo-100">
            テスターとして参加するとポイントを獲得。貯めたポイントで自分のアプリのテスターを募集できます。
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => alert("テスト募集機能は次のステップで実装します！")}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow transition hover:bg-indigo-50 active:scale-95"
            >
              ＋ テストを募集する
            </button>
          </div>
        </section>

        {/* テスト案件一覧 */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">募集中のテスト案件</h3>
            <span className="text-xs text-slate-500">{projects.length} 件の募集</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-slate-900">{project.title}</h4>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      +{project.rewardPoints} pt
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{project.description}</p>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>テスター集まり状況</span>
                    <span className="font-medium text-slate-700">
                      {project.currentTesters} / {project.targetTesters} 人
                    </span>
                  </div>
                  {/* プログレスバー */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${(project.currentTesters / project.targetTesters) * 100}%` }}
                    />
                  </div>

                  <a
                    href={project.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setUserPoints((prev) => prev + project.rewardPoints)}
                    className="mt-4 block w-full rounded-lg bg-indigo-50 py-2 text-center text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 active:scale-95"
                  >
                    テストに参加して +{project.rewardPoints}pt 獲得
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}