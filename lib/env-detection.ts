export interface EnvDetectionResult {
  provider: 'google' | 'openai' | 'anthropic' | 'workers';
  isFromEnv: boolean;
  value: string;
  source: 'environment' | 'localStorage' | 'none';
}

function getEnvVar(key: string): string | undefined {
  const viteKey = `VITE_${key}`;
  const viteValue = (import.meta.env as any)[viteKey];
  if (viteValue) return viteValue;

  if (typeof process !== 'undefined' && process.env) {
    const processValue = (process.env as any)[key];
    if (processValue) return processValue;
  }

  return undefined;
}

export function detectApiKeySources(): Record<string, EnvDetectionResult> {
  const providers = [
    { provider: 'google' as const, envKey: 'GEMINI_API_KEY' },
    { provider: 'openai' as const, envKey: 'OPENAI_API_KEY' },
    { provider: 'anthropic' as const, envKey: 'ANTHROPIC_API_KEY' },
    { provider: 'workers' as const, envKey: 'WORKERS_AI_TOKEN' }
  ];

  const results: Record<string, EnvDetectionResult> = {};

  for (const { provider, envKey } of providers) {
    const envValue = getEnvVar(envKey);
    const localStorageKeys = JSON.parse(localStorage.getItem('metacogna_api_keys') || '{}');
    const localValue = localStorageKeys[provider];

    if (envValue) {
      results[provider] = { provider, isFromEnv: true, value: envValue, source: 'environment' };
    } else if (localValue) {
      results[provider] = { provider, isFromEnv: false, value: localValue, source: 'localStorage' };
    } else {
      results[provider] = { provider, isFromEnv: false, value: '', source: 'none' };
    }
  }

  return results;
}

export function getEffectiveApiKey(provider: string): string {
  const detection = detectApiKeySources()[provider];
  return detection?.value || '';
}
