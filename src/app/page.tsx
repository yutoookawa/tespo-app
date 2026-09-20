"use client";

import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Smartphone, 
  Users, 
  Sparkles, 
  X, 
  Loader2, 
  ExternalLink, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  AlertCircle,
  Camera,
  Trash2,
  FolderLock,
  LogIn,
  LogOut,
  Copy,
  MessageSquare,
  Menu,
  BookOpen,
  Share2,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AppItem {
  id: number;
  user_id?: string;
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
  user_id?: string;
  tester_name: string;
  started_at: string;
  status: 'testing' | 'completed' | 'dropped';
  feedback?: string;
  device_model?: string;
  os_version?: string;
  good_points?: string;
  improvements?: string;
  bug_reports?: string;
  screenshot_day1?: string;
  screenshot_day7?: string;
  screenshot_day14?: string;
  app?: AppItem;
}

const GOOGLE_GROUP_URL = "https://groups.google.com/g/testers-field";
const GOOGLE_GROUP_EMAIL = "testers-field@googlegroups.com";

const INITIAL_POINTS = 0;
const FIXED_TESTERS = 15;
const REWARD_PER_TEST = 100;
const REQUIRED_POINTS_FOR_POST = FIXED_TESTERS * REWARD_PER_TEST;

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string>('');
  const [userPoints, setUserPoints] = useState<number>(INITIAL_POINTS);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [myTests, setMyTests] = useState<Participation[]>([]);
  const [allParticipations, setAllParticipations] = useState<Participation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 表示タブ管理 ('explore' = 募集中, 'joined' = 参加中, 'my_apps' = 自作案件)
  const [activeTab, setActiveTab] = useState<'explore' | 'joined' | 'my_apps'>('explore');
  // 使い方アコーディオン開閉
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // モーダル・ドロワーステート
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeManualModal, setActiveManualModal] = useState<'about' | 'dev' | 'tester' | null>(null);
  const [activeCompletingTest, setActiveCompletingTest] = useState<Participation | null>(null);
  
  // 認証フォームステート
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [hasJoinedGroup, setHasJoinedGroup] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // 案件投稿フォームステート
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ツール');
  const [tagsInput, setTagsInput] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // フィードバック入力ステート
  const [deviceModel, setDeviceModel] = useState('');
  const [osVersion, setOsVersion] = useState('Android 14');
  const [goodPoints, setGoodPoints] = useState('');
  const [improvements, setImprovements] = useState('');
  const [bugReports, setBugReports] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setUsername('');
        setUserPoints(INITIAL_POINTS);
      }
    });

    fetchData();

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('points, username')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        const fallbackName = email ? email.split('@')[0] : '開発者';
        await supabase.from('profiles').insert([{ id: userId, email: email ?? '', username: fallbackName, points: INITIAL_POINTS }]);
        setUsername(fallbackName);
        setUserPoints(INITIAL_POINTS);
      } else if (data) {
        setUsername(data.username || '開発者');
        setUserPoints(data.points ?? 0);
      }
    } catch (err) {
      console.error('プロファイル取得エラー:', err);
    }
  };

  const fetchData = async () => {
    try {
      const { data: appsData, error: appsErr } = await supabase
        .from('apps')
        .select('*')
        .order('created_at', { ascending: false });
      if (appsErr) throw appsErr;
      setApps(appsData || []);

      const { data: partData, error: partErr } = await supabase
        .from('test_participations')
        .select('*, app:apps(*)');
      if (partErr) throw partErr;
      
      setAllParticipations(partData || []);

      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData.session?.user?.id;
      if (currentUserId && partData) {
        setMyTests(partData.filter((p) => p.user_id === currentUserId));
      } else {
        const localJoined = JSON.parse(localStorage.getItem('tespo_joined_ids') || '[]');
        setMyTests((partData || []).filter((p) => localJoined.includes(p.id)));
      }
    } catch (err) {
      console.error('データ取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (isSignUp) {
        if (!authUsername.trim()) {
          throw new Error('開発者名（ユーザー名）を入力してください');
        }

        if (!hasJoinedGroup) {
          throw new Error('公式Googleグループへの参加確認チェックを入れてください');
        }

        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', authUsername.trim())
          .maybeSingle();

        if (existingUser) {
          throw new Error('この開発者名はすでに使用されています。別の名前を入力してください。');
        }

        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').insert([{ 
            id: data.user.id, 
            email: data.user.email, 
            username: authUsername.trim(),
            points: INITIAL_POINTS 
          }]);
          alert('アカウント登録が完了しました！ログインしてご利用ください。');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      }
      setIsAuthModalOpen(false);
      fetchData();
    } catch (err: any) {
      setAuthError(err.message || '認証エラーが発生しました');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUsername('');
    setMyTests([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (userPoints < REQUIRED_POINTS_FOR_POST) {
      setFormError(`募集には ${REQUIRED_POINTS_FOR_POST} pt 必要です。他の方のテストに参加してポイントを貯めてください。`);
      return;
    }

    if (testUrl) {
      const isGoogleUrl = testUrl.startsWith('https://') && 
        (testUrl.includes('google.com') || testUrl.includes('play.google.com'));
      if (!isGoogleUrl) {
        setFormError('テスト参加URLには GoogleグループまたはPlayストアのURLを入力してください。');
        return;
      }
    }

    setIsSubmitting(true);
    const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : ['クローズドテスト', '14日間維持'];

    try {
      const { data, error } = await supabase
        .from('apps')
        .insert([
          {
            user_id: user.id,
            name,
            category,
            developer: username || '開発者',
            required_testers: FIXED_TESTERS,
            current_testers: 0,
            reward_points: REWARD_PER_TEST,
            tags,
            test_url: testUrl,
          },
        ])
        .select();

      if (error) throw error;

      const nextPoints = userPoints - REQUIRED_POINTS_FOR_POST;
      await supabase.from('profiles').update({ points: nextPoints }).eq('id', user.id);
      setUserPoints(nextPoints);

      if (data && data.length > 0) {
        setApps([data[0], ...apps]);
      }

      setName('');
      setCategory('ツール');
      setTagsInput('');
      setTestUrl('');
      setIsModalOpen(false);
      setActiveTab('my_apps');
    } catch (err: any) {
      setFormError('投稿に失敗しました: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMyApp = async (app: AppItem) => {
    if (!confirm(`「${app.name}」の募集を取り下げますか？\n未募集枠分のポイントが返還されます。`)) return;

    try {
      const { error } = await supabase.from('apps').delete().eq('id', app.id);
      if (error) throw error;

      const remainingSlots = Math.max(0, app.required_testers - app.current_testers);
      const refundPoints = remainingSlots * REWARD_PER_TEST;
      const nextPoints = userPoints + refundPoints;

      if (user) {
        await supabase.from('profiles').update({ points: nextPoints }).eq('id', user.id);
      }
      setUserPoints(nextPoints);
      setApps(apps.filter((a) => a.id !== app.id));

      alert(`案件を削除しました。未募集分として ${refundPoints} pt 返還されました。`);
    } catch (err) {
      alert('削除に失敗しました。');
    }
  };

  const handleJoinTest = async (app: AppItem) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const isAlreadyJoined = myTests.some((t) => t.app_id === app.id);
    if (isAlreadyJoined) {
      alert('このアプリのテストには既に参加中です！');
      return;
    }

    const updatedCount = app.current_testers + 1;

    try {
      const { data: partData, error: partErr } = await supabase
        .from('test_participations')
        .insert([{ app_id: app.id, user_id: user.id, status: 'testing' }])
        .select('*, app:apps(*)')
        .single();

      if (partErr) throw partErr;

      setMyTests([partData, ...myTests]);
      await supabase.from('apps').update({ current_testers: updatedCount }).eq('id', app.id);
      setApps(apps.map((a) => (a.id === app.id ? { ...a, current_testers: updatedCount } : a)));

      if (app.test_url) {
        window.open(app.test_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert('参加処理でエラーが発生しました');
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>, participationId: number, dayKey: 'day1' | 'day7' | 'day14') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTarget(`${participationId}_${dayKey}`);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `proofs/${participationId}_${dayKey}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('task-proofs').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('task-proofs').getPublicUrl(filePath);
      const dbColumn = `screenshot_${dayKey}`;

      await supabase.from('test_participations').update({ [dbColumn]: publicUrlData.publicUrl }).eq('id', participationId);

      setMyTests(myTests.map((t) => t.id === participationId ? { ...t, [dbColumn]: publicUrlData.publicUrl } : t));
      alert('起動証明スクショを提出しました！');
    } catch (err: any) {
      alert('アップロード失敗: ' + err.message);
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompletingTest || !user) return;

    if (goodPoints.trim().length < 20 || improvements.trim().length < 20) {
      alert('「良かった点」と「改善してほしい点」はそれぞれ20文字以上入力してください。');
      return;
    }

    setFeedbackSubmitting(true);
    try {
      const { error } = await supabase
        .from('test_participations')
        .update({
          status: 'completed',
          device_model: deviceModel,
          os_version: osVersion,
          good_points: goodPoints,
          improvements: improvements,
          bug_reports: bugReports,
        })
        .eq('id', activeCompletingTest.id);

      if (error) throw error;

      const nextPoints = userPoints + REWARD_PER_TEST;
      await supabase.from('profiles').update({ points: nextPoints }).eq('id', user.id);
      setUserPoints(nextPoints);

      setMyTests(myTests.map((t) => t.id === activeCompletingTest.id ? { ...t, status: 'completed' } : t));
      setIsFeedbackModalOpen(false);
      alert(`🎉 14日間のテスト完遂お疲れさまでした！\n報酬として ${REWARD_PER_TEST} pt を獲得しました！`);
    } catch (err: any) {
      alert('提出エラー: ' + err.message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleCopyReviewText = (appId: number) => {
    const feedbacks = allParticipations.filter((p) => p.app_id === appId && p.status === 'completed');
    if (feedbacks.length === 0) {
      alert('まだ完了テスターのフィードバックが集まっていません。14日経過後の報告をお待ちください。');
      return;
    }

    let report = `【Google Play クローズドテスト 審査申請用フィードバック実績】\n\n`;
    report += `■ 参加テスター数: ${feedbacks.length}名（14日間オプトイン維持確認済）\n\n`;
    report += `■ テスターからの具体的なフィードバック内容:\n`;

    feedbacks.forEach((f, idx) => {
      report += `\n[テスター ${idx + 1}] 使用端末: ${f.device_model || 'Android'} / OS: ${f.os_version || 'Android 14'}\n`;
      report += `・評価点: ${f.good_points || '特になし'}\n`;
      report += `・改善要望: ${f.improvements || '特になし'}\n`;
      report += `・不具合報告: ${f.bug_reports || '発生なし'}\n`;
    });

    report += `\n■ テスト結果を踏まえた対応:\n上記の指摘事項を反映し、UI改善および安定性向上の修正アップデートを実施しました。`;

    navigator.clipboard.writeText(report);
    alert('📋 Google Play Console 審査用のフィードバック回答テキストをコピーしました！');
  };

  const handleShareApp = () => {
    const shareText = "Google Playの「14日間・12人クローズドテスト」を個人開発者同士で助け合うWEBサービス【テスターズフィールド】！\n相互テストでポイントを貯めてテスターを即募集しよう！";
    const shareUrl = "https://tespo-app.vercel.app";
    const twitterIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=個人開発,GooglePlay,AndroidDev`;
    window.open(twitterIntent, '_blank', 'noopener,noreferrer');
  };

  const getDaysPassed = (startDate: string) => {
    const diff = new Date().getTime() - new Date(startDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const myCreatedApps = user ? apps.filter((a) => a.user_id === user.id) : [];

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        {/* ヘッダー */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-2.5 shadow-sm">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="p-1 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                title="メニューを開く"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Smartphone className="w-5 h-5 text-indigo-600" />
              <h1 className="text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                テスターズフィールド
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-full border border-slate-200 max-w-[100px] truncate">
                    {username}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-slate-500 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition"
                    title="ログアウト"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-1 border border-indigo-200 px-2.5 py-1.5 rounded-full font-semibold"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>ログイン</span>
                </button>
              )}
              <button
                onClick={() => {
                  setFormError('');
                  if (!user) {
                    setIsSignUp(false);
                    setIsAuthModalOpen(true);
                  } else {
                    setIsModalOpen(true);
                  }
                }}
                className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-full transition shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>募集</span>
              </button>
            </div>
          </div>
        </header>

        {/* 左メニュー（スライドインドロワー） */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex">
            <div className="bg-white w-72 h-full shadow-2xl flex flex-col justify-between p-5 animate-in slide-in-from-left duration-200">
              <div className="space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-sm">テスターズフィールド</span>
                  </div>
                  <button onClick={() => setIsMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-xl p-3.5 text-xs shadow-sm">
                  <p className="font-bold text-indigo-950 flex items-center gap-1 mb-1">
                    <Users className="w-4 h-4 text-indigo-600" />
                    公式Googleグループ（参加必須）
                  </p>
                  <p className="text-slate-600 text-[11px] leading-relaxed mb-3">
                    参加しないとPlayストアで「アイテムが見つかりません」とエラーになります。
                  </p>
                  <a
                    href={GOOGLE_GROUP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow transition"
                  >
                    グループに参加する（無料）
                  </a>
                </div>

                <div className="space-y-1 text-sm font-medium text-slate-700">
                  <button
                    onClick={() => { setIsMenuOpen(false); setActiveManualModal('about'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 transition text-left"
                  >
                    <Info className="w-4 h-4 text-indigo-600" />
                    <span>テスターズフィールドとは？</span>
                  </button>
                  <button
                    onClick={() => { setIsMenuOpen(false); setActiveManualModal('dev'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 transition text-left"
                  >
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>開発者向けマニュアル（募集）</span>
                  </button>
                  <button
                    onClick={() => { setIsMenuOpen(false); setActiveManualModal('tester'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 transition text-left"
                  >
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>テスター向けマニュアル（参加）</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <button
                  onClick={handleShareApp}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Xでサービスをシェア</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center">Version 1.2.1</p>
              </div>
            </div>
            <div className="flex-1" onClick={() => setIsMenuOpen(false)} />
          </div>
        )}

        <div className="max-w-md mx-auto px-4 pt-3 space-y-3">
          {/* 保有ポイント ＆ 強調表示された公式Googleグループ参加ボタン */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl px-3.5 py-2.5 text-white shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-100">保有:</span>
              <span className="text-xl font-bold flex items-baseline gap-0.5">
                {userPoints.toLocaleString()} <span className="text-[10px] font-normal text-indigo-200">pt</span>
              </span>
            </div>

            {/* 強調版公式グループボタン */}
            <a
              href={GOOGLE_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black px-3 py-1.5 rounded-lg shadow-md transition active:scale-95 border border-amber-200 animate-pulse"
              title="参加しないとアプリをインストールできません"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-900 flex-shrink-0" />
              <span>【必須】公式グループ参加</span>
              <ExternalLink className="w-3 h-3 text-slate-700 flex-shrink-0 ml-0.5" />
            </a>
          </div>

          {/* 開閉式使い方ガイド */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <button
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>テスターズフィールドの使い方</span>
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-0.5 font-normal">
                {isGuideOpen ? '閉じる' : '詳細を開く'}
                {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>
            {isGuideOpen && (
              <div className="px-3.5 pb-3 pt-1 text-[11px] text-slate-600 border-t border-slate-100 bg-slate-50/50 space-y-1.5">
                <p className="text-slate-500 leading-relaxed">
                  Google Play公開に必要な<strong>「12人以上・14日間のクローズドテスト」</strong>を個人開発者同士で助け合うプラットフォームです。
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-0.5 leading-normal">
                  <li><strong>公式Googleグループに参加</strong>（未参加だとインストール不可）</li>
                  <li>気になるアプリのテストに参加し、<strong>14日間維持</strong>（1・7・14日目にスクショ提出）</li>
                  <li>14日経過後に<strong>フィードバック記入で 100 pt 獲得</strong></li>
                  <li>貯めたポイント（1,500pt）で<strong>自分のアプリのテスター15人を募集</strong>！</li>
                </ol>
              </div>
            )}
          </div>

          {/* 案件切り替えタブ */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('explore')}
              className={`flex-1 py-1.5 rounded-lg text-center transition ${
                activeTab === 'explore'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              募集中 ({apps.length})
            </button>
            <button
              onClick={() => setActiveTab('joined')}
              className={`flex-1 py-1.5 rounded-lg text-center transition ${
                activeTab === 'joined'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              参加中 ({myTests.length})
            </button>
            <button
              onClick={() => setActiveTab('my_apps')}
              className={`flex-1 py-1.5 rounded-lg text-center transition ${
                activeTab === 'my_apps'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              自分の案件 ({myCreatedApps.length})
            </button>
          </div>

          {/* タブ1: 募集中のテスト案件 */}
          {activeTab === 'explore' && (
            <div className="space-y-3 pt-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                  <p className="text-sm">案件を読み込み中...</p>
                </div>
              ) : apps.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500 p-6">
                  <p className="text-sm">現在募集中のテスト案件はありません。</p>
                </div>
              ) : (
                apps.map((app) => {
                  const progress = Math.min(
                    100,
                    Math.round((app.current_testers / app.required_testers) * 100)
                  );
                  const isJoined = myTests.some((t) => t.app_id === app.id);
                  const isMyCreated = user && app.user_id === user.id;

                  return (
                    <div
                      key={app.id}
                      className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <div>
                            <span className="inline-block text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-1">
                              {app.category}
                            </span>
                            <h3 className="font-bold text-slate-900 text-base">{app.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">{app.developer}</p>
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
                        <div className="space-y-1 mb-2.5">
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
                        </div>

                        <button
                          onClick={() => handleJoinTest(app)}
                          disabled={Boolean(isJoined || isMyCreated)}
                          className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                            isMyCreated
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : isJoined
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm active:scale-[0.99]'
                          }`}
                        >
                          {isMyCreated ? (
                            <span>あなたが募集した案件です</span>
                          ) : isJoined ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>現在テスト参加中</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3.5 h-3.5 text-indigo-200" />
                              <span>14日間のテストに参加する</span>
                              <ExternalLink className="w-3 h-3 text-white/70 ml-0.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* タブ2: 参加中のテスト（14日間維持） */}
          {activeTab === 'joined' && (
            <div className="space-y-3 pt-1">
              {myTests.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-500 p-6">
                  <p className="text-xs">現在参加中のテストはありません。</p>
                  <button
                    onClick={() => setActiveTab('explore')}
                    className="mt-3 text-xs text-indigo-600 font-bold hover:underline inline-block"
                  >
                    募集中のテストを探す →
                  </button>
                </div>
              ) : (
                myTests.map((t) => {
                  const days = getDaysPassed(t.started_at);
                  const isReadyToComplete = days >= 14;
                  const isCompleted = t.status === 'completed';

                  return (
                    <div key={t.id} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {isCompleted ? 'テスト完了・獲得済' : `${days}日目 / 14日間`}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">{t.app?.name || 'テスト案件'}</h4>
                        </div>
                        <span className="text-xs text-amber-600 font-bold">+{t.app?.reward_points || REWARD_PER_TEST} pt</span>
                      </div>

                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, (days / 14) * 100)}%` }}
                        />
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-2">
                          <Camera className="w-3.5 h-3.5 text-indigo-600" />
                          起動証明スクショ提出
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                          <label className="border border-dashed border-slate-300 rounded p-1.5 cursor-pointer hover:bg-white transition flex flex-col items-center justify-center">
                            <span className="font-medium text-slate-600">1日目（開始）</span>
                            {t.screenshot_day1 ? (
                              <span className="text-emerald-600 font-bold mt-1">提出済 ✓</span>
                            ) : uploadingTarget === `${t.id}_day1` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 mt-1" />
                            ) : (
                              <span className="text-indigo-600 mt-1">アップ</span>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload(e, t.id, 'day1')} />
                          </label>

                          <label className="border border-dashed border-slate-300 rounded p-1.5 cursor-pointer hover:bg-white transition flex flex-col items-center justify-center">
                            <span className="font-medium text-slate-600">7日目（中間）</span>
                            {t.screenshot_day7 ? (
                              <span className="text-emerald-600 font-bold mt-1">提出済 ✓</span>
                            ) : uploadingTarget === `${t.id}_day7` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 mt-1" />
                            ) : (
                              <span className="text-indigo-600 mt-1">アップ</span>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload(e, t.id, 'day7')} />
                          </label>

                          <label className="border border-dashed border-slate-300 rounded p-1.5 cursor-pointer hover:bg-white transition flex flex-col items-center justify-center">
                            <span className="font-medium text-slate-600">14日目（完遂）</span>
                            {t.screenshot_day14 ? (
                              <span className="text-emerald-600 font-bold mt-1">提出済 ✓</span>
                            ) : uploadingTarget === `${t.id}_day14` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 mt-1" />
                            ) : (
                              <span className="text-indigo-600 mt-1">アップ</span>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload(e, t.id, 'day14')} />
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-slate-500 text-[11px]">
                          {isCompleted 
                            ? '完了・獲得済' 
                            : isReadyToComplete 
                              ? '14日達成！提出可能' 
                              : `あと ${14 - days} 日間保持`}
                        </span>
                        {isCompleted ? (
                          <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            受取完了
                          </span>
                        ) : isReadyToComplete ? (
                          <button
                            onClick={() => {
                              setActiveCompletingTest(t);
                              setIsFeedbackModalOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            フィードバックを書いて100pt受取
                          </button>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-medium">
                            保持中
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* タブ3: あなたが募集中の案件 */}
          {activeTab === 'my_apps' && (
            <div className="space-y-3 pt-1">
              {myCreatedApps.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-500 p-6">
                  <p className="text-xs">あなたが募集中の案件はありません。</p>
                  <button
                    onClick={() => {
                      if (!user) setIsAuthModalOpen(true);
                      else setIsModalOpen(true);
                    }}
                    className="mt-3 text-xs bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg inline-block"
                  >
                    案件を新規募集する
                  </button>
                </div>
              ) : (
                myCreatedApps.map((app) => (
                  <div key={app.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{app.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          テスター確保: <span className="font-semibold text-indigo-600">{app.current_testers}</span> / {app.required_testers} 人
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteMyApp(app)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition"
                        title="案件を取り下げて削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopyReviewText(app.id)}
                      className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>審査申請用フィードバックをコピー</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* フッター */}
      <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>© テスターズフィールド (Testers Field) - 個人開発者のGoogle Playクローズドテスト相互プラットフォーム</p>
        <p className="text-[10px] text-slate-400 mt-1">Google Play および Android は Google LLC の商標です。当サービスは Google LLC と提携・公認されたものではありません。</p>
        <div className="mt-2 flex justify-center gap-4 text-indigo-600">
          <a href="https://forms.gle/3sTTB61MrBeghMTd6" target="_blank" rel="noopener noreferrer" className="hover:underline">
            不具合・違反案件の報告フォーム
          </a>
        </div>
      </footer>

      {/* ログイン・新規登録モーダル */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-900 text-base">{isSignUp ? '新規登録' : 'ログイン'}</h3>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSignUp && (
              <div className="mb-4 bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-xl p-3.5 text-xs shadow-sm">
                <p className="font-bold text-indigo-950 mb-1 flex items-center gap-1">
                  <Users className="w-4 h-4 text-indigo-600" />
                  STEP 1: 公式Googleグループへの参加（必須）
                </p>
                <p className="text-slate-600 text-[11px] leading-relaxed mb-2.5">
                  未参加の場合、アプリのインストール時に「アイテムが見つかりませんでした」とエラーになります。
                </p>
                <a
                  href={GOOGLE_GROUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow transition mb-3"
                >
                  <span>公式Googleグループに参加する（無料）</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <label className="flex items-start gap-2 text-slate-800 text-xs font-semibold cursor-pointer select-none bg-white p-2 rounded-lg border border-indigo-100">
                  <input
                    type="checkbox"
                    checked={hasJoinedGroup}
                    onChange={(e) => setHasJoinedGroup(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-[11px] leading-tight">
                    公式Googleグループへの参加を完了しました <span className="text-red-500">*必須</span>
                  </span>
                </label>
              </div>
            )}

            {authError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-3 text-sm">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    開発者名（ユーザー名） <span className="text-red-500">*重複不可</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例: StudioAlfa, ヤマダ開発"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  required
                  placeholder="developer@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">パスワード</label>
                <input
                  type="password"
                  required
                  placeholder="6文字以上のパスワード"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              {isSignUp && !hasJoinedGroup && (
                <p className="text-[11px] text-red-500 text-center font-medium">
                  ※上記の「グループへの参加」とチェックボックスの同意が必要です
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading || (isSignUp && !hasJoinedGroup)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {authLoading ? '処理中...' : isSignUp ? '登録案内メールを送信' : 'ログイン'}
              </button>
            </form>

            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError('');
                  setHasJoinedGroup(false);
                }}
                className="text-xs text-indigo-600 hover:underline"
              >
                {isSignUp ? 'アカウントをお持ちの方はこちら（ログイン）' : '初めての方はこちら（新規登録）'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フィードバック提出モーダル */}
      {isFeedbackModalOpen && activeCompletingTest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">テスト完了フィードバック提出</h3>
                <p className="text-[11px] text-slate-500">Google Play審査提出用のフィードバックを記入してください</p>
              </div>
              <button onClick={() => setIsFeedbackModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">使用端末名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="例: Pixel 8, Galaxy S23"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">OSバージョン</label>
                  <input
                    type="text"
                    required
                    placeholder="Android 14"
                    value={osVersion}
                    onChange={(e) => setOsVersion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    良かった点・UIの感想 <span className="text-red-500">* (20文字以上)</span>
                  </label>
                  <span className={`text-[10px] font-bold ${goodPoints.trim().length >= 20 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {goodPoints.trim().length} / 20文字
                  </span>
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder="直感的で操作がスムーズだった、デザインがシンプルで見やすかったなど"
                  value={goodPoints}
                  onChange={(e) => setGoodPoints(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    改善してほしい点 <span className="text-red-500">* (20文字以上)</span>
                  </label>
                  <span className={`text-[10px] font-bold ${improvements.trim().length >= 20 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {improvements.trim().length} / 20文字
                  </span>
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder="文字のコントラストが低く見づらい画面があった、戻るボタンの挙動など"
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">不具合・クラッシュ報告（なければ「なし」） <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="なし、または発生した画面の状況"
                  value={bugReports}
                  onChange={(e) => setBugReports(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2">
                {!(goodPoints.trim().length >= 20 && improvements.trim().length >= 20 && deviceModel.trim().length > 0) && (
                  <p className="text-[11px] text-red-500 text-center mb-1.5 font-medium">
                    ※使用端末名と、良かった点・改善点（各20文字以上）を入力してください
                  </p>
                )}
                <button
                  type="submit"
                  disabled={feedbackSubmitting || goodPoints.trim().length < 20 || improvements.trim().length < 20 || !deviceModel.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition shadow flex items-center justify-center gap-1.5 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {feedbackSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>提出して 100 pt を獲得</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 案件募集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">テスト案件を募集する</h3>
                <p className="text-[11px] text-slate-500">
                  必要: <span className="font-bold text-indigo-600">{REQUIRED_POINTS_FOR_POST} pt</span>（残高: {userPoints} pt）
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-3 bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 text-xs text-indigo-950">
              <span className="font-bold block mb-1">⚠️ 案件投稿前の確認事項</span>
              Google Play Consoleのクローズドテストのテスター欄に、公式Googleグループのアドレスを追加してください：
              <div className="mt-1 flex items-center justify-between bg-white border border-indigo-200 rounded px-2 py-1 text-[11px] font-mono text-indigo-700">
                <span>{GOOGLE_GROUP_EMAIL}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(GOOGLE_GROUP_EMAIL);
                    alert('アドレスをコピーしました！Consoleのテスター欄に貼り付けてください。');
                  }}
                  className="font-sans text-indigo-600 font-bold hover:underline ml-2"
                >
                  コピー
                </button>
              </div>
            </div>

            {formError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">アプリ名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="例: 習慣トラッカー"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
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
                    disabled
                    value={username || 'ログイン中の開発者名'}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-600 rounded-lg text-sm cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  テスト参加オプトインURL（Web参加リンク） <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://play.google.com/apps/testing/パッケージ名"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">※ Consoleでテスターを追加した後に発行されるWeb参加URLです。</p>
              </div>

              <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-900 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>募集テスター人数:</span>
                  <span>15人（固定）</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>消費ポイント:</span>
                  <span className="font-bold text-indigo-700">1,500 pt</span>
                </div>
                <p className="text-[10px] text-slate-400 pt-1 border-t border-indigo-100/50">
                  ※ Google Playの12人要件に対し、離脱リスクを考慮した推奨15人枠固定です。
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">タグ（カンマ区切り）</label>
                <input
                  type="text"
                  placeholder="例: Android14, 日常系"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || userPoints < REQUIRED_POINTS_FOR_POST}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>1,500 pt で募集する</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* マニュアル・紹介モーダル */}
      {activeManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {activeManualModal === 'about' && 'テスターズフィールドとは？'}
                {activeManualModal === 'dev' && '開発者向けマニュアル（募集手順）'}
                {activeManualModal === 'tester' && 'テスター向けマニュアル（参加手順）'}
              </h3>
              <button onClick={() => setActiveManualModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeManualModal === 'about' && (
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">サービス立ち上げの背景</h4>
                  <p>Google Playでは個人開発者がアプリを本番公開する際、「12人以上のテスターが14日間連続でオプトイン（参加）を維持すること」が必須条件となりました。知り合いだけで12人を集めるのは非常にハードルが高く、挫折してしまう開発者が後を絶ちません。</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">仕組みと特徴</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>相互扶助のエコシステム</strong>: 他の開発者のアプリをテストすることでポイント（1回100pt）を獲得できます。</li>
                    <li><strong>完全無料</strong>: 貯まった1,500ptで、今度は自分のアプリのテスター15名を募集できます。</li>
                    <li><strong>審査用フィードバック生成</strong>: 14日完遂時のテスターの意見を、Google Play Consoleの審査申請フォームにそのままコピペできる形で自動出力します。</li>
                  </ul>
                </div>
              </div>
            )}

            {activeManualModal === 'dev' && (
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">STEP 1: Google Play Console にグループを追加</h4>
                  <p>Play Console の「クローズドテスト」&gt;「テスター」タブを開き、メールアドレス一覧に公式Googleグループのアドレス（<strong className="text-indigo-600">{GOOGLE_GROUP_EMAIL}</strong>）を追加して保存します。</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">STEP 2: Web参加リンクを取得</h4>
                  <p>「テスターへの参加案内方法」にある「ウェブ上のテスター向けリンク（<code>https://play.google.com/apps/testing/...</code>）」をコピーします。</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">STEP 3: 案件を募集</h4>
                  <p>ヘッダーの「募集」ボタンを押し、先ほどのWeb参加リンクを貼り付けて投稿します（1,500pt消費）。</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">STEP 4: 14日後に審査申請</h4>
                  <p>テスターが14日間維持して集まったフィードバックをワンクリックでコピーし、Consoleの審査申請フォームに貼り付けて本番公開を申請します。</p>
                </div>
              </div>
            )}

            {activeManualModal === 'tester' && (
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">STEP 1: 公式Googleグループに参加</h4>
                  <p>最初に公式Googleグループ（参加無料）に加入します。一度入れば、以後はすべてのアプリをワンクリックでテスト可能になります。</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">STEP 2: 案件に参加＆承認</h4>
                  <p>一覧から気になるアプリの「テストに参加する」を押し、開いたGoogle Play画面で青い「テスターになる」ボタンを押してからアプリをインストールします。</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">STEP 3: 14日間アプリを維持</h4>
                  <p>アプリをアンインストールせずに14日間端末に維持します。1日目・7日目・14日目に簡単な起動スクショを提出します。</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">STEP 4: フィードバック回答で100pt獲得</h4>
                  <p>14日経過後、「フィードバックを書いて100pt受取」から感想を入力するとポイントが付与されます。</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}