"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  CheckCircle2,
  ExternalLink,
  Flame,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Share2,
  Copy,
  ChevronRight,
  TrendingUp,
  Volume2,
  VolumeX,
} from "lucide-react";

// --- 上質なUIサウンド生成エンジン (Web Audio API) ---
const playMinimalSound = (type: "click" | "complete" | "success", enabled: boolean) => {
  if (!enabled || typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "click") {
      // Linear風の心地よい極小クリック
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === "complete") {
      // 20文字達成時の上品なスナップ音
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "success") {
      // レポートコピー・達成時の上質な和音
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.connect(subGain);
        subGain.connect(ctx.destination);
        subOsc.type = "sine";
        subOsc.frequency.setValueAtTime(freq, now + idx * 0.04);
        subGain.gain.setValueAtTime(0.06, now + idx * 0.04);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);
        subOsc.start(now + idx * 0.04);
        subOsc.stop(now + idx * 0.04 + 0.25);
      });
    }
  } catch (e) {
    // AudioContext非対応環境へのフォールバック
  }
};

export default function TespoWorkspace() {
  const [activeTab, setActiveTab] = useState<"recruit" | "training" | "report">("recruit");
  const [userPoints, setUserPoints] = useState(1500); // 初回無料募集枠
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copied, setCopied] = useState(false);

  // フィードバック入力ステート
  const [goodPoint, setGoodPoint] = useState("");
  const [improvePoint, setImprovePoint] = useState("");
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  // サンプル案件
  const [projects, setProjects] = useState([
    {
      id: "app-1",
      title: "FocusTimer Pro - ポモドーロ＆習慣化",
      developer: "Kento_Dev",
      category: "生産性",
      targetTesters: 15,
      currentTesters: 13,
      rewardPoints: 100,
      daysLeft: 3,
      status: "running",
      url: "https://play.google.com/apps/testing/example",
      description: "集中タイマー機能と統計グラフの画面遷移テストをお願いします。",
    },
    {
      id: "app-2",
      title: "Pixel Rogue - 2DダンジョンRPG",
      developer: "IndieCat Studio",
      category: "ゲーム",
      targetTesters: 15,
      currentTesters: 9,
      rewardPoints: 100,
      daysLeft: 7,
      status: "running",
      url: "https://play.google.com/apps/testing/example2",
      description: "低スペック端末でのフレームレート低下がないか検証協力求む！",
    },
  ]);

  // 文字数達成時のサウンド演出
  useEffect(() => {
    if (goodPoint.trim().length === 20) {
      playMinimalSound("complete", soundEnabled);
    }
  }, [goodPoint, soundEnabled]);

  useEffect(() => {
    if (improvePoint.trim().length === 20) {
      playMinimalSound("complete", soundEnabled);
    }
  }, [improvePoint, soundEnabled]);

  // レポートコピー
  const handleCopyReport = () => {
    playMinimalSound("success", soundEnabled);
    const dummyReport = `【Google Play 審査申請用フィードバック要約】\n1. 収集フィードバック数: 15件（全項目20文字以上検証済）\n2. 主なUI/UX改善実績: 「戻る操作時のダイアログ修正」「特定端末でのフォント可読性向上」\n3. テスト実施期間: 14日間（実機起動・クラッシュログゼロ確認済）`;
    navigator.clipboard.writeText(dummyReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      {/* ── 最上部ナビゲーション ── */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white shadow-md shadow-indigo-500/20">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-base sm:text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  テスポ
                </span>
                <span className="text-[10px] rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono font-medium text-emerald-400">
                  BUILD SUITE
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                playMinimalSound("click", !soundEnabled);
              }}
              title="効果音 ON/OFF"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 transition hover:text-slate-200"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-600" />}
            </button>
            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 shadow-inner">
              <span className="text-xs font-semibold text-slate-400">保有枠:</span>
              <span className="font-mono text-sm font-bold text-emerald-400">{userPoints.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-500">pt</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-6 space-y-6">
        {/* ── AI開発ログ & トレーニング進捗 (ジム管理風) ── */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-xl">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-indigo-400 border border-slate-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-indigo-400">AI 開発トレーナー・日報</p>
                <h2 className="text-sm font-bold text-slate-100">
                  「審査合格まであと 2 テスター。エビデンス品質は極めて良好です」
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
                <Flame className="h-3.5 w-3.5 fill-orange-400" /> 開発 8 日目
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 text-center">
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
              <span className="text-[11px] font-medium text-slate-400">審査通過予測</span>
              <p className="mt-1 font-mono text-lg font-bold text-emerald-400">94 %</p>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
              <span className="text-[11px] font-medium text-slate-400">20文字レポート蓄積</span>
              <p className="mt-1 font-mono text-lg font-bold text-indigo-400">13 / 15 件</p>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3">
              <span className="text-[11px] font-medium text-slate-400">お返し義理負債</span>
              <p className="mt-1 font-mono text-lg font-bold text-slate-300">0 人（免除）</p>
            </div>
          </div>
        </section>

        {/* ── 乗り換えの口実を提示するステータスバー ── */}
        <section className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium leading-relaxed">
              <strong>他社利用中の方へ:</strong> 審査落ちを防ぐ「20文字フィードバック」と「証拠レポート」を揃える併用バックアップとして機能します。
            </span>
          </div>
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:bg-slate-800 transition active:scale-95"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            {copied ? "審査用レポートをコピー済" : "審査申請レポート例を見る"}
          </button>
        </section>

        {/* ── 3つの集中ワークスペース切り替えタブ ── */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => {
              setActiveTab("recruit");
              playMinimalSound("click", soundEnabled);
            }}
            className={`flex-1 py-3 text-center text-xs font-bold transition border-b-2 ${
              activeTab === "recruit"
                ? "border-emerald-400 text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            募集中のテスト案件（{projects.length}）
          </button>
          <button
            onClick={() => {
              setActiveTab("training");
              playMinimalSound("click", soundEnabled);
            }}
            className={`flex-1 py-3 text-center text-xs font-bold transition border-b-2 ${
              activeTab === "training"
                ? "border-emerald-400 text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            テスト参加・フィードバック入力
          </button>
          <button
            onClick={() => {
              setActiveTab("report");
              playMinimalSound("click", soundEnabled);
            }}
            className={`flex-1 py-3 text-center text-xs font-bold transition border-b-2 ${
              activeTab === "report"
                ? "border-emerald-400 text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            自分の案件 & 自動拡散
          </button>
        </div>

        {/* ── タブ1: 募集中の案件一覧 ── */}
        {activeTab === "recruit" && (
          <div className="space-y-4">
            {projects.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm transition hover:border-slate-700 hover:bg-slate-900/90"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        {item.category}
                      </span>
                      <span className="text-xs text-slate-500">by {item.developer}</span>
                    </div>
                    <h3 className="mt-1.5 text-base font-bold text-slate-100 group-hover:text-emerald-400 transition">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">{item.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 font-mono">
                    +{item.rewardPoints} pt
                  </span>
                </div>

                <div className="mt-5 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span>テスター確保進捗</span>
                    <span className="font-mono font-bold text-slate-200">
                      {item.currentTesters} / {item.targetTesters} 名
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${(item.currentTesters / item.targetTesters) * 100}%` }}
                    />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => playMinimalSound("click", soundEnabled)}
                      className="flex-1 rounded-xl bg-slate-800 py-2.5 text-center text-xs font-bold text-slate-200 hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" /> アプリを導入
                    </a>
                    <button
                      onClick={() => {
                        setSelectedApp(item);
                        setActiveTab("training");
                        playMinimalSound("click", soundEnabled);
                      }}
                      className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-center text-xs font-bold text-slate-950 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                    >
                      フィードバックして +100pt <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── タブ2: フィードバック入力（集中モード & 爽快感バリデーション） ── */}
        {activeTab === "training" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 tracking-wider">TASK VERIFICATION</span>
              <h3 className="text-base font-bold text-slate-100">
                {selectedApp ? `「${selectedApp.title}」のフィードバック提出` : "アプリのテストレポート入力"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Googleの審査基準を満たすため、各項目20文字以上の入力で完了音が鳴り、ポイントが付与されます。
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label className="font-semibold text-slate-300">① 良かった点・使いやすかった点</label>
                  <span className={`font-mono text-xs font-bold ${goodPoint.trim().length >= 20 ? "text-emerald-400" : "text-slate-500"}`}>
                    {goodPoint.trim().length} / 20文字
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={goodPoint}
                  onChange={(e) => setGoodPoint(e.target.value)}
                  placeholder="UIのボタン配置が直感的で迷わなかった、画面遷移が軽くストレスがなかったなど"
                  className={`w-full rounded-xl border bg-slate-950 px-3 py-2.5 text-xs text-slate-200 outline-none transition ${
                    goodPoint.trim().length >= 20
                      ? "border-emerald-500/80 shadow-sm shadow-emerald-500/10"
                      : "border-slate-800 focus:border-slate-700"
                  }`}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label className="font-semibold text-slate-300">② 改善してほしい点・バグ・気になった点</label>
                  <span className={`font-mono text-xs font-bold ${improvePoint.trim().length >= 20 ? "text-emerald-400" : "text-slate-500"}`}>
                    {improvePoint.trim().length} / 20文字
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={improvePoint}
                  onChange={(e) => setImprovePoint(e.target.value)}
                  placeholder="ダークモード時に文字が見づらい箇所があった、戻るボタンの挙動を統一してほしいなど"
                  className={`w-full rounded-xl border bg-slate-950 px-3 py-2.5 text-xs text-slate-200 outline-none transition ${
                    improvePoint.trim().length >= 20
                      ? "border-emerald-500/80 shadow-sm shadow-emerald-500/10"
                      : "border-slate-800 focus:border-slate-700"
                  }`}
                />
              </div>

              <button
                disabled={goodPoint.trim().length < 20 || improvePoint.trim().length < 20}
                onClick={() => {
                  playMinimalSound("success", soundEnabled);
                  setUserPoints((prev) => prev + 100);
                  alert("フィードバックを提出しました！+100ptを獲得しました。");
                  setGoodPoint("");
                  setImprovePoint("");
                  setActiveTab("recruit");
                }}
                className="w-full rounded-xl py-3 text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/10"
              >
                <CheckCircle2 className="h-4 w-4" /> 完了を証明して +100 pt を獲得
              </button>
            </div>
          </div>
        )}

        {/* ── タブ3: 自作案件 & 自動拡散 ── */}
        {activeTab === "report" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">現在テスト中の自作アプリ</h3>
                  <p className="text-xs text-slate-400 mt-0.5">14日間の維持をシステムが自動追跡中</p>
                </div>
                <span className="rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold">
                  DAY 11 / 14
                </span>
              </div>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold">審査用フィードバック収集進捗</span>
                  <span className="font-mono text-emerald-400 font-bold">14 / 15 人完了</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-emerald-400" style={{ width: "93%" }} />
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCopyReport}
                  className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" /> 審査申請用テキストを全コピー
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    "Google Playの14日間テスト、テスポで14人達成！審査用レポートも自動出力されてめちゃくちゃ楽。残り1名枠空いてます👇\n#テスポ #個人開発 #クローズドテスト"
                  )}&url=${encodeURIComponent("https://tespo-app.vercel.app")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                >
                  <Share2 className="h-3.5 w-3.5" /> Xで進捗をシェア（自動集客）
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}