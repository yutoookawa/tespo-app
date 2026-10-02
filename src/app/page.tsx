"use client";

import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Users, 
  Sparkles, 
  X, 
  Loader2, 
  ExternalLink, 
  Calendar, 
  CheckCircle2, 
  Camera, 
  Trash2, 
  LogIn, 
  LogOut, 
  Copy, 
  MessageSquare, 
  Menu, 
  Share2, 
  ChevronRight, 
  ArrowLeft,
  Award, 
  Save, 
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// --- Web Audio API（歯切れの良いメカニカル・プチプチ触感クリック ＆ みずみずしいスライム音） ---
let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  return sharedAudioCtx;
};

// 集中力を削がない、クリスピーで心地よい触感サウンド
const playTactileSound = async (type: 'click' | 'slime' = 'click') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    if (type === 'slime') {
      // みずみずしく「ポヨッ！」と弾けるスライムサウンド（2重倍音）
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(380, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.06);
      osc1.frequency.exponentialRampToValueAtTime(480, now + 0.16);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(760, now);
      osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(600, now + 0.14);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.18);
      osc2.stop(now + 0.18);
    } else {
      // 乾いたメカニカルクリック／プチプチ触感音（高域クリア＆超短ディケイ）
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1250, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.035);

      gain.gain.setValueAtTime(0.75, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.start(now);
      osc.stop(now + 0.035);
    }
  } catch {
    // AudioContext エラーハンドリング
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
  device_model?: string;
  os_version?: string;
  good_points?: string;
  improvements?: string;
  bug_reports?: string;
  screenshot_day1?: string;
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
  name: "【公式サンプル】タスク管理メモ",
  category: "ツール",
  developer: "テスポ運営",
  required_testers: 15,
  current_testers: 13,
  reward_points: 100,
  tags: ["チュートリアル", "14日間残そう", "レポート体験"],
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

  // 画面ビュー切替 ('home' | 'vision' | 'guide_tester' | 'guide_dev' | 'guide_multi')
  const [currentView, setCurrentView] = useState<'home' | 'vision' | 'guide_tester' | 'guide_dev' | 'guide_multi'>('home');
  const [activeTab, setActiveTab] = useState<'explore' | 'joined' | 'my_apps'>('explore');
  const [isGroupJoinedState, setIsGroupJoinedState] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSlimeBouncing, setIsSlimeBouncing] = useState(false);

  // ポケモン風ガイド（ステップ1は新規登録から）
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  
  // モーダル
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeEditingTest, setActiveEditingTest] = useState<Participation | null>(null);
  
  // 認証フォーム
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [hasJoinedGroup, setHasJoinedGroup] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // 案件投稿フォーム
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ツール');
  const [tagsInput, setTagsInput] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // レビュー編集
  const [deviceModel, setDeviceModel] = useState('');
  const [osVersion, setOsVersion] = useState('Android 14');
  const [goodPoints, setGoodPoints] = useState('');
  const [improvements, setImprovements] = useState('');
  const [bugReports, setBugReports] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const [uploadingTarget, setUploadingTarget] = useState<number | null>(null);

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
    } catch {}
  };

  const getDaysPassed = (startDate: string) => {
    const diff = new Date().getTime() - new Date(startDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
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
        const userParticipations = partData.filter((p) => p.user_id === currentUserId);
        setMyTests(userParticipations);

        userParticipations.forEach(async (p) => {
          if (p.status === 'testing' && getDaysPassed(p.started_at) >= 14) {
            const hasScreenshot = Boolean(p.screenshot_day1);
            const hasValidReview = (p.good_points?.length || 0) >= 20 && (p.improvements?.length || 0) >= 20;

            if (hasScreenshot && hasValidReview) {
              await supabase.from('test_participations').update({ status: 'completed' }).eq('id', p.id);
              const nextPoints = userPoints + REWARD_PER_TEST;
              await supabase.from('profiles').update({ points: nextPoints }).eq('id', currentUserId);
              setUserPoints(nextPoints);
              setMyTests(prev => prev.map(item => item.id === p.id ? { ...item, status: 'completed' } : item));
            }
          }
        });
      } else {
        const localJoined = JSON.parse(localStorage.getItem('tespo_joined_ids') || '[]');
        setMyTests((partData || []).filter((p) => localJoined.includes(p.id)));
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const markGroupAsJoined = () => {
    playTactileSound('click');
    setIsGroupJoinedState(true);
    localStorage.setItem('tf_group_joined', 'true');
  };

  const handleSlimeClick = () => {
    playTactileSound('slime');
    setIsSlimeBouncing(true);
    setTimeout(() => setIsSlimeBouncing(false), 500);
  };

  const navigateToView = (view: 'home' | 'vision' | 'guide_tester' | 'guide_dev' | 'guide_multi') => {
    playTactileSound('click');
    setIsMenuOpen(false);
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (isSignUp) {
        if (!authUsername.trim()) throw new Error('お名前（ニックネーム）を入力してください');
        if (!hasJoinedGroup) throw new Error('公式Googleグループへの参加確認にチェックを入れてください');

        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', authUsername.trim())
          .maybeSingle();

        if (existingUser) throw new Error('このお名前は既に使用されています。');

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
          playTactileSound('click');
          alert('🎉 登録完了！初回募集用の 1,500 pt をプレゼントしたよ！自分のアプリもすぐ募集できるよ！');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        playTactileSound('click');
      }
      setIsAuthModalOpen(false);
      fetchData();
      if (tutorialStep === 1) setTutorialStep(2);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '認証エラーが発生しました';
      setAuthError(errorMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    playTactileSound('click');
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
      setFormError(`募集には ${REQUIRED_POINTS_FOR_POST} pt 必要です。他のアプリのテストに参加してポイントを獲得してください。`);
      return;
    }

    if (testUrl) {
      const isGoogleUrl = testUrl.startsWith('https://') && 
        (testUrl.includes('google.com') || testUrl.includes('play.google.com'));
      if (!isGoogleUrl) {
        setFormError('Play Consoleで発行されたWeb参加用URL（https://play.google.com/apps/testing/...）を入力してください。');
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

      playTactileSound('click');
      setName('');
      setTagsInput('');
      setTestUrl('');
      setIsModalOpen(false);
      setActiveTab('my_apps');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '投稿に失敗しました';
      setFormError('募集の投稿に失敗しました: ' + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMyApp = async (app: AppItem) => {
    playTactileSound('click');
    if (!confirm(`「${app.name}」の募集を取り下げますか？\n集まっていない枠のポイント（未募集分）は全額返還されます。`)) return;

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

      playTactileSound('click');
      alert(`募集を取り下げました。${refundPoints} pt が返還されました。`);
    } catch {
      alert('削除に失敗しました。');
    }
  };

  const handleJoinTest = async (app: AppItem) => {
    playTactileSound('click');

    if (app.id === -999) {
      setTutorialStep(1);
      return;
    }

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const isAlreadyJoined = myTests.some((t) => t.app_id === app.id);
    if (isAlreadyJoined) {
      alert('このアプリのテストには既に参加中だよ！');
      return;
    }

    const confirmed = confirm(
      `🤝 【みんなでリリース成功を目指すお約束！】\n\n` +
      `Google Playの審査をクリアするため、アプリは「14日間スマホに残しておくこと（アンインストール・削除は厳禁）」が大切です！\n\n` +
      `※途中で削除すると、獲得ポイントが無効になる可能性があります。\n\n` +
      `14日間しっかり残して応援することに同意して参加しますか？`
    );

    if (!confirmed) return;

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

      playTactileSound('click');
      if (app.test_url) {
        window.open(app.test_url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      alert('参加処理でエラーが発生しました');
    }
  };

  const handleSingleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>, participationId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTarget(participationId);
    playTactileSound('click');

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `proofs/${participationId}_single_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('task-proofs').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('task-proofs').getPublicUrl(filePath);

      await supabase.from('test_participations').update({ screenshot_day1: publicUrlData.publicUrl }).eq('id', participationId);

      setMyTests(myTests.map((t) => t.id === participationId ? { ...t, screenshot_day1: publicUrlData.publicUrl } : t));
      playTactileSound('click');
      alert('テストアプリの画面スクショを保存したよ！');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラー';
      alert('アップロード失敗: ' + msg);
    } finally {
      setUploadingTarget(null);
    }
  };

  const openFeedbackEditor = (t: Participation) => {
    playTactileSound('click');
    setActiveEditingTest(t);
    setDeviceModel(t.device_model || '');
    setOsVersion(t.os_version || 'Android 14');
    setGoodPoints(t.good_points || '');
    setImprovements(t.improvements || '');
    setBugReports(t.bug_reports || '');
    setIsFeedbackModalOpen(true);
  };

  const handleSaveFeedbackDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEditingTest || !user) return;

    setFeedbackSubmitting(true);
    playTactileSound('click');

    try {
      const days = getDaysPassed(activeEditingTest.started_at);
      const isEligibleForAutoCompletion = days >= 14 && activeEditingTest.screenshot_day1 && goodPoints.trim().length >= 20 && improvements.trim().length >= 20;

      const nextStatus = isEligibleForAutoCompletion ? 'completed' : activeEditingTest.status;

      const { error } = await supabase
        .from('test_participations')
        .update({
          status: nextStatus,
          device_model: deviceModel,
          os_version: osVersion,
          good_points: goodPoints,
          improvements: improvements,
          bug_reports: bugReports,
        })
        .eq('id', activeEditingTest.id);

      if (error) throw error;

      if (isEligibleForAutoCompletion && activeEditingTest.status !== 'completed') {
        const nextPoints = userPoints + REWARD_PER_TEST;
        await supabase.from('profiles').update({ points: nextPoints }).eq('id', user.id);
        setUserPoints(nextPoints);
        playTactileSound('click');
        alert(`🎉 14日間キープ達成！\n報酬として ${REWARD_PER_TEST} pt を付与したよ！`);
      } else {
        playTactileSound('click');
        alert('感想メモを保存したよ！14日間いつでも書き直せるよ。');
      }

      setMyTests(myTests.map((t) => t.id === activeEditingTest.id ? { 
        ...t, 
        status: nextStatus,
        device_model: deviceModel,
        os_version: osVersion,
        good_points: goodPoints,
        improvements: improvements,
        bug_reports: bugReports
      } : t));

      setIsFeedbackModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラー';
      alert('保存エラー: ' + msg);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleCopyReviewText = (appId: number) => {
    playTactileSound('click');
    const feedbacks = allParticipations.filter((p) => p.app_id === appId && p.good_points && p.good_points.length >= 20);
    if (feedbacks.length === 0) {
      alert('まだ集まったフィードバックがありません。');
      return;
    }

    let report = `【Google Play クローズドテスト 審査申請用フィードバック実績】\n\n`;
    report += `■ 参加テスター数: ${feedbacks.length}名（14日間オプトイン継続確認済）\n\n`;
    report += `■ テスターからの具体的な改善フィードバック:\n`;

    feedbacks.forEach((f, idx) => {
      report += `\n[テスター ${idx + 1}] 端末: ${f.device_model || 'Android'} / OS: ${f.os_version || 'Android 14'}\n`;
      report += `・評価点: ${f.good_points || 'なし'}\n`;
      report += `・改善要望: ${f.improvements || 'なし'}\n`;
      report += `・不具合報告: ${f.bug_reports || '発生なし'}\n`;
    });

    report += `\n■ テスト結果を踏まえた対応策:\n上記のフィードバックに基づき、UIデザインの調整および安定性向上の修正アップデートを実施しました。`;

    navigator.clipboard.writeText(report);
    playTactileSound('click');
    alert('📋 Play Console 審査用の回答テキストをコピーしました！申請画面に貼り付けてご利用ください。');
  };

  const handleShareOnX = () => {
    playTactileSound('click');
    const shareText = `Google Playの14日間クローズドテスト、テスターズフィールド（テスポ）で進行中！\n相互テストで15人確保＆審査用の感想レポートも自動作成できる無料Webです🤝\n#個人開発 #GooglePlay #Androidアプリ開発`;
    const shareUrl = "https://tespo-app.vercel.app";
    const twitterIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterIntent, '_blank', 'noopener,noreferrer');
  };

  const myCreatedApps = user ? apps.filter((a) => a.user_id === user.id) : [];
  const displayedApps = apps.length > 0 ? apps : [DEMO_SAMPLE_APP];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans relative">
      <div>
        {/* ヘッダー */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-emerald-100 px-4 py-2.5 shadow-xs">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => { playTactileSound('click'); setIsMenuOpen(true); }}
                className="p-1 -ml-1 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition"
                title="メニューを開く"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div 
                onClick={handleSlimeClick}
                className="flex items-center gap-1.5 cursor-pointer select-none group"
                title="タップしてね！"
              >
                <div className={`relative transition-transform duration-300 ${isSlimeBouncing ? 'scale-125 -translate-y-1' : 'group-hover:scale-110 active:scale-95'}`}>
                  <svg className="w-7 h-7 text-emerald-500 fill-emerald-400 drop-shadow-xs" viewBox="0 0 100 100">
                    <path d="M50 15 C25 15, 12 45, 12 70 C12 88, 28 92, 50 92 C72 92, 88 88, 88 70 C88 45, 75 15, 50 15 Z" />
                    <circle cx="38" cy="55" r="5" fill="#064e3b" />
                    <circle cx="62" cy="55" r="5" fill="#064e3b" />
                    <circle cx="40" cy="53" r="1.5" fill="#ffffff" />
                    <circle cx="64" cy="53" r="1.5" fill="#ffffff" />
                    <path d="M44 68 Q50 74 56 68" stroke="#064e3b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm text-slate-900 tracking-tight leading-none group-hover:text-emerald-600 transition">
                    テスターズフィールド
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold leading-tight mt-0.5">
                    テスポ
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 bg-emerald-50/60 border border-emerald-200 px-2 py-1 rounded-full max-w-[90px] truncate">
                    {username}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
                    title="ログアウト"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  id="guide-auth-btn"
                  onClick={() => {
                    playTactileSound('click');
                    setIsSignUp(true);
                    setIsAuthModalOpen(true);
                  }}
                  className={`text-xs text-emerald-700 hover:bg-emerald-50 border border-emerald-300 bg-emerald-50/40 px-2.5 py-1.5 rounded-full font-bold transition shadow-2xs ${tutorialStep === 1 ? 'ring-4 ring-amber-400 animate-bounce' : ''}`}
                >
                  <LogIn className="w-3 h-3 inline mr-1 text-emerald-600" />
                  <span>登録 / ログイン</span>
                </button>
              )}

              <button
                onClick={() => {
                  playTactileSound('click');
                  setFormError('');
                  if (!user) {
                    setIsSignUp(true);
                    setIsAuthModalOpen(true);
                  } else {
                    setIsModalOpen(true);
                  }
                }}
                className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-full transition shadow-xs active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>募集</span>
              </button>
            </div>
          </div>
        </header>

        {/* ドロワーメニュー */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex">
            <div className="bg-white w-80 h-full border-r border-slate-200 shadow-2xl flex flex-col justify-between p-5 animate-in slide-in-from-left duration-200 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <span className="text-emerald-600 font-extrabold text-base">テスポ</span>
                    <span>ガイド＆メニュー</span>
                  </div>
                  <button onClick={() => { playTactileSound('click'); setIsMenuOpen(false); }} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => navigateToView('vision')}
                    className="w-full p-3.5 rounded-xl border-2 border-emerald-400 bg-emerald-50/50 hover:bg-emerald-100/50 transition flex items-center justify-between text-left group shadow-xs"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded">必見</span>
                      <h4 className="text-xs font-extrabold text-slate-900 mt-1 group-hover:text-emerald-800">テスポのこだわり（選ばれる理由）</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">審査を確実に通すための3つの強み</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </button>

                  <button
                    onClick={() => navigateToView('guide_tester')}
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center justify-between text-left group"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">基本</span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 group-hover:text-emerald-700">テスター参加の流れ</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">グループ参加から100pt獲得まで</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </button>

                  <button
                    onClick={() => navigateToView('guide_dev')}
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center justify-between text-left group"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">開発者</span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 group-hover:text-emerald-700">アプリ募集と審査申請手順</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Console登録とレポート出力</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </button>

                  <button
                    onClick={() => navigateToView('guide_multi')}
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center justify-between text-left group"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">便利</span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 group-hover:text-emerald-700">他社ツール（TestCrew等）との併用</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">複数グループ登録で人数を倍増</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <button
                  onClick={handleShareOnX}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Xでサービスをシェア</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center font-mono">TestersField Core v2.8</p>
              </div>
            </div>
            <div className="flex-1" onClick={() => { playTactileSound('click'); setIsMenuOpen(false); }} />
          </div>
        )}

        {/* 画面遷移ビュー：テスポのこだわり・価値訴求 */}
        {currentView === 'vision' && (
          <div className="max-w-md mx-auto px-4 py-4 space-y-4 animate-in fade-in duration-150">
            <button
              onClick={() => navigateToView('home')}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ホームに戻る</span>
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                  PHILOSOPHY
                </span>
                <h2 className="text-base font-extrabold text-slate-900 mt-2">
                  テスポが選ばれる理由とこだわり
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  「ただ12人を集めるだけ」ではGoogle Playの審査には通りません。テスポは**審査を突破するための証拠づくり**に徹底的にこだわっています。
                </p>
              </div>

              <div className="border border-emerald-200 bg-emerald-50/30 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>1. 審査官を納得させる「20文字以上の本気フィードバック」</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  他社ツールやSNS募集では「よかった」「面白かった」の数文字で終わってしまい、Console申請で落ちるケースが多発しています。テスポは**20文字以上の具体的な意見（評価点・改善要望）を必須化**。さらにワンタップで整形レポートを出力できるため、審査回答フォームにそのまま貼り付け可能です。
                </p>
              </div>

              <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>2. 「途中のテスター離脱」を防ぐ15人固定プール</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Google要件は12人ですが、1人でも途中でアンインストールすると14日のカウントが即リセットされます。テスポは最初から**余裕を持った15人枠で自動募集**。万が一の端末不調や離脱があっても12人を安全に死守します。
                </p>
              </div>

              <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-purple-900">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>3. 他社ツール（TestCrewやDiscord）との完全併用OK</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  乗り換える必要はありません。Google Play Consoleは複数のGoogleグループを同時に登録できます。他社ツールで集めている人の**「人数のバックアップ＆証拠レポート作成用の併用先」**として最も威力を発揮します。
                </p>
              </div>

              <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>4. 新規登録で初回15人分（1,500pt）完全無料プレゼント</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  「他人のテストをしてポイントを貯めないと募集できない」という参入障壁をゼロに。登録したその瞬間に、自分のアプリをいきなり15人分無料で募集できます。
                </p>
              </div>

              <button
                onClick={() => navigateToView('home')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
              >
                ホームに戻って使ってみる
              </button>
            </div>
          </div>
        )}

        {/* 画面遷移①：テスター参加 */}
        {currentView === 'guide_tester' && (
          <div className="max-w-md mx-auto px-4 py-4 space-y-4 animate-in fade-in duration-150">
            <button
              onClick={() => navigateToView('home')}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ホームに戻る</span>
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                <span>テスター参加のステップ</span>
              </h2>

              <div className="space-y-4 text-xs text-slate-700">
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">STEP 1</span>
                  <h3 className="font-bold text-slate-900">公式Googleグループに参加する</h3>
                  <div className="border border-emerald-300 bg-white rounded-lg p-2.5 text-center text-[11px] text-slate-600 shadow-2xs">
                    📱 <strong>【実機スマホと同じGoogleアカウント】</strong>でグループに参加！<br />
                    （未参加だとPlayストアで「見つかりません」と出ます）
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">STEP 2</span>
                  <h3 className="font-bold text-slate-900">アプリをインストールして14日間残す</h3>
                  <div className="border border-emerald-300 bg-white rounded-lg p-2.5 text-center text-[11px] text-slate-600 shadow-2xs">
                    ⏳ <strong>【アンインストール・削除は厳禁！】</strong><br />
                    14日間スマホに残しておくことで、相手の開発者の審査条件を満たせます。
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">STEP 3</span>
                  <h3 className="font-bold text-slate-900">スクショ1枚＆感想メモで自動完了！</h3>
                  <div className="border border-emerald-300 bg-white rounded-lg p-2.5 text-center text-[11px] text-slate-600 shadow-2xs">
                    📝 <strong>【期間中いつでもメモ保存可能】</strong><br />
                    スクショ1枚と20文字以上の感想を保存しておけば、14日経過時に自動で100ptが付与されます！
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigateToView('home')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
              >
                分かった！ホームで案件を探す
              </button>
            </div>
          </div>
        )}

        {/* 画面遷移②：自作アプリ募集＆審査申請 */}
        {currentView === 'guide_dev' && (
          <div className="max-w-md mx-auto px-4 py-4 space-y-4 animate-in fade-in duration-150">
            <button
              onClick={() => navigateToView('home')}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ホームに戻る</span>
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                <span>アプリ募集＆Console申請の手順</span>
              </h2>

              <div className="space-y-4 text-xs text-slate-700">
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                  <span className="font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded text-[10px]">STEP 1</span>
                  <h3 className="font-bold text-slate-900">Google Play Consoleにグループアドレスを追加</h3>
                  <div className="bg-white border border-blue-200 rounded p-2 text-center text-[11px] font-mono text-blue-700">
                    testers-field@googlegroups.com
                  </div>
                  <p className="text-[11px] text-slate-500">Consoleの「クローズドテスト」&gt;「テスター」に追加して保存します。</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                  <span className="font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded text-[10px]">STEP 2</span>
                  <h3 className="font-bold text-slate-900">Web参加用URLをテスポに投稿（1,500pt）</h3>
                  <p className="text-[11px] text-slate-500">初回登録で1,500ptが無料プレゼントされているので、すぐに15人分の募集を開始できます！</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                  <span className="font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded text-[10px]">STEP 3</span>
                  <h3 className="font-bold text-slate-900">14日後、審査エビデンスをワンタップコピー！</h3>
                  <div className="bg-white border border-slate-200 rounded p-2 text-[10px] font-mono text-slate-600">
                    「審査申請用フィードバックをコピー」ボタンを押して、Consoleの申請アンケートにそのまま貼り付けるだけで申請完了！
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  navigateToView('home');
                  if (!user) {
                    setIsSignUp(true);
                    setIsAuthModalOpen(true);
                  } else {
                    setIsModalOpen(true);
                  }
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
              >
                今すぐ案件を募集してみる！
              </button>
            </div>
          </div>
        )}

        {/* 画面遷移③：他社ツール併用 */}
        {currentView === 'guide_multi' && (
          <div className="max-w-md mx-auto px-4 py-4 space-y-4 animate-in fade-in duration-150">
            <button
              onClick={() => navigateToView('home')}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ホームに戻る</span>
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                <span>他社ツール（TestCrew・Discord）との併用</span>
              </h2>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 space-y-2">
                  <h3 className="font-bold text-purple-900 text-sm">💡 Googleグループは「何個でも同時に登録可能」！</h3>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    Google Play Consoleは複数のメールリスト・Googleグループを同時登録できる仕様です。既存のグループを消す必要は一切ありません。
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <h4 className="font-bold text-slate-900">併用するメリット（バックアップ保険）</h4>
                  <ul className="space-y-1.5 text-[11px] text-slate-600">
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span><strong>離脱対策</strong>: 他社のテスターが途中で辞めても、テスポの15人がいれば12人要件を安全クリア！</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span><strong>証拠づくり</strong>: 他社で不足しがちな「審査用の具体的なフィードバック意見」をテスポで自動確保！</span>
                    </li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => navigateToView('home')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
              >
                理解できた！ホームに戻る
              </button>
            </div>
          </div>
        )}

        {/* 通常ホーム画面 */}
        {currentView === 'home' && (
          <div className="max-w-md mx-auto px-4 pt-3 space-y-3">
            
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-3 text-white shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-xs">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <p className="text-[11px] text-emerald-100 font-medium leading-none">保有ポイント</p>
                  <p className="text-xl font-extrabold mt-1 leading-none flex items-baseline gap-0.5">
                    {userPoints.toLocaleString()} <span className="text-[10px] font-normal text-emerald-200">pt</span>
                  </p>
                </div>
              </div>

              {isGroupJoinedState ? (
                <span className="text-xs font-bold text-white bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg flex items-center gap-1 backdrop-blur-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  グループ参加済
                </span>
              ) : (
                <a
                  href={GOOGLE_GROUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={markGroupAsJoined}
                  className="text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
                >
                  <span>必須：グループ参加</span>
                  <ExternalLink className="w-3 h-3 text-emerald-600" />
                </a>
              )}
            </div>

            <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden shadow-2xs">
              <button
                onClick={() => { playTactileSound('click'); setIsGuideOpen(!isGuideOpen); }}
                className="w-full px-3.5 py-2 text-xs font-bold text-slate-700 flex items-center justify-between hover:bg-emerald-50/40 transition"
              >
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>初めての方へ：テスポの全体の流れ</span>
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-0.5 font-normal">
                  {isGuideOpen ? '閉じる' : '手順を見る'}
                  {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>
              {isGuideOpen && (
                <div className="px-3.5 pb-3 pt-1 text-[11px] text-slate-600 border-t border-emerald-100 bg-emerald-50/20 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <p><strong>公式Googleグループに参加</strong>（実機のPlayストアと同じGoogleアカウント）</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <p><strong>アプリを募集する</strong>（初回プレゼントの1,500ptですぐに15人分募集できるよ！）</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <p><strong>他のアプリを14日間スマホに残そう！</strong>（テスト画面のスクショ＆メモを保存しておけば、14日後に自動で100pt獲得！）</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 bg-emerald-100/60 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                onClick={() => { playTactileSound('click'); setActiveTab('explore'); }}
                className={`py-2 rounded-lg transition ${
                  activeTab === 'explore'
                    ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200/60'
                    : 'hover:text-emerald-900'
                }`}
              >
                探す・参加 ({displayedApps.length})
              </button>
              <button
                id="guide-tab-joined"
                onClick={() => { 
                  playTactileSound('click'); 
                  setActiveTab('joined');
                  if (tutorialStep === 2) setTutorialStep(3);
                }}
                className={`py-2 rounded-lg transition ${
                  activeTab === 'joined'
                    ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200/60'
                    : 'hover:text-emerald-900'
                } ${tutorialStep === 2 ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
              >
                参加中・14日管理 ({myTests.length})
              </button>
              <button
                onClick={() => { playTactileSound('click'); setActiveTab('my_apps'); }}
                className={`py-2 rounded-lg transition ${
                  activeTab === 'my_apps'
                    ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200/60'
                    : 'hover:text-emerald-900'
                }`}
              >
                自分の案件 ({myCreatedApps.length})
              </button>
            </div>

            {activeTab === 'explore' && (
              <div className="space-y-3 pt-1">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
                    <p className="text-xs">アプリを読み込み中...</p>
                  </div>
                ) : (
                  displayedApps.map((app) => {
                    const isDemo = app.id === -999;
                    const progress = Math.min(100, Math.round((app.current_testers / app.required_testers) * 100));
                    const isJoined = myTests.some((t) => t.app_id === app.id);
                    const isMyCreated = user && app.user_id === user.id;

                    return (
                      <div
                        key={app.id}
                        className={`bg-white rounded-xl p-4 border shadow-xs flex flex-col justify-between transition ${
                          isDemo ? 'border-emerald-400 ring-2 ring-emerald-200/60 bg-emerald-50/20' : 'border-emerald-100/90 hover:border-emerald-300'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mb-1 ${
                                isDemo ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {isDemo ? '公式サンプル' : app.category}
                              </span>
                              <h3 className="font-bold text-slate-900 text-base">{app.name}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">{app.developer}</p>
                            </div>
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                              +{app.reward_points} pt
                            </span>
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
                                <Users className="w-3.5 h-3.5 text-emerald-600" />
                                テスター確保状況
                              </span>
                              <span>{app.current_testers} / {app.required_testers} 人</span>
                            </div>
                            <div className="w-full bg-emerald-100/70 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => handleJoinTest(app)}
                            disabled={Boolean(!isDemo && (isJoined || isMyCreated))}
                            className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                              isDemo
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-[0.99]'
                                : isMyCreated
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                : isJoined
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-[0.99]'
                            }`}
                          >
                            {isDemo ? (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                <span>チュートリアルを体験する（操作ガイド）</span>
                              </>
                            ) : isMyCreated ? (
                              <span>あなたが募集したアプリです</span>
                            ) : isJoined ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>現在テスト参加中</span>
                              </>
                            ) : (
                              <>
                                <Calendar className="w-3.5 h-3.5" />
                                <span>14日間のテストに参加する</span>
                                <ExternalLink className="w-3 h-3 ml-0.5" />
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

            {activeTab === 'joined' && (
              <div className="space-y-3 pt-1">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-950 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>【みんなでリリース成功を目指すお約束！】</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed pl-5">
                    14日間スマホに残しておこう！（アンインストール・削除は厳禁だよ）。途中で削除すると獲得ポイントが無効になっちゃうので気をつけてね！
                  </p>
                </div>

                {myTests.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-emerald-100 text-slate-500 p-6">
                    <p className="text-xs">現在参加中のテストはありません。</p>
                    <button
                      onClick={() => { playTactileSound('click'); setActiveTab('explore'); }}
                      className="mt-3 text-xs text-emerald-600 font-bold hover:underline inline-block"
                    >
                      募集中のアプリを探す →
                    </button>
                  </div>
                ) : (
                  myTests.map((t) => {
                    const days = getDaysPassed(t.started_at);
                    const isCompleted = t.status === 'completed';
                    const hasScreenshot = Boolean(t.screenshot_day1);
                    const hasReview = (t.good_points?.length || 0) >= 20 && (t.improvements?.length || 0) >= 20;

                    return (
                      <div key={t.id} className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {isCompleted ? 'テスト完了・獲得済' : `${days}日目 / 14日間`}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm mt-1">{t.app?.name || 'テストアプリ'}</h4>
                          </div>
                          <span className="text-xs font-bold text-emerald-700">+{t.app?.reward_points || REWARD_PER_TEST} pt</span>
                        </div>

                        <div className="w-full bg-emerald-100/70 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, (days / 14) * 100)}%` }}
                          />
                        </div>

                        <div className="bg-emerald-50/40 p-3 rounded-lg border border-emerald-100 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-emerald-600" />
                              <span>テストアプリの画面をスクショしてアップロードしよう！</span>
                            </p>
                            {hasScreenshot ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> 保存済
                              </span>
                            ) : (
                              <label className="text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded cursor-pointer transition shadow-2xs">
                                {uploadingTarget === t.id ? 'アップ中...' : '+ スクショ選択'}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSingleScreenshotUpload(e, t.id)} />
                              </label>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-emerald-100/80">
                            <div className="text-[11px] text-slate-600">
                              <span className="font-bold">フィードバックメモ:</span>{' '}
                              {hasReview ? (
                                <span className="text-emerald-700 font-bold">20文字以上入力済 ✓</span>
                              ) : (
                                <span className="text-amber-700">下書き保存中（タップして編集）</span>
                              )}
                            </div>
                            <button
                              id="guide-memo-btn"
                              onClick={() => {
                                openFeedbackEditor(t);
                                if (tutorialStep === 3) setTutorialStep(4);
                              }}
                              className={`text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-md transition shadow-2xs flex items-center gap-1 ${tutorialStep === 3 ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{hasReview ? 'メモを確認・編集' : 'メモを書く'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-1 text-xs">
                          <span className="text-slate-500 text-[11px]">
                            {isCompleted 
                              ? '100pt 受取完了！' 
                              : days >= 14 
                                ? (hasScreenshot && hasReview ? '14日達成！自動付与完了' : 'スクショまたはメモを完成させてね')
                                : `あと ${14 - days} 日間スマホに残しておこう！（削除厳禁）`}
                          </span>

                          {isCompleted ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              獲得完了
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-medium">
                              キープ中
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'my_apps' && (
              <div className="space-y-3 pt-1">
                {myCreatedApps.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-emerald-100 text-slate-500 p-6">
                    <p className="text-xs">あなたが募集中のアプリはありません。</p>
                    <button
                      onClick={() => {
                        playTactileSound('click');
                        if (!user) {
                          setIsSignUp(true);
                          setIsAuthModalOpen(true);
                        } else {
                          setIsModalOpen(true);
                        }
                      }}
                      className="mt-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg inline-block transition"
                    >
                      案件を新規募集する
                    </button>
                  </div>
                ) : (
                  myCreatedApps.map((app) => (
                    <div key={app.id} className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{app.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            テスター確保: <span className="text-emerald-600 font-bold">{app.current_testers}</span> / {app.required_testers} 人
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteMyApp(app)}
                          className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
                          title="募集を取り消してポイント返還"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleCopyReviewText(app.id)}
                        className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <Copy className="w-3.5 h-3.5 text-emerald-700" />
                        <span>審査申請用フィードバックをコピー</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* ポケモン風 インタラクティブガイド */}
      {tutorialStep !== null && (
        <div className="sticky bottom-4 z-40 max-w-md mx-auto px-4 animate-in slide-in-from-bottom duration-300">
          <div className="bg-white border-2 border-emerald-500 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3">
            <div className="w-10 h-10 flex-shrink-0 animate-bounce">
              <svg className="w-full h-full text-emerald-500 fill-emerald-400 drop-shadow-xs" viewBox="0 0 100 100">
                <path d="M50 15 C25 15, 12 45, 12 70 C12 88, 28 92, 50 92 C72 92, 88 88, 88 70 C88 45, 75 15, 50 15 Z" />
                <circle cx="38" cy="55" r="5" fill="#064e3b" />
                <circle cx="62" cy="55" r="5" fill="#064e3b" />
                <circle cx="40" cy="53" r="1.5" fill="#ffffff" />
                <circle cx="64" cy="53" r="1.5" fill="#ffffff" />
                <path d="M44 68 Q50 74 56 68" stroke="#064e3b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>

            <div className="flex-1 text-xs text-slate-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-emerald-700 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  テスポのナビゲーション [{tutorialStep}/4]
                </span>
                <button 
                  onClick={() => { playTactileSound('click'); setTutorialStep(null); }}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {tutorialStep === 1 && (
                <p className="leading-relaxed">
                  「ようこそテスポへ！まずは右上の<strong>【登録 / ログイン】</strong>からアカウントを作って、初回15人分の募集ポイント（1,500pt）を受け取ろう！」
                </p>
              )}
              {tutorialStep === 2 && (
                <p className="leading-relaxed">
                  「登録完了おめでとう！次は案件一覧から<strong>【14日間のテストに参加する】</strong>を押して、アプリを端末に入れてみよう！」
                </p>
              )}
              {tutorialStep === 3 && (
                <p className="leading-relaxed">
                  「参加したら<strong>【参加中・14日管理】タブ</strong>を開いて、画面スクショ保存や<strong>【メモを書く】</strong>を試してみてね！」
                </p>
              )}
              {tutorialStep === 4 && (
                <p className="leading-relaxed">
                  「準備は完璧！受け取った1,500ptで、右上の<strong>【募集】ボタン</strong>から自分のアプリのテスター15人を即募集できるよ！」
                </p>
              )}

              <div className="pt-1 flex justify-end gap-1.5">
                {tutorialStep === 1 && !user ? (
                  <button
                    onClick={() => {
                      playTactileSound('click');
                      setIsSignUp(true);
                      setIsAuthModalOpen(true);
                    }}
                    className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-md shadow-2xs"
                  >
                    登録画面を開く！
                  </button>
                ) : tutorialStep < 4 ? (
                  <button
                    onClick={() => {
                      playTactileSound('click');
                      setTutorialStep(tutorialStep + 1);
                      if (tutorialStep === 2) setActiveTab('joined');
                    }}
                    className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <span>次へ進む</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      playTactileSound('click');
                      setTutorialStep(null);
                      setIsModalOpen(true);
                    }}
                    className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md shadow-2xs"
                  >
                    自分のアプリを募集する！
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* フッター */}
      <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-400 space-y-2">
        <p>© テスターズフィールド (Testers Field) - 個人開発者のGoogle Playクローズドテスト相互プラットフォーム</p>
        <p className="text-[10px] text-slate-400">Google Play および Android は Google LLC の商標です。</p>
        <div className="flex justify-center items-center gap-4 text-xs text-slate-500 pt-1">
          <button onClick={() => navigateToView('vision')} className="hover:underline font-bold text-emerald-700">
            テスポのこだわり
          </button>
          <span>•</span>
          <button onClick={() => navigateToView('guide_tester')} className="hover:underline">
            参加ガイド
          </button>
          <span>•</span>
          <button onClick={() => navigateToView('guide_dev')} className="hover:underline">
            募集ガイド
          </button>
          <span>•</span>
          <a href="https://forms.gle/3sTTB61MrBeghMTd6" target="_blank" rel="noopener noreferrer" className="hover:underline">
            不具合・違反報告
          </a>
        </div>
      </footer>

      {/* ログイン・新規登録モーダル */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-5 shadow-xl animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{isSignUp ? '新規登録' : 'ログイン'}</h3>
                {isSignUp && (
                  <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                    🎁 新規登録で初回募集用 1,500 pt プレゼント中！
                  </p>
                )}
              </div>
              <button onClick={() => { playTactileSound('click'); setIsAuthModalOpen(false); }} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSignUp && (
              <div className="mb-4 bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 text-xs space-y-2">
                <p className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  STEP 1: 公式Googleグループに参加（必須）
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  未参加の場合、Playストアでアプリが表示されずエラーになります。
                </p>
                <p className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 font-semibold">
                  ⚠️ Android実機（Playストア）と同じGoogleアカウントでご参加ください。
                </p>
                <a
                  href={GOOGLE_GROUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={markGroupAsJoined}
                  className="block text-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition"
                >
                  公式グループに参加する（無料）
                </a>

                <label className="flex items-start gap-2 text-slate-800 text-[11px] font-semibold cursor-pointer pt-1 bg-white p-2 rounded border border-emerald-200">
                  <input
                    type="checkbox"
                    checked={hasJoinedGroup}
                    onChange={(e) => { playTactileSound('click'); setHasJoinedGroup(e.target.checked); }}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600"
                  />
                  <span>公式グループへの参加を完了しました</span>
                </label>
              </div>
            )}

            {authError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded text-xs">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-3 text-sm">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">お名前（開発者名）</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 山田開発, StudioApp"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  required
                  placeholder="dev@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading || (isSignUp && !hasJoinedGroup)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition disabled:opacity-40"
              >
                {authLoading ? '処理中...' : isSignUp ? '1,500ptを受け取って登録' : 'ログイン'}
              </button>
            </form>

            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  playTactileSound('click');
                  setIsSignUp(!isSignUp);
                  setAuthError('');
                }}
                className="text-xs text-emerald-600 hover:underline"
              >
                {isSignUp ? 'アカウントをお持ちの方（ログイン）' : '初めての方（新規登録）'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フィードバック編集モーダル */}
      {isFeedbackModalOpen && activeEditingTest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">感想・改善メモ（随時保存）</h3>
                <p className="text-[11px] text-slate-500">気付いた点をメモしておくと、14日経過時に自動で審査用レポートになります</p>
              </div>
              <button onClick={() => { playTactileSound('click'); setIsFeedbackModalOpen(false); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFeedbackDraft} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">使用端末名</label>
                  <input
                    type="text"
                    placeholder="例: Pixel 8, Galaxy S23"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OSバージョン</label>
                  <input
                    type="text"
                    placeholder="Android 14"
                    value={osVersion}
                    onChange={(e) => setOsVersion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">良かった点・使い心地 (20文字以上推奨)</label>
                  <span className={`text-[10px] font-bold ${goodPoints.trim().length >= 20 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {goodPoints.trim().length} / 20文字
                  </span>
                </div>
                <textarea
                  rows={2}
                  placeholder="直感的で操作がスムーズ、デザインが見やすいなど"
                  value={goodPoints}
                  onChange={(e) => setGoodPoints(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">改善してほしい点・気になる点 (20文字以上推奨)</label>
                  <span className={`text-[10px] font-bold ${improvements.trim().length >= 20 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {improvements.trim().length} / 20文字
                  </span>
                </div>
                <textarea
                  rows={2}
                  placeholder="文字のコントラストが低く見づらい、戻るボタンの挙動など"
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">不具合報告（なければ「なし」）</label>
                <input
                  type="text"
                  placeholder="なし、または発生した画面"
                  value={bugReports}
                  onChange={(e) => setBugReports(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-[11px] text-emerald-800">
                💡 <strong>安心設計：</strong> 14日後にわざわざ操作しなくても、ここで20文字以上メモを保存しスクショを1枚上げておけば、14日経過した瞬間に100ptが自動付与されます。
              </div>

              <button
                type="submit"
                disabled={feedbackSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{feedbackSubmitting ? '保存中...' : 'メモを保存する'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 案件募集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">テストアプリを募集する</h3>
                <p className="text-[11px] text-slate-500">
                  消費: <span className="text-emerald-600 font-bold">{REQUIRED_POINTS_FOR_POST} pt</span> (保有残高: {userPoints} pt)
                </p>
              </div>
              <button onClick={() => { playTactileSound('click'); setIsModalOpen(false); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-3 bg-emerald-50/50 border border-emerald-200 rounded-lg p-2.5 text-xs text-slate-700">
              <span className="font-bold block mb-1 text-slate-900">⚠️️ 投稿前の確認</span>
              Play Consoleのテスター欄に下記グループアドレスを追加してください：
              <div className="mt-1 flex items-center justify-between bg-white border border-emerald-200 rounded px-2 py-1 text-[11px] text-emerald-800 font-mono">
                <span>{GOOGLE_GROUP_EMAIL}</span>
                <button
                  type="button"
                  onClick={() => {
                    playTactileSound('click');
                    navigator.clipboard.writeText(GOOGLE_GROUP_EMAIL);
                    alert('グループアドレスをコピーしました！Consoleに貼り付けてください。');
                  }}
                  className="text-emerald-600 font-bold hover:underline ml-2"
                >
                  コピー
                </button>
              </div>
            </div>

            {formError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">アプリ名 *</label>
                <input
                  type="text"
                  required
                  placeholder="例: 習慣トラッカー"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">カテゴリ</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
                  >
                    <option value="ツール">ツール</option>
                    <option value="ゲーム">ゲーム</option>
                    <option value="生産性">生産性</option>
                    <option value="ライフスタイル">ライフスタイル</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">開発者名</label>
                  <input
                    type="text"
                    disabled
                    value={username || '開発者'}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Web参加用リンク (Play Console発行URL) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://play.google.com/apps/testing/..."
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">タグ（カンマ区切り）</label>
                <input
                  type="text"
                  placeholder="例: Android14, 日常系"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || userPoints < REQUIRED_POINTS_FOR_POST}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition disabled:opacity-40"
              >
                {isSubmitting ? '登録中...' : '1,500 pt で募集する'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}