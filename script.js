const CONFIG = window.CHORE_CONFIG || {};
const SCRIPT_URL = CONFIG.scriptUrl || '';
const TOKEN = CONFIG.token || '';
const REPO_OWNER = CONFIG.repoOwner || '';
const REPO_NAME = CONFIG.repoName || '';
const BUILD_TIME = CONFIG.buildTime ? new Date(CONFIG.buildTime) : null;
const BUILD_SHA = CONFIG.buildSha || '';

const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const PERSON_ORDER = ['Tatian', 'Tamara', 'Hope', 'Abby'];

const KID_CHORE_POOL = [
  'Dishes',
  'Counters or table',
  'Garbage',
  'Recycling',
  'Sweep kitchen'
];

const ABBY_DAILY = [
  'Put backpacks away',
  'Dirty clothes bin or worn but not dirty bin',
  'Gather soccer stuff for next day'
];

const HOPE_DAILY = ['Unpack lunch box - wash thermos'];

const VACUUM_ROOMS = ['Entry way', 'Kitchen', 'Living room', 'Office', 'Hallway', 'Bathroom'];
const MOP_ROOMS = ['Kitchen', 'Living room', 'Bathroom', 'Entry way', 'Hallway'];

const SHARED_TASKS = [
  'Lunch box clean up',
  'Coffee mug cleanup',
  'Mail sorting',
  'Sweep kitchen',
  'Spot mop spots in kitchen',
  'Clean up pee',
  'Pick up poop',
  'Clean litter box',
  'Wipe counters',
  'Wipe down stove tops',
  'Start dish washer',
  'Clean dinner dishes',
  'Clean dog bowls',
  'Refill water for dogs and cats',
  'Empty dishwasher',
  'Wash pots and pans',
  'Put away dishes from the dish strainer',
  'Clean toilet',
  'Clean bathroom counter',
  'Take out bathroom garbage',
  'Wipe down dining room table',
  'Put shoes in bins'
]
  .concat(VACUUM_ROOMS.map((room) => `Vacuum: ${room}`))
  .concat(MOP_ROOMS.map((room) => `Mop: ${room}`));

const LAUNDRY_SCHEDULE = {
  Friday: ['Hope'],
  Saturday: ['Tamara', 'Tatian'],
  Sunday: ['Abby']
};

const dayChipsEl = document.getElementById('dayChips');
const personCardsEl = document.getElementById('personCards');
const overviewGridEl = document.getElementById('overviewGrid');
const laundryListEl = document.getElementById('laundryList');
const selectedDateEl = document.getElementById('selectedDate');
const weekMetaEl = document.getElementById('weekMeta');
const weekStartEl = document.getElementById('weekStart');
const rotationWeekEl = document.getElementById('rotationWeek');
const overallProgressEl = document.getElementById('overallProgress');
const overallMetaEl = document.getElementById('overallMeta');
const todayJumpBtn = document.getElementById('todayJump');
const connectionStatusEl = document.getElementById('connectionStatus');
const appFooterEl = document.getElementById('appFooter');
const toastEl = document.getElementById('toast');
const updateBannerEl = document.getElementById('updateBanner');
const refreshBtnEl = document.getElementById('refreshBtn');
const settingsModalEl = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettings');
const closeSettingsBtn = document.getElementById('closeSettings');
const textSizeRangeEl = document.getElementById('textSizeRange');
const toggleHighContrastEl = document.getElementById('toggleHighContrast');
const themeInputs = Array.from(document.querySelectorAll('input[name="theme"]'));

const REMIND_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 4.5c-3 0-5 2.2-5 5v3.6l-1.5 2.1h13L17 13.1V9.5c0-2.8-2-5-5-5Z"></path>
    <path d="M9.5 18.2a2.5 2.5 0 0 0 5 0"></path>
  </svg>
