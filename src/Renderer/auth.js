'use strict';

/* ══ SUPABASE ══ */
const AOS_CONFIG = window.AOS_CONFIG || {};
const SUPABASE_URL = AOS_CONFIG.supabaseUrl || '';
const SUPABASE_KEY = AOS_CONFIG.supabaseAnonKey || '';

const IS_WEB = window.location.protocol === 'https:' || window.location.protocol === 'http:';
const AUTH_CONFIG_ERROR = 'App configuration is missing. Check Cloudflare AOS_SUPABASE_URL and AOS_SUPABASE_ANON_KEY.';
let sb = null;

if (!SUPABASE_URL || !SUPABASE_KEY || typeof supabase === 'undefined') {
  console.error('[auth] ' + AUTH_CONFIG_ERROR);
} else {
  try {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        detectSessionInUrl: IS_WEB
      }
    });
  } catch (err) {
    console.error('[auth] Failed to create Supabase client:', err);
  }
}

let currentUser  = null;
let currentProfile = null;
let authMode = 'login';

function requireSupabaseClient() {
  if (sb) return true;
  showAuthMsg(AUTH_CONFIG_ERROR, true);
  return false;
}

async function loadProfile() {
  if (!currentUser || !sb) return;
  const { data, error } = await sb
    .from('profiles')
    .select('username, avatar_url, country, display_name, font, theme, bio, is_public, share_fitness, share_food, share_projects, share_media')
    .eq('id', currentUser.id)
    .single();
  if (error && error.code !== 'PGRST116') console.warn('[auth] loadProfile failed:', error.message);
  currentProfile = data || {};
  if (typeof restoreAppearance === 'function') restoreAppearance();
  if (currentProfile.theme) { localStorage.setItem('aos_theme', currentProfile.theme); if (typeof applyTheme === 'function') applyTheme(currentProfile.theme); }
  if (currentProfile.font)  { localStorage.setItem('aos_font',  currentProfile.font);  if (typeof applyFont  === 'function') applyFont(currentProfile.font); }
}

function setAuthMode(mode, btn) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  eid('authBtn').textContent = mode === 'login' ? t('sign_in') : t('create_account');
  eid('authMsg').textContent = '';
  eid('countryField').style.display = mode === 'signup' ? '' : 'none';
}

async function doAuth() {
  if (!requireSupabaseClient()) return;

  const email = eid('authEmail').value.trim();
  const pass = eid('authPass').value;

  if (!email || !pass) {
    showAuthMsg(t('fill_both_fields'), true);
    return;
  }

  eid('authBtn').textContent = '...';
  eid('authBtn').disabled = true;

  let res;
  try {
    if (authMode === 'login') {
      res = await sb.auth.signInWithPassword({ email, password: pass });
    } else {
      res = await sb.auth.signUp({
        email,
        password: pass,
        options: {
          emailRedirectTo: IS_WEB ? window.location.origin : 'com.aal99816.aos://auth/callback'
        }
      });
    }
  } catch (err) {
    showAuthMsg(err?.message || 'Authentication failed. Please try again.', true);
    return;
  } finally {
    eid('authBtn').disabled = false;
    eid('authBtn').textContent = authMode === 'login' ? t('sign_in') : t('create_account');
  }

  if (res.error) {
    showAuthMsg(res.error.message, true);
    return;
  }

  if (authMode === 'signup' && !res.data.session) {
    showAuthMsg(t('check_email'), false);
    return;
  }

  currentUser = res.data.user;
  if (!currentUser) {
    showAuthMsg('Authentication did not return a user. Please try again.', true);
    return;
  }
  const country = authMode === 'signup' ? (eid('authCountry')?.value?.trim() || '') : '';
  await loadProfile();
  if (country) {
    await sb.from('profiles').upsert({ id: currentUser.id, country }, { onConflict: 'id' });
    if (!currentProfile) currentProfile = {};
    currentProfile.country = country;
  }
  eid('authScreen').classList.add('hidden');
  eid('userEmail').textContent = currentUser.email;
  localStorage.setItem('aos_user_exists', 'true');
  subscribeToSync();
  await bootApp();
}

function showAuthMsg(msg, isErr) {
  const el = eid('authMsg');
  el.textContent = msg;
  el.className = 'auth-msg ' + (isErr ? 'err' : 'ok');
}

function parseAuthCallbackUrl(url) {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
    const hashParams = new URLSearchParams(hash);
    const queryParams = parsed.searchParams;

    return {
      access_token: hashParams.get('access_token'),
      refresh_token: hashParams.get('refresh_token'),
      type: queryParams.get('type'),
      token_hash: queryParams.get('token_hash')
    };
  } catch (err) {
    console.error('Failed to parse auth callback URL:', err);
    return null;
  }
}

async function handleAuthDeepLink(url) {
  if (!requireSupabaseClient()) return;

  const parsed = parseAuthCallbackUrl(url);
  if (!parsed) return;

  if (parsed.access_token && parsed.refresh_token) {
    const { error } = await sb.auth.setSession({
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token
    });

    if (error) {
      console.error('Failed to set session from deep link:', error);
      showAuthMsg(t('signin_link_error'), true);
      return;
    }

    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      currentUser = user;
      await loadProfile();
      eid('authScreen').classList.add('hidden');
      eid('userEmail').textContent = currentUser.email;
      localStorage.setItem('aos_user_exists', 'true');
      subscribeToSync();
      await bootApp();
      toast(t('signin_success'));
    }

    return;
  }

  if (parsed.token_hash && parsed.type) {
    const { error } = await sb.auth.verifyOtp({
      token_hash: parsed.token_hash,
      type: parsed.type
    });

    if (error) {
      console.error('Failed to verify OTP from deep link:', error);
      showAuthMsg(t('email_verify_error'), true);
      return;
    }

    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      await loadProfile();
      eid('authScreen').classList.add('hidden');
      eid('userEmail').textContent = currentUser.email;
      localStorage.setItem('aos_user_exists', 'true');
      subscribeToSync();
      await bootApp();
      toast(t('email_confirmed'));
    }
  }
}

async function signOut() {
  if (sb) await sb.auth.signOut();
  currentUser = null;
  appBooted = false;
  document.body.classList.remove('app-ready');
  eid('authScreen').classList.remove('hidden');
  eid('authEmail').value = '';
  eid('authPass').value = '';
  eid('authMsg').textContent = '';
  eid('userEmail').textContent = '';
}

if (window.authBridge?.onDeepLink) {
  window.authBridge.onDeepLink(async (url) => {
    console.log('Received auth deep link:', url);
    await handleAuthDeepLink(url);
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  if (!sb) {
    showAuthMsg(AUTH_CONFIG_ERROR, true);
    const btn = eid('authBtn');
    if (btn) btn.disabled = true;
    return;
  }

  let session = null;
  try {
    ({ data: { session } } = await sb.auth.getSession());
  } catch (err) {
    console.error('[auth] Failed to restore session:', err);
    showAuthMsg('Could not restore your session. Please sign in again.', true);
    return;
  }
  if (session && session.user) {
    currentUser = session.user;
    await loadProfile();
    eid('authScreen').classList.add('hidden');
    eid('userEmail').textContent = currentUser.email;
    localStorage.setItem('aos_user_exists', 'true');
    subscribeToSync();
    await bootApp();
  }
});
