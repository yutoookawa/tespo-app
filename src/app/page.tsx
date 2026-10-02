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
  Award,
  Save
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// --- Web Audio API（YouTube/ゲーム標準音量にブースト） ---
const playHapticSound = async (type: 'click' | 'success' | 'tab' | 'slime' = 'click') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'slime') {
      // ぷよん！という弾力スライム音（音量強化）
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.16);
      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'click') {
      // YouTube/Netflix操作音に近いしっかりしたクリック音
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.05);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'tab') {
      // タブ切り替え音
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.06);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'success') {
      // 承認・受取時のリッチチャイム
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.start(now);
      osc.stop(now + 0.26);
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
  developer: "テスターズフィールド運営",
  required_testers: 15,
  current_testers: 13,
  reward_points: 100,
  tags: ["操作体験用", "14日間維持", "審査レポート自動生成"],
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
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSlimeBouncing, setIsSlimeBouncing] = useState(false);
  
  // モーダル
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeManualModal, setActiveManualModal] = useState<'about' | 'dev' | 'tester' | 'terms' | null>(null);
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

  // レビュー下書き・編集フォーム（初日から随時編集可能）
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
    } catch (err) {
      console.error('プロファイル取得エラー:', err);
    }
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

        // 14日経過した案件の自動完了チェック（14日経過＋スクショ＋20文字以上入力で自動完了）
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
    } catch (err) {
      console.error('データ取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const markGroupAsJoined = () => {
    playHapticSound('success');
    setIsGroupJoinedState(true);
    localStorage.setItem('tf_group_joined', 'true');
  };

  const handleSlimeClick = () => {
    playHapticSound('slime');
    setIsSlimeBouncing(true);
    setTimeout(() => setIsSlimeBouncing(false), 500);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (isSignUp) {
        if (!authUsername.trim()) {
          throw new Error('お名前（ニックネーム）を入力してください');
        }

        if (!hasJoinedGroup) {
          throw new Error('公式Googleグループへの参加確認にチェックを入れてください');
        }

        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', authUsername.trim())
          .maybeSingle();

        if (existingUser) {
          throw new Error('このお名前は既に使用されています。');
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
          playHapticSound('success');
          alert('🎉 登録完了しました！初回募集用の 1,500 pt をプレゼントしました！');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        playHapticSound('click');
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
    playHapticSound('click');
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

      playHapticSound('success');
      setName('');
      setTagsInput('');
      setTestUrl('');
      setIsModalOpen(false);
      setActiveTab('my_apps');
    } catch (err: any) {
      setFormError('募集の投稿に失敗しました: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMyApp = async (app: AppItem) => {
    playHapticSound('click');
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

      playHapticSound('success');
      alert(`募集を取り下げました。${refundPoints} pt が返還されました。`);
    } catch (err) {
      alert('削除に失敗しました。');
    }
  };

  const handleJoinTest = async (app: AppItem) => {
    playHapticSound('click');

    if (app.id === -999) {
      alert('💡 これは操作体験用の公式サンプルです。\n実際のアプリでは、インストール＆14日間維持しながらメモを書いておくことで100ptを獲得できます！');
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

      playHapticSound('success');
      if (app.test_url) {
        window.open(app.test_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert('参加処理でエラーが発生しました');
    }
  };

  // スクショ1枚提出（1日目・中間・最終日のどこでも1回アップロードすればOK）
  const handleSingleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>, participationId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTarget(participationId);
    playHapticSound('click');

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `proofs/${participationId}_single_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('task-proofs').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('task-proofs').getPublicUrl(filePath);

      await supabase.from('test_participations').update({ screenshot_day1: publicUrlData.publicUrl }).eq('id', participationId);

      setMyTests(myTests.map((t) => t.id === participationId ? { ...t, screenshot_day1: publicUrlData.publicUrl } : t));
      playHapticSound('success');
      alert('起動スクショを保存しました！');
    } catch (err: any) {
      alert('アップロード失敗: ' + err.message);
    } finally {
      setUploadingTarget(null);
    }
  };

  // フィードバックの開閉（初日からいつでも編集可能）
  const openFeedbackEditor = (t: Participation) => {
    playHapticSound('click');
    setActiveEditingTest(t);
    setDeviceModel(t.device_model || '');
    setOsVersion(t.os_version || 'Android 14');
    setGoodPoints(t.good_points || '');
    setImprovements(t.improvements || '');
    setBugReports(t.bug_reports || '');
    setIsFeedbackModalOpen(true);
  };

  // 下書き保存（いつでも保存可能）
  const handleSaveFeedbackDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEditingTest || !user) return;

    setFeedbackSubmitting(true);
    playHapticSound('click');

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
        playHapticSound('success');
        alert(`🎉 14日間維持＆レビュー要件達成！\n報酬として ${REWARD_PER_TEST} pt を付与しました！`);
      } else {
        playHapticSound('success');
        alert('メモ・フィードバックを保存しました！（期間中いつでも編集・追記できます）');
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
    } catch (err: any) {
      alert('保存エラー: ' + err.message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleCopyReviewText = (appId: number) => {
    playHapticSound('click');
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
    playHapticSound('success');
    alert('📋 Play Console 審査用の回答テキストをコピーしました！申請画面に貼り付けてご利用ください。');
  };

  const handleShareOnX = () => {
    playHapticSound('click');
    const shareText = `Google Playの14日間クローズドテスト、テスターズフィールド（テスポ）で進行中！\n相互テストで15人確保＆審査用の感想レポートも自動作成できる無料Webです🤝\n#個人開発 #GooglePlay #Androidアプリ開発`;
    const shareUrl = "https://tespo-app.vercel.app";
    const twitterIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterIntent, '_blank', 'noopener,noreferrer');
  };

  const myCreatedApps = user ? apps.filter((a) => a.user_id === user.id) : [];
  const displayedApps = apps.length > 0 ? apps : [DEMO_SAMPLE_APP];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans">
      <div>
        {/* ヘッダー */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-emerald-100 px-4 py-2.5 shadow-xs">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => { playHapticSound('tab'); setIsMenuOpen(true); }}
                className="p-1 -ml-1 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition"
                title="メニューを開く"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* ぷよんと跳ねるテスポスライム */}
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
                  onClick={() => {
                    playHapticSound('click');
                    setIsSignUp(true);
                    setIsAuthModalOpen(true);
                  }}
                  className="text-xs text-emerald-700 hover:bg-emerald-50 border border-emerald-300 bg-emerald-50/40 px-2.5 py-1.5 rounded-full font-bold transition shadow-2xs"
                >
                  <LogIn className="w-3 h-3 inline mr-1 text-emerald-600" />
                  <span>登録 / ログイン</span>
                </button>
              )}

              <button
                onClick={() => {
                  playHapticSound('click');
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

        {/* 左スライドメニュー */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex">
            <div className="bg-white w-72 h-full border-r border-slate-200 shadow-2xl flex flex-col justify-between p-5 animate-in slide-in-from-left duration-200">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <span className="text-emerald-600 font-extrabold">テスポ</span>
                    <span>公式メニュー</span>
                  </div>
                  <button onClick={() => { playHapticSound('click'); setIsMenuOpen(false); }} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-1 text-emerald-800 font-bold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>他社ツール（TestCrew等）との併用</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    途中のテスター離脱による14日リセットを防ぐため、テスポを「人数のバックアップ＆審査用の20文字エビデンス確保」として同時に走らせる開発者が増えています。
                  </p>
                </div>

                <div className="space-y-1 text-xs font-medium text-slate-700">
                  <button
                    onClick={() => { playHapticSound('click'); setIsMenuOpen(false); setActiveManualModal('about'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-emerald-50/60 hover:text-emerald-700 transition text-left"
                  >
                    <Info className="w-4 h-4 text-emerald-600" />
                    <span>テスターズフィールドとは？</span>
                  </button>
                  <button
                    onClick={() => { playHapticSound('click'); setIsMenuOpen(false); setActiveManualModal('dev'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-emerald-50/60 hover:text-emerald-700 transition text-left"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>開発者マニュアル（審査申請手順）</span>
                  </button>
                  <button
                    onClick={() => { playHapticSound('click'); setIsMenuOpen(false); setActiveManualModal('terms'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-emerald-50/60 hover:text-emerald-700 transition text-left"
                  >
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>利用規約 / ルール</span>
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
                <p className="text-[10px] text-slate-400 text-center">Version 2.3</p>
              </div>
            </div>
            <div className="flex-1" onClick={() => { playHapticSound('click'); setIsMenuOpen(false); }} />
          </div>
        )}

        <div className="max-w-md mx-auto px-4 pt-3 space-y-3">
          
          {/* コンパクト化：保有ポイント ＆ グループ参加ステータス */}
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

          {/* 3ステップ使い方ガイド */}
          <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden shadow-2xs">
            <button
              onClick={() => { playHapticSound('tab'); setIsGuideOpen(!isGuideOpen); }}
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
                  <p><strong>アプリを募集する</strong>（初回付与の1,500ptで即座に15人分の募集が可能）</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <p><strong>他のアプリを14日間テスト</strong>しながらスクショ1枚＆感想メモを保存しておけば、14日後に自動で100pt獲得！</p>
                </div>
              </div>
            )}
          </div>

          {/* タブナビゲーション */}
          <div className="grid grid-cols-3 gap-1 bg-emerald-100/60 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => { playHapticSound('tab'); setActiveTab('explore'); }}
              className={`py-2 rounded-lg transition ${
                activeTab === 'explore'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200/60'
                  : 'hover:text-emerald-900'
              }`}
            >
              探す・参加 ({displayedApps.length})
            </button>
            <button
              onClick={() => { playHapticSound('tab'); setActiveTab('joined'); }}
              className={`py-2 rounded-lg transition ${
                activeTab === 'joined'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200/60'
                  : 'hover:text-emerald-900'
              }`}
            >
              参加中・14日管理 ({myTests.length})
            </button>
            <button
              onClick={() => { playHapticSound('tab'); setActiveTab('my_apps'); }}
              className={`py-2 rounded-lg transition ${
                activeTab === 'my_apps'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200/60'
                  : 'hover:text-emerald-900'
              }`}
            >
              自分の案件 ({myCreatedApps.length})
            </button>
          </div>

          {/* タブ1: 募集中のアプリ一覧 */}
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
                  const progress = Math.min(
                    100,
                    Math.round((app.current_testers / app.required_testers) * 100)
                  );
                  const isJoined = myTests.some((t) => t.app_id === app.id);
                  const isMyCreated = user && app.user_id === user.id;

                  return (
                    <div
                      key={app.id}
                      className={`bg-white rounded-xl p-4 border shadow-xs flex flex-col justify-between transition ${
                        isDemo ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-emerald-100/90 hover:border-emerald-300'
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
                              <span>操作体験・参加方法を確認する</span>
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

          {/* タブ2: 参加中（スクショ1回＋いつでもメモ編集＋14日自動受取） */}
          {activeTab === 'joined' && (
            <div className="space-y-3 pt-1">
              {myTests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-emerald-100 text-slate-500 p-6">
                  <p className="text-xs">現在参加中のテストはありません。</p>
                  <button
                    onClick={() => { playHapticSound('tab'); setActiveTab('explore'); }}
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

                      {/* スクショ1回＆いつでもメモ記入のスマート設計 */}
                      <div className="bg-emerald-50/40 p-3 rounded-lg border border-emerald-100 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-emerald-600" />
                            <span>起動スクショ（期間中に1枚だけでOK）</span>
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
                            onClick={() => openFeedbackEditor(t)}
                            className="text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-md transition shadow-2xs flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{hasReview ? 'メモを確認・編集' : 'メモを書く'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1 text-xs">
                        <span className="text-slate-500 text-[11px]">
                          {isCompleted 
                            ? '100pt 受取完了' 
                            : days >= 14 
                              ? (hasScreenshot && hasReview ? '14日達成！自動付与完了' : 'スクショまたはメモを完成させてください')
                              : `あと ${14 - days} 日間端末に保持（14日経過で自動付与）`}
                        </span>

                        {isCompleted ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            獲得完了
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-medium">
                            保持追跡中
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* タブ3: 自分が募集したアプリ */}
          {activeTab === 'my_apps' && (
            <div className="space-y-3 pt-1">
              {myCreatedApps.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-emerald-100 text-slate-500 p-6">
                  <p className="text-xs">あなたが募集中のアプリはありません。</p>
                  <button
                    onClick={() => {
                      playHapticSound('click');
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
      </div>

      {/* フッター */}
      <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-400 space-y-2">
        <p>© テスターズフィールド (Testers Field) - 個人開発者のGoogle Playクローズドテスト相互プラットフォーム</p>
        <p className="text-[10px] text-slate-400">Google Play および Android は Google LLC の商標です。</p>
        <div className="flex justify-center items-center gap-4 text-xs text-slate-500 pt-1">
          <button onClick={() => { playHapticSound('tab'); setActiveManualModal('terms'); }} className="hover:underline">
            利用規約
          </button>
          <span>•</span>
          <button onClick={() => { playHapticSound('tab'); setActiveManualModal('about'); }} className="hover:underline">
            サービス概要
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
              <button onClick={() => { playHapticSound('click'); setIsAuthModalOpen(false); }} className="text-slate-400 hover:text-slate-600 p-1">
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
                    onChange={(e) => { playHapticSound('click'); setHasJoinedGroup(e.target.checked); }}
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
                  playHapticSound('tab');
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

      {/* いつでも下書き・追記できるフィードバックモーダル */}
      {isFeedbackModalOpen && activeEditingTest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">感想・改善メモ（随時保存）</h3>
                <p className="text-[11px] text-slate-500">気付いた点をメモしておくと、14日経過時に自動で審査用レポートになります</p>
              </div>
              <button onClick={() => { playHapticSound('click'); setIsFeedbackModalOpen(false); }} className="text-slate-400 hover:text-slate-600">
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
              <button onClick={() => { playHapticSound('click'); setIsModalOpen(false); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-3 bg-emerald-50/50 border border-emerald-200 rounded-lg p-2.5 text-xs text-slate-700">
              <span className="font-bold block mb-1 text-slate-900">⚠️ 投稿前の確認</span>
              Play Consoleのテスター欄に下記グループアドレスを追加してください：
              <div className="mt-1 flex items-center justify-between bg-white border border-emerald-200 rounded px-2 py-1 text-[11px] text-emerald-800 font-mono">
                <span>{GOOGLE_GROUP_EMAIL}</span>
                <button
                  type="button"
                  onClick={() => {
                    playHapticSound('click');
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

      {/* サービス概要・マニュアル・利用規約モーダル */}
      {activeManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-5 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {activeManualModal === 'about' && 'テスターズフィールドの設計思想'}
                {activeManualModal === 'dev' && '審査申請手順（Play Console連携）'}
                {activeManualModal === 'terms' && '利用規約 / 免責事項'}
              </h3>
              <button onClick={() => { playHapticSound('click'); setActiveManualModal(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeManualModal === 'about' && (
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p><strong className="text-slate-900">審査官を納得させる「証拠」を自動生成：</strong><br />Google Playの審査では「テスターを集めたか」だけでなく「フィードバックを得て修正したか」が厳しく問われます。テスポは20文字以上の具体的な意見を必須にし、Play Consoleにそのまま貼れるレポートをワンタップで作成します。</p>
                <p><strong className="text-slate-900">相互テストの煩わしさをゼロに：</strong><br />「お返しのプレッシャー」やDMでの個別対応を廃止。共通ポイントプールで自律的に助け合う仕組みです。</p>
              </div>
            )}

            {activeManualModal === 'dev' && (
              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <p>1. Play Console &gt; クローズドテスト &gt; テスターに <span className="font-mono text-emerald-700 font-bold">{GOOGLE_GROUP_EMAIL}</span> を追加</p>
                <p>2. Webテスター参加リンクを取得してテスポに投稿</p>
                <p>3. 14日経過後、「審査申請用フィードバックをコピー」ボタンでエビデンスを生成し、Consoleの申請フォームに貼り付けて本番公開を申請</p>
              </div>
            )}

            {activeManualModal === 'terms' && (
              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <p>・即時アンインストールやテスト放置、サボり行為はアカウント停止およびポイント没収の対象となります。</p>
                <p>・当サービスはGoogle LLCとの提携関係にはありません。審査通過を保証するものではありません。</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}