`;

const state = {
  selectedDayIndex: 0,
  completed: {},
  syncEnabled: false,
  weekKey: '',
  collapsed: {},
  settings: {
    textSize: 1,
    highContrast: false,
    theme: 'warm'
  }
};

const dataStore = {
  weekStartDate: new Date(2026, 1, 1),
  rotationWeek: 2,
  days: [],
  people: [],
  items: [],
  itemsByPersonDay: new Map(),
  itemsByDay: new Map(),
  itemMap: new Map(),
  todayIndex: 0
};

init();

async function init() {
  if (SCRIPT_URL && !SCRIPT_URL.includes('PASTE_APPS_SCRIPT_URL_HERE')) {
    setConnectionStatus('Connecting to sheet...', '');
    try {
      const payload = await fetchSheetData();
      if (!payload || !Array.isArray(payload.items)) {
        throw new Error('Sheet response missing items.');
      }
      applyData(payload, true);
      setConnectionStatus('Connected to sheet', 'is-live');
      appFooterEl.textContent = 'Changes sync to your Google Sheet.';
      checkForUpdate();
      return;
    } catch (error) {
      console.warn('Sheet connection failed, using fallback.', error);
      setConnectionStatus('Using local data', 'is-error');
      appFooterEl.textContent = 'Connect Apps Script to sync changes.';
    }
  } else {
    setConnectionStatus('Add Apps Script URL to sync', 'is-error');
    appFooterEl.textContent = 'Connect Apps Script to sync changes.';
  }

  const fallback = buildFallbackPayload();
  applyData(fallback, false);
  checkForUpdate();
}

function buildFallbackPayload() {
  const weekStartDate = new Date(2026, 1, 1);
  const { tatian, tamara } = splitTasks(SHARED_TASKS);
  const templateTasks = {
    Tatian: tatian,
    Tamara: tamara
  };

  const items = [];
  dayNames.forEach((day, dayIndex) => {
    PERSON_ORDER.forEach((person) => {
      const tasks = getTasksForPersonDay(person, dayIndex, templateTasks);
      tasks.forEach((task, index) => {
        items.push({
          id: `local-${person}-${day}-${index}`,
          row: null,
          person,
          day,
          task,
          done: false
        });
      });
    });
  });

  return {
    weekStart: formatDateKey(weekStartDate),
    rotationWeek: getRotationWeek(weekStartDate),
    items
  };
}

async function fetchSheetData() {
  const url = new URL(SCRIPT_URL);
  url.searchParams.set('action', 'getWeek');
  if (TOKEN) {
    url.searchParams.set('token', TOKEN);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Sheet request failed: ${response.status}`);
  }
  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.error || 'Sheet response not ok.');
  }
  return payload;
}

function applyData(payload, syncEnabled) {
  const weekStartDate = parseDate(payload.weekStart) || new Date(2026, 1, 1);
  dataStore.weekStartDate = weekStartDate;
  dataStore.rotationWeek = payload.rotationWeek || getRotationWeek(weekStartDate);
  dataStore.days = buildDays(weekStartDate);
  dataStore.todayIndex = getInitialDayIndex(dataStore.days);
  state.weekKey = formatDateKey(weekStartDate);
  state.syncEnabled = syncEnabled;

  const items = (payload.items || [])
    .map((item) => normalizeItem(item))
    .filter((item) => item !== null);

  items.sort((a, b) => (a.row || 0) - (b.row || 0));

  dataStore.items = items;
  buildIndexes(items);
  setPeople(items);
  hydrateSelectedDay();
  hydrateCompletion(items, syncEnabled);
  hydrateCollapsedState();
  applySettings();
  renderAll();
}

function normalizeItem(item) {
  const rawPerson = String(item.person || '').trim();
  const person = normalizePersonName(rawPerson);
  const dayName = normalizeDayName(item.day);
  if (!person || !dayName) return null;
  const dayIndex = dayNames.indexOf(dayName);
  return {
    id: item.row ? String(item.row) : String(item.id || `${person}-${dayName}-${item.task}`),
    row: item.row ? Number(item.row) : null,
    person,
    sourcePerson: rawPerson,
    day: dayName,
    dayIndex,
    task: String(item.task || '').trim(),
    done: Boolean(item.done)
  };
}

