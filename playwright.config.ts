import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  webServer: {
    command: 'vite preview',
    port: 4173
  },
  testDir: 'tests',
  testMatch: /(.+\.)?(test)\.[jt]s/,
  fullyParallel: false
};

export default config;
