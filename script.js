const weekStartDate = new Date(2026, 1, 1);
const rotationWeek = 2;
const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const people = [
  {
    name: 'Tatian',
    cluster: 'Floors & Surfaces',
    tasks: {
      Sunday: ['Living room reset', 'Quick sweep high-traffic'],
      Monday: ['Wipe counters + table', 'Spot clean spills'],
      Tuesday: ['Vacuum/sweep main area', 'Wipe handles'],
      Wednesday: ['Bathrooms: wipe sinks + mirrors', 'Swap hand towels'],
      Thursday: ['Mop or swiffer kitchen', 'Entryway reset'],
      Friday: ['Light tidy only', 'No deep cleaning'],
      Saturday: ['Dust/wipe surfaces', 'Vacuum bedrooms (quick)']
    }
  },
  {
    name: 'Tamara',
    cluster: 'Laundry & Rooms',
    tasks: {
      Sunday: ['Sort laundry + start 1 load', 'Room reset (15 min)'],
      Monday: ['Move laundry + fold 10 min', 'Put away'],
      Tuesday: ['Start/finish laundry load', 'Bedding check'],
      Wednesday: ['Fold + distribute', 'Clear bedroom floors'],
      Thursday: ['Catch-up laundry', 'Towels/linens'],
      Friday: ['Light reset only', 'No laundry'],
      Saturday: ['Deep room reset (30 min)', 'Donate bag if needed']
    }
  },
  {
    name: 'Hope (19)',
    cluster: 'Trash, Plants & Outdoors',
    tasks: {
      Sunday: ['Take out kitchen trash', 'Check recycling'],
      Monday: ['Bins/cans check', 'Bring in if needed'],
      Tuesday: ['Water plants (as needed)', 'Porch/entry tidy'],
      Wednesday: ['Trash + compost check', 'Pet area reset'],
      Thursday: ['Take out all trash', 'Yard quick scan'],
      Friday: ['Light reset only', 'No outside'],
      Saturday: ['Recycling breakdown', 'Outdoor sweep (10 min)']
    }
  },
  {
    name: 'Abby (15)',
    cluster: 'Food (Lite)',
    tasks: {
      Sunday: ['Pick 1 snack item to prep', 'Put away your food stuff'],
      Monday: ['Pack your lunch item', 'Wipe your spot'],
      Tuesday: ['Pack your lunch item', 'Dish to dishwasher'],
      Wednesday: ['Set table OR clear table', 'Put leftovers away (small)'],
      Thursday: ['Pack your lunch item', 'Wipe counters (2 min)'],
      Friday: ['Help choose dinner / dessert', 'Put cups away'],
      Saturday: ['Restock 1 snack', 'Put dishes away (5 min)']
    }
  }
];

const weekKey = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, '0')}-${String(weekStartDate.getDate()).padStart(2, '0')}`;
const appStateKey = `chore-map-${weekKey}`;

const dayChipsEl = document.getElementById('dayChips');
const personCardsEl = document.getElementById('personCards');
const overviewGridEl = document.getElementById('overviewGrid');
const clusterListEl = document.getElementById('clusterList');
const selectedDateEl = document.getElementById('selectedDate');
const weekMetaEl = document.getElementById('weekMeta');
const weekStartEl = document.getElementById('weekStart');
const rotationWeekEl = document.getElementById('rotationWeek');
const overallProgressEl = document.getElementById('overallProgress');
const overallMetaEl = document.getElementById('overallMeta');
const todayJumpBtn = document.getElementById('todayJump');

const days = dayNames.map((name, index) => {
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

const state = {
  selectedDayIndex: getInitialDayIndex(),
  completed: {}
};

hydrateState();
renderAll();

function hydrateState() {
  const saved = localStorage.getItem(appStateKey);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    if (typeof parsed.selectedDayIndex === 'number') {
      state.selectedDayIndex = clamp(parsed.selectedDayIndex, 0, 6);
    }
    if (parsed.completed && typeof parsed.completed === 'object') {
      state.completed = parsed.completed;
    }
  } catch (error) {
    console.warn('Unable to load saved chore data.', error);
  }
}

function saveState() {
  localStorage.setItem(appStateKey, JSON.stringify({
    selectedDayIndex: state.selectedDayIndex,
    completed: state.completed
  }));
}

function getInitialDayIndex() {
  const today = new Date();
  for (let i = 0; i < days.length; i += 1) {
    const day = days[i];
    if (
      day.date.getFullYear() === today.getFullYear() &&
      day.date.getMonth() === today.getMonth() &&
      day.date.getDate() === today.getDate()
    ) {
      return i;
    }
  }
  return days.length - 1;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function taskId(personIndex, dayIndex, taskIndex) {
  return `task-${personIndex}-${dayIndex}-${taskIndex}`;
}

function isTaskDone(id) {
  return Boolean(state.completed[id]);
}

function setTaskDone(id, done) {
  if (done) {
    state.completed[id] = true;
  } else {
    delete state.completed[id];
  }
  saveState();
}

function getDayTotals(dayIndex) {
  let total = 0;
  let done = 0;
  people.forEach((person, personIndex) => {
    const tasks = person.tasks[days[dayIndex].key] || [];
    tasks.forEach((_, taskIndex) => {
      total += 1;
      if (isTaskDone(taskId(personIndex, dayIndex, taskIndex))) {
        done += 1;
      }
    });
  });
  return { done, total };
}

function getPersonDayTotals(personIndex, dayIndex) {
  const tasks = people[personIndex].tasks[days[dayIndex].key] || [];
  const total = tasks.length;
  const done = tasks.reduce((count, _, taskIndex) => {
    return count + (isTaskDone(taskId(personIndex, dayIndex, taskIndex)) ? 1 : 0);
  }, 0);
  return { done, total };
}

function getWeekTotals() {
  let total = 0;
  let done = 0;
  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const dayTotals = getDayTotals(dayIndex);
    total += dayTotals.total;
    done += dayTotals.done;
  }
  return { done, total };
}

function renderAll() {
  renderHeader();
  renderDayChips();
  renderPersonCards();
  renderOverview();
  renderClusters();
  updateSelectedDate();
  updateOverallProgress();
}

function renderHeader() {
  const weekEnd = days[days.length - 1].date;
  const year = weekEnd.getFullYear();
  const startMonth = weekStartDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
  const startDay = weekStartDate.getDate();
  const endDay = weekEnd.getDate();
  const rangeLabel = startMonth === endMonth
    ? `${startMonth} ${startDay}-${endDay}, ${year}`
    : `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  weekMetaEl.textContent = `Week of ${rangeLabel} | Rotation Week ${rotationWeek}`;
  weekStartEl.textContent = weekStartDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  rotationWeekEl.textContent = rotationWeek;
}

