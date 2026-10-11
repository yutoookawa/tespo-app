import React from 'react';

export default function PrivacyPolicy() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif', lineHeight: '1.7', color: '#333' }}>
      <h1 style={{ fontSize: '24px', borderBottom: '2px solid #eee', paddingBottom: '12px' }}>
        プライバシーポリシーおよびアカウント・データ削除について
      </h1>
      <p style={{ color: '#666', fontSize: '14px' }}>最終改定日: 2026年10月11日</p>

      <section style={{ marginTop: '24px' }}>
        <p>
          「テスターズフィールド - テスポ」（以下、「当サービス」といいます）は、ユーザーの皆様のプライバシーを尊重し、個人情報の管理に細心の注意を払っています。
        </p>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '18px', borderLeft: '4px solid #0070f3', paddingLeft: '8px' }}>1. 取得する情報</h2>
        <ul style={{ paddingLeft: '20px' }}>
          <li>アカウント認証情報（メールアドレス、パスワード等の認証識別子）</li>
          <li>サービス利用履歴および投稿内容</li>
        </ul>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '18px', borderLeft: '4px solid #0070f3', paddingLeft: '8px' }}>2. 利用目的</h2>
        <ul style={{ paddingLeft: '20px' }}>
          <li>ユーザー認証およびアカウント管理（Supabase等によるセキュアな認証管理）</li>
          <li>当サービスの提供、運営、保守および改善</li>
        </ul>
      </section>

      <section style={{ marginTop: '24px', backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '18px', borderLeft: '4px solid #e00', paddingLeft: '8px', color: '#d00' }}>
          3. アカウントおよび関連データの削除リクエスト手順
        </h2>
        <p>
          「テスターズフィールド - テスポ」のアカウントおよび登録されたすべてのデータの削除を希望される場合は、以下の手順で申請いただけます。
        </p>
        <ol style={{ paddingLeft: '20px', marginTop: '8px' }}>
          <li>
            当サービスの通報・お問い合わせ用フォーム（または登録メールアドレス）より、「アカウント削除希望」とご連絡ください。
          </li>
          <li>ご本人確認が完了次第、アカウントおよび関連データを速やかに削除いたします。</li>
        </ol>
        
        <h3 style={{ fontSize: '16px', marginTop: '12px' }}>【削除されるデータ】</h3>
        <ul style={{ paddingLeft: '20px' }}>
          <li>登録メールアドレス、認証識別子</li>
          <li>ユーザーが投稿したテスト情報、フィードバック等のすべてのデータ</li>
        </ul>

        <h3 style={{ fontSize: '16px', marginTop: '12px' }}>【データの保持期間】</h3>
        <p>
          削除申請の受領後、原則として30日以内にデータベースから完全に消去されます。法令遵守等のために保持が義務付けられているデータを除き、事後保持される個人データはありません。
        </p>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '18px', borderLeft: '4px solid #0070f3', paddingLeft: '8px' }}>4. お問い合わせ先</h2>
        <p>
          アカウント削除や個人情報に関するお問い合わせは、アプリ内の報告フォームよりご連絡ください。
        </p>
      </section>
    </main>
  );
}