function normalizeDayName(day) {
  if (!day) return null;
  const cleaned = String(day).trim().toLowerCase();
  for (const name of dayNames) {
    if (name.toLowerCase() === cleaned) return name;
    if (name.slice(0, 3).toLowerCase() === cleaned) return name;
  }
  return null;
}

function buildDays(weekStartDate) {
  return dayNames.map((name, index) => {
    const date = new Date(weekStartDate);
    date.setDate(weekStartDate.getDate() + index);
    return {
      key: name,
      short: name.slice(0, 3),
      date,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    };
  });
}

function buildIndexes(items) {
  dataStore.itemsByPersonDay = new Map();
  dataStore.itemsByDay = new Map();
  dataStore.itemMap = new Map();

  items.forEach((item) => {
    dataStore.itemMap.set(item.id, item);
    const dayKey = String(item.dayIndex);
    if (!dataStore.itemsByDay.has(dayKey)) {
      dataStore.itemsByDay.set(dayKey, []);
    }
    dataStore.itemsByDay.get(dayKey).push(item);
  });
}

function setPeople(items) {
  const found = [];
  items.forEach((item) => {
    if (!found.includes(item.person)) {
      found.push(item.person);
    }
  });

  const ordered = PERSON_ORDER.filter((name) => found.includes(name));
  const extras = found.filter((name) => !ordered.includes(name));
  const people = ordered.concat(extras).map((name) => ({
    name,
    tag: 'Daily chores'
  }));

  const personIndexMap = new Map();
  people.forEach((person, index) => {
    personIndexMap.set(person.name, index);
  });

  dataStore.itemsByPersonDay = new Map();
  items.forEach((item) => {
    const personIndex = personIndexMap.get(item.person);
    if (personIndex === undefined) return;
    const key = `${personIndex}-${item.dayIndex}`;
    if (!dataStore.itemsByPersonDay.has(key)) {
      dataStore.itemsByPersonDay.set(key, []);
    }
    dataStore.itemsByPersonDay.get(key).push(item);
  });

  dataStore.people = people;
}

function hydrateSelectedDay() {
  state.selectedDayIndex = dataStore.todayIndex;
}

function hydrateCompletion(items, syncEnabled) {
  if (syncEnabled) {
    state.completed = {};
    items.forEach((item) => {
      if (item.done) state.completed[item.id] = true;
    });
    return;
  }

  const saved = loadState();
  if (saved && saved.completed) {
    state.completed = saved.completed;
    return;
  }

  state.completed = {};
  items.forEach((item) => {
    if (item.done) state.completed[item.id] = true;
  });
}

function hydrateCollapsedState() {
  const saved = loadUiState();
  if (saved && saved.collapsed) {
    state.collapsed = saved.collapsed;
  } else {
    state.collapsed = {};
  }

  if (saved && saved.settings) {
    state.settings = {
      textSize: Number.isFinite(saved.settings.textSize) ? saved.settings.textSize : 1,
      highContrast: Boolean(saved.settings.highContrast),
      theme: saved.settings.theme || 'warm'
    };
  }
}

function loadState() {
  if (!state.weekKey) return null;
  const saved = localStorage.getItem(`chore-map-${state.weekKey}`);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (error) {
    return null;
  }
}

function saveState() {
  if (!state.weekKey || state.syncEnabled) return;
  localStorage.setItem(
    `chore-map-${state.weekKey}`,
    JSON.stringify({
      selectedDayIndex: state.selectedDayIndex,
      completed: state.completed
    })
  );
}

function loadUiState() {
  const saved = localStorage.getItem('chore-map-ui');
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (error) {
    return null;
  }
}

