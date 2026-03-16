'use strict';

/* ══ SUPABASE ══ */
const SUPABASE_URL = 'https://kzsbpqbhogmribkumdui.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6c2JwcWJob2dtcmlia3VtZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzgzMDgsImV4cCI6MjA4OTAxNDMwOH0.5DLUeO-Q-HutYmQaOMnzrpPFob6bPLe5os28kq2VZ_k';

const IS_WEB = window.location.protocol === 'https:' || window.location.protocol === 'http:';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    detectSessionInUrl: IS_WEB
  }
});

let currentUser  = null;
let currentProfile = null;
let authMode = 'login';

async function loadProfile() {
  if (!currentUser) return;
  const { data } = await sb
    .from('profiles')
    .select('username, avatar_url, country, display_name, font, theme')
    .eq('id', currentUser.id)
    .single();
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
  const email = eid('authEmail').value.trim();
  const pass = eid('authPass').value;

  if (!email || !pass) {
    showAuthMsg(t('fill_both_fields'), true);
    return;
  }

  eid('authBtn').textContent = '...';
  eid('authBtn').disabled = true;

  let res;
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

  eid('authBtn').disabled = false;
  eid('authBtn').textContent = authMode === 'login' ? t('sign_in') : t('create_account');

  if (res.error) {
    showAuthMsg(res.error.message, true);
    return;
  }

  if (authMode === 'signup' && !res.data.session) {
    showAuthMsg(t('check_email'), false);
    return;
  }

  currentUser = res.data.user;
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
      eid('authScreen').classList.add('hidden');
      eid('userEmail').textContent = currentUser.email;
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
      eid('authScreen').classList.add('hidden');
      eid('userEmail').textContent = currentUser.email;
      await bootApp();
      toast(t('email_confirmed'));
    }
  }
}

async function signOut() {
  await sb.auth.signOut();
  currentUser = null;
  appBooted = false;
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
  const { data: { session } } = await sb.auth.getSession();
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
