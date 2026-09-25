export interface LucentTranslatePublicConfig {
  baseUrl: string;
  project: string;
  apiKey: string;
  defaultLocale: string;
  fallbackLocale: string;
  pollInterval: number;
  cookie: string | false;
}