function saveUiState() {
  localStorage.setItem('chore-map-ui', JSON.stringify({
    collapsed: state.collapsed,
    settings: state.settings
  }));
}

function renderAll() {
  renderHeader();
  renderDayChips();
  renderPersonCards();
  renderOverview();
  renderLaundry();
  updateSelectedDate();
  updateOverallProgress();
}

function renderHeader() {
  const weekEnd = dataStore.days[dataStore.days.length - 1].date;
  const year = weekEnd.getFullYear();
  const startMonth = dataStore.weekStartDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
  const startDay = dataStore.weekStartDate.getDate();
  const endDay = weekEnd.getDate();
  const rangeLabel = startMonth === endMonth
    ? `${startMonth} ${startDay}-${endDay}, ${year}`
    : `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;

  weekMetaEl.textContent = `Week of ${rangeLabel} | Rotation Week ${dataStore.rotationWeek}`;
  weekStartEl.textContent = dataStore.weekStartDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  rotationWeekEl.textContent = dataStore.rotationWeek;
}

function renderDayChips() {
  dayChipsEl.innerHTML = '';
  dataStore.days.forEach((day, index) => {
    const { done, total } = getDayTotals(index);
    const chip = document.createElement('button');
    chip.className = 'day-chip';
    chip.type = 'button';
    chip.dataset.dayIndex = index;
    if (index === state.selectedDayIndex) {
      chip.classList.add('is-active');
    }
    chip.innerHTML = `
      <strong>${day.short}</strong>
      <span>${day.label}</span>
      <span class="day-progress">${done}/${total}</span>
    `;
    dayChipsEl.appendChild(chip);
  });
}

function renderPersonCards() {
  const day = dataStore.days[state.selectedDayIndex];
  personCardsEl.innerHTML = '';
  dataStore.people.forEach((person, personIndex) => {
    const { done, total } = getPersonDayTotals(personIndex, state.selectedDayIndex);
    const card = document.createElement('article');
    card.className = 'person-card';
    card.dataset.personIndex = personIndex;
    if (state.collapsed[person.name]) {
      card.classList.add('is-collapsed');
    }

    const header = document.createElement('div');
    header.className = 'person-header';

    const titleWrap = document.createElement('div');
    const nameEl = document.createElement('div');
    nameEl.className = 'person-name';
    nameEl.textContent = person.name;

    const tagEl = document.createElement('div');
    tagEl.className = 'cluster-tag';
    tagEl.textContent = person.tag || 'Daily chores';

    titleWrap.appendChild(nameEl);
    titleWrap.appendChild(tagEl);

    const progressEl = document.createElement('div');
    progressEl.className = 'progress-pill';
    progressEl.dataset.personProgress = personIndex;
    progressEl.textContent = `${done}/${total} done`;

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'collapse-btn';
    collapseBtn.dataset.personName = person.name;
    collapseBtn.setAttribute('aria-expanded', String(!state.collapsed[person.name]));
    collapseBtn.setAttribute('aria-label', `${state.collapsed[person.name] ? 'Expand' : 'Collapse'} chores for ${person.name}`);
    collapseBtn.setAttribute('title', state.collapsed[person.name] ? 'Expand chores' : 'Collapse chores');

    header.appendChild(titleWrap);
    header.appendChild(progressEl);
    header.appendChild(collapseBtn);

    const list = document.createElement('div');
    list.className = 'task-list';

    const tasks = getItemsForPersonDay(personIndex, day.key);
    tasks.forEach((task) => {
      const id = task.id;
      const item = document.createElement('div');
      item.className = 'task-item';
      if (isTaskDone(id)) {
        item.classList.add('is-done');
      }

      const label = document.createElement('label');
      label.className = 'task-label';
      label.htmlFor = id;

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.checked = isTaskDone(id);
      input.dataset.taskId = id;
      if (!state.syncEnabled && !task.row) {
        input.dataset.localOnly = 'true';
      }

      const text = document.createElement('span');
      text.textContent = task.task;

      label.appendChild(input);
      label.appendChild(text);

      const remindBtn = document.createElement('button');
      remindBtn.type = 'button';
      remindBtn.className = 'remind-btn';
      remindBtn.setAttribute('aria-label', 'Set reminder');
      remindBtn.setAttribute('title', 'Set reminder');
      remindBtn.innerHTML = REMIND_ICON;
      remindBtn.dataset.personName = person.name;
      remindBtn.dataset.dayLabel = day.full;
      remindBtn.dataset.task = task.task;

      item.appendChild(label);
      item.appendChild(remindBtn);
      list.appendChild(item);
    });

    card.appendChild(header);
    card.appendChild(list);
    personCardsEl.appendChild(card);
  });
}

function renderOverview() {
  overviewGridEl.innerHTML = '';
  dataStore.people.forEach((person, personIndex) => {
    const row = document.createElement('div');
    row.className = 'overview-row';

    const name = document.createElement('div');
    name.className = 'overview-name';
    name.textContent = person.name;

    const daysWrap = document.createElement('div');
    daysWrap.className = 'overview-days';

    dataStore.days.forEach((day, dayIndex) => {
      const { done, total } = getPersonDayTotals(personIndex, dayIndex);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'mini-day';
      cell.dataset.personIndex = personIndex;
      cell.dataset.dayIndex = dayIndex;
      cell.dataset.level = getCompletionLevel(done, total);
      if (dayIndex === dataStore.todayIndex) {
        cell.classList.add('is-today');
      }
      cell.innerHTML = `<strong>${day.short}</strong>${done}/${total}`;
      daysWrap.appendChild(cell);
    });

    row.appendChild(name);
    row.appendChild(daysWrap);
    overviewGridEl.appendChild(row);
  });
}

function renderLaundry() {
  laundryListEl.innerHTML = '';
  const schedule = buildLaundrySchedule();
  const entries = Object.entries(schedule);
  if (!entries.length) {
    const item = document.createElement('li');
    item.className = 'cluster-item';
    item.textContent = 'No laundry tasks listed yet.';
    laundryListEl.appendChild(item);
    return;
  }

  entries.forEach(([day, people]) => {
    const item = document.createElement('li');
    item.className = 'cluster-item';

    const dayLabel = document.createElement('strong');
    dayLabel.textContent = day;

    const names = document.createElement('span');
    names.textContent = people.join(', ');

    item.appendChild(dayLabel);
    item.appendChild(names);
    laundryListEl.appendChild(item);
  });
}

function buildLaundrySchedule() {
  const schedule = {};
  dataStore.items.forEach((item) => {
    if (!item.task.toLowerCase().includes('laundry')) return;
    const dayName = dayNames[item.dayIndex];
    if (!schedule[dayName]) schedule[dayName] = [];
    if (!schedule[dayName].includes(item.person)) {
      schedule[dayName].push(item.person);
    }
  });
  return schedule;
}

function updateSelectedDate() {
  selectedDateEl.textContent = dataStore.days[state.selectedDayIndex].full;
}

function updateOverallProgress() {
  const { done, total } = getWeekTotals();
  const percentage = total === 0 ? 0 : Math.round((done / total) * 100);
  overallProgressEl.style.width = `${percentage}%`;
  overallMetaEl.textContent = `${done} of ${total} tasks complete (${percentage}%)`;
}

function updateDayChipCounts() {
  dayChipsEl.querySelectorAll('.day-chip').forEach((chip) => {
    const dayIndex = Number(chip.dataset.dayIndex);
    const { done, total } = getDayTotals(dayIndex);
    const progress = chip.querySelector('.day-progress');
    if (progress) {
      progress.textContent = `${done}/${total}`;
    }
  });
}

function updatePersonProgress() {
  document.querySelectorAll('[data-person-progress]').forEach((pill) => {
    const personIndex = Number(pill.dataset.personProgress);
    const { done, total } = getPersonDayTotals(personIndex, state.selectedDayIndex);
    pill.textContent = `${done}/${total} done`;
  });
}

function updateOverviewCounts() {
  overviewGridEl.querySelectorAll('.mini-day').forEach((cell) => {
    const personIndex = Number(cell.dataset.personIndex);
    const dayIndex = Number(cell.dataset.dayIndex);
    const { done, total } = getPersonDayTotals(personIndex, dayIndex);
    cell.dataset.level = getCompletionLevel(done, total);
    cell.innerHTML = `<strong>${dataStore.days[dayIndex].short}</strong>${done}/${total}`;
  });
}

function getCompletionLevel(done, total) {
  if (total === 0) return 'none';
  if (done === 0) return 'none';
  if (done === total) return 'full';
  return 'partial';
}

function setSelectedDay(dayIndex) {
  state.selectedDayIndex = clamp(dayIndex, 0, dataStore.days.length - 1);
  saveState();
  renderDayChips();
  renderPersonCards();
  updateSelectedDate();
  updatePersonProgress();
}

function getItemsForPersonDay(personIndex, dayKey) {
  const dayIndex = dayNames.indexOf(dayKey);
  const key = `${personIndex}-${dayIndex}`;
  return dataStore.itemsByPersonDay.get(key) || [];
}

function getDayTotals(dayIndex) {
  let total = 0;
  let done = 0;
  dataStore.people.forEach((_, personIndex) => {
    const dayName = dayNames[dayIndex];
    const items = getItemsForPersonDay(personIndex, dayName);
    items.forEach((item) => {
      total += 1;
      if (isTaskDone(item.id)) done += 1;
    });
  });
  return { done, total };
}

function getPersonDayTotals(personIndex, dayIndex) {
  const dayName = dayNames[dayIndex];
  const items = getItemsForPersonDay(personIndex, dayName);
  const total = items.length;
  const done = items.reduce((count, item) => count + (isTaskDone(item.id) ? 1 : 0), 0);
  return { done, total };
}

function getWeekTotals() {
  let total = 0;
  let done = 0;
  dataStore.days.forEach((day, dayIndex) => {
    dataStore.people.forEach((_, personIndex) => {
      const items = getItemsForPersonDay(personIndex, day.key);
      items.forEach((item) => {
        total += 1;
        if (isTaskDone(item.id)) done += 1;
      });
    });
  });
  return { done, total };
}

function isTaskDone(id) {
  return Boolean(state.completed[id]);
}

function setTaskDoneLocal(id, done) {
  if (done) {
    state.completed[id] = true;
  } else {
    delete state.completed[id];
  }
}

async function syncTaskToSheet(item, done) {
  if (!state.syncEnabled || !item.row) return;
  const payload = {
    action: 'updateTask',
    token: TOKEN,
    row: item.row,
    done
  };

  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Sync failed (${response.status})`);
  }
  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error || 'Sync failed');
  }
}

