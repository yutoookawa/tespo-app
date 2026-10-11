import React from 'react';

export default function PrivacyPolicy() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif', lineHeight: '1.7', color: '#333' }}>
      <h1 style={{ fontSize: '24px', borderBottom: '2px solid #eee', paddingBottom: '12px' }}>
        プライバシーポリシー
      </h1>
      <p style={{ color: '#666', fontSize: '14px' }}>最終改定日: 2026年10月11日</p>

      <section style={{ marginTop: '24px' }}>
        <p>
          「テスターズフィールド - テスポ」（以下、「当サービス」といいます）は、ユーザーの皆様のプライバシーを尊重し、個人情報の管理に細心の注意を払っています。本プライバシーポリシーでは、当サービスにおける個人情報の取り扱い方針について説明します。
        </p>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '18px', borderLeft: '4px solid #0070f3', paddingLeft: '8px' }}>1. 取得する情報</h2>
        <p>当サービスでは、アカウント登録およびサービスの円滑な提供のため、以下の情報を取得する場合があります。</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li>アカウント認証情報（メールアドレス、パスワード等の認証識別子）</li>
          <li>サービス利用履歴および投稿内容</li>
        </ul>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '18px', borderLeft: '4px solid #0070f3', paddingLeft: '8px' }}>2. 利用目的</h2>
        <p>取得した情報は、以下の目的のために利用されます。</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li>ユーザー認証およびアカウント管理（Supabase等によるセキュアな認証管理）</li>
          <li>当サービスの提供、運営、保守および改善</li>
          <li>利用規約違反や不正アクセスの検知・防止</li>
        </ul>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '18px', borderLeft: '4px solid #0070f3', paddingLeft: '8px' }}>3. 情報の管理と安全対策</h2>
        <p>
          当サービスは、取り扱う個人情報の漏洩、滅失または毀損の防止その他の安全管理のために、SSL/TLSによる通信の暗号化をはじめとする必要かつ適切な措置を講じます。
        </p>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '18px', borderLeft: '4px solid #0070f3', paddingLeft: '8px' }}>4. 第三者提供について</h2>
        <p>
          当サービスは、法令に基づく場合を除き、ユーザーの同意を得ることなく第三者に個人情報を提供することはありません。
        </p>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '18px', borderLeft: '4px solid #0070f3', paddingLeft: '8px' }}>5. アカウントおよびデータの削除</h2>
        <p>
          ユーザーは、自身のアカウントおよび登録されたデータの削除を求めることができます。削除をご希望の場合は、下記のお問い合わせ先までご連絡ください。
        </p>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '18px', borderLeft: '4px solid #0070f3', paddingLeft: '8px' }}>6. お問い合わせ</h2>
        <p>
          本ポリシーに関するお問い合わせは、当サービスのサポート窓口までご連絡ください。
        </p>
      </section>
    </main>
  );
}