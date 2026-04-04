type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}

interface TurnstileRenderOptions {
  sitekey: string;
  theme?: "auto" | "light" | "dark";
  callback?: (token: string) => void;
  "error-callback"?: (errorCode?: string) => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  appearance?: "always" | "execute" | "interaction-only";
  size?: "normal" | "flexible" | "compact";
  execution?: "render" | "execute";
}

interface Turnstile {
  render(
    container: string | HTMLElement,
    options: TurnstileRenderOptions,
  ): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
  execute(container?: string | HTMLElement): void;
}

declare interface Window {
  turnstile: Turnstile;
}
