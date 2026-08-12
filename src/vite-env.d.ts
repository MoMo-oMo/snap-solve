/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL of the optional Cloudflare Worker AI proxy — see worker/README.md. */
  readonly VITE_AI_SOLVE_ENDPOINT?: string;
  /** Shared secret sent as X-App-Secret; must match the Worker's APP_SHARED_SECRET. */
  readonly VITE_AI_SHARED_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
