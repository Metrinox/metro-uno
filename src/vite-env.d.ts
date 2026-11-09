/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The online game server, e.g. wss://metro-uno-server.example.workers.dev. Online play is hidden when unset. */
  readonly VITE_SERVER_URL?: string;
}
