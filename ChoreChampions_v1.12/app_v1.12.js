/* ChoreChampions v1.12
   Single-page app that matches the provided look + flow:
   - Home: big family selection cards
   - Person tasks: Morning/Evening toggle, progress ring, points today, streak, task cards
   - History + Leaderboard modals
   - Local-only persistence (localStorage)
*/

(() => {
  const APP = {
    version: "v1.12",
    storageKey: "chorechampions_v1.12",
    route: { name: "home", personId: null }, // home | tasks
    mode: "morning", // morning | evening
    dateISO: isoToday(),
    state: null,
    ui: {},
    confettiRunning: false
  };

  const DEFAULT = {
    settings: { sound: true, animations: true },
    people: [
      { id:"tamara", name:"Tamara", role:"Parent", emoji:"👩", colorClass:"tamara" },
      { id:"tatian", name:"Tatian", role:"Parent", emoji:"👨", colorClass:"tatian" },
      { id:"hope",   name:"Hope",   role:"Teen",   emoji:"⭐", colorClass:"hope" },
      { id:"abby",   name:"Abby",   role:"Teen",   emoji:"🦋", colorClass:"abby" }
    ],
    routines: {
      morning: {
        label: "Morning",
        icon: "☀️",
        tasks: {
          tamara: [
            { id:"m_teeth", name:"Brush Teeth", icon:"🪥", pts:5 },
            { id:"m_meds", name:"Take Medicine", icon:"💊", pts:10 },
            { id:"m_water", name:"Pack Water Bottle", icon:"💧", pts:5 },
            { id:"m_phone", name:"Pack Cell Phone", icon:"📱", pts:5 }
          ],
          tatian: [
            { id:"m_teeth", name:"Brush Teeth", icon:"🪥", pts:5 },
            { id:"m_meds", name:"Take Medicine", icon:"💊", pts:10 },
            { id:"m_water", name:"Pack Water Bottle", icon:"💧", pts:5 },
            { id:"m_phone", name:"Pack Cell Phone", icon:"📱", pts:5 }
          ],
          hope: [
            { id:"m_teeth", name:"Brush Teeth", icon:"🪥", pts:5 },
            { id:"m_meds", name:"Take Medicine", icon:"💊", pts:10 },
            { id:"m_water", name:"Pack Water Bottle", icon:"💧", pts:5 },
            { id:"m_soccer", name:"Pack Soccer Stuff", icon:"⚽", pts:10 },
            { id:"m_phone", name:"Pack Cell Phone", icon:"📱", pts:5 }
          ],
          abby: [
            { id:"m_teeth", name:"Brush Teeth", icon:"🪥", pts:5 },
            { id:"m_meds", name:"Take Medicine", icon:"💊", pts:10 },
            { id:"m_water", name:"Pack Water Bottle", icon:"💧", pts:5 },
            { id:"m_soccer", name:"Pack Soccer Stuff", icon:"⚽", pts:10 },
            { id:"m_phone", name:"Pack Cell Phone", icon:"📱", pts:5 }
          ],
        }
      },
      evening: {
        label: "Evening",
        icon: "🌙",
        tasks: {
          tamara: [
            { id:"e_dishes", name:"Dirty Dishes in Dishwasher", icon:"🍽️", pts:10 },
            { id:"e_laundry", name:"Laundry Off Floor", icon:"🧺", pts:10 },
            { id:"e_backpack", name:"Backpack Packed", icon:"🎒", pts:10 },
            { id:"e_laptop", name:"Laptop Charging", icon:"💻", pts:10 },
            { id:"e_phone", name:"Phone Charging", icon:"🔌", pts:10 }
          ],
          tatian: [
            { id:"e_dishes", name:"Dirty Dishes in Dishwasher", icon:"🍽️", pts:10 },
            { id:"e_laundry", name:"Laundry Off Floor", icon:"🧺", pts:10 },
            { id:"e_backpack", name:"Backpack Packed", icon:"🎒", pts:10 },
            { id:"e_laptop", name:"Laptop Charging", icon:"💻", pts:10 },
            { id:"e_phone", name:"Phone Charging", icon:"🔌", pts:10 }
          ],
          hope: [
            { id:"e_dishes", name:"Dishes to Kitchen", icon:"🍽️", pts:10 },
            { id:"e_laundry", name:"Laundry Off Floor", icon:"🧺", pts:10 },
            { id:"e_backpack", name:"Backpack Packed", icon:"🎒", pts:10 },
            { id:"e_laptop", name:"Laptop Charging", icon:"💻", pts:10 },
            { id:"e_phone", name:"Phone Charging", icon:"🔌", pts:10 }
          ],
          abby: [
            { id:"e_dishes", name:"Dishes to Kitchen", icon:"🍽️", pts:10 },
            { id:"e_laundry", name:"Laundry Off Floor", icon:"🧺", pts:10 },
            { id:"e_backpack", name:"Backpack Packed", icon:"🎒", pts:10 },
            { id:"e_laptop", name:"Laptop Charging", icon:"💻", pts:10 },
            { id:"e_phone", name:"Phone Charging", icon:"🔌", pts:10 }
          ],
        }
      }
    },
    // dailyLog[dateISO][mode][personId] = { doneIds: [] }
    dailyLog: {}
  };

  // ----- init -----
  init();

  function init(){
    APP.state = loadState();
    cacheUI();
    bindUI();
    ensureDay(APP.dateISO);
    // start at home
    goHome();
  }

  function cacheUI(){
    APP.ui.main = qs("#main");
    APP.ui.btnBack = qs("#btnBack");
    APP.ui.btnHistory = qs("#btnHistory");
    APP.ui.btnLeaderboard = qs("#btnLeaderboard");
    APP.ui.btnSettings = qs("#btnSettings");
    APP.ui.btnEditTasks = qs("#btnEditTasks");
    APP.ui.btnToday = qs("#btnToday");
    APP.ui.btnExport = qs("#btnExport");
    APP.ui.pageTitle = qs("#pageTitle");
    APP.ui.pageSub = qs("#pageSub");

    APP.ui.modal = qs("#modal");
    APP.ui.modalTitle = qs("#modalTitle");
    APP.ui.modalBody = qs("#modalBody");
    APP.ui.modalClose = qs("#modalClose");

    APP.ui.confetti = qs("#confetti");
  }

  function bindUI(){
    APP.ui.btnBack.addEventListener("click", () => { clickSound(); goHome(); });
    APP.ui.btnToday.addEventListener("click", () => { clickSound(); APP.dateISO = isoToday(); ensureDay(APP.dateISO); rerender(); toast("Today"); });
    APP.ui.btnHistory.addEventListener("click", () => { clickSound(); openHistory(); });
    APP.ui.btnLeaderboard.addEventListener("click", () => { clickSound(); openLeaderboard(); });
    APP.ui.btnSettings.addEventListener("click", () => { clickSound(); openSettings(); });
    APP.ui.btnEditTasks.addEventListener("click", () => { clickSound(); openTaskEditor(true); });
    APP.ui.btnExport.addEventListener("click", () => { clickSound(); openExport(); });

    APP.ui.modalClose.addEventListener("click", closeModal);
    APP.ui.modal.addEventListener("click", (e) => { if(e.target === APP.ui.modal) closeModal(); });

    window.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && !APP.ui.modal.classList.contains("hidden")) closeModal();
    });
  }

  // ----- routing -----
  function goHome(){
    APP.route = { name:"home", personId:null };
    APP.ui.btnBack.classList.add("hidden");
    APP.ui.btnEditTasks.classList.add("hidden");
    APP.ui.pageTitle.textContent = "Get Done! ✨";
    APP.ui.pageSub.textContent = "Who's checking off tasks?";
    renderHome();
  }

  function goTasks(personId){
    APP.route = { name:"tasks", personId };
    APP.ui.btnBack.classList.remove("hidden");
    APP.ui.btnEditTasks.classList.remove("hidden");
    const p = getPerson(personId);
    APP.ui.pageTitle.textContent = `${p.name}'s Tasks`;
    APP.ui.pageSub.textContent = prettyDate(APP.dateISO);
    renderTasks();
  }

  function rerender(){
    if(APP.route.name === "home") renderHome();
    else renderTasks();
  }

  // ----- screens -----
  function renderHome(){
    const wrap = div("container");
    wrap.innerHTML = `
      <div class="grid2" id="memberGrid"></div>
      <div class="bottomLinks">
        <button id="homeHistory"><span>↺</span> <span>View History</span></button>
        <button id="homeLeaderboard"><span>🏅</span> <span>Leaderboard</span></button>
      </div>
    `;

    const grid = wrap.querySelector("#memberGrid");
    APP.state.people.forEach(p => {
      const card = document.createElement("div");
      card.className = `memberCard ${p.colorClass}`;
      card.innerHTML = `
        <div class="bigEmoji" aria-hidden="true">${p.emoji}</div>
        <div class="name">${p.name}</div>
        <div class="role">${p.role}</div>
      `;
      card.addEventListener("click", () => { clickSound(); goTasks(p.id); });
      grid.appendChild(card);
    });

    wrap.querySelector("#homeHistory").addEventListener("click", () => { clickSound(); openHistory(); });
    wrap.querySelector("#homeLeaderboard").addEventListener("click", () => { clickSound(); openLeaderboard(); });

    mount(wrap);
  }

  function renderTasks(){
    const personId = APP.route.personId;
    const person = getPerson(personId);
    ensureDay(APP.dateISO);

    const mode = APP.mode;
    const tasks = getTasks(mode, personId);
    const log = getPersonLog(APP.dateISO, mode, personId);

    const totals = {
      done: log.doneIds.length,
      total: tasks.length,
      points: pointsForDone(tasks, log.doneIds)
    };
    const pct = totals.total ? Math.round((totals.done / totals.total) * 100) : 0;
    const streak = computePersonStreak(personId, mode);

    const wrap = div("container");
    wrap.innerHTML = `
      <div class="taskHeader">
        <div class="modePill" role="tablist" aria-label="Routine">
          <button id="btnMorning" class="${mode==='morning'?'active':''}" role="tab" aria-selected="${mode==='morning'}">☀️ Morning</button>
          <button id="btnEvening" class="${mode==='evening'?'active':''}" role="tab" aria-selected="${mode==='evening'}">🌙 Evening</button>
        </div>
      </div>

      <div class="statsRow">
        ${progressRingHTML(pct)}
        <div class="statBox points">
          <div class="statIcon">⭐</div>
          <div class="statMeta">
            <div class="k">Points Today</div>
            <div class="v">${totals.points}</div>
          </div>
        </div>
        <div class="statBox streak">
          <div class="statIcon">🔥</div>
          <div class="statMeta">
            <div class="k">Day Streak</div>
            <div class="v">${streak}</div>
          </div>
        </div>
      </div>

      <ul class="taskList" id="taskList"></ul>
    `;

    wrap.querySelector("#btnMorning").addEventListener("click", () => { clickSound(); APP.mode="morning"; renderTasks(); });
    wrap.querySelector("#btnEvening").addEventListener("click", () => { clickSound(); APP.mode="evening"; renderTasks(); });

    const ul = wrap.querySelector("#taskList");
    tasks.forEach(t => {
      const done = log.doneIds.includes(t.id);
      const li = document.createElement("li");
      li.className = "taskItem" + (done ? " done" : "");
      li.innerHTML = `
        <div class="taskLeftIcon" aria-hidden="true">${t.icon || "✅"}</div>
        <div class="taskMain">
          <div class="taskName">${escapeHtml(t.name)}</div>
          <div class="taskPts">+${t.pts || 5} pts</div>
        </div>
        <div class="taskRight" aria-hidden="true">${done ? "✓" : ""}</div>
      `;
      li.addEventListener("click", () => toggleTask(personId, t.id));
      ul.appendChild(li);
    });

    mount(wrap);

    // Auto confetti if complete (per person+day+mode once)
    const meta = getDayMeta(APP.dateISO);
    const flag = `${personId}_${mode}_celebrated`;
    if(totals.total && totals.done === totals.total && !meta[flag]){
      meta[flag] = true;
      saveState();
      celebrate("All done!");
    }
  }

  // ----- actions -----
  function toggleTask(personId, taskId){
    ensureDay(APP.dateISO);
    const log = getPersonLog(APP.dateISO, APP.mode, personId);
    const tasks = getTasks(APP.mode, personId);
    const idx = log.doneIds.indexOf(taskId);

    if(idx >= 0){
      log.doneIds.splice(idx, 1);
      uncheckSound();
    }else{
      log.doneIds.push(taskId);
      checkSound();
      if(APP.state.settings.animations) pulse();
    }
    saveState();
    renderTasks();
  }

  // ----- modals -----
  function openModal(title, node){
    APP.ui.modalTitle.textContent = title;
    APP.ui.modalBody.innerHTML = "";
    APP.ui.modalBody.appendChild(node);
    APP.ui.modal.classList.remove("hidden");
  }
  function closeModal(){
    APP.ui.modal.classList.add("hidden");
  }

  function openHistory(){
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="notice">Tap a date to jump to it. History is stored locally on this device.</div>
      <div style="height:12px"></div>
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Morning</th>
            <th>Evening</th>
            <th>Total Pts</th>
          </tr>
        </thead>
        <tbody id="hbody"></tbody>
      </table>
    `;

    const tb = wrap.querySelector("#hbody");
    const dates = Object.keys(APP.state.dailyLog).sort().reverse();
    if(!dates.length){
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="4" style="color:#6b7280">No history yet.</td>`;
      tb.appendChild(tr);
    }else{
      for(const dateISO of dates){
        const m = totalsForDayMode(dateISO, "morning");
        const e = totalsForDayMode(dateISO, "evening");
        const totalPts = m.points + e.points;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><button class="pillBtn" data-date="${dateISO}">${prettyDate(dateISO)}</button></td>
          <td>${m.done}/${m.total}</td>
          <td>${e.done}/${e.total}</td>
          <td>${totalPts}</td>
        `;
        tr.querySelector("button").addEventListener("click", () => {
          APP.dateISO = dateISO;
          ensureDay(APP.dateISO);
          closeModal();
          if(APP.route.name === "tasks") {
            APP.ui.pageSub.textContent = prettyDate(APP.dateISO);
            renderTasks();
          } else {
            goHome();
          }
        });
        tb.appendChild(tr);
      }
    }

    openModal("History", wrap);
  }

  function openLeaderboard(){
    // leaderboard based on last 30 days (sum points)
    const wrap = document.createElement("div");
    const scores = APP.state.people.map(p => {
      const pts = sumPointsForPerson(p.id, 30);
      const streakM = computePersonStreak(p.id, "morning");
      const streakE = computePersonStreak(p.id, "evening");
      return { id:p.id, name:p.name, pts, streak: Math.max(streakM, streakE) };
    }).sort((a,b) => b.pts - a.pts);

    wrap.innerHTML = `
      <div class="notice">Leaderboard uses the last 30 days of points on this device.</div>
      <div style="height:12px"></div>
      <table class="table">
        <thead>
          <tr><th>Rank</th><th>Name</th><th>Points</th><th>Best Streak</th></tr>
        </thead>
        <tbody>
          ${scores.map((s,i)=>`<tr><td>#${i+1}</td><td>${escapeHtml(s.name)}</td><td>${s.pts}</td><td>${s.streak}</td></tr>`).join("")}
        </tbody>
      </table>
    `;
    openModal("Leaderboard", wrap);
  }

  function openSettings(){
    const wrap = document.createElement("div");
    const s = APP.state.settings;
    wrap.innerHTML = `
      <div class="notice">Settings affect this device only.</div>
      <div style="height:12px"></div>
      <div style="display:flex; gap:12px; flex-wrap:wrap">
        <button class="pillBtn" id="toggleSound">Sound: ${s.sound ? "On" : "Off"}</button>
        <button class="pillBtn" id="toggleAnim">Animations: ${s.animations ? "On" : "Off"}</button>
        <button class="pillBtn" id="editTasks">Edit Tasks</button>
        <button class="pillBtn" id="wipe" style="border-color:#fecaca">Wipe Data</button>
      </div>
    `;

    wrap.querySelector("#toggleSound").addEventListener("click", () => {
      s.sound = !s.sound; saveState(); openSettings(); clickSound();
    });
    wrap.querySelector("#toggleAnim").addEventListener("click", () => {
      s.animations = !s.animations; saveState(); openSettings(); clickSound();
    });
    wrap.querySelector("#editTasks").addEventListener("click", () => { clickSound(); openTaskEditor(); });
    wrap.querySelector("#wipe").addEventListener("click", () => {
      if(confirm("Wipe all ChoreChampions data on this device?")){
        APP.state = structuredClone(DEFAULT);
        saveState();
        ensureDay(APP.dateISO);
        closeModal();
        goHome();
        warnSound();
      }
    });

    openModal("Settings", wrap);
  }

  function openExport(){
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="notice">Export is for backups or moving to another device.</div>
      <div style="height:12px"></div>
      <div style="display:flex; gap:12px; flex-wrap:wrap">
        <button class="pillBtn" id="copyJson">Copy JSON</button>
        <button class="pillBtn" id="dlJson">Download JSON</button>
        <button class="pillBtn" id="dlCsv">Download CSV</button>
      </div>
      <div style="height:14px"></div>
      <div class="notice">Import JSON (replaces current data)</div>
      <div style="height:8px"></div>
      <textarea id="importBox" style="width:100%; min-height:120px; border-radius:18px; padding:12px; border:1px solid #e5e7eb;"></textarea>
      <div style="height:10px"></div>
      <button class="pillBtn" id="importBtn">Import</button>
    `;

    wrap.querySelector("#copyJson").addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(JSON.stringify(APP.state, null, 2));
        toast("Copied!");
        checkSound();
      }catch(e){
        alert("Clipboard not available. Use Download JSON.");
      }
    });
    wrap.querySelector("#dlJson").addEventListener("click", () => {
      download("chorechampions_backup.json", JSON.stringify(APP.state, null, 2), "application/json");
      checkSound();
    });
    wrap.querySelector("#dlCsv").addEventListener("click", () => {
      download("chorechampions_history.csv", buildCSV(), "text/csv");
      checkSound();
    });
    wrap.querySelector("#importBtn").addEventListener("click", () => {
      const txt = wrap.querySelector("#importBox").value.trim();
      if(!txt) return;
      try{
        const obj = JSON.parse(txt);
        if(!obj.people || !obj.routines || !obj.dailyLog) throw new Error("Not a valid export.");
        APP.state = obj;
        saveState();
        ensureDay(APP.dateISO);
        closeModal();
        rerender();
        celebrate("Imported!");
      }catch(e){
        alert("Import failed: " + e.message);
      }
    });

    openModal("Export", wrap);
  }

    function openTaskEditor(lockToCurrentPerson=false){
    // Editor: edit tasks for a person & routine.
    // When launched from a person's task screen, editing is locked to that person
    // so each family member can safely maintain their own lists.
    const wrap = document.createElement("div");

    const currentPersonId = (APP.route.name === "tasks")
      ? APP.route.personId
      : APP.state.people[0].id;

    wrap.innerHTML = `
      <div class="notice">
        Edit tasks (one per line). Format: <b>icon | task name | points</b>.<br>
        Example: 🪥 | Brush Teeth | 5
      </div>
      <div style="height:12px"></div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center">
        <select id="personSel" class="pillBtn" style="padding:12px 14px"></select>
        <select id="modeSel" class="pillBtn" style="padding:12px 14px">
          <option value="morning">Morning</option>
          <option value="evening">Evening</option>
        </select>
        <button class="pillBtn" id="load">Load</button>
        <button class="pillBtn" id="save" style="border-color:#bbf7d0">Save</button>
      </div>

      <div style="height:10px"></div>
      <textarea id="box" style="width:100%; min-height:240px; border-radius:18px; padding:12px; border:1px solid #e5e7eb;"></textarea>

      <div style="height:12px"></div>
      <div class="notice">
        Tip: Keep tasks short and specific (it makes streaks feel more achievable).
      </div>
    `;

    const personSel = wrap.querySelector("#personSel");
    for(const p of APP.state.people){
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.name;
      personSel.appendChild(o);
    }

    if(lockToCurrentPerson){
      personSel.value = currentPersonId;
      personSel.disabled = true;
      personSel.style.opacity = "0.85";
      personSel.title = "Editing is locked to the selected person from the task screen.";
    }else{
      personSel.value = currentPersonId;
    }

    const modeSel = wrap.querySelector("#modeSel");

    function loadBox(){
      const pid = personSel.value;
      const mode = modeSel.value;
      const tasks = getTasks(mode, pid);
      wrap.querySelector("#box").value = tasks
        .map(t => `${t.icon||"✅"} | ${t.name} | ${t.pts||5}`)
        .join("\\n");
    }

    wrap.querySelector("#load").addEventListener("click", () => { clickSound(); loadBox(); });

    wrap.querySelector("#save").addEventListener("click", () => {
      const pid = personSel.value;
      const mode = modeSel.value;
      const lines = wrap.querySelector("#box").value
        .split(/\\r?\\n/)
        .map(s=>s.trim())
        .filter(Boolean);

      const tasks = lines.map((line, idx) => {
        const parts = line.split("|").map(p=>p.trim());
        const icon = parts[0] || "✅";
        const name = parts[1] || `Task ${idx+1}`;
        const pts = clampInt(parseInt(parts[2]||"0",10), 1, 100) || 5;
        // Stable IDs by index for this routine so completion doesn't drift after minor edits
        return { id: `t_${mode}_${idx+1}`, icon, name, pts };
      });

      APP.state.routines[mode].tasks[pid] = tasks;

      // prune doneIds for the currently-viewed day (this mode/person)
      ensureDay(APP.dateISO);
      const log = getPersonLog(APP.dateISO, mode, pid);
      const allowed = new Set(tasks.map(t=>t.id));
      log.doneIds = log.doneIds.filter(id => allowed.has(id));

      saveState();
      toast("Saved.");
      checkSound();
      rerender();
    });

    // default routine
    modeSel.value = (APP.route.name === "tasks") ? APP.mode : "morning";
    loadBox();

    openModal(lockToCurrentPerson ? "Edit Your Tasks" : "Edit Tasks", wrap);
  }

  // ----- calculations -----
  function pointsForDone(tasks, doneIds){
    const map = new Map(tasks.map(t=>[t.id, t.pts||5]));
    return doneIds.reduce((sum,id)=>sum+(map.get(id)||0),0);
  }

  function totalsForDayMode(dateISO, mode){
    const day = APP.state.dailyLog[dateISO];
    if(!day) return { done:0, total:0, points:0 };
    let done=0,total=0,points=0;
    for(const p of APP.state.people){
      const tasks = getTasks(mode, p.id);
      const log = day[mode][p.id] || { doneIds:[] };
      total += tasks.length;
      done += log.doneIds.length;
      points += pointsForDone(tasks, log.doneIds);
    }
    return {done,total,points};
  }

  function sumPointsForPerson(personId, daysBack){
    const dates = Object.keys(APP.state.dailyLog).sort().reverse();
    const cutoff = new Date(isoToday()+"T12:00:00");
    let sum=0;
    for(const dateISO of dates){
      const d = new Date(dateISO+"T12:00:00");
      const diff = Math.round((cutoff - d) / (1000*60*60*24));
      if(diff < 0) continue;
      if(diff >= daysBack) continue;
      for(const mode of ["morning","evening"]){
        const tasks = getTasks(mode, personId);
        const log = APP.state.dailyLog[dateISO]?.[mode]?.[personId];
        if(log) sum += pointsForDone(tasks, log.doneIds);
      }
    }
    return sum;
  }

  function computePersonStreak(personId, mode){
    // streak: consecutive days up to today where ALL tasks for this person+mode are complete
    let streak=0;
    const cursor = new Date(isoToday()+"T12:00:00");
    for(;;){
      const iso = cursor.toISOString().slice(0,10);
      const day = APP.state.dailyLog[iso];
      if(!day) break;
      const tasks = getTasks(mode, personId);
      const log = day[mode]?.[personId];
      if(!tasks.length || !log) break;
      if(log.doneIds.length === tasks.length){
        streak++;
      }else{
        break;
      }
      cursor.setDate(cursor.getDate()-1);
    }
    return streak;
  }

  // ----- progress ring -----
  function progressRingHTML(pct){
    const r = 62;
    const c = 2 * Math.PI * r;
    const dash = Math.max(0, Math.min(100, pct)) / 100 * c;
    return `
      <div class="ringCard" aria-label="${pct}% complete">
        <svg viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="${r}" stroke="#e5e7eb" stroke-width="12" fill="none" />
          <circle cx="80" cy="80" r="${r}" stroke="#22c55e" stroke-width="12" fill="none"
            stroke-linecap="round"
            stroke-dasharray="${dash} ${c-dash}"
          />
        </svg>
        <div class="ringCenter">
          <div class="ringPct">${pct}%</div>
          <div class="ringLabel">Complete</div>
        </div>
      </div>
    `;
  }

  // ----- storage -----
  function loadState(){
    try{
      const raw = localStorage.getItem(APP.storageKey);
      if(!raw) return structuredClone(DEFAULT);
      const obj = JSON.parse(raw);
      if(!obj.people || !obj.routines || !obj.dailyLog) return structuredClone(DEFAULT);
      return obj;
    }catch(e){
      return structuredClone(DEFAULT);
    }
  }
  function saveState(){
    localStorage.setItem(APP.storageKey, JSON.stringify(APP.state));
  }

  function ensureDay(dateISO){
    if(!APP.state.dailyLog[dateISO]){
      APP.state.dailyLog[dateISO] = { morning:{}, evening:{}, meta:{} };
    }
    const day = APP.state.dailyLog[dateISO];
    day.meta ||= {};
    for(const mode of ["morning","evening"]){
      day[mode] ||= {};
      for(const p of APP.state.people){
        day[mode][p.id] ||= { doneIds: [] };
      }
    }
    saveState();
  }

  function getPersonLog(dateISO, mode, personId){
    ensureDay(dateISO);
    return APP.state.dailyLog[dateISO][mode][personId];
  }
  function getDayMeta(dateISO){
    ensureDay(dateISO);
    return APP.state.dailyLog[dateISO].meta;
  }

  // ----- utils -----
  function getPerson(id){ return APP.state.people.find(p=>p.id===id); }
  function getTasks(mode, personId){ return APP.state.routines[mode].tasks[personId] || []; }

  function mount(node){
    APP.ui.main.innerHTML = "";
    APP.ui.main.appendChild(node);
    APP.ui.main.scrollTop = 0;
  }

  function div(cls){
    const d = document.createElement("div");
    d.className = cls;
    return d;
  }
  function qs(sel){ return document.querySelector(sel); }

  function isoToday(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const da = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${da}`;
  }
  function prettyDate(iso){
    const d = new Date(iso+"T12:00:00");
    return new Intl.DateTimeFormat(undefined, {weekday:"long", month:"long", day:"numeric"}).format(d);
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  }
  function slug(s){
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,24) || "task";
  }
  function clampInt(n, min, max){
    if(!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function download(name, text, mime){
    const blob = new Blob([text], {type:mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 800);
  }

  function buildCSV(){
    const rows = [["date","mode","person","done","total","points"].join(",")];
    const dates = Object.keys(APP.state.dailyLog).sort();
    for(const dateISO of dates){
      for(const mode of ["morning","evening"]){
        for(const p of APP.state.people){
          const tasks = getTasks(mode, p.id);
          const log = APP.state.dailyLog[dateISO]?.[mode]?.[p.id] || { doneIds:[] };
          const done = log.doneIds.length;
          const total = tasks.length;
          const points = pointsForDone(tasks, log.doneIds);
          rows.push([dateISO, mode, p.name, done, total, points].join(","));
        }
      }
    }
    return rows.join("\n");
  }

  // ----- micro-animations -----
  function pulse(){
    const el = APP.ui.pageTitle;
    el.animate([{transform:"scale(1)"},{transform:"scale(1.01)"},{transform:"scale(1)"}], {duration: 220, easing:"ease-out"});
  }

  function toast(msg){
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.position="fixed";
    t.style.left="50%";
    t.style.bottom="18px";
    t.style.transform="translateX(-50%)";
    t.style.padding="12px 14px";
    t.style.borderRadius="999px";
    t.style.background="#111827";
    t.style.color="#fff";
    t.style.fontWeight="900";
    t.style.boxShadow="0 12px 30px rgba(0,0,0,0.20)";
    t.style.zIndex="60";
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 1100);
  }

  // ----- sounds -----
  function playTone(freq, ms, type="sine", vol=0.06){
    if(!APP.state.settings.sound) return;
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(()=>{ o.stop(); ctx.close(); }, ms);
    }catch(e){}
  }
  function clickSound(){ playTone(520, 35, "square", 0.03); }
  function checkSound(){ playTone(880, 80, "triangle", 0.06); }
  function uncheckSound(){ playTone(320, 65, "sine", 0.05); }
  function warnSound(){ playTone(220, 160, "sawtooth", 0.05); }
  function cheerSound(){
    if(!APP.state.settings.sound) return;
    playTone(660, 70, "triangle", 0.06);
    setTimeout(()=>playTone(880, 70, "triangle", 0.06), 90);
    setTimeout(()=>playTone(990, 90, "triangle", 0.06), 180);
  }

  // ----- confetti -----
  function celebrate(msg){
    toast(msg);
    cheerSound();
    if(APP.state.settings.animations) confetti(1100);
  }

  function confetti(durationMs){
    if(APP.confettiRunning) return;
    APP.confettiRunning = true;

    const canvas = APP.ui.confetti;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w*dpr);
    canvas.height = Math.floor(h*dpr);
    canvas.style.width = w+"px";
    canvas.style.height = h+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);

    const pieces = [];
    const N = 140;
    for(let i=0;i<N;i++){
      pieces.push({
        x: Math.random()*w,
        y: -20 - Math.random()*h*0.25,
        vx: -1 + Math.random()*2,
        vy: 2 + Math.random()*4.5,
        r: 3 + Math.random()*5,
        rot: Math.random()*Math.PI,
        vr: -0.25 + Math.random()*0.5,
        a: 0.7 + Math.random()*0.3
      });
    }

    canvas.classList.add("on");
    const t0 = performance.now();

    function step(now){
      const t = now - t0;
      ctx.clearRect(0,0,w,h);

      for(const p of pieces){
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vy += 0.02;
        p.vx *= 0.999;

        ctx.save();
        ctx.translate(p.x,p.y);
        ctx.rotate(p.rot);
        const hue = (p.x + p.y + t*0.15) % 360;
        ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${p.a})`;
        roundRect(ctx, -p.r, -p.r/2, p.r*2, p.r, 3);
        ctx.fill();
        ctx.restore();
      }

      if(t < durationMs){
        requestAnimationFrame(step);
      }else{
        canvas.classList.remove("on");
        ctx.clearRect(0,0,w,h);
        APP.confettiRunning = false;
      }
    }
    requestAnimationFrame(step);
  }

  function roundRect(ctx, x, y, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

})();
