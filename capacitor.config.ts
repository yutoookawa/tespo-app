import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.vercel.tespo',
  appName: 'テスターズフィールド',
  webDir: 'public',
  server: {
    // 公開中のVercel URL（Web側の更新がアプリにも自動反映されます）
    url: 'https://tespo-app.vercel.app',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;