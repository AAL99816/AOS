'use strict';

function showUpdateCard() {
  eid('updateCard').classList.remove('hidden');
}

function hideUpdateCard() {
  eid('updateCard').classList.add('hidden');
}

function dismissUpdateCard() {
  hideUpdateCard();
}

async function installUpdateNow() {
  if (window.updater) {
    await window.updater.install();
  }
}

if (window.updater) {
  window.updater.onEvent((msg) => {
    const title = eid('updateTitle');
    const sub = eid('updateSub');
    const wrap = eid('updateProgressWrap');
    const fill = eid('updateProgressFill');
    const text = eid('updateProgressText');
    const actions = eid('updateActions');

    showUpdateCard();

    if (msg.event === 'checking') {
      title.textContent = 'Checking for updates…';
      sub.textContent = 'Looking for a newer version of AOS.';
      wrap.classList.add('hidden');
      actions.classList.add('hidden');
    }

    if (msg.event === 'available') {
      title.textContent = `Update ${msg.version} available`;
      sub.textContent = 'Downloading in the background.';
      wrap.classList.remove('hidden');
      actions.classList.add('hidden');
      fill.style.transform = 'scaleX(0)';
      text.textContent = '0%';
    }

    if (msg.event === 'progress') {
      const pct = Math.round(msg.percent || 0);
      title.textContent = 'Downloading update…';
      sub.textContent = 'AOS is updating in the background.';
      wrap.classList.remove('hidden');
      actions.classList.add('hidden');
      fill.style.transform = `scaleX(${pct / 100})`;
      text.textContent = pct + '% downloaded';
    }

    if (msg.event === 'downloaded') {
      title.textContent = `Update ${msg.version} ready — restarting…`;
      sub.textContent = 'Installing update now. AOS will restart in 3 seconds.';
      wrap.classList.add('hidden');
      actions.classList.add('hidden');
      // Auto-install immediately — no user action required
      setTimeout(async () => {
        if (window.updater) await window.updater.install();
      }, 3000);
    }

    if (msg.event === 'not-available') {
      hideUpdateCard();
    }

    if (msg.event === 'error') {
      title.textContent = 'Update check failed';
      sub.textContent = msg.message || 'Something went wrong while checking for updates.';
      wrap.classList.add('hidden');
      actions.classList.add('hidden');
    }
  });
}
