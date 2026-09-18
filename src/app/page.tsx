"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Smartphone, Users, Sparkles, X, Loader2, ExternalLink, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AppItem {
  id: number;
  name: string;
  category: string;
  developer: string;
  required_testers: number;
  current_testers: number;
  reward_points: number;
  tags: string[];
  test_url?: string;
  created_at: string;
}

interface Participation {
  id: number;
  app_id: number;
  tester_name: string;
  started_at: string;
  status: 'testing' | 'completed' | 'dropped';
  feedback: string;
  app?: AppItem;
}

export default function Home() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [myTests, setMyTests] = useState<Participation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フォーム用ステート
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ツール');
  const [developer, setDeveloper] = useState('');
  const [requiredTesters, setRequiredTesters] = useState(22); // 20人同時維持のため22人推奨
  const [rewardPoints, setRewardPoints] = useState(500);
  const [tagsInput, setTagsInput] = useState('');
  const [testUrl, setTestUrl] = useState('');

  // 案件および参加履歴の取得
  const fetchData = async () => {
    try {
      // 案件取得
      const { data: appsData, error: appsErr } = await supabase
        .from('apps')
        .select('*')
        .order('created_at', { ascending: false });
      if (appsErr) throw appsErr;
      setApps(appsData || []);

      // 参加中テスト取得（ローカルストレージに保存した参加IDを利用）
      const localJoined = JSON.parse(localStorage.getItem('tespo_joined_ids') || '[]');
      if (localJoined.length > 0) {
        const { data: partData, error: partErr } = await supabase
          .from('test_participations')
          .select('*, app:apps(*)')
          .in('id', localJoined);
        if (!partErr && partData) {
          setMyTests(partData);
        }
      }
    } catch (err) {
      console.error('データ取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 新規募集
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      : ['クローズドテスト', '14日間維持'];

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

      setName('');
      setCategory('ツール');
      setDeveloper('');
      setRequiredTesters(22);
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

  // テスト参加（14日間タイマー開始）
  const handleJoinTest = async (app: AppItem) => {
    const updatedCount = app.current_testers + 1;

    try {
      // 1. 参加テーブルへ追加
      const { data: partData, error: partErr } = await supabase
        .from('test_participations')
        .insert([{ app_id: app.id, status: 'testing' }])
        .select('*, app:apps(*)')
        .single();

      if (partErr) throw partErr;

      // 2. 端末にIDを記憶
      const currentLocal = JSON.parse(localStorage.getItem('tespo_joined_ids') || '[]');
      localStorage.setItem('tespo_joined_ids', JSON.stringify([...currentLocal, partData.id]));
      setMyTests([partData, ...myTests]);

      // 3. アプリ側のテスター数+1
      await supabase
        .from('apps')
        .update({ current_testers: updatedCount })
        .eq('id', app.id);

      setApps(apps.map((a) => (a.id === app.id ? { ...a, current_testers: updatedCount } : a)));

      // 4. URLを開く
      if (app.test_url) {
        window.open(app.test_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('参加エラー:', err);
      alert('参加処理でエラーが発生しました');
    }
  };

  // 14日経過計算関数
  const getDaysPassed = (startDate: string) => {
    const diff = new Date().getTime() - new Date(startDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
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

      <div className="max-w-md mx-auto px-4 pt-4 space-y-6">
        {/* ポイントステータス */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-4 text-white shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-indigo-100 font-medium">保有テスポポイント</p>
              <h2 className="text-2xl font-bold flex items-center gap-1 mt-0.5">
                1,500 <span className="text-xs font-normal text-indigo-200">pt</span>
              </h2>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>14日完遂でポイント付与</span>
            </div>
          </div>
        </div>

        {/* 参加中（実施中）の14日間テストタスク */}
        {myTests.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                参加中のテスト（14日間維持）
              </h2>
              <span className="text-xs text-indigo-600 font-semibold">{myTests.length} 件</span>
            </div>

            <div className="space-y-2">
              {myTests.map((t) => {
                const days = getDaysPassed(t.started_at);
                const isReadyToComplete = days >= 14;
                return (
                  <div key={t.id} className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                          {days}日目 / 14日間
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{t.app?.name || 'テスト案件'}</h4>
                      </div>
                      <span className="text-xs text-amber-600 font-bold">+{t.app?.reward_points || 500} pt</span>
                    </div>

                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (days / 14) * 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 text-[11px]">
                        {isReadyToComplete ? '14日達成！完了申請可能' : `あと ${14 - days} 日間端末に保持`}
                      </span>
                      {isReadyToComplete ? (
                        <button className="bg-emerald-600 text-white px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3 h-3" />
                          完了してポイント獲得
                        </button>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-medium">
                          保持中
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 募集中の案件一覧 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 text-sm">募集中のテスト案件（20人審査対策）</h2>
            <span className="text-xs text-slate-500 font-medium">{apps.length} 件</span>
          </div>

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
                    className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="inline-block text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-1">
                            {app.category}
                          </span>
                          <h3 className="font-bold text-slate-900 text-base">{app.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{app.developer}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                            +{app.reward_points} pt
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {app.tags?.map((tag, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      {/* 同時テスター確保進捗 */}
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            テスター確保状況
                          </span>
                          <span>
                            {app.current_testers} / {app.required_testers} 人
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">※ Google Play要件: 20人の同時維持</p>
                      </div>

                      <button
                        onClick={() => handleJoinTest(app)}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                      >
                        <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                        <span>14日間のテストに参加する</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 投稿モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base">テスト案件を募集する</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  アプリ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 習慣トラッカー"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">カテゴリ</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="ツール">ツール</option>
                    <option value="ゲーム">ゲーム</option>
                    <option value="生産性">生産性</option>
                    <option value="ライフスタイル">ライフスタイル</option>
                    <option value="教育">教育</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">開発者名</label>
                  <input
                    type="text"
                    placeholder="Studio Alfa"
                    value={developer}
                    onChange={(e) => setDeveloper(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  テスト参加URL（GoogleグループまたはPlay参加リンク）
                </label>
                <input
                  type="url"
                  placeholder="https://groups.google.com/g/... または https://play.google.com/apps/testing/..."
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">募集人数（推奨22人）</label>
                  <input
                    type="number"
                    min="20"
                    max="100"
                    value={requiredTesters}
                    onChange={(e) => setRequiredTesters(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>この内容で募集する</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}