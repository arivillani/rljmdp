// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// S12.b (L40): la misma suite corre contra dos sitios. `fuente` sirve la raíz del repo; `sitio-publicado` sirve el _site/
// minificado que arma `npm run build` (`npm test` lo arma antes, vía `pretest`) y que publica GitHub Pages.
const SOURCE_URL = 'http://127.0.0.1:4173';
const PUBLISHED_URL = 'http://127.0.0.1:4174';

// Compartido por los dos proyectos. S10.d (L31): por defecto la suite corre sin la intro animada; los tests de S10 piden
// 'no-preference'. En @playwright/test 1.56 reducedMotion no es una opción de test de primer nivel (se ignora en
// silencio): solo llega al contexto vía contextOptions, y se repite en cada proyecto para no depender de cómo se fusionan.
const shared = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1440, height: 900 },
  contextOptions: { reducedMotion: /** @type {'reduce'} */ ('reduce') },
};

module.exports = defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  expect: { timeout: 3000 },
  projects: [
    { name: 'fuente', use: { ...shared, baseURL: SOURCE_URL } },
    { name: 'sitio-publicado', use: { ...shared, baseURL: PUBLISHED_URL } },
  ],
  webServer: [
    { command: 'npm start', url: SOURCE_URL, reuseExistingServer: !process.env.CI },
    { command: 'npm run start:site', url: PUBLISHED_URL, reuseExistingServer: !process.env.CI },
  ],
});