function setConnectionStatus(text, variant) {
  connectionStatusEl.textContent = text;
  connectionStatusEl.classList.remove('is-live', 'is-error');
  if (variant) {
    connectionStatusEl.classList.add(variant);
  }
}

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toastEl.classList.remove('is-visible');
  }, 2200);
}

function applySettings() {
  document.body.classList.remove('text-small', 'text-medium', 'text-large', 'theme-warm', 'theme-sage', 'theme-slate');
  const size = clamp(Math.round(state.settings.textSize), 0, 2);
  const sizeClass = size === 0 ? 'text-small' : size === 1 ? 'text-medium' : 'text-large';
  document.body.classList.add(sizeClass);
  document.body.classList.add(`theme-${state.settings.theme}`);
  document.body.classList.toggle('high-contrast', state.settings.highContrast);

  if (textSizeRangeEl) textSizeRangeEl.value = String(size);
  if (toggleHighContrastEl) toggleHighContrastEl.checked = state.settings.highContrast;
  themeInputs.forEach((input) => {
    input.checked = input.value === state.settings.theme;
  });
}

async function checkForUpdate() {
  if (!REPO_OWNER || !REPO_NAME) {
    return;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/main`, {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) return;
    const data = await response.json();
    const latestSha = data && data.sha;
    if (latestSha && BUILD_SHA) {
      if (latestSha !== BUILD_SHA) {
        showUpdateBanner();
      }
      return;
    }

    const latestDate = data && data.commit && data.commit.committer && data.commit.committer.date;
    if (!latestDate) return;
    const latest = new Date(latestDate);
    const localBuild = (BUILD_TIME && !Number.isNaN(BUILD_TIME.getTime()))
      ? BUILD_TIME
      : new Date(document.lastModified);
    const graceMs = 5 * 60 * 1000;
    if (latest.getTime() - localBuild.getTime() > graceMs) {
      showUpdateBanner();
    }
  } catch (error) {
    console.warn('Update check failed', error);
  }
}

function showUpdateBanner() {
  if (!updateBannerEl) return;
  updateBannerEl.hidden = false;
}

function getInitialDayIndex(days) {
  const today = new Date();
  for (let i = 0; i < days.length; i += 1) {
    const day = days[i].date;
    if (
      day.getFullYear() === today.getFullYear() &&
      day.getMonth() === today.getMonth() &&
      day.getDate() === today.getDate()
    ) {
      return i;
    }
  }
  return days.length - 1;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function splitTasks(tasks) {
  const tatian = [];
  const tamara = [];
  tasks.forEach((task, index) => {
    if (index % 2 === 0) {
      tatian.push(task);
    } else {
      tamara.push(task);
    }
  });
  return { tatian, tamara };
}

function getTasksForPersonDay(person, dayIndex, templateTasks) {
  const dayName = dayNames[dayIndex];
  const weekday = dayIndex >= 1 && dayIndex <= 5;
  if (person === 'Abby') {
    return weekday
      ? ABBY_DAILY.concat(pickRotating(KID_CHORE_POOL, dayIndex, 2, 0))
      : pickRotating(KID_CHORE_POOL, dayIndex, 4, 0);
  }
  if (person === 'Hope') {
    return weekday
      ? HOPE_DAILY.concat(pickRotating(KID_CHORE_POOL, dayIndex, 2, 2))
      : pickRotating(KID_CHORE_POOL, dayIndex, 4, 2);
  }
  const tasks = templateTasks[person] || [];
  const hasLaundry = (LAUNDRY_SCHEDULE[dayName] || []).includes(person);
  const start = (dayIndex * 4) % (tasks.length || 1);
  const dailyTasks = tasks.length ? tasks.slice(start, start + 4) : [];
  const normalized = dailyTasks.length === 4 ? dailyTasks : dailyTasks.concat(tasks.slice(0, Math.max(0, 4 - dailyTasks.length)));
  return hasLaundry ? ['Laundry'].concat(normalized.slice(0, 3)) : normalized;
}

function pickRotating(list, dayIndex, count, offset) {
  if (!list.length) return [];
  const start = (dayIndex + offset) % list.length;
  const selected = [];
  for (let i = 0; i < count; i += 1) {
    selected.push(list[(start + i) % list.length]);
  }
  return selected;
}

function normalizePersonName(name) {
  return name.replace(/\s*\(\d+\)\s*/g, '').trim();
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getRotationWeek(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const dayOffset = start.getDay();
  const diffDays = Math.floor((date - start) / (1000 * 60 * 60 * 24));
  const weekNum = Math.floor((diffDays + dayOffset) / 7) + 1;
  return ((weekNum - 1) % 4) + 1;
}

function isLaundryTask(item) {
  return item.task.toLowerCase().includes('laundry');
}

personCardsEl.addEventListener('change', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!target.dataset.taskId) return;
  const id = target.dataset.taskId;
  const item = dataStore.itemMap.get(id);
  if (!item) return;

  const nextDone = target.checked;
  setTaskDoneLocal(id, nextDone);
  const wrapper = target.closest('.task-item');
  if (wrapper) {
    wrapper.classList.toggle('is-done', nextDone);
  }

  updateDayChipCounts();
  updatePersonProgress();
  updateOverviewCounts();
  updateOverallProgress();
  saveState();

  if (state.syncEnabled) {
    try {
      await syncTaskToSheet(item, nextDone);
      setConnectionStatus('Connected to sheet', 'is-live');
    } catch (error) {
      console.warn('Sync failed', error);
      setTaskDoneLocal(id, !nextDone);
      target.checked = !nextDone;
      if (wrapper) {
        wrapper.classList.toggle('is-done', !nextDone);
      }
      updateDayChipCounts();
      updatePersonProgress();
      updateOverviewCounts();
      updateOverallProgress();
      setConnectionStatus('Sync error - try again', 'is-error');
      showToast('Sync error - try again.');
    }
  }
});

personCardsEl.addEventListener('click', async (event) => {
  const collapseBtn = event.target.closest('.collapse-btn');
  if (collapseBtn) {
    const personName = collapseBtn.dataset.personName;
    if (!personName) return;
    const nextState = !state.collapsed[personName];
    state.collapsed[personName] = nextState;
    saveUiState();
    renderPersonCards();
    return;
  }

  const remindBtn = event.target.closest('.remind-btn');
  if (!remindBtn) return;
  const personName = remindBtn.dataset.personName;
  const dayLabel = remindBtn.dataset.dayLabel;
  const task = remindBtn.dataset.task;
  if (!personName || !task) return;

  const reminderText = `${personName} • ${task} (${dayLabel})`;
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Chore reminder',
        text: reminderText
      });
      return;
    } catch (error) {
      console.warn('Share cancelled or failed', error);
    }
  }

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(reminderText);
      showToast('Copied reminder text.');
      return;
    } catch (error) {
      console.warn('Clipboard write failed', error);
    }
  }

  showToast('Share not available on this device.');
});

dayChipsEl.addEventListener('click', (event) => {
  const target = event.target.closest('.day-chip');
  if (!target) return;
  setSelectedDay(Number(target.dataset.dayIndex));
});

overviewGridEl.addEventListener('click', (event) => {
  const target = event.target.closest('.mini-day');
  if (!target) return;
  setSelectedDay(Number(target.dataset.dayIndex));
});

todayJumpBtn.addEventListener('click', () => {
  setSelectedDay(getInitialDayIndex(dataStore.days));
});

if (refreshBtnEl) {
  refreshBtnEl.addEventListener('click', () => {
    window.location.reload();
  });
}

function openSettings() {
  if (!settingsModalEl) return;
  settingsModalEl.hidden = false;
}

function closeSettings() {
  if (!settingsModalEl) return;
  settingsModalEl.hidden = true;
}

if (openSettingsBtn) {
  openSettingsBtn.addEventListener('click', () => {
    openSettings();
  });
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener('click', () => {
    closeSettings();
  });
}

if (settingsModalEl) {
  settingsModalEl.addEventListener('click', (event) => {
    if (event.target === settingsModalEl) {
      closeSettings();
    }
  });
}

if (toggleHighContrastEl) {
  toggleHighContrastEl.addEventListener('change', () => {
    state.settings.highContrast = toggleHighContrastEl.checked;
    applySettings();
    saveUiState();
  });
}

if (textSizeRangeEl) {
  textSizeRangeEl.addEventListener('input', () => {
    state.settings.textSize = Number(textSizeRangeEl.value);
    applySettings();
    saveUiState();
  });
}

themeInputs.forEach((input) => {
  input.addEventListener('change', () => {
    if (input.checked) {
      state.settings.theme = input.value;
      applySettings();
      saveUiState();
    }
  });
});
