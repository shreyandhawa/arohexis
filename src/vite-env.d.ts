/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The commit the build came from; set by CI. */
  readonly VITE_BUILD_SHA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