function renderDayChips() {
  dayChipsEl.innerHTML = '';
  days.forEach((day, index) => {
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
  const day = days[state.selectedDayIndex].key;
  personCardsEl.innerHTML = '';
  people.forEach((person, personIndex) => {
    const { done, total } = getPersonDayTotals(personIndex, state.selectedDayIndex);
    const card = document.createElement('article');
    card.className = 'person-card';
    card.dataset.personIndex = personIndex;

    const header = document.createElement('div');
    header.className = 'person-header';

    const titleWrap = document.createElement('div');
    const nameEl = document.createElement('div');
    nameEl.className = 'person-name';
    nameEl.textContent = person.name;

    const clusterEl = document.createElement('div');
    clusterEl.className = 'cluster-tag';
    clusterEl.dataset.cluster = person.cluster;
    clusterEl.textContent = person.cluster;

    titleWrap.appendChild(nameEl);
    titleWrap.appendChild(clusterEl);

    const progressEl = document.createElement('div');
    progressEl.className = 'progress-pill';
    progressEl.dataset.personProgress = personIndex;
    progressEl.textContent = `${done}/${total} done`;

    header.appendChild(titleWrap);
    header.appendChild(progressEl);

    const list = document.createElement('div');
    list.className = 'task-list';

    const tasks = person.tasks[day] || [];
    tasks.forEach((task, taskIndex) => {
      const id = taskId(personIndex, state.selectedDayIndex, taskIndex);
      const item = document.createElement('label');
      item.className = 'task-item';
      if (isTaskDone(id)) {
        item.classList.add('is-done');
      }
      item.htmlFor = id;

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.checked = isTaskDone(id);
      input.dataset.taskId = id;

      const text = document.createElement('span');
      text.textContent = task;

      item.appendChild(input);
      item.appendChild(text);
      list.appendChild(item);
    });

    card.appendChild(header);
    card.appendChild(list);
    personCardsEl.appendChild(card);
  });
}

function renderOverview() {
  overviewGridEl.innerHTML = '';
  people.forEach((person, personIndex) => {
    const row = document.createElement('div');
    row.className = 'overview-row';

    const name = document.createElement('div');
    name.className = 'overview-name';
    name.textContent = person.name;

    const daysWrap = document.createElement('div');
    daysWrap.className = 'overview-days';

    days.forEach((day, dayIndex) => {
      const { done, total } = getPersonDayTotals(personIndex, dayIndex);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'mini-day';
      cell.dataset.personIndex = personIndex;
      cell.dataset.dayIndex = dayIndex;
      cell.dataset.level = getCompletionLevel(done, total);
      cell.innerHTML = `<strong>${day.short}</strong>${done}/${total}`;
      daysWrap.appendChild(cell);
    });

    row.appendChild(name);
    row.appendChild(daysWrap);
    overviewGridEl.appendChild(row);
  });
}

function renderClusters() {
  clusterListEl.innerHTML = '';
  people.forEach((person) => {
    const item = document.createElement('li');
    item.className = 'cluster-item';

    const name = document.createElement('strong');
    name.textContent = person.name;

    const cluster = document.createElement('span');
    cluster.textContent = person.cluster;

    item.appendChild(name);
    item.appendChild(cluster);
    clusterListEl.appendChild(item);
  });
}

function updateSelectedDate() {
  selectedDateEl.textContent = days[state.selectedDayIndex].full;
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
    cell.innerHTML = `<strong>${days[dayIndex].short}</strong>${done}/${total}`;
  });
}

function getCompletionLevel(done, total) {
  if (total === 0) return 'none';
  if (done === 0) return 'none';
  if (done === total) return 'full';
  return 'partial';
}

function setSelectedDay(dayIndex) {
  state.selectedDayIndex = clamp(dayIndex, 0, days.length - 1);
  saveState();
  renderDayChips();
  renderPersonCards();
  updateSelectedDate();
  updatePersonProgress();
}

personCardsEl.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!target.dataset.taskId) return;
  setTaskDone(target.dataset.taskId, target.checked);
  const item = target.closest('.task-item');
  if (item) {
    item.classList.toggle('is-done', target.checked);
  }
  updateDayChipCounts();
  updatePersonProgress();
  updateOverviewCounts();
  updateOverallProgress();
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
  setSelectedDay(getInitialDayIndex());
});
