/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly STARLIGHT_ENABLED: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
