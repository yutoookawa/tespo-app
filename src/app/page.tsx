"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Smartphone, Users, Sparkles, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AppItem {
  id: string | number;
  name: string;
  category: string;
  developer: string;
  required_testers: number;
  current_testers: number;
  reward_points: number;
  tags: string[];
}

export default function Home() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フォーム入力値
  const [formData, setFormData] = useState({
    name: "",
    category: "ツール",
    developer: "",
    requiredTesters: 20,
    rewardPoints: 500,
    tagInput: "",
  });

  // Supabaseから案件一覧を取得
  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setApps(data);
    } catch (err) {
      console.error('データ取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // 投稿ハンドラー
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.developer.trim()) return;

    setIsSubmitting(true);

    const tagsArray = formData.tagInput
      ? formData.tagInput.split(',').map(t => t.trim()).filter(Boolean)
      : ["Android", "新着"];

    try {
      const { error } = await supabase.from('apps').insert([
        {
          name: formData.name,
          category: formData.category,
          developer: formData.developer,
          required_testers: Number(formData.requiredTesters) || 20,
          current_testers: 0,
          reward_points: Number(formData.rewardPoints) || 500,
          tags: tagsArray
        }
      ]);

      if (error) throw error;

      // 投稿完了後のリセット
      setIsModalOpen(false);
      setFormData({
        name: "",
        category: "ツール",
        developer: "",
        requiredTesters: 20,
        rewardPoints: 500,
        tagInput: "",
      });

      // 最新データを再取得
      await fetchApps();
    } catch (err) {
      console.error('投稿エラー:', err);
      alert('投稿に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-indigo-900">テスポ (仮)</span>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow hover:bg-indigo-700 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>案件を募集する</span>
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-6">
        {/* バナー */}
        <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Google Play 20人テスト対策</span>
            </div>
            <h1 className="text-xl font-bold leading-tight">
              互いにテストし合い、<br />アプリ審査を突破しよう。
            </h1>
            <p className="text-xs text-indigo-100 leading-relaxed">
              あなたのアプリをテストしてもらう代わりに、他の開発者のアプリをテストして助け合うプラットフォームです。
            </p>
          </div>
        </section>

        {/* 案件一覧 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>募集中のテスト案件 ({apps.length}件)</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">読み込み中...</span>
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-6">
              <p className="text-sm text-slate-500 font-medium">現在募集中のテスト案件はありません。</p>
              <p className="text-xs text-slate-400 mt-1">最初の案件を募集してみましょう！</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {apps.map((app) => (
                <div key={app.id} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {app.category}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">{app.name}</h3>
                      <p className="text-xs text-slate-500">開発者: {app.developer}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        +{app.reward_points} pt
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {app.tags && app.tags.map((tag, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-100">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <span>テスター進捗: <b>{app.current_testers}</b> / {app.required_testers}人</span>
                    <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full" 
                        style={{ width: `${Math.min((app.current_testers / app.required_testers) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 投稿モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-slate-800">新しいテスト案件を募集する</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">アプリ名 *</label>
                <input
                  type="text"
                  required
                  placeholder="例: 集中タイマー &amp; ポモドーロ"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">カテゴリー</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
                  >
                    <option>ツール</option>
                    <option>ゲーム</option>
                    <option>生産性</option>
                    <option>ヘルスケア</option>
                    <option>教育</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">開発者名（ニックネーム） *</label>
                  <input
                    type="text"
                    required
                    placeholder="例: ねこまる開発"
                    value={formData.developer}
                    onChange={(e) => setFormData({ ...formData, developer: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">募集人数</label>
                  <input
                    type="number"
                    value={formData.requiredTesters}
                    onChange={(e) => setFormData({ ...formData, requiredTesters: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">付与ポイント</label>
                  <input
                    type="number"
                    value={formData.rewardPoints}
                    onChange={(e) => setFormData({ ...formData, rewardPoints: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">タグ（カンマ区切り）</label>
                <input
                  type="text"
                  placeholder="例: Android 13+, 初心者歓迎"
                  value={formData.tagInput}
                  onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 font-semibold text-white hover:bg-indigo-700 shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSubmitting ? "投稿中..." : "投稿する"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}