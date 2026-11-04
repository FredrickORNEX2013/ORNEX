import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AppConfig = {
  appName: string;
  primaryColor: string;
  accentColor: string;
  logoIcon: string;
  showTabs: string[];
};

const DEFAULT_CONFIG: AppConfig = {
  appName: 'ORNEX',
  primaryColor: '#000000',
  accentColor: '#ffffff',
  logoIcon: 'play',
  showTabs: ['foryou', 'explore', 'post', 'inbox', 'me'],
};

let cachedConfig: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  return cachedConfig || DEFAULT_CONFIG;
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(cachedConfig || DEFAULT_CONFIG);

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'app_config')
        .maybeSingle();
      if (data?.value) {
        const parsed = { ...DEFAULT_CONFIG, ...(data.value as Record<string, unknown>) } as AppConfig;
        cachedConfig = parsed;
        setConfig(parsed);
      }
    })();
  }, []);

  return config;
}

export function clearAppConfigCache() {
  cachedConfig = null;
}
