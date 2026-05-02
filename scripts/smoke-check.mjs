import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function unique(values) {
  return [...new Set(values)];
}

const index = read('src/index.html');
const app = read('src/Renderer/app.js');
const modules = read('src/Renderer/modules.js');
const i18n = read('src/Renderer/i18n.js');
const auth = read('src/Renderer/auth.js');
const webApi = read('src/Renderer/web-api.js');
const mediaSearch = read('src/Renderer/mediaSearch.js');
const media = read('src/Renderer/media.js');
const settings = read('src/Renderer/settings.js');
const sw = read('src/sw.js');
const gitignore = read('.gitignore');

const manifestBlock = app.match(/const TAB_MANIFEST = \[([\s\S]*?)\];/);
expect(!!manifestBlock, 'TAB_MANIFEST exists in app.js');
const tabIds = manifestBlock ? unique([...manifestBlock[1].matchAll(/id:\s*'([^']+)'/g)].map(match => match[1])) : [];

expect(tabIds.length === 9, `TAB_MANIFEST has 9 tabs, found ${tabIds.length}`);

const navTabs = unique([...index.matchAll(/data-tab="([^"]+)"/g)].map(match => match[1]));
const panelIds = unique([...index.matchAll(/id="panel-([^"]+)"/g)].map(match => match[1]));
const moduleTabs = unique([...modules.matchAll(/type:\s*'tab',\s*tabName:\s*'([^']+)'/g)].map(match => match[1]));

for (const id of tabIds) {
  expect(navTabs.includes(id), `nav has data-tab="${id}"`);
  expect(panelIds.includes(id), `index.html has #panel-${id}`);
  expect(moduleTabs.includes(id), `MODULE_REGISTRY has tab.${id}`);
  expect(app.includes(`modId: 'tab.${id}'`), `TAB_MANIFEST maps ${id} to tab.${id}`);
}

expect(index.includes('id="sbarLangToggle"'), 'status bar language toggle exists');
expect(index.includes('onclick="toggleLang()"'), 'language toggles call toggleLang()');
expect(i18n.includes('function toggleLang()'), 'i18n.js exposes toggleLang()');
expect(i18n.includes('function updateLanguageToggles()'), 'i18n.js updates all language toggle labels');

expect(app.includes('function _findNavTab(name)'), 'go() has nav-tab fallback helper');
expect(app.includes('activeBtn = btn || _findNavTab(name)'), 'go() marks active tab when called without a button');
expect(app.includes("nav.querySelector('.nav-right')"), 'tab ordering keeps the utility nav cluster anchored');
expect(app.includes('nav.insertBefore(btn, utilityCluster)'), 'tab ordering inserts tabs before nav utilities');
expect(app.includes('function getPreferredStartTab()'), 'boot chooses a visible preferred start tab');
expect(app.includes('go(startTab)'), 'boot navigates through go(startTab)');

expect(index.includes('[dir="rtl"] nav { direction: ltr; }'), 'RTL keeps nav rail physically left-to-right');
expect(index.includes('[dir="rtl"] nav .tab { direction: rtl; }'), 'RTL still applies to tab label text');
expect(index.includes('.tab{order:1;'), 'tab buttons are displayed before utility nav controls');
expect(index.includes('.nav-right{order:2;'), 'utility nav controls are displayed after tab buttons');
expect(index.includes('class="hero-settings-btn"'), 'mobile has a Settings entry point for module controls');

const indexSwVersion = index.match(/const SW_VERSION = '([^']+)'/)?.[1];
const workerCache = sw.match(/const CACHE = '([^']+)'/)?.[1];
expect(indexSwVersion && workerCache && indexSwVersion === workerCache, `index SW_VERSION matches service worker cache (${indexSwVersion || 'missing'} vs ${workerCache || 'missing'})`);
expect(sw.includes("'/index.html'"), 'service worker precaches index.html');
expect(sw.includes("'/icons/icon-maskable.svg'"), 'service worker precaches maskable icon');
expect(sw.includes('networkFirst(e.request, \'/index.html\')'), 'service worker uses network-first navigation fallback');
expect(sw.includes("url.pathname === '/config.js'"), 'service worker does not cache runtime config');

const rendererScripts = unique([...index.matchAll(/<script src="\.\/(Renderer\/[^"]+\.js)"><\/script>/g)].map(match => `/${match[1]}`));
for (const script of rendererScripts) {
  expect(sw.includes(`'${script}'`), `service worker precaches ${script}`);
}

const clientSource = [auth, mediaSearch, index].join('\n');
expect(index.indexOf('<script src="./config.js"></script>') < index.indexOf('<script src="./Renderer/auth.js"></script>'), 'runtime config loads before auth.js');
expect(gitignore.includes('src/config.js'), 'runtime config file is gitignored');
expect(fs.existsSync(path.join(root, 'src/config.example.js')), 'safe runtime config example exists');
expect(!/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(clientSource), 'client source has no committed JWT-like tokens');
expect(!/const\s+(TMDB|RAWG)_KEY\s*=\s*['"][0-9a-f]{24,}['"]/i.test(clientSource), 'client source has no committed media API keys');
expect(!/supabaseAnonKey\s*:\s*['"]eyJ/i.test(clientSource), 'client source has no committed Supabase anon key');
expect(auth.includes('let sb = null'), 'auth starts without a Supabase client until config is validated');
expect(auth.includes('function requireSupabaseClient()'), 'auth blocks login when config is missing');
expect((auth.match(/subscribeToSync\(\);/g) || []).length >= 3, 'all auth entry points start sync after login');
expect(webApi.includes("has('token_hash')"), 'web auth callback handles token_hash redirects');
expect(webApi.includes("history.replaceState(null, '', window.location.pathname)"), 'web auth callback removes tokens from the URL');
expect(settings.includes('function isHexColor(value)'), 'custom theme colors are validated before restore');
expect(!media.includes("updateBF('${escapeAttr(b.id)}'"), 'game media edit handlers do not single-quote escaped ids');
expect(!index.includes('marked.min.js'), 'unused marked CDN script is not loaded');
expect(!/marked\.parse/.test(read('src/Renderer/community.js')), 'community markdown does not render unsanitized marked HTML');

if (failures.length) {
  console.error('Smoke check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Smoke check passed: ${tabIds.length} tabs, ${rendererScripts.length} renderer scripts, cache ${workerCache}.`);
