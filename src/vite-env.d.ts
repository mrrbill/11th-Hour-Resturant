/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Optional fixed public URL used in QR codes, e.g. https://11thhour.vercel.app */
  readonly VITE_PUBLIC_SITE_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
