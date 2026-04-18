'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// modules.js — Module registry + visibility system
//
// Each module maps to a UI element that can be shown/hidden.
// S.modules = { [id]: boolean } — stored in state, survives reload.
// applyModules() reads S.modules and shows/hides everything accordingly.
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_REGISTRY = [
  // ── Navigation tabs ──────────────────────────────────────────
  {
    id: 'tab.fitness',   group: 'Navigation', label: 'Fitness',
    desc: 'Workout cards, exercise logging, weight, cardio',
    type: 'tab', tabName: 'fitness', default: true
  },
  {
    id: 'tab.food',      group: 'Navigation', label: 'Food',
    desc: 'Food diary, calorie tracking, meal plans',
    type: 'tab', tabName: 'food', default: true
  },
  {
    id: 'tab.projects',  group: 'Navigation', label: 'Projects',
    desc: 'Tasks, deadlines, project notes',
    type: 'tab', tabName: 'projects', default: true
  },
  {
    id: 'tab.media',     group: 'Navigation', label: 'Media',
    desc: 'Books, shows, films, games, albums',
    type: 'tab', tabName: 'media', default: true
  },
  {
    id: 'tab.focus',     group: 'Navigation', label: 'Focus',
    desc: 'Focus timer (Pomodoro), focus items',
    type: 'tab', tabName: 'focus', default: true
  },
  {
    id: 'tab.notes',     group: 'Navigation', label: 'Notes',
    desc: 'Free-form notes organised by topic, linkable to other tabs',
    type: 'tab', tabName: 'notes', default: true
  },
  {
    id: 'tab.community', group: 'Navigation', label: 'Community',
    desc: 'Public profiles, activity feed, discover people, community notes',
    type: 'tab', tabName: 'community', default: true
  },

  // ── Today dashboard sections ──────────────────────────────────
  {
    id: 'today.quicklog',  group: 'Today', label: 'Quick Exercise Log',
    desc: 'Log your last exercises directly from the Today page',
    type: 'section', sectionId: 'todayQuickLogSection', default: true
  },
  {
    id: 'today.nextup',    group: 'Today', label: 'Next Up Task',
    desc: 'Shows the first incomplete task from your active projects',
    type: 'section', sectionId: 'todayNextUpSection', default: true
  },
  {
    id: 'today.water',     group: 'Today', label: 'Water Tracker',
    desc: 'Daily hydration tracker with unit selection',
    type: 'section', sectionId: 'todayWaterSection', default: true
  },
  {
    id: 'today.prayer',    group: 'Today', label: 'Prayer',
    desc: 'Track your five daily prayers',
    type: 'section', sectionId: 'todayPrayerSection', default: true
  },
  {
    id: 'today.habits',    group: 'Today', label: 'Habits',
    desc: 'Habit checklist on the Today page',
    type: 'section', sectionId: 'todayHabitsSection', default: true
  },
  {
    id: 'today.media',     group: 'Today', label: 'In-Progress Media',
    desc: 'Shows books/shows you are currently consuming',
    type: 'section', sectionId: 'todayMediaSection', default: true
  },
  {
    id: 'today.note',      group: 'Today', label: 'Daily Note',
    desc: 'Free-write note for the day',
    type: 'section', sectionId: 'todayNoteSection', default: true
  },
  {
    id: 'today.reflection',group: 'Today', label: 'Reflection',
    desc: 'Quote / reflection card at the bottom of Today',
    type: 'section', sectionId: 'reflectionCard', default: true
  },
  {
    id: 'today.ringsrow',  group: 'Today', label: 'Progress Rings',
    desc: 'Habits / Food / Water / Prayer rings at top of Today',
    type: 'section', sectionId: 'todayRingsRow', default: true
  },
  {
    id: 'today.score',     group: 'Today', label: 'Day Score',
    desc: 'Daily score computed from habits, water, gym and prayers',
    type: 'section', sectionId: 'todayScoreSection', default: true
  },

  // ── Fitness sections ──────────────────────────────────────────
  // Note: Personal Bests visibility is controlled by Settings → Features (exercisePbs flag)
  // to avoid double-controlling the same element. Do not add fitness.pbs here.
  {
    id: 'fitness.cardio',  group: 'Fitness', label: 'Cardio Log',
    desc: 'Log runs, cycles, and other cardio sessions',
    type: 'section', sectionId: 'cardioSection', default: true
  },
  {
    id: 'fitness.weight',  group: 'Fitness', label: 'Body Weight Log',
    desc: 'Log and chart your body weight over time',
    type: 'section', sectionId: 'bodyWeightSection', default: true
  },
];

// Build a flat id→module map for quick lookup
const MODULE_MAP = Object.fromEntries(MODULE_REGISTRY.map(m => [m.id, m]));

// Get effective value for a module (S.modules first, fall back to default)
function modOn(id) {
  const m = MODULE_MAP[id];
  if (!m) return true;
  if (S.modules && id in S.modules) return !!S.modules[id];
  return m.default !== false;
}

// ── Apply all module visibility ──────────────────────────────────────────────
function applyModules() {
  MODULE_REGISTRY.forEach(mod => {
    const on = modOn(mod.id);

    if (mod.type === 'tab') {
      // Hide/show the nav tab button
      const btn = document.querySelector(`.tab[onclick*="go('${mod.tabName}')"]`);
      if (btn) btn.style.display = on ? '' : 'none';
      // If we just hid the active tab, fall back to 'today'
      if (!on && (typeof _activeTab !== 'undefined') && _activeTab === mod.tabName) {
        const fallback = document.querySelector(".tab[onclick*=\"go('today')\"]") ||
                         document.querySelector('.tab:not([style*="none"])');
        if (fallback) fallback.click();
      }
    }

    if (mod.type === 'section') {
      const el = eid(mod.sectionId);
      if (el) el.style.display = on ? '' : 'none';
    }
  });
}

// ── Toggle a module from the settings pane ───────────────────────────────────
function setModule(id, on) {
  if (!S.modules) S.modules = {};
  S.modules[id] = on;
  scheduleSave();
  applyModules();
  // Re-render today if a today section changed
  if (id.startsWith('today.') && typeof renderToday === 'function') renderToday();
}

// ── Render the Modules settings pane ─────────────────────────────────────────
function renderModulesPane() {
  const pane = eid('stPane-modules');
  if (!pane) return;
  // Only Navigation (tab visibility) lives here.
  // Today sections → Settings > Today. Fitness sections → Settings > Fitness.
  const navMods = MODULE_REGISTRY.filter(m => m.group === 'Navigation');
  pane.innerHTML = `
    <div style="font-size:0.68rem;color:var(--muted);margin-bottom:16px;line-height:1.6">
      Hide tabs you don't use. They disappear from the nav and your data is always preserved.
    </div>
    ${navMods.map(m => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">
        <div style="flex:1;min-width:0;margin-right:12px">
          <div style="font-size:0.82rem;color:var(--cream);margin-bottom:2px">${escapeHtml(m.label)}</div>
          <div style="font-size:0.66rem;color:var(--muted);line-height:1.4">${escapeHtml(m.desc)}</div>
        </div>
        <label class="toggle-switch" style="flex-shrink:0">
          <input type="checkbox" ${modOn(m.id) ? 'checked' : ''} onchange="setModule('${m.id}',this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
    `).join('')}
  `;
}
