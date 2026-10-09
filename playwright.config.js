// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = 'http://127.0.0.1:4173';

module.exports = defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  expect: { timeout: 3000 },
  use: {
    baseURL: BASE_URL,
    // S10.d (L31): por defecto la suite corre sin la intro animada; los tests de S10 piden 'no-preference'.
    // En @playwright/test 1.56 reducedMotion no es una opción de test de primer nivel (se ignora en silencio):
    // solo llega al contexto vía contextOptions.
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
