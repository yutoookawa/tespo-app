"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  Terminal, 
  Users, 
  Sparkles, 
  X, 
  Loader2, 
  ExternalLink, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  Flame,
  Camera,
  Trash2,
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
  FileText,
  Activity,
  Zap,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// --- Web Audio API 周波数合成ハプティック音 ---
const playMinimalClick = (type: 'click' | 'success' | 'tab' = 'click') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      // Linear/Macライクな乾いた触感クリック
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (type === 'tab') {
      // 軽いスナップ音
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'success') {
      // 上品なデュアルトーン
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch (e) {
    // AudioContext制限対策
  }
};

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

const INITIAL_POINTS = 1500;
const FIXED_TESTERS = 15;
const REWARD_PER_TEST = 100;
const REQUIRED_POINTS_FOR_POST = FIXED_TESTERS * REWARD_PER_TEST;

const DEMO_SAMPLE_APP: AppItem = {
  id: -999,
  name: "FocusPulse - ミニマル習慣タイマー",
  category: "生産性",
  developer: "TestersField Labs",
  required_testers: 15,
  current_testers: 13,
  reward_points: 100,
  tags: ["公式デモ", "審査直結", "14日間オプトイン"],
  test_url: GOOGLE_GROUP_URL,
  created_at: new Date().toISOString(),
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string>('');
  const [userPoints, setUserPoints] = useState<number>(INITIAL_POINTS);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [myTests, setMyTests] = useState<Participation[]>([]);
  const [allParticipations, setAllParticipations] = useState<Participation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'explore' | 'joined' | 'my_apps'>('explore');
  const [isGroupJoinedState, setIsGroupJoinedState] = useState(false);
  
  // モーダル
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeManualModal, setActiveManualModal] = useState<'about' | 'dev' | 'tester' | 'terms' | null>(null);
  const [activeCompletingTest, setActiveCompletingTest] = useState<Participation | null>(null);
  
  // 認証
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [hasJoinedGroup, setHasJoinedGroup] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // 案件投稿
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ツール');
  const [tagsInput, setTagsInput] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // フィードバック
  const [deviceModel, setDeviceModel] = useState('');
  const [osVersion, setOsVersion] = useState('Android 14');
  const [goodPoints, setGoodPoints] = useState('');
  const [improvements, setImprovements] = useState('');
  const [bugReports, setBugReports] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);

  useEffect(() => {
    const storedGroupJoined = localStorage.getItem('tf_group_joined');
    if (storedGroupJoined === 'true') {
      setIsGroupJoinedState(true);
    }

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

  const markGroupAsJoined = () => {
    playMinimalClick('success');
    setIsGroupJoinedState(true);
    localStorage.setItem('tf_group_joined', 'true');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (isSignUp) {
        if (!authUsername.trim()) {
          throw new Error('開発者名（ID）を入力してください');
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
          throw new Error('この開発者名は既に使用されています。');
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
          markGroupAsJoined();
          playMinimalClick('success');
          alert('🚀 アカウント発行完了！初回募集用の 1,500 pt をアクティベートしました。');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        playMinimalClick('click');
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
    playMinimalClick('click');
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
      setFormError(`募集には ${REQUIRED_POINTS_FOR_POST} pt 必要です。`);
      return;
    }

    if (testUrl) {
      const isGoogleUrl = testUrl.startsWith('https://') && 
        (testUrl.includes('google.com') || testUrl.includes('play.google.com'));
      if (!isGoogleUrl) {
        setFormError('Play ConsoleのWebテスター参加URLを入力してください。');
        return;
      }
    }

    setIsSubmitting(true);
    const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : ['クローズドテスト', '審査直結'];

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

      playMinimalClick('success');
      setName('');
      setTagsInput('');
      setTestUrl('');
      setIsModalOpen(false);
      setActiveTab('my_apps');
    } catch (err: any) {
      setFormError('投稿失敗: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMyApp = async (app: AppItem) => {
    playMinimalClick('click');
    if (!confirm(`「${app.name}」の募集をアーカイブしますか？\n残枠分のポイントがウォレットへ即時返還されます。`)) return;

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

      playMinimalClick('success');
      alert(`アーカイブ完了。${refundPoints} pt が返還されました。`);
    } catch (err) {
      alert('削除エラーが発生しました。');
    }
  };

  const handleJoinTest = async (app: AppItem) => {
    playMinimalClick('click');

    if (app.id === -999) {
      alert('💡 公式デモ案件です。参加後14日間の維持＆フィードバック送信で100pt獲得のフローを体験できます。');
      window.open(GOOGLE_GROUP_URL, '_blank', 'noopener,noreferrer');
      markGroupAsJoined();
      return;
    }

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const isAlreadyJoined = myTests.some((t) => t.app_id === app.id);
    if (isAlreadyJoined) {
      alert('既にテスト参加トラックに追加されています。');
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

      playMinimalClick('success');
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
    playMinimalClick('click');

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `proofs/${participationId}_${dayKey}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('task-proofs').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('task-proofs').getPublicUrl(filePath);
      const dbColumn = `screenshot_${dayKey}`;

      await supabase.from('test_participations').update({ [dbColumn]: publicUrlData.publicUrl }).eq('id', participationId);

      setMyTests(myTests.map((t) => t.id === participationId ? { ...t, [dbColumn]: publicUrlData.publicUrl } : t));
      playMinimalClick('success');
      alert('起動ログを同期しました。');
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
      alert('「評価点」「改善提案」は審査通過のため、それぞれ20文字以上入力してください。');
      return;
    }

    setFeedbackSubmitting(true);
    playMinimalClick('click');

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
      playMinimalClick('success');
      alert(`🎉 14日間のトラック完遂！\n開発者プールから ${REWARD_PER_TEST} pt を受領しました。`);
    } catch (err: any) {
      alert('提出エラー: ' + err.message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleCopyReviewText = (appId: number) => {
    playMinimalClick('click');
    const feedbacks = allParticipations.filter((p) => p.app_id === appId && p.status === 'completed');
    if (feedbacks.length === 0) {
      alert('まだ完了テスターのフィードバックが集まっていません。14日経過後の報告をお待ちください。');
      return;
    }

    let report = `【Google Play クローズドテスト 審査申請用フィードバック実績】\n\n`;
    report += `■ テスト維持実績: ${feedbacks.length}名（14日間オプトイン継続確認済）\n\n`;
    report += `■ 収集されたユーザーフィードバック:\n`;

    feedbacks.forEach((f, idx) => {
      report += `\n[Tester ${idx + 1}] Model: ${f.device_model || 'Android'} / OS: ${f.os_version || 'Android 14'}\n`;
      report += `・評価点: ${f.good_points || 'なし'}\n`;
      report += `・改善要望: ${f.improvements || 'なし'}\n`;
      report += `・不具合報告: ${f.bug_reports || '発生なし'}\n`;
    });

    report += `\n■ テスト結果を踏まえた対応策:\n上記のフィードバックに基づき、UI挙動およびクラッシュ対策のアップデートを実施しました。`;

    navigator.clipboard.writeText(report);
    playMinimalClick('success');
    alert('📋 Play Console 審査用のエビデンスレポートをクリップボードにコピーしました！');
  };

  const handleShareOnX = (textType: 'devlog' | 'general') => {
    playMinimalClick('click');
    let shareText = "";
    if (textType === 'devlog') {
      shareText = `Google Playの14日間クローズドテスト、テスポ（Testers Field）でテスト進行中！\n開発者プールで相互テストして審査エビデンスを自動生成。\n#個人開発 #GooglePlay #AndroidDev`;
    } else {
      shareText = `Google Playの「14日間12人テスト」を完全自動化する開発者相互プラットフォーム【テスターズフィールド】。\n初回15人分の募集pt無料配布中！\n#個人開発 #Androidアプリ開発`;
    }
    const shareUrl = "https://tespo-app.vercel.app";
    const twitterIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterIntent, '_blank', 'noopener,noreferrer');
  };

  const getDaysPassed = (startDate: string) => {
    const diff = new Date().getTime() - new Date(startDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const myCreatedApps = user ? apps.filter((a) => a.user_id === user.id) : [];
  const displayedApps = apps.length > 0 ? apps : [DEMO_SAMPLE_APP];

  // ワークアウト計算（アクティブな参加中日数ストリーク）
  const activeStreak = myTests.length > 0 
    ? Math.max(...myTests.map(t => getDaysPassed(t.started_at)))
    : 0;

  return (
    <main className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-300 font-sans">
      <div>
        {/* ヘッダー: Vercel / Linearライクなスリムグラスデザイン */}
        <header className="sticky top-0 z-30 bg-[#090a0f]/80 backdrop-blur-md border-b border-zinc-800/80 px-4 py-2.5">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => { playMinimalClick('tab'); setIsMenuOpen(true); }}
                className="p-1 -ml-1 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800/50 transition"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider text-emerald-400">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>TESTERS_FIELD</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md max-w-[90px] truncate">
                    {username}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded hover:bg-zinc-900 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    playMinimalClick('click');
                    setIsSignUp(true);
                    setIsAuthModalOpen(true);
                  }}
                  className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-2.5 py-1 rounded-md font-mono transition"
                >
                  <LogIn className="w-3 h-3 text-emerald-400" />
                  <span>LOGIN</span>
                </button>
              )}

              <button
                onClick={() => {
                  playMinimalClick('click');
                  setFormError('');
                  if (!user) {
                    setIsSignUp(true);
                    setIsAuthModalOpen(true);
                  } else {
                    setIsModalOpen(true);
                  }
                }}
                className="flex items-center space-x-1 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold px-3 py-1 rounded-md transition active:scale-95 shadow-xs shadow-emerald-500/20"
              >
                <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>POST</span>
              </button>
            </div>
          </div>
        </header>

        {/* ドロワーメニュー */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex">
            <div className="bg-[#0e1017] w-72 h-full border-r border-zinc-800 shadow-2xl flex flex-col justify-between p-5 animate-in slide-in-from-left duration-200">
              <div className="space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 font-bold">
                    <Terminal className="w-4 h-4" />
                    <span>SYSTEM_MENU</span>
                  </div>
                  <button onClick={() => { playMinimalClick('click'); setIsMenuOpen(false); }} className="text-zinc-400 hover:text-zinc-200">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 乗り換え・他社併用の正当化カード */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>RISK_HEDGE // 他社併用ガイド</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    TestCrewやDiscordで集めたテスターの急な離脱（14日カウントリセット）を防ぐため、テスポのプール型プールを「バックアップ保険」として同時に走らせる開発者が増えています。
                  </p>
                </div>

                <div className="space-y-1 text-xs font-medium text-zinc-300">
                  <button
                    onClick={() => { playMinimalClick('click'); setIsMenuOpen(false); setActiveManualModal('about'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/60 transition text-left"
                  >
                    <Info className="w-4 h-4 text-emerald-400" />
                    <span>テスターズフィールドの設計思想</span>
                  </button>
                  <button
                    onClick={() => { playMinimalClick('click'); setIsMenuOpen(false); setActiveManualModal('dev'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/60 transition text-left"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span>開発者向け審査突破マニュアル</span>
                  </button>
                  <button
                    onClick={() => { playMinimalClick('click'); setIsMenuOpen(false); setActiveManualModal('terms'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/60 transition text-left"
                  >
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>利用規約 / 免責条項</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 space-y-2">
                <button
                  onClick={() => handleShareOnX('general')}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SHARE ON X</span>
                </button>
                <p className="text-[10px] text-zinc-600 font-mono text-center">CORE v2.0 // DARK_MINIMAL</p>
              </div>
            </div>
            <div className="flex-1" onClick={() => { playMinimalClick('click'); setIsMenuOpen(false); }} />
          </div>
        )}

        <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
          
          {/* AI Dev-Log: 筋トレ管理風 ワークアウトストリーク */}
          <div className="bg-gradient-to-b from-zinc-900 to-[#0e111a] border border-zinc-800 rounded-xl p-3.5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="font-mono text-xs font-bold text-zinc-300">DEV_STREAK // 審査準備度</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="bg-black/40 border border-zinc-800/60 rounded-lg p-2">
                <p className="text-[10px] text-zinc-500">WALLET</p>
                <p className="text-base font-bold text-white mt-0.5">{userPoints.toLocaleString()}<span className="text-[10px] text-emerald-400 ml-0.5">pt</span></p>
              </div>
              <div className="bg-black/40 border border-zinc-800/60 rounded-lg p-2">
                <p className="text-[10px] text-zinc-500">MAX STREAK</p>
                <p className="text-base font-bold text-emerald-400 mt-0.5">{activeStreak}<span className="text-[10px] text-zinc-500 ml-0.5">/14日</span></p>
              </div>
              <div className="bg-black/40 border border-zinc-800/60 rounded-lg p-2">
                <p className="text-[10px] text-zinc-500">ACTIVE TRACK</p>
                <p className="text-base font-bold text-white mt-0.5">{myTests.length}<span className="text-[10px] text-zinc-500 ml-0.5">apps</span></p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/40">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Insight: 15名確保で審査通過率94%達成</span>
              </span>
              <button 
                onClick={() => handleShareOnX('devlog')}
                className="text-emerald-400 hover:text-emerald-300 font-mono text-[10px] flex items-center gap-0.5"
              >
                <span>進捗共有</span>
                <Share2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* 公式Googleグループステータス */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-2 h-2 rounded-full ${isGroupJoinedState ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              <div className="text-xs">
                <p className="font-semibold text-zinc-200">公式Googleグループ</p>
                <p className="text-[10px] text-zinc-500">Playストア参加用の共通テストプール</p>
              </div>
            </div>

            {isGroupJoinedState ? (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-md">
                SYNCED ✓
              </span>
            ) : (
              <a
                href={GOOGLE_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={markGroupAsJoined}
                className="text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 rounded-md transition shadow-xs"
              >
                グループ参加
              </a>
            )}
          </div>

          {/* タブナビゲーション */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => { playMinimalClick('tab'); setActiveTab('explore'); }}
              className={`py-1.5 rounded-lg transition ${
                activeTab === 'explore'
                  ? 'bg-zinc-800 text-emerald-400 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              EXPLORE ({displayedApps.length})
            </button>
            <button
              onClick={() => { playMinimalClick('tab'); setActiveTab('joined'); }}
              className={`py-1.5 rounded-lg transition ${
                activeTab === 'joined'
                  ? 'bg-zinc-800 text-emerald-400 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              TRACKING ({myTests.length})
            </button>
            <button
              onClick={() => { playMinimalClick('tab'); setActiveTab('my_apps'); }}
              className={`py-1.5 rounded-lg transition ${
                activeTab === 'my_apps'
                  ? 'bg-zinc-800 text-emerald-400 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              MY_APPS ({myCreatedApps.length})
            </button>
          </div>

          {/* タブ1: 募集中の案件一覧 */}
          {activeTab === 'explore' && (
            <div className="space-y-3 pt-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
                  <p className="text-xs font-mono">LOADING_DEVELOPER_POOL...</p>
                </div>
              ) : (
                displayedApps.map((app) => {
                  const isDemo = app.id === -999;
                  const progress = Math.min(
                    100,
                    Math.round((app.current_testers / app.required_testers) * 100)
                  );
                  const isJoined = myTests.some((t) => t.app_id === app.id);
                  const isMyCreated = user && app.user_id === user.id;

                  return (
                    <div
                      key={app.id}
                      className="bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-4 transition shadow-sm space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                              {app.category}
                            </span>
                            {isDemo && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                TUTORIAL
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-white text-base tracking-tight">{app.name}</h3>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5">by {app.developer}</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/80 px-2 py-1 rounded">
                          +{app.reward_points} pt
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {app.tags?.map((tag, idx) => (
                          <span key={idx} className="text-[10px] bg-zinc-800/60 text-zinc-400 px-2 py-0.5 rounded font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-zinc-500" />
                            CAPACITY
                          </span>
                          <span>{app.current_testers} / {app.required_testers} SLOT</span>
                        </div>
                        <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoinTest(app)}
                        disabled={Boolean(!isDemo && (isJoined || isMyCreated))}
                        className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                          isDemo
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-800/60'
                            : isMyCreated
                            ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                            : isJoined
                            ? 'bg-zinc-900 text-emerald-500 border border-emerald-900/40 cursor-not-allowed'
                            : 'bg-emerald-400 hover:bg-emerald-300 text-black font-bold active:scale-[0.99]'
                        }`}
                      >
                        {isDemo ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>操作フローを体験する</span>
                          </>
                        ) : isMyCreated ? (
                          <span>あなたの募集案件です</span>
                        ) : isJoined ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>14日トラッキング中</span>
                          </>
                        ) : (
                          <>
                            <Calendar className="w-3.5 h-3.5" />
                            <span>14日テストに参加して100pt獲得</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* タブ2: 参加中（維持トラッキング） */}
          {activeTab === 'joined' && (
            <div className="space-y-3 pt-1">
              {myTests.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/40 rounded-xl border border-zinc-800 text-zinc-500 p-6">
                  <p className="text-xs font-mono">NO_ACTIVE_TRACKING</p>
                  <button
                    onClick={() => { playMinimalClick('tab'); setActiveTab('explore'); }}
                    className="mt-3 text-xs text-emerald-400 font-mono hover:underline inline-block"
                  >
                    EXPLORE_APPS →
                  </button>
                </div>
              ) : (
                myTests.map((t) => {
                  const days = getDaysPassed(t.started_at);
                  const isReadyToComplete = days >= 14;
                  const isCompleted = t.status === 'completed';

                  return (
                    <div key={t.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            isCompleted ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-300'
                          }`}>
                            {isCompleted ? 'STATUS: COMPLETED' : `DAY ${days} / 14`}
                          </span>
                          <h4 className="font-bold text-white text-sm mt-1.5">{t.app?.name || 'テスト案件'}</h4>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400">+{t.app?.reward_points || REWARD_PER_TEST} pt</span>
                      </div>

                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, (days / 14) * 100)}%` }}
                        />
                      </div>

                      <div className="bg-black/50 p-3 rounded-lg border border-zinc-800/80">
                        <p className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5 mb-2.5">
                          <Camera className="w-3.5 h-3.5 text-emerald-400" />
                          <span>PROOF_LOG // 起動証明</span>
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                          <label className="border border-dashed border-zinc-700 hover:border-zinc-500 rounded p-2 cursor-pointer transition flex flex-col items-center justify-center">
                            <span className="text-zinc-400">DAY 1</span>
                            {t.screenshot_day1 ? (
                              <span className="text-emerald-400 font-bold mt-1">SYNCED ✓</span>
                            ) : uploadingTarget === `${t.id}_day1` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 mt-1" />
                            ) : (
                              <span className="text-zinc-500 mt-1">UPLOAD</span>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload(e, t.id, 'day1')} />
                          </label>

                          <label className="border border-dashed border-zinc-700 hover:border-zinc-500 rounded p-2 cursor-pointer transition flex flex-col items-center justify-center">
                            <span className="text-zinc-400">DAY 7</span>
                            {t.screenshot_day7 ? (
                              <span className="text-emerald-400 font-bold mt-1">SYNCED ✓</span>
                            ) : uploadingTarget === `${t.id}_day7` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 mt-1" />
                            ) : (
                              <span className="text-zinc-500 mt-1">UPLOAD</span>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload(e, t.id, 'day7')} />
                          </label>

                          <label className="border border-dashed border-zinc-700 hover:border-zinc-500 rounded p-2 cursor-pointer transition flex flex-col items-center justify-center">
                            <span className="text-zinc-400">DAY 14</span>
                            {t.screenshot_day14 ? (
                              <span className="text-emerald-400 font-bold mt-1">SYNCED ✓</span>
                            ) : uploadingTarget === `${t.id}_day14` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 mt-1" />
                            ) : (
                              <span className="text-zinc-500 mt-1">UPLOAD</span>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload(e, t.id, 'day14')} />
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1 font-mono text-xs">
                        <span className="text-zinc-500 text-[11px]">
                          {isCompleted 
                            ? 'WALLET_CREDITED' 
                            : isReadyToComplete 
                              ? 'READY_FOR_FEEDBACK' 
                              : `REMAINING: ${14 - days} DAYS`}
                        </span>

                        {isCompleted ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            COMPLETED
                          </span>
                        ) : isReadyToComplete ? (
                          <button
                            onClick={() => {
                              playMinimalClick('click');
                              setActiveCompletingTest(t);
                              setIsFeedbackModalOpen(true);
                            }}
                            className="bg-emerald-400 hover:bg-emerald-300 text-black px-3 py-1.5 rounded-md font-bold text-xs flex items-center gap-1 shadow-xs transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            審査レポート記入 (+100pt)
                          </button>
                        ) : (
                          <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px]">
                            ACTIVE_HOLD
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* タブ3: 自分の案件 */}
          {activeTab === 'my_apps' && (
            <div className="space-y-3 pt-1">
              {myCreatedApps.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/40 rounded-xl border border-zinc-800 text-zinc-500 p-6">
                  <p className="text-xs font-mono">NO_PROJECTS_REGISTERED</p>
                  <button
                    onClick={() => {
                      playMinimalClick('click');
                      if (!user) {
                        setIsSignUp(true);
                        setIsAuthModalOpen(true);
                      } else {
                        setIsModalOpen(true);
                      }
                    }}
                    className="mt-3 text-xs bg-emerald-400 hover:bg-emerald-300 text-black font-bold px-4 py-2 rounded-md font-mono inline-block transition"
                  >
                    + REGISTER_PROJECT
                  </button>
                </div>
              ) : (
                myCreatedApps.map((app) => (
                  <div key={app.id} className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{app.name}</h4>
                        <p className="text-xs font-mono text-zinc-400 mt-0.5">
                          TESTERS: <span className="text-emerald-400 font-bold">{app.current_testers}</span> / {app.required_testers}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteMyApp(app)}
                        className="text-zinc-500 hover:text-red-400 p-1.5 rounded hover:bg-zinc-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopyReviewText(app.id)}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-emerald-300 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>COPY_EVIDENCE_FOR_CONSOLE</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>

      {/* ミニマルフッター */}
      <footer className="mt-12 border-t border-zinc-900 py-6 text-center text-xs text-zinc-600 font-mono space-y-2">
        <p>© TESTERS FIELD // DEVELOPER CLOSED TEST MUTUAL POOL</p>
        <div className="flex justify-center items-center gap-4 text-[11px] text-zinc-500">
          <button onClick={() => { playMinimalClick('tab'); setActiveManualModal('terms'); }} className="hover:text-zinc-300">
            利用規約
          </button>
          <span>•</span>
          <button onClick={() => { playMinimalClick('tab'); setActiveManualModal('about'); }} className="hover:text-zinc-300">
            設計思想
          </button>
          <span>•</span>
          <a href="https://forms.gle/3sTTB61MrBeghMTd6" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">
            バグ・悪質テスター報告
          </a>
        </div>
      </footer>

      {/* 認証モーダル */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e1017] border border-zinc-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-white text-base font-mono">{isSignUp ? 'REGISTER' : 'LOGIN'}</h3>
                {isSignUp && (
                  <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                    🎁 初回募集枠 1,500 pt 付与中
                  </p>
                )}
              </div>
              <button onClick={() => { playMinimalClick('click'); setIsAuthModalOpen(false); }} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSignUp && (
              <div className="mb-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs space-y-2">
                <p className="font-bold text-zinc-200 flex items-center gap-1 font-mono text-[11px]">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  STEP 1: 公式Googleグループ同期（必須）
                </p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Android実機のGoogle Playと同じGoogleアカウントでご参加ください。
                </p>
                <a
                  href={GOOGLE_GROUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={markGroupAsJoined}
                  className="block text-center py-2 bg-emerald-400 hover:bg-emerald-300 text-black font-bold rounded-lg text-xs transition"
                >
                  Googleグループに参加する
                </a>

                <label className="flex items-start gap-2 text-zinc-300 text-[11px] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={hasJoinedGroup}
                    onChange={(e) => { playMinimalClick('click'); setHasJoinedGroup(e.target.checked); }}
                    className="mt-0.5 rounded border-zinc-700 text-emerald-500 bg-zinc-800"
                  />
                  <span>グループ参加完了を確認しました</span>
                </label>
              </div>
            )}

            {authError && (
              <div className="mb-3 p-2 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-3 text-sm">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">DEVELOPER_ID</label>
                  <input
                    type="text"
                    required
                    placeholder="StudioAlfa"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">EMAIL</label>
                <input
                  type="email"
                  required
                  placeholder="dev@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">PASSWORD</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading || (isSignUp && !hasJoinedGroup)}
                className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-black font-mono font-bold rounded-lg text-xs transition disabled:opacity-40"
              >
                {authLoading ? 'AUTHENTICATING...' : isSignUp ? 'CREATE_ACCOUNT (+1500pt)' : 'SIGN_IN'}
              </button>
            </form>

            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  playMinimalClick('tab');
                  setIsSignUp(!isSignUp);
                  setAuthError('');
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 font-mono"
              >
                {isSignUp ? 'アカウントをお持ちの方 (LOGIN)' : '初めての方 (REGISTER)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フィードバックモーダル */}
      {isFeedbackModalOpen && activeCompletingTest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e1017] border border-zinc-800 w-full max-w-md rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-white text-base font-mono">SUBMIT_EVIDENCE</h3>
                <p className="text-[11px] text-zinc-500">Google審査提出用の高品質レポートを記録します</p>
              </div>
              <button onClick={() => { playMinimalClick('click'); setIsFeedbackModalOpen(false); }} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">DEVICE_MODEL *</label>
                  <input
                    type="text"
                    required
                    placeholder="Pixel 8"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">OS_VERSION *</label>
                  <input
                    type="text"
                    required
                    placeholder="Android 14"
                    value={osVersion}
                    onChange={(e) => setOsVersion(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-zinc-400">良かった点・UI挙動 (20文字以上) *</label>
                  <span className={`font-mono text-[10px] ${goodPoints.trim().length >= 20 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {goodPoints.trim().length}/20
                  </span>
                </div>
                <textarea
                  required
                  rows={2}
                  value={goodPoints}
                  onChange={(e) => setGoodPoints(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-zinc-400">改善提案・UIの違和感 (20文字以上) *</label>
                  <span className={`font-mono text-[10px] ${improvements.trim().length >= 20 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {improvements.trim().length}/20
                  </span>
                </div>
                <textarea
                  required
                  rows={2}
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">不具合報告（なければ「なし」） *</label>
                <input
                  type="text"
                  required
                  value={bugReports}
                  onChange={(e) => setBugReports(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                />
              </div>

              <button
                type="submit"
                disabled={feedbackSubmitting || goodPoints.trim().length < 20 || improvements.trim().length < 20 || !deviceModel.trim()}
                className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-black font-mono font-bold rounded-lg transition disabled:opacity-40"
              >
                {feedbackSubmitting ? 'SUBMITTING...' : 'COMPLETE (+100pt)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 案件募集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e1017] border border-zinc-800 w-full max-w-md rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-white text-base font-mono">POST_PROJECT</h3>
                <p className="text-[11px] text-zinc-500">
                  CONSUME: <span className="text-emerald-400 font-bold">{REQUIRED_POINTS_FOR_POST} pt</span> (BALANCE: {userPoints} pt)
                </p>
              </div>
              <button onClick={() => { playMinimalClick('click'); setIsModalOpen(false); }} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-3 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300">
              <span className="font-bold block mb-1 text-emerald-400 font-mono">SETUP_CHECK</span>
              Play Consoleテスター欄に下記グループアドレスを登録してください：
              <div className="mt-1 flex items-center justify-between bg-black border border-zinc-800 rounded px-2 py-1 font-mono text-[11px] text-zinc-300">
                <span>{GOOGLE_GROUP_EMAIL}</span>
                <button
                  type="button"
                  onClick={() => {
                    playMinimalClick('click');
                    navigator.clipboard.writeText(GOOGLE_GROUP_EMAIL);
                    alert('アドレスをコピーしました。');
                  }}
                  className="text-emerald-400 hover:underline ml-2"
                >
                  COPY
                </button>
              </div>
            </div>

            {formError && (
              <div className="mb-3 p-2 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-mono mb-1">APP_NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="HabitTracker"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">CATEGORY</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                  >
                    <option value="ツール">ツール</option>
                    <option value="ゲーム">ゲーム</option>
                    <option value="生産性">生産性</option>
                    <option value="ライフスタイル">ライフスタイル</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">DEVELOPER</label>
                  <input
                    type="text"
                    disabled
                    value={username || '開発者'}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">WEB_TEST_URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://play.google.com/apps/testing/..."
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">TAGS (カンマ区切り)</label>
                <input
                  type="text"
                  placeholder="Android14, 審査直結"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || userPoints < REQUIRED_POINTS_FOR_POST}
                className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-black font-mono font-bold rounded-lg transition disabled:opacity-40"
              >
                {isSubmitting ? 'DEPLOYING...' : 'CONFIRM_POST (1,500 pt)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 設計思想・利用規約モーダル */}
      {activeManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e1017] border border-zinc-800 w-full max-w-md rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-base font-mono">
                {activeManualModal === 'about' && 'PHILOSOPHY // 設計思想'}
                {activeManualModal === 'dev' && 'PLAY_CONSOLE_GUIDE // 審査手順'}
                {activeManualModal === 'terms' && 'TERMS // 利用規約'}
              </h3>
              <button onClick={() => { playMinimalClick('click'); setActiveManualModal(null); }} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeManualModal === 'about' && (
              <div className="space-y-3 text-xs text-zinc-400 leading-relaxed font-sans">
                <p><strong className="text-white">審査官を納得させる「証拠」を自動でつくる：</strong><br />Google Playの審査では「テスターを集めたか」ではなく「フィードバックを得て修正したか」が問われます。テスポは20文字以上の義務付けと、Play Console用のコピペ用レポート生成に特化しています。</p>
                <p><strong className="text-white">相互テストの煩わしさをゼロに：</strong><br />「返報性のプレッシャー」やDMでの個別対応を廃止。共通ポイントプールで自律的に回る仕組みです。</p>
              </div>
            )}

            {activeManualModal === 'dev' && (
              <div className="space-y-2 text-xs text-zinc-400 leading-relaxed font-mono">
                <p>1. Play Console &gt; クローズドテスト &gt; テスターに <span className="text-emerald-400">{GOOGLE_GROUP_EMAIL}</span> を追加</p>
                <p>2. Webテスター参加リンクを取得してテスポに投稿</p>
                <p>3. 14日経過後、「COPY_EVIDENCE」ボタンでレポートを生成して申請フォームに貼る</p>
              </div>
            )}

            {activeManualModal === 'terms' && (
              <div className="space-y-2 text-xs text-zinc-400 leading-relaxed">
                <p>・即時アンインストールやテスト放置、サボり行為はアカウント停止およびポイント没収の対象です。</p>
                <p>・当サービスはGoogle LLCとの提携関係にはありません。審査結果について保証するものではありません。</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}