"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Smartphone, Users, Sparkles, X, Loader2, ExternalLink } from 'lucide-react';
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
  test_url?: string;
}

export default function Home() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フォーム用ステート
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ツール');
  const [developer, setDeveloper] = useState('');
  const [requiredTesters, setRequiredTesters] = useState(20);
  const [rewardPoints, setRewardPoints] = useState(500);
  const [tagsInput, setTagsInput] = useState('');
  const [testUrl, setTestUrl] = useState('');

  // 案件一覧の取得
  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApps(data || []);
    } catch (err) {
      console.error('案件取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // 新規投稿
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      : ['クローズドテスト'];

    try {
      const { data, error } = await supabase
        .from('apps')
        .insert([
          {
            name,
            category,
            developer: developer || '匿名開発者',
            required_testers: Number(requiredTesters),
            current_testers: 0,
            reward_points: Number(rewardPoints),
            tags,
            test_url: testUrl,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setApps([data[0], ...apps]);
      }

      // フォーム初期化 & 閉じる
      setName('');
      setCategory('ツール');
      setDeveloper('');
      setRequiredTesters(20);
      setRewardPoints(500);
      setTagsInput('');
      setTestUrl('');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('投稿エラー:', err);
      alert('投稿に失敗しました: ' + (err.message || 'エラーが発生しました'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // テスト参加処理（カウントアップ & リンク遷移）
  const handleJoinTest = async (app: AppItem) => {
    const updatedCount = app.current_testers + 1;

    // UIを先行して即時更新
    setApps(apps.map((a) => (a.id === app.id ? { ...a, current_testers: updatedCount } : a)));

    try {
      // DBを更新
      await supabase
        .from('apps')
        .update({ current_testers: updatedCount })
        .eq('id', app.id);
    } catch (err) {
      console.error('更新エラー:', err);
    }

    // リンクが設定されていれば新しいタブで開く
    if (app.test_url) {
      window.open(app.test_url, '_blank', 'noopener,noreferrer');
    } else {
      alert('参加登録しました！テスト用URLは設定されていません。');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              テスポ
            </h1>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-full transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>案件を募集</span>
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-4">
        {/* ポイント状況バー */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-4 text-white shadow-md mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-indigo-100 font-medium">保有テスポポイント</p>
              <h2 className="text-2xl font-bold flex items-center gap-1 mt-0.5">
                1,500 <span className="text-xs font-normal text-indigo-200">pt</span>
              </h2>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>テスト参加で獲得</span>
            </div>
          </div>
        </div>

        {/* リスト見出し */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800 text-sm">募集中のテスト案件</h2>
          <span className="text-xs text-slate-500 font-medium">{apps.length} 件</span>
        </div>

        {/* 案件一覧 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            <p className="text-sm">案件を読み込み中...</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500 p-6">
            <p className="text-sm">現在募集中のテスト案件はありません。</p>
            <p className="text-xs text-slate-400 mt-1">最初の案件を募集してみましょう！</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apps.map((app) => {
              const progress = Math.min(
                100,
                Math.round((app.current_testers / app.required_testers) * 100)
              );
              return (
                <div
                  key={app.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="inline-block text-[10px] font-semibold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-1">
                          {app.category}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          {app.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{app.developer}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 flex items-center gap-0.5">
                          +{app.reward_points} pt
                        </span>
                      </div>
                    </div>

                    {/* タグ */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {app.tags &&
                        app.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div>
                    {/* 進捗プログレスバー */}
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          テスター進捗
                        </span>
                        <span>
                          {app.current_testers} / {app.required_testers} 人 ({progress}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* 参加ボタン */}
                    <button
                      onClick={() => handleJoinTest(app)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                    >
                      <span>テストに参加する</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 投稿モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base">テスト案件を募集する</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  アプリ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: タスク管理習慣化アプリ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">カテゴリ</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                  >
                    <option value="ツール">ツール</option>
                    <option value="ゲーム">ゲーム</option>
                    <option value="生産性">生産性</option>
                    <option value="ライフスタイル">ライフスタイル</option>
                    <option value="教育">教育</option>
                    <option value="その他">その他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">開発者名</label>
                  <input
                    type="text"
                    placeholder="例: Studio Alfa"
                    value={developer}
                    onChange={(e) => setDeveloper(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  テスト参加URL（Googleグループ / Web参加URL）
                </label>
                <input
                  type="url"
                  placeholder="https://groups.google.com/g/... など"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">募集人数</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={requiredTesters}
                    onChange={(e) => setRequiredTesters(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">報酬ポイント</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  タグ（カンマ区切り）
                </label>
                <input
                  type="text"
                  placeholder="例: Android14対応, 短期集中"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>投稿中...</span>
                    </>
                  ) : (
                    <span>この内容で募集する</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}