import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const readIfExists = file => {
  const fullPath = path.join(root, file);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
};
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
const community = read('src/Renderer/community.js');
const settings = read('src/Renderer/settings.js');
const sync = read('src/Renderer/sync.js');
const state = read('src/Renderer/state.js');
const fitness = read('src/Renderer/fitness.js');
const food = read('src/Renderer/food.js');
const sqlBundle = [
  readIfExists('LOCAL_SQL_CHANGES.sql'),
  readIfExists('supabase/migrations/20260503_food_products.sql'),
  readIfExists('supabase/migrations/20260503_community_posts.sql')
].join('\n');
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
expect(!/marked\.parse/.test(community), 'community markdown does not render unsanitized marked HTML');

expect(sync.includes(".from('public_profiles')"), 'community public profile reads use public_profiles view');
expect(!sync.includes(".select('*, profiles("), 'community feed no longer embeds raw profiles');
expect(!/from\('exercise_catalog'\)\s*\.\s*upsert/.test(sync), 'client no longer writes exercise_catalog');
expect(sync.includes("sb.from('project_tasks').upsert") && sync.includes("{ onConflict: 'user_id,app_id' }"), 'project task upserts use user_id,app_id conflict target');
expect(sync.includes("sb.from('focus_items').upsert(rows, { onConflict: 'user_id,app_id' })"), 'focus item upserts use user_id,app_id conflict target');

expect(state.includes('activeWorkoutDrafts:{}'), 'default state includes active workout drafts');
expect(state.includes('function normalizeWorkoutDrafts'), 'active workout drafts normalize on load');
expect(state.includes('function normalizeLoggedSets'), 'workout history normalizes loggedSets');
expect(state.includes('restBeforeSecs'), 'workout set state preserves restBeforeSecs');
expect(fitness.includes('function scheduleDraftSave()'), 'fitness drafts use a separate draft save debounce');
expect(fitness.includes('function startWorkoutDraft'), 'workout cards can start an active draft');
expect(fitness.includes('function finishWorkoutDraft'), 'active workout drafts can be finished');
expect(fitness.includes('function discardWorkoutDraft'), 'active workout drafts can be discarded');
expect(fitness.includes('function logWorkoutSet'), 'fitness logs individual sets into the draft');
expect(fitness.includes("_exercisePickerCtx = { mode: mode === 'replace'"), 'exercise picker tracks add vs replace context');
expect(fitness.includes('function moveEx'), 'workout card exercises can be reordered');
expect(index.includes('.workout-set-grid'), 'fitness set logger has responsive CSS');

if (sqlBundle.trim()) {
  expect(sqlBundle.includes('create table if not exists public.food_products'), 'food products migration creates canonical product table');
  expect(sqlBundle.includes('create table if not exists public.food_product_submissions'), 'food products migration creates submissions table');
  expect(sqlBundle.includes('create table if not exists public.app_admins'), 'food products migration creates app_admins');
  expect(sqlBundle.includes('grant select on table public.food_products'), 'food product tables explicitly grant client privileges behind RLS');
  expect(sqlBundle.includes("execute 'drop table public.community_foods'"), 'food migration retires legacy community_foods');
}
expect(food.includes(".from('food_products')"), 'food search reads canonical food_products');
expect(food.includes(".from('food_product_submissions')"), 'food submissions use food_product_submissions');
expect(food.includes(".from('app_admins')"), 'food admin view checks app_admins');
expect(!food.includes(".from('community_foods')"), 'food code no longer reads or writes community_foods');
expect(food.includes('function _rankFoodSearchRows'), 'food search uses weighted ranking');
expect(food.includes('sourceProductId'), 'custom foods keep product provenance as sourceProductId');
expect(index.includes('id="foodAdminSubmissions"'), 'Food tab contains admin pending submissions mount');
expect(index.includes('id="mfeeCountry"'), 'My Foods editor captures country code');
expect(index.includes('id="mfeeServingGrams"'), 'My Foods editor captures serving grams');
expect(index.includes('id="mfeeBarcode"'), 'My Foods editor stores barcode for later scanner support');

if (sqlBundle.trim()) {
  expect(sqlBundle.includes('create table if not exists public.community_posts'), 'community migration creates posts table');
  expect(sqlBundle.includes('create table if not exists public.follow_requests'), 'community migration creates follow requests');
  expect(sqlBundle.includes('create table if not exists public.content_reports'), 'community migration creates content reports');
  expect(sqlBundle.includes('create view public.community_visible_profiles'), 'community migration creates visible profile view');
  expect(sqlBundle.includes('create view public.community_requestable_profiles'), 'community migration creates requestable profile view');
  expect(sqlBundle.includes('create or replace function public.aos_request_follow'), 'community migration routes follow requests through a database function');
  expect(sqlBundle.includes('community_follows_insert_public_target'), 'community migration blocks direct follows to private profiles');
  expect(sqlBundle.includes('on public.community_posts for delete'), 'community posts are deleted, not edited');
}
expect(sync.includes(".from('community_posts')"), 'sync reads/writes community_posts');
expect(sync.includes(".from('follow_requests')"), 'sync handles follow_requests');
expect(sync.includes(".from('content_reports')"), 'sync handles content_reports');
expect(sync.includes("sb.rpc('aos_request_follow'"), 'sync uses RPC for public follows and private follow requests');
expect(sync.includes(".from('community_requestable_profiles')"), 'sync can find private profiles without exposing email');
expect(sync.includes('async function toggleCommunityPostLike'), 'sync can like and unlike community posts');
expect(sync.includes('async function loadCommunityPostComments'), 'sync can load community post comments');
expect(community.includes('function _buildPostsFeedView'), 'community feed renders accountability posts');
expect(community.includes('function _buildPostsDiscoverView'), 'community discover renders public posts');
expect(community.includes('function openProgressPicker'), 'community composer can attach progress cards');
expect(community.includes('function reviewFollowRequest'), 'community profile can review follow requests');
expect(community.includes('function togglePostLike'), 'community posts expose like interactions');
expect(community.includes('function togglePostComments'), 'community posts expose comments');
expect(community.includes('_communityPendingFollows'), 'community UI tracks pending private follow requests');

if (failures.length) {
  console.error('Smoke check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Smoke check passed: ${tabIds.length} tabs, ${rendererScripts.length} renderer scripts, cache ${workerCache}.`);
