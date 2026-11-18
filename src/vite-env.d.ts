/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Firebase 网页设定（在 Firebase 控制台 → 项目设定 → 你的应用 里可以找到） */
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
