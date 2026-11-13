import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AppConfig = {
  appName: string;
  primaryColor: string;
  accentColor: string;
  logoIcon: string;
  showTabs: string[];
};

const MAIN_TABS = ['foryou', 'explore', 'post', 'inbox', 'me'];
const DEFAULT_CONFIG: AppConfig = {
  appName: 'ORNEX',
  primaryColor: '#000000',
  accentColor: '#D61E2B',
  logoIcon: 'play',
  showTabs: MAIN_TABS,
};

const BRAND_COLORS = new Set(['#000000', '#FFFFFF', '#D61E2B']);
let cachedConfig: AppConfig | null = null;

function normalizeConfig(value: Record<string, unknown>): AppConfig {
  const parsed = { ...DEFAULT_CONFIG, ...value } as AppConfig;
  return {
    ...parsed,
    primaryColor: BRAND_COLORS.has(parsed.primaryColor?.toUpperCase()) ? parsed.primaryColor : DEFAULT_CONFIG.primaryColor,
    accentColor: BRAND_COLORS.has(parsed.accentColor?.toUpperCase()) ? parsed.accentColor : DEFAULT_CONFIG.accentColor,
    appName: 'ORNEX',
    showTabs: MAIN_TABS,
  };
}

export function getAppConfig(): AppConfig {
  return cachedConfig || DEFAULT_CONFIG;
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(cachedConfig || DEFAULT_CONFIG);

  useEffect(() => {
    let cancelled = false;
    if (cachedConfig) {
      setConfig(cachedConfig);
      return () => { cancelled = true; };
    }

    const loadConfig = async () => {
      try {
        const { data, error } = await supabase.from('app_settings').select('*').eq('key', 'app_config').maybeSingle();
        if (error) throw error;
        if (data?.value) {
          cachedConfig = normalizeConfig(data.value as Record<string, unknown>);
          if (!cancelled) setConfig(cachedConfig);
        }
      } catch {
        if (!cancelled) setConfig(cachedConfig || DEFAULT_CONFIG);
      }
    };

    void loadConfig();
    return () => { cancelled = true; };
  }, []);

  return config;
}

export function clearAppConfigCache() {
  cachedConfig = null;
}
