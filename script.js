/* ===================================================
   SMART ATTENDANCE SYSTEM — script.js
   --- FIXED + UPGRADED ---
   =================================================== */

/* =============================================
   PART 1: DATA MODEL
   ============================================= */

const DEFAULT_PROFILES = {

  suhani: {
    mon: [
      {start:"10:45", end:"11:45", subject:"HRM", room:"R202", teacher:"Sunita Chhabra", type:"DSC", status:null},
      {start:"11:45", end:"12:45", subject:"Corporate Accounting", room:"R301", teacher:"Devendra Malapati", type:"DSC", status:null},
      {start:"12:45", end:"13:05", subject:"Lunch Break", type:"BREAK", status:null},
      {start:"13:05", end:"14:05", subject:"GE II", room:"Th321", teacher:"Drishti Joshi", type:"GE", status:null},
      {start:"14:05", end:"15:05", subject:"EVS", room:"R216", type:"DSC", status:null},
      {start:"15:05", end:"16:05", subject:"EVS", room:"R216", type:"DSC", status:null}
    ],
    tue: [
      {start:"10:45", end:"11:45", subject:"Company Law Tutorial G1", room:"R205", teacher:"Sindhu Mani", type:"TUTORIAL", status:null},
      {start:"11:45", end:"12:45", subject:"HRM Tutorial G1", room:"R202", teacher:"Sunita Chhabra", type:"TUTORIAL", status:null},
      {start:"12:45", end:"13:05", subject:"Lunch Break", type:"BREAK", status:null},
      {start:"13:05", end:"14:05", subject:"Corporate Accounting", room:"R202", teacher:"Devendra Malapati", type:"DSC", status:null},
      {start:"14:05", end:"15:05", subject:"Company Law", room:"R202", teacher:"Sindhu Mani", type:"DSC", status:null},
      {start:"15:05", end:"16:05", subject:"VAC Semester II", type:"VAC", status:null},
      {start:"16:05", end:"17:05", subject:"VAC Semester II", type:"VAC", status:null}
    ],
    wed: [
      {start:"08:45", end:"09:45", subject:"GE II", room:"Th321", teacher:"Drishti Joshi", type:"GE", status:null},
      {start:"09:45", end:"10:45", subject:"HRM", room:"R202", teacher:"Sunita Chhabra", type:"DSC", status:null},
      {start:"10:45", end:"11:45", subject:"Company Law", room:"R219", teacher:"Sindhu Mani", type:"DSC", status:null},
      {start:"11:45", end:"12:45", subject:"Company Law Tutorial G2", room:"R205", teacher:"Sindhu Mani", type:"TUTORIAL", status:null},
      {start:"12:45", end:"13:05", subject:"Lunch Break", type:"BREAK", status:null},
      {start:"13:05", end:"14:05", subject:"HRM Tutorial G2", room:"R207", teacher:"Sunita Chhabra", type:"TUTORIAL", status:null}
    ],
    thu: [
      {start:"08:45", end:"09:45", subject:"EVS", room:"R202", type:"DSC", status:null},
      {start:"09:45", end:"10:45", subject:"HRM", room:"R202", teacher:"Sunita Chhabra", type:"DSC", status:null},
      {start:"10:45", end:"11:45", subject:"Corporate Accounting Tutorial", room:"R207", teacher:"P. Chengarayulu", type:"TUTORIAL", status:null},
      {start:"11:45", end:"12:45", subject:"HRM Tutorial G3", room:"R207", teacher:"Sunita Chhabra", type:"TUTORIAL", status:null},
      {start:"12:45", end:"13:05", subject:"Lunch Break", type:"BREAK", status:null},
      {start:"13:05", end:"14:05", subject:"Corporate Accounting Tutorial", teacher:"P. Chengarayulu", type:"TUTORIAL", status:null}
    ],
    fri: [
      {start:"08:45", end:"09:45", subject:"Corporate Accounting", room:"R201", teacher:"Devendra Malapati", type:"DSC", status:null},
      {start:"09:45", end:"10:45", subject:"Break", type:"BREAK", status:null},
      {start:"10:45", end:"11:45", subject:"Company Law Tutorial G3", room:"R205", teacher:"Sindhu Mani", type:"TUTORIAL", status:null},
      {start:"11:45", end:"12:45", subject:"Company Law", room:"R321", teacher:"Sindhu Mani", type:"DSC", status:null},
      {start:"12:45", end:"13:05", subject:"Lunch Break", type:"BREAK", status:null},
      {start:"13:05", end:"14:05", subject:"GE II Practical", type:"PRACTICAL", status:null},
      {start:"14:05", end:"15:05", subject:"GE II Practical", type:"PRACTICAL", status:null},
      {start:"15:05", end:"16:05", subject:"GE II Practical", type:"PRACTICAL", status:null}
    ],
    sat: [
      {start:"08:45", end:"09:45", subject:"SEC Semester II", type:"SEC", status:null},
      {start:"09:45", end:"10:45", subject:"SEC Semester II", type:"SEC", status:null},
      {start:"10:45", end:"11:45", subject:"SEC Semester II", type:"SEC", status:null},
      {start:"11:45", end:"12:45", subject:"SEC Semester II", type:"SEC", status:null},
      {start:"12:45", end:"13:05", subject:"Lunch Break", type:"BREAK", status:null},
      {start:"13:05", end:"14:05", subject:"VAC Semester II", type:"VAC", status:null},
      {start:"14:05", end:"15:05", subject:"VAC Semester II", type:"VAC", status:null},
      {start:"15:05", end:"16:05", subject:"AEC Semester II", type:"AEC", status:null},
      {start:"16:05", end:"17:05", subject:"AEC Semester II", type:"AEC", status:null}
    ]
  },

  laksh: {
    mon: [
      {start:"08:30", end:"09:30", subject:"HRM", room:"R27", teacher:"Nisha Devi", type:"DSC", status:null},
      {start:"09:30", end:"10:30", subject:"Company Law", room:"R1", teacher:"Abhishek", type:"DSC", status:null},
      {start:"10:30", end:"11:30", subject:"Break Gap", type:"BREAK", status:null},
      {start:"11:30", end:"12:30", subject:"VAC - Vedic Maths", room:"R33", teacher:"Priyanka Modi", type:"VAC", status:null},
      {start:"13:30", end:"14:00", subject:"Lunch Break", type:"BREAK", status:null},
      {start:"14:00", end:"15:00", subject:"SEC - Digital Marketing", room:"R18", teacher:"Tanisha", type:"SEC", status:null}
    ],
    tue: [
      {start:"08:30", end:"09:30", subject:"PME", room:"R35", teacher:"Kritika", type:"DSC", status:null},
      {start:"09:30", end:"10:30", subject:"EVS", room:"Library FF", teacher:"Franky Varah", type:"DSC", status:null},
      {start:"10:30", end:"11:30", subject:"Corporate Accounting", room:"R27", teacher:"Priya Chaurasia", type:"DSC", status:null},
      {start:"11:30", end:"12:30", subject:"Company Law", room:"R2", teacher:"Abhishek", type:"DSC", status:null}
    ],
    wed: [
      {start:"08:30", end:"09:30", subject:"PME", room:"R15", teacher:"Kritika", type:"DSC", status:null},
      {start:"09:30", end:"10:30", subject:"EVS", room:"SCR4", teacher:"EVSG1", type:"PRACTICAL", status:null},
      {start:"10:30", end:"11:30", subject:"Tute Company Law", room:"T9", teacher:"Renu Aggarwal", type:"TUTORIAL", status:null},
      {start:"11:30", end:"12:30", subject:"HRM", room:"R1", teacher:"Nisha Devi", type:"DSC", status:null},
      {start:"12:30", end:"13:30", subject:"Tute PME", room:"T24", teacher:"Anuradha", type:"TUTORIAL", status:null}
    ],
    thu: [
      {start:"08:30", end:"09:30", subject:"PME", room:"R15", teacher:"Kritika", type:"DSC", status:null},
      {start:"09:30", end:"10:30", subject:"Corporate Accounting", room:"R33", teacher:"Priya Chaurasia", type:"DSC", status:null},
      {start:"10:30", end:"11:30", subject:"EVS", room:"R30", teacher:"EVSG1", type:"PRACTICAL", status:null},
      {start:"11:30", end:"12:30", subject:"Tute HRM", room:"T14", teacher:"Shashank", type:"TUTORIAL", status:null}
    ],
    fri: [
      {start:"08:30", end:"09:30", subject:"HRM", room:"R18", teacher:"Nisha Devi", type:"DSC", status:null},
      {start:"09:30", end:"10:30", subject:"Company Law", room:"R1", teacher:"Abhishek", type:"DSC", status:null},
      {start:"10:30", end:"11:30", subject:"Tute Corporate Accounting", room:"T36", teacher:"Saroj", type:"TUTORIAL", status:null},
      {start:"11:30", end:"12:30", subject:"Break", type:"BREAK", status:null},
      {start:"12:30", end:"13:30", subject:"Corporate Accounting", room:"R1", teacher:"Priya Chaurasia", type:"DSC", status:null},
      {start:"13:30", end:"14:00", subject:"Lunch Break", type:"BREAK", status:null},
      {start:"14:00", end:"15:00", subject:"VAC - Vedic Maths", type:"VAC", status:null}
    ],
    sat: []
  }
};

/* =============================================
   DATA MIGRATION
   ============================================= */
function migrateItem(item) {
  if (item.time && !item.start) {
    item.start = item.time;
    const [h, m] = item.time.split(":").map(Number);
    const endMins = h * 60 + m + 60;
    item.end = `${String(Math.floor(endMins/60)).padStart(2,"0")}:${String(endMins%60).padStart(2,"0")}`;
    delete item.time;
  }
  if (!item.type) item.type = guessType(item);
  if (item.tag) {
    const tagMap = { lecture:"DSC", tutorial:"TUTORIAL", break:"BREAK", practical:"PRACTICAL" };
    if (!item.type || item.type === guessType(item)) {
      item.type = tagMap[item.tag.toLowerCase()] || item.type || "DSC";
    }
    delete item.tag;
  }
  if (item.status === undefined) item.status = null;
  return item;
}

function guessType(item) {
  const s = (item.subject || "").toLowerCase();
  if (s.includes("break") || s.includes("lunch") || s.includes("gap")) return "BREAK";
  if (s.includes("practical")) return "PRACTICAL";
  if (s.includes("tut")) return "TUTORIAL";
  if (s.includes("vac")) return "VAC";
  if (s.includes("aec")) return "AEC";
  if (s.includes("sec")) return "SEC";
  if (s.includes("ge ") || s.startsWith("ge")) return "GE";
  return "DSC";
}

function migrateProfiles(data) {
  for (const prof in data) {
    for (const day in data[prof]) {
      data[prof][day] = data[prof][day].map(migrateItem);
    }
  }
  return data;
}

/* =============================================
   STATE
   ============================================= */
let currentProfile = "suhani";
let currentDay     = "mon";
let currentTab     = "schedule";
let detailSubjectKey = null;

const FULL_DATA_KEY = "timetable_full_data_v3";

let profiles = (() => {
  try {
    const saved = localStorage.getItem(FULL_DATA_KEY);
    if (saved) return migrateProfiles(JSON.parse(saved));
    const legacy = localStorage.getItem("timetable_full_data_v2");
    if (legacy) return migrateProfiles(JSON.parse(legacy));
  } catch(e) { console.warn("Load error:", e); }
  return migrateProfiles(JSON.parse(JSON.stringify(DEFAULT_PROFILES)));
})();

let modalDayKey    = null;
let modalItemIndex = null;
let isEditing      = false;
let originalValues = {};

/* =============================================
   HELPERS
   ============================================= */
function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function getNow() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}
function getToday() {
  return ["sun","mon","tue","wed","thu","fri","sat"][new Date().getDay()];
}
function formatTime(diff) {
  const h = Math.floor(diff / 60), m = diff % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
function isBreakItem(item) {
  const type = (item.type || "").toUpperCase();
  if (type === "BREAK") return true;
  const s = (item.subject || "").toLowerCase();
  return s.includes("break") || s.includes("lunch") || s.includes("gap");
}
function isValid(v) { return v && v !== "-" && v !== "undefined"; }
function isToday(day) { return day === getToday(); }

function formatTimeRange(start, end) {
  const fmt = (t) => {
    const [h, m] = t.split(":").map(Number);
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2,"0")}`;
  };
  const [h] = end.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${fmt(start)}\n${fmt(end)} ${ampm}`;
}
function minsToDisplay(mins) {
  const h = Math.floor(mins/60), m = mins%60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h%12||12;
  return `${h12}:${m.toString().padStart(2,"0")} ${ampm}`;
}
function formatDisplayTime(time) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h%12||12;
  return `${h12}:${m.toString().padStart(2,"0")} ${ampm}`;
}

const DAY_KEYS  = ["mon","tue","wed","thu","fri","sat"];
const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat"];

/* =============================================
   STORAGE
   ============================================= */
function saveEditsToStorage() {
  try { localStorage.setItem(FULL_DATA_KEY, JSON.stringify(profiles)); }
  catch(e) { console.warn("Save error:", e); }
}

/* =============================================
   DRAWER
   ============================================= */
function openDrawer()  {
  document.getElementById("drawer").classList.add("open");
  document.getElementById("drawerOverlay").classList.add("open");
}
function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawerOverlay").classList.remove("open");
}

/* =============================================
   TAB SWITCHING
   ============================================= */
function switchTab(tab) {
  currentTab = tab;
  closeDrawer();
  document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");
  document.querySelectorAll(".drawer-nav-item").forEach(b => b.classList.remove("active"));
  const navBtn = document.getElementById(`nav-${tab}`);
  if (navBtn) navBtn.classList.add("active");
  const label = document.getElementById("header-tab-label");
  if (label) label.textContent = tab === "schedule" ? "Schedule" : "Attendance";
  const popup = document.getElementById("nextClassPopup");
  if (popup) popup.style.display = tab === "schedule" ? "" : "none";
  if (tab === "attendance") renderAttendance();
}

/* =============================================
   PROFILE SWITCH
   ============================================= */
function switchProfile(profile, btn) {
  currentProfile = profile;
  localStorage.setItem("timetable_profile", profile);
  document.querySelectorAll(".drawer-profile-btn").forEach(b => b.classList.remove("active"));
  if (btn && btn.classList.contains("drawer-profile-btn")) btn.classList.add("active");
  document.getElementById("dCheck-suhani").style.display = profile === "suhani" ? "" : "none";
  document.getElementById("dCheck-laksh").style.display  = profile === "laksh"  ? "" : "none";

  const avatar    = document.getElementById("header-avatar");
  const drawerAva = document.getElementById("drawer-avatar");
  const title     = document.getElementById("header-title");
  const dname     = document.getElementById("drawer-name");

  if (profile === "suhani") {
    avatar.src = drawerAva.src = "https://i.pinimg.com/564x/02/a9/55/02a9551d5605cfb4a3f2ae976905f09e.jpg";
    title.textContent   = "Suhani's Timetable";
    dname.textContent   = "Suhani";
  } else {
    avatar.src = drawerAva.src = "https://i.pinimg.com/originals/f4/2a/f1/f42af16ba580f84430d39a5838ad0c70.jpg";
    title.textContent   = "Laksh's Timetable";
    dname.textContent   = "Laksh";
  }

  const activeBtn = document.querySelector(`.tabs button[data-day="${currentDay}"]`);
  showDay(currentDay, activeBtn);
  updateBusySection();
  if (currentTab === "attendance") renderAttendance();
  closeDrawer();
}

/* =============================================
   SCHEDULE RENDER
   ============================================= */
function showDay(day, btn = null, direction = null) {
  currentDay = day;
  const container = document.getElementById("schedule");
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const dayData      = profiles[currentProfile][day];
  const viewingToday = isToday(day);

  if (direction) {
    const outClass = direction === "left" ? "slide-out-left" : "slide-out-right";
    container.classList.add(outClass);
    setTimeout(() => {
      container.classList.remove(outClass);
      const inClass = direction === "left" ? "slide-in-left" : "slide-in-right";
      container.classList.add(inClass);
      renderSchedule(container, dayData, viewingToday, day);
      requestAnimationFrame(() => requestAnimationFrame(() => container.classList.remove(inClass)));
    }, 180);
  } else {
    renderSchedule(container, dayData, viewingToday, day);
  }
}

function renderSchedule(container, dayData, viewingToday, day) {
  container.innerHTML = "";
  if (!dayData || dayData.length === 0) {
    container.innerHTML = `
      <div class="sleep">
        <span class="sleep-emoji">😴</span>
        <div class="sleep-title">Rest Day!</div>
        <div class="sleep-sub">No classes today. Enjoy the break!</div>
      </div>`;
    updatePopup(null, day);
    return;
  }

  const now = getNow();
  let nextClassTime = null, currentCardId = null;

  dayData.forEach((item, index) => {
    const startMin    = toMinutes(item.start);
    const endMin      = toMinutes(item.end);
    const isCurrent   = viewingToday && (now >= startMin && now < endMin);
    const isBreakCard = isBreakItem(item);
    const cardId      = `card-${index}`;

    if (viewingToday && startMin > now && nextClassTime === null && !isBreakCard)
      nextClassTime = startMin;
    if (isCurrent) currentCardId = cardId;

    const type       = (item.type || "DSC").toUpperCase();
    const tagLabel   = isCurrent ? "live" : type;
    const tagText    = isCurrent ? "🔴 LIVE" : type;
    const extraClass = isBreakCard ? " break-card" : "";

    const roomChip    = !isBreakCard && isValid(item.room)    ? `<span class="room">📍 ${item.room}</span>` : '';
    const teacherChip = !isBreakCard && isValid(item.teacher) ? `<span class="teacher">👤 ${item.teacher}</span>` : '';
    const bottomRow   = (roomChip || teacherChip) ? `<div class="bottomRow">${roomChip}${teacherChip}</div>` : '';

    let progressHTML = '';
    if (isCurrent) {
      const elapsed  = now - startMin;
      const duration = endMin - startMin || 60;
      const pct = Math.min(100, Math.max(0, (elapsed / duration) * 100));
      progressHTML = `<div class="progress-overlay" style="background:linear-gradient(90deg,rgba(29,61,155,0.06) 0%,rgba(29,61,155,0.06) ${pct}%,transparent ${pct}%,transparent 100%);"></div>`;
    }

    const liveCharSrc = "https://media.tenor.com/oajbons5PGEAAAAC/shinchan-cute.gif";
    const charHTML = isCurrent ? `<div class="shinchan-live"><img src="${liveCharSrc}" alt="live"></div>` : '';

    const timeDisplay = formatTimeRange(item.start, item.end);

    let statusBadge = '';
    if (!isBreakCard && item.status) {
      const labels = { attended:'✅', missed:'❌', cancelled:'🚫' };
      statusBadge = `<span class="status-badge ${item.status}">${labels[item.status] || ''}</span>`;
    }

    const statusAttr = item.status ? `data-status="${item.status}"` : '';

    let actionsHTML = '';
    if (!isBreakCard) {
      const aActive = item.status === "attended"  ? " selected" : "";
      const mActive = item.status === "missed"    ? " selected" : "";
      const cActive = item.status === "cancelled" ? " selected" : "";
      actionsHTML = `
        <div class="card-actions" onclick="event.stopPropagation()">
          <button class="action-btn act-attend${aActive}"
            onclick="quickMark('${day}',${index},'attended',this)">✅</button>
          <button class="action-btn act-miss${mActive}"
            onclick="quickMark('${day}',${index},'missed',this)">❌</button>
          <button class="action-btn act-cancel${cActive}"
            onclick="quickMark('${day}',${index},'cancelled',this)">🚫</button>
        </div>`;
    }

    container.innerHTML += `
      <div id="${cardId}" class="card${isCurrent ? ' current' : ''}${extraClass}"
           ${statusAttr}
           onclick="openModal('${day}', ${index})">
        ${progressHTML}
        <div class="time">${timeDisplay}</div>
        <div class="divider"></div>
        <div class="content">
          <div class="subject">${item.subject}</div>
          ${bottomRow}
          ${actionsHTML}
        </div>
        <div class="card-right">
          <span class="tag ${tagLabel}">${tagText}</span>
          ${statusBadge}
        </div>
        ${charHTML}
      </div>`;
  });

  if (currentCardId) {
    const el = document.getElementById(currentCardId);
    if (el) setTimeout(() => el.scrollIntoView({ behavior:"smooth", block:"center" }), 350);
  }
  updatePopup(nextClassTime, day);
}

/* =============================================
   QUICK MARK
   ============================================= */
function quickMark(dayKey, itemIndex, status, btnEl) {
  const item = profiles[currentProfile][dayKey][itemIndex];
  if (!item) return;
  item.status = (item.status === status) ? null : status;
  saveEditsToStorage();

  const cardId = `card-${itemIndex}`;
  const card = document.getElementById(cardId);
  if (card) {
    if (item.status) card.setAttribute("data-status", item.status);
    else card.removeAttribute("data-status");
    card.querySelectorAll(".action-btn").forEach(b => {
      b.classList.remove("selected");
      if (item.status) {
        if ((b.classList.contains("act-attend")  && item.status === "attended")  ||
            (b.classList.contains("act-miss")    && item.status === "missed")    ||
            (b.classList.contains("act-cancel")  && item.status === "cancelled")) {
          b.classList.add("selected");
        }
      }
    });
    const right = card.querySelector(".card-right");
    if (right) {
      const old = right.querySelector(".status-badge");
      if (old) old.remove();
      if (item.status) {
        const labels = { attended:'✅', missed:'❌', cancelled:'🚫' };
        const badge = document.createElement("span");
        badge.className = `status-badge ${item.status}`;
        badge.textContent = labels[item.status];
        right.appendChild(badge);
      }
    }
  }
  if (currentTab === "attendance") renderAttendance();
}

/* =============================================
   POPUP
   ============================================= */
function updatePopup(nextClassTime, day) {
  const popup = document.getElementById("nextClassPopup");
  if (!popup) return;
  const text = popup.querySelector(".popup-text");
  const icon = popup.querySelector(".popup-icon");
  const viewingToday = isToday(day);

  if (viewingToday) {
    if (nextClassTime !== null) {
      const diff = nextClassTime - getNow();
      text.textContent = diff <= 0 ? "Class starting now!" : `Next class in ${formatTime(diff)}`;
      icon.textContent = "⏳";
    } else {
      text.textContent = "No more classes today!";
      icon.textContent = "🎉";
    }
  } else {
    const dayData = profiles[currentProfile][day];
    const firstClass = dayData && dayData.find(item => !isBreakItem(item));
    if (firstClass) {
      text.textContent = `First class at ${formatDisplayTime(firstClass.start)}`;
      icon.textContent = "📅";
    } else {
      text.textContent = "No classes this day";
      icon.textContent = "😴";
    }
  }
}

/* =============================================
   WHO'S BUSY
   ============================================= */
function getBusyIntervals(profile, dayKey) {
  const dayData = profiles[profile][dayKey];
  if (!dayData) return [];
  return dayData.filter(i => !isBreakItem(i)).map(i => [toMinutes(i.start), toMinutes(i.end)]);
}
function hasClassesRemainingToday(profile, dayKey, nowMins) {
  const dayData = profiles[profile][dayKey];
  if (!dayData) return false;
  return dayData.some(i => !isBreakItem(i) && toMinutes(i.end) > nowMins);
}
function findNextCommonFreeTime() {
  const today    = getToday();
  const todayIdx = DAY_KEYS.indexOf(today);
  if (todayIdx === -1) return null;
  const now = getNow();
  if (!hasClassesRemainingToday("suhani", today, now) && !hasClassesRemainingToday("laksh", today, now))
    return null;
  for (let offset = 0; offset < 7; offset++) {
    const dayIdx   = (todayIdx + offset) % DAY_KEYS.length;
    const dayKey   = DAY_KEYS[dayIdx];
    const busySet  = new Set();
    [...getBusyIntervals("suhani", dayKey), ...getBusyIntervals("laksh", dayKey)]
      .forEach(([s,e]) => { for (let m=s;m<e;m++) busySet.add(m); });
    const startMin = offset === 0 ? now : 8 * 60;
    for (let m = startMin; m <= 22*60; m++) {
      if (!busySet.has(m) && m >= 8*60) {
        const label = offset===0?"Today":offset===1?"Tomorrow":DAY_NAMES[dayIdx];
        return `${label} at ${minsToDisplay(m)}`;
      }
    }
  }
  return null;
}
function updateBusySection() {
  const today = getToday(), now = getNow();
  const check = profile => {
    const dayData = profiles[profile][today];
    if (!dayData) return null;
    for (const item of dayData) {
      const s = toMinutes(item.start), e = toMinutes(item.end);
      if (now >= s && now < e && !isBreakItem(item)) return item.subject;
    }
    return null;
  };
  const sc = check("suhani"), lc = check("laksh");
  document.getElementById("indicatorSuhani").textContent = sc ? `🔴 ${sc}` : "🟢 Free";
  document.getElementById("indicatorLaksh").textContent  = lc ? `🔴 ${lc}` : "🟢 Free";
  const sum = document.getElementById("busySummary");
  if (sc && lc)        sum.textContent = "Both in class 📚";
  else if (!sc && !lc) sum.textContent = "Both free 🎉";
  else                 sum.textContent = "";
  const row  = document.getElementById("freeTimeRow");
  const text = document.getElementById("freeTimeText");
  const ft   = findNextCommonFreeTime();
  if (ft && row && text) {
    row.style.display = "flex";
    row.classList.remove("hidden");
    text.textContent = `Next free together: ${ft}`;
  } else if (row) {
    row.style.display = "none";
  }
}

/* =============================================
   ATTENDANCE ENGINE
   ============================================= */
function normaliseSubject(subject) {
  return subject
    .toLowerCase()
    .replace(/\s*(tutorial|tute|g1|g2|g3|group\s*\d)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcMarks(pct, type) {
  const t = (type||"DSC").toUpperCase();
  if (["SEC","PRACTICAL","BREAK","GE"].includes(t)) return null;
  let slabs;
  if (t === "DSC")      slabs = [[85,6],[75,3.6],[70,2.4],[67,1.2],[0,0]];
  else if (t === "TUTORIAL") slabs = [[85,5],[75,3],[70,2],[67,1],[0,0]];
  else                  slabs = [[85,2],[75,1.6],[70,1.2],[67,0.8],[0,0]];
  for (const [threshold, marks] of slabs) if (pct >= threshold) return marks;
  return 0;
}

function getSubjectStats() {
  const subjectMap = {};
  for (const day of DAY_KEYS) {
    const dayData = profiles[currentProfile][day] || [];
    dayData.forEach((item, idx) => {
      if (isBreakItem(item)) return;
      const type = (item.type || guessType(item)).toUpperCase();
      if (type === "BREAK") return;
      const key = `${normaliseSubject(item.subject)}__${type}`;
      if (!subjectMap[key]) subjectMap[key] = { subject:item.subject, type, items:[] };
      subjectMap[key].items.push({ item, day, idx });
    });
  }

  const result = [];
  for (const key in subjectMap) {
    const { subject, type, items } = subjectMap[key];
    const attended  = items.filter(i => i.item.status === "attended").length;
    const missed    = items.filter(i => i.item.status === "missed").length;
    const total     = attended + missed;
    const pct       = total > 0 ? Math.round((attended / total) * 100) : 0;
    const marks     = calcMarks(pct, type);
    result.push({ subject, type, items, attended, missed, total, pct, marks, key });
  }
  result.sort((a,b) => a.subject.localeCompare(b.subject));
  return result;
}

/* =============================================
   DECISION ENGINE
   ============================================= */
function getSmartInsight(attended, total, pct, type) {
  if (["SEC","PRACTICAL","GE"].includes((type||"").toUpperCase())) {
    return { insight:"No marks tracked for this type.", risk:null, riskMsg:null };
  }
  if (total === 0) return { insight:"No classes marked yet. Start marking attendance!", risk:null, riskMsg:null };

  const marksNow  = calcMarks(pct, type);
  const totMiss   = total + 1;
  const pctMiss   = Math.round((attended / totMiss) * 100);
  const marksMiss = calcMarks(pctMiss, type);
  const totAtt    = total + 1;
  const pctAtt    = Math.round(((attended+1) / totAtt) * 100);
  const marksAtt  = calcMarks(pctAtt, type);

  let insight = null, risk = null, riskMsg = null;

  if (pct >= 85 && pctMiss >= 85) {
    insight = "Safe to miss next class — you're in the top slab.";
  } else if (marksMiss !== null && marksNow !== null && marksMiss < marksNow) {
    insight = `⚠️ Missing next class drops your marks slab!`;
    risk = "high-risk";
    riskMsg = `Missing next: ${pctMiss}% (${marksMiss} marks) vs current ${marksNow} marks`;
  } else if (marksAtt !== null && marksNow !== null && marksAtt > marksNow) {
    insight = `Attending next class moves you up a slab!`;
  } else if (pct < 75) {
    insight = "Below 75% — attend all upcoming classes.";
    risk = "high-risk";
    riskMsg = "Critical: Below minimum attendance threshold";
  } else if (pctMiss < 75) {
    insight = "One more miss drops you below 75%.";
    risk = "high-risk";
    riskMsg = "Missing next class takes you below 75%";
  } else {
    const boundaries = [67,70,75,85].filter(b => b > pct);
    if (boundaries.length) {
      const next = boundaries[0];
      insight = `${next - pct}% away from ${next}% slab.`;
      if (next - pct <= 3) { risk = "warning"; riskMsg = `Only ${next-pct}% away from ${next}% boundary`; }
    } else {
      insight = "Top slab — great work! 🎉";
    }
  }
  return { insight, risk, riskMsg };
}

/* =============================================
   END-SEM CALCULATOR
   ============================================= */
function calcEndSem(attended, total, type, remainingStr) {
  const remaining = parseInt(remainingStr) || 0;
  if (remaining <= 0) return null;
  const projTotal  = total + remaining;
  const bestPct  = Math.round(((attended + remaining) / projTotal) * 100);
  const worstPct = Math.round((attended / projTotal) * 100);
  const minAttend = Math.ceil(0.75 * projTotal);
  const maxMiss   = Math.max(0, (attended + remaining) - minAttend);
  const bestMarks  = calcMarks(bestPct, type);
  const worstMarks = calcMarks(worstPct, type);
  return { remaining, projTotal, bestPct, worstPct, maxMiss, bestMarks, worstMarks };
}

/* =============================================
   ATTENDANCE DASHBOARD
   ============================================= */
function renderAttendance() {
  const container = document.getElementById("attendanceCards");
  const stats = getSubjectStats();

  if (stats.length === 0) {
    container.innerHTML = `
      <div class="att-empty">
        <span class="att-empty-emoji">📭</span>
        <div class="att-empty-text">No attendance data yet.<br>Mark classes in the Schedule tab.</div>
      </div>`;
    return;
  }

  container.innerHTML = "";
  stats.forEach(({ subject, type, total, attended, missed, pct, marks, key }) => {
    const { insight, risk, riskMsg } = getSmartInsight(attended, total, pct, type);
    const pctClass     = total > 0 ? (pct >= 75 ? "safe" : pct >= 67 ? "warn" : "danger") : "none";
    const cardRiskClass= risk === "high-risk" ? " risk-critical" : risk === "warning" ? " risk-high" : "";
    const typeLabel    = type;
    const alertHTML    = risk
      ? `<div class="att-alert ${risk}"><span>${risk==='high-risk'?'🔴':'⚠️'}</span><span>${riskMsg}</span></div>`
      : '';
    const marksHTML    = marks !== null
      ? `<div class="att-marks">🎯 ${marks} marks</div>`
      : '';

    container.innerHTML += `
      <div class="att-subject-card${cardRiskClass}" onclick="openSubjectDetail('${key}')">
        <div class="att-card-header">
          <div class="att-subject-name">${subject}</div>
          <span class="att-type-badge ${type}">${typeLabel}</span>
        </div>
        <div class="att-stats-row">
          <div class="att-pct ${pctClass}">${total > 0 ? pct + '%' : '--'}</div>
          <div class="att-meta">
            <div class="att-count">${attended} attended / ${total} total</div>
            ${marksHTML}
          </div>
        </div>
        <div class="att-progress-bg">
          <div class="att-progress-fill ${pctClass}" style="width:${Math.min(100,pct)}%"></div>
        </div>
        ${alertHTML}
        ${insight ? `<div class="att-insight">${insight}</div>` : ''}
        <div class="att-tap-hint">Tap for details →</div>
      </div>`;
  });
}

/* =============================================
   SUBJECT DETAIL PAGE
   ============================================= */
function openSubjectDetail(key) {
  detailSubjectKey = key;
  const stats = getSubjectStats();
  const stat  = stats.find(s => s.key === key);
  if (!stat) return;

  currentTab = "subject-detail";
  document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
  document.getElementById("tab-subject-detail").classList.add("active");
  document.getElementById("nextClassPopup").style.display = "none";
  document.getElementById("header-tab-label").textContent = "Subject Detail";

  renderSubjectDetail(stat);
}

function goBackToAttendance() {
  currentTab = "attendance";
  document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
  document.getElementById("tab-attendance").classList.add("active");
  document.getElementById("header-tab-label").textContent = "Attendance";
  document.querySelectorAll(".drawer-nav-item").forEach(b => b.classList.remove("active"));
  document.getElementById("nav-attendance").classList.add("active");
  renderAttendance();
}

function renderSubjectDetail(stat) {
  const { subject, type, total, attended, missed, pct, marks, items } = stat;
  const pctClass = total > 0 ? (pct>=75?"safe":pct>=67?"warn":"danger") : "neutral";
  const { insight, risk, riskMsg } = getSmartInsight(attended, total, pct, type);

  const DAY_MAP = { mon:0, tue:1, wed:2, thu:3, fri:4, sat:5 };
  const markedItems = items
    .filter(i => i.item.status !== null)
    .sort((a,b) => (DAY_MAP[a.day]||0) - (DAY_MAP[b.day]||0));

  let historyHTML = '';
  if (markedItems.length === 0) {
    historyHTML = `<div class="history-empty">No attendance marked yet.</div>`;
  } else {
    historyHTML = '<div class="history-list">';
    markedItems.forEach(({ item, day }) => {
      const icons  = { attended:'✅', missed:'❌', cancelled:'🚫' };
      const labels = { attended:'Attended', missed:'Missed', cancelled:'Cancelled' };
      const timeStr = `${formatDisplayTime(item.start)} – ${formatDisplayTime(item.end)}`;
      historyHTML += `
        <div class="history-item">
          <div class="history-status">${icons[item.status]||''}</div>
          <div class="history-info">
            <div class="history-date">${item.subject}</div>
            <div class="history-day">${DAY_NAMES[DAY_MAP[day]] || day} · ${timeStr}</div>
          </div>
          <span class="history-label ${item.status}">${labels[item.status]||''}</span>
        </div>`;
    });
    historyHTML += '</div>';
  }

  let decisionHTML = '';
  if (total > 0) {
    let chipClass = "safe", chipText = "✅ Safe to miss next";
    if (risk === "high-risk")  { chipClass="danger";  chipText="🔴 Cannot miss next class"; }
    else if (risk === "warning") { chipClass="warning"; chipText="⚠️ Be careful next class"; }
    decisionHTML = `<div class="decision-chip ${chipClass}">${chipText}</div>`;
  }

  const marksDisplay = marks !== null
    ? `<div class="detail-stat"><div class="detail-stat-val neutral">${marks}</div><div class="detail-stat-label">Marks</div></div>`
    : '';

  const container = document.getElementById("subjectDetailContent");
  container.innerHTML = `
    <button class="detail-back-btn" onclick="goBackToAttendance()">← Back</button>

    <div class="detail-hero">
      <div class="detail-subject-name">${subject}</div>
      <div class="detail-type-row">
        <span class="detail-type-badge">${type}</span>
      </div>
      <div class="detail-stats-row">
        <div class="detail-stat">
          <div class="detail-stat-val ${pctClass}">${total>0?pct+'%':'--'}</div>
          <div class="detail-stat-label">Attendance</div>
        </div>
        <div class="detail-stat">
          <div class="detail-stat-val neutral">${attended}/${total}</div>
          <div class="detail-stat-label">Attended/Total</div>
        </div>
        ${marksDisplay}
      </div>
    </div>

    ${total > 0 ? `
    <div class="detail-section">
      <div class="detail-section-title">Decision</div>
      ${decisionHTML}
      ${insight ? `<div class="att-insight" style="margin-top:10px">${insight}</div>` : ''}
      ${risk ? `<div class="att-alert ${risk}" style="margin-top:10px"><span>${risk==='high-risk'?'🔴':'⚠️'}</span><span>${riskMsg}</span></div>` : ''}
    </div>
    ` : ''}

    <div class="detail-section">
      <div class="detail-section-title">Week-wise Attendance Trend</div>
      <div class="graph-container">
        <canvas id="attChart" class="graph-canvas"></canvas>
      </div>
      <div class="graph-legend" id="graph-legend"></div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">End-Semester Simulator</div>
      <div class="endsem-input-row">
        <input type="number" id="endsem-input-${stat.key.replace(/[^a-z0-9]/gi,'_')}"
          class="endsem-input" placeholder="Remaining classes" min="0" max="200"
          oninput="renderEndSem('${stat.key}')">
        <button class="endsem-btn"
          onclick="document.getElementById('endsem-input-${stat.key.replace(/[^a-z0-9]/gi,'_')}').value=''; renderEndSem('${stat.key}')">
          Reset
        </button>
      </div>
      <div id="endsem-result-${stat.key.replace(/[^a-z0-9]/gi,'_')}"></div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Class History</div>
      ${historyHTML}
    </div>
  `;

  drawAttChart(stat);
}

/* =============================================
   WEEK-WISE ATTENDANCE LINE GRAPH
   --- NEW: Shows attendance % per week ---
   ============================================= */
function buildWeeklyData(stat) {
  // Group marked items into "weeks". Since there are no real dates,
  // we treat each pass through Mon→Sat as one "week" of classes.
  // Items carry their day; we group sequentially: every time we
  // wrap from a later day back to an earlier day, that's a new week.
  const DAY_MAP = { mon:0, tue:1, wed:2, thu:3, fri:4, sat:5 };
  const ordered = stat.items
    .slice()
    .sort((a,b) => (DAY_MAP[a.day]||0) - (DAY_MAP[b.day]||0));

  // For "weeks", we use the marked items only and split them into
  // chunks based on schedule wrap-around. With limited data, we
  // distribute marked items into up to 4 simulated weeks based on order.
  const marked = ordered.filter(i => i.item.status === "attended" || i.item.status === "missed");
  if (marked.length === 0) return [];

  // Distribute marked items evenly into up to N weeks (max 6, min 1)
  const totalMarked = marked.length;
  const weeksToShow = Math.min(6, Math.max(1, Math.ceil(totalMarked / Math.max(1, stat.items.filter(i => !isBreakItem(i.item)).length || 1))));

  // Simpler approach: each "week" = one complete pass through the timetable.
  // Count weekly occurrences of this subject in the timetable:
  const perWeek = stat.items.length || 1;

  const weeks = [];
  let cumA = 0, cumT = 0;
  for (let w = 0; w < Math.ceil(totalMarked / perWeek); w++) {
    const slice = marked.slice(w * perWeek, (w + 1) * perWeek);
    const a = slice.filter(i => i.item.status === "attended").length;
    const m = slice.filter(i => i.item.status === "missed").length;
    cumA += a;
    cumT += a + m;
    const pct = cumT > 0 ? Math.round((cumA / cumT) * 100) : 0;
    weeks.push({ week: w + 1, attended: a, missed: m, pct });
  }
  return weeks;
}

function drawAttChart(stat) {
  const canvas = document.getElementById("attChart");
  const legendEl = document.getElementById("graph-legend");
  if (!canvas) return;

  const weeks = buildWeeklyData(stat);

  // Setup canvas with DPR
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.parentElement.offsetWidth || 320;
  const H   = 180;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + "px";
  canvas.style.height = H + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // Empty state
  if (weeks.length === 0) {
    ctx.fillStyle = "#9999bb";
    ctx.font = `600 13px 'DM Sans', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Mark some classes to see your weekly trend", W/2, H/2);
    if (legendEl) legendEl.innerHTML = '';
    return;
  }

  // Layout
  const padL = 38, padR = 14, padT = 14, padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Y-axis: 0 → 100
  const yMax = 100, yMin = 0;
  const yToPx = (v) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // X positions (evenly distributed)
  const n = weeks.length;
  const xToPx = (i) => {
    if (n === 1) return padL + plotW / 2;
    return padL + (i / (n - 1)) * plotW;
  };

  // Draw horizontal grid lines + Y labels (0, 25, 50, 75, 100)
  ctx.strokeStyle = "#eef0f4";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#9999bb";
  ctx.font = `600 10px 'DM Sans', sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  [0, 25, 50, 75, 100].forEach(v => {
    const y = yToPx(v);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    ctx.fillText(v + "%", padL - 6, y);
  });

  // 75% threshold line (dashed, amber)
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  const y75 = yToPx(75);
  ctx.beginPath();
  ctx.moveTo(padL, y75);
  ctx.lineTo(W - padR, y75);
  ctx.stroke();
  ctx.setLineDash([]);

  // X-axis labels
  ctx.fillStyle = "#9999bb";
  ctx.font = `600 10px 'DM Sans', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  weeks.forEach((w, i) => {
    ctx.fillText(`W${w.week}`, xToPx(i), padT + plotH + 8);
  });

  // Build line points
  const points = weeks.map((w, i) => ({ x: xToPx(i), y: yToPx(w.pct), pct: w.pct }));

  // Area fill under line (subtle)
  if (points.length >= 2) {
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, "rgba(15, 36, 96, 0.18)");
    grad.addColorStop(1, "rgba(15, 36, 96, 0.02)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(points[0].x, padT + plotH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padT + plotH);
    ctx.closePath();
    ctx.fill();
  }

  // Draw the line
  ctx.strokeStyle = "#0f2460";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // Draw points + labels
  points.forEach((p) => {
    // Color by threshold
    const color = p.pct >= 75 ? "#16a34a" : p.pct >= 67 ? "#d97706" : "#dc2626";
    // Outer ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    ctx.stroke();

    // Value label above
    ctx.fillStyle = color;
    ctx.font = `bold 10px 'DM Sans', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const labelY = Math.max(padT + 10, p.y - 9);
    ctx.fillText(p.pct + "%", p.x, labelY);
  });

  // Highlight highest and lowest (only if >= 2 weeks)
  if (weeks.length >= 2) {
    const highIdx = weeks.reduce((best, w, i, arr) => w.pct > arr[best].pct ? i : best, 0);
    const lowIdx  = weeks.reduce((best, w, i, arr) => w.pct < arr[best].pct ? i : best, 0);
    [highIdx, lowIdx].forEach(idx => {
      if (idx === highIdx && idx === lowIdx) return;
      const p = points[idx];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
      ctx.strokeStyle = idx === highIdx ? "rgba(22,163,74,0.25)" : "rgba(220,38,38,0.25)";
      ctx.lineWidth = 4;
      ctx.stroke();
    });
  }

  // ===== LEGEND / TREND =====
  if (legendEl) {
    let trendHTML = '';
    if (weeks.length >= 2) {
      const first = weeks[0].pct;
      const last  = weeks[weeks.length - 1].pct;
      const diff  = last - first;
      if (diff > 1) {
        trendHTML = `<span class="graph-trend up">↗ Improving <span style="color:#9999bb;font-weight:600">+${diff}%</span></span>`;
      } else if (diff < -1) {
        trendHTML = `<span class="graph-trend down">↘ Declining <span style="color:#9999bb;font-weight:600">${diff}%</span></span>`;
      } else {
        trendHTML = `<span class="graph-trend flat">→ Steady</span>`;
      }
    } else {
      trendHTML = `<span class="graph-trend flat">→ Just getting started</span>`;
    }

    const high = Math.max(...weeks.map(w => w.pct));
    const low  = Math.min(...weeks.map(w => w.pct));
    const summaryHTML = weeks.length >= 2
      ? `<span class="graph-summary">High ${high}% · Low ${low}%</span>`
      : `<span class="graph-summary">Current ${weeks[0].pct}%</span>`;

    legendEl.innerHTML = `${trendHTML}${summaryHTML}`;
  }
}

/* =============================================
   END-SEM RESULT RENDER
   ============================================= */
function renderEndSem(key) {
  const stats = getSubjectStats();
  const stat  = stats.find(s => s.key === key);
  if (!stat) return;
  const safeId  = key.replace(/[^a-z0-9]/gi, '_');
  const inputEl = document.getElementById(`endsem-input-${safeId}`);
  const resEl   = document.getElementById(`endsem-result-${safeId}`);
  if (!inputEl || !resEl) return;

  const val = inputEl.value;
  const projection = calcEndSem(stat.attended, stat.total, stat.type, val);

  if (!projection) { resEl.innerHTML = ''; return; }

  const { remaining, projTotal, bestPct, worstPct, maxMiss, bestMarks, worstMarks } = projection;
  const bMarksHTML = bestMarks  !== null ? `<div class="endsem-row"><span class="endsem-label">Best case marks</span><span class="endsem-val good">${bestMarks}</span></div>` : '';
  const wMarksHTML = worstMarks !== null ? `<div class="endsem-row"><span class="endsem-label">Worst case marks</span><span class="endsem-val ${worstPct>=75?'good':'bad'}">${worstMarks}</span></div>` : '';

  resEl.innerHTML = `
    <div class="endsem-result">
      <div class="endsem-row"><span class="endsem-label">Total classes (projected)</span><span class="endsem-val">${projTotal}</span></div>
      <div class="endsem-row"><span class="endsem-label">Max you can miss</span><span class="endsem-val ${maxMiss>0?'good':'bad'}">${maxMiss} classes</span></div>
      <div class="endsem-row"><span class="endsem-label">Best case % (attend all)</span><span class="endsem-val good">${bestPct}%</span></div>
      <div class="endsem-row"><span class="endsem-label">Worst case % (miss all)</span><span class="endsem-val ${worstPct>=75?'warn':'bad'}">${worstPct}%</span></div>
      ${bMarksHTML}${wMarksHTML}
    </div>`;
}

/* =============================================
   MODAL
   ============================================= */
function openModal(dayKey, itemIndex) {
  const item = profiles[currentProfile][dayKey][itemIndex];
  if (!item) return;
  modalDayKey = dayKey; modalItemIndex = itemIndex; isEditing = false;

  if (isBreakItem(item)) { item.subject = item.subject || "Break"; }

  document.getElementById("edit-subject").value = item.subject || "";
  document.getElementById("edit-start").value   = item.start   || "";
  document.getElementById("edit-end").value     = item.end     || "";
  document.getElementById("edit-room").value    = item.room    || "";
  document.getElementById("edit-teacher").value = item.teacher || "";

  const validTypes = ["DSC","SEC","VAC","AEC","GE","TUTORIAL","PRACTICAL","BREAK"];
  const typeVal = (item.type || "DSC").toUpperCase();
  document.getElementById("editTag").value = validTypes.includes(typeVal) ? typeVal : "DSC";

  updateModalBreakState(isBreakItem(item), true);
  setReadonly(true);
  document.getElementById("editToggleBtn").style.display = "";
  document.getElementById("saveBtn").style.display       = "none";
  document.getElementById("cancelBtn").style.display     = "none";
  document.getElementById("modalHint").textContent       = "";

  const overlay = document.getElementById("editModal");
  overlay.style.display = "flex";
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("open","visible")));
}

function closeModal() {
  const overlay = document.getElementById("editModal");
  overlay.classList.remove("visible");
  setTimeout(() => { overlay.classList.remove("open"); overlay.style.display="none"; isEditing=false; }, 220);
}

function handleModalOverlayClick(e) {
  if (e.target === document.getElementById("editModal")) closeModal();
}

function setReadonly(val) {
  ["edit-subject","edit-start","edit-end","edit-room","edit-teacher"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (val) el.setAttribute("readonly", true); else el.removeAttribute("readonly");
  });
  const tagSel = document.getElementById("editTag");
  if (tagSel) tagSel.disabled = val;
}

function updateModalBreakState(isBreak, readonly) {
  const roomField    = document.getElementById("edit-room").closest(".modal-field") ||
                       document.getElementById("edit-room").closest(".modal-field-half") ||
                       document.getElementById("edit-room").parentElement;
  const teacherField = document.getElementById("edit-teacher").closest(".modal-field") ||
                       document.getElementById("edit-teacher").parentElement;
  const subjectEl    = document.getElementById("edit-subject");

  if (isBreak) {
    if (roomField)    roomField.style.display    = "none";
    if (teacherField) teacherField.style.display = "none";
    subjectEl.classList.add("break-locked");
  } else {
    if (roomField)    roomField.style.display    = "";
    if (teacherField) teacherField.style.display = "";
    subjectEl.classList.remove("break-locked");
    if (!readonly) {
      document.getElementById("edit-room").removeAttribute("readonly");
      document.getElementById("edit-teacher").removeAttribute("readonly");
    }
  }
}

function onTagChange() {
  if (!isEditing) return;
  const isBreak = document.getElementById("editTag").value === "BREAK";
  updateModalBreakState(isBreak, false);
  if (isBreak) {
    document.getElementById("edit-subject").value = "Break";
    document.getElementById("edit-room").value    = "";
    document.getElementById("edit-teacher").value = "";
    document.getElementById("edit-subject").setAttribute("readonly", true);
  } else {
    const subjectEl = document.getElementById("edit-subject");
    subjectEl.removeAttribute("readonly");
    if (subjectEl.value === "Break") subjectEl.value = "";
    subjectEl.focus();
  }
}

function toggleEdit() {
  isEditing = true;
  originalValues = {
    subject: document.getElementById("edit-subject").value,
    start:   document.getElementById("edit-start").value,
    end:     document.getElementById("edit-end").value,
    room:    document.getElementById("edit-room").value,
    teacher: document.getElementById("edit-teacher").value,
    type:    document.getElementById("editTag").value,
  };
  setReadonly(false);
  const isBreak = document.getElementById("editTag").value === "BREAK";
  updateModalBreakState(isBreak, false);
  if (isBreak) document.getElementById("edit-subject").setAttribute("readonly", true);
  document.getElementById("editToggleBtn").style.display = "none";
  document.getElementById("saveBtn").style.display       = "";
  document.getElementById("cancelBtn").style.display     = "";
  document.getElementById("edit-subject").focus();
}

function cancelEdit() {
  document.getElementById("edit-subject").value = originalValues.subject;
  document.getElementById("edit-start").value   = originalValues.start;
  document.getElementById("edit-end").value     = originalValues.end;
  document.getElementById("edit-room").value    = originalValues.room;
  document.getElementById("edit-teacher").value = originalValues.teacher;
  document.getElementById("editTag").value      = originalValues.type || "DSC";
  updateModalBreakState(originalValues.type === "BREAK", true);
  setReadonly(true);
  isEditing = false;
  document.getElementById("editToggleBtn").style.display = "";
  document.getElementById("saveBtn").style.display       = "none";
  document.getElementById("cancelBtn").style.display     = "none";
  document.getElementById("modalHint").textContent       = "";
}

function saveEdit() {
  const hint    = document.getElementById("modalHint");
  const type    = document.getElementById("editTag").value;
  const isBreak = (type === "BREAK");

  const subject = isBreak ? "Break" : document.getElementById("edit-subject").value.trim();
  const start   = document.getElementById("edit-start").value.trim();
  const end     = document.getElementById("edit-end").value.trim();
  const room    = isBreak ? "" : document.getElementById("edit-room").value.trim();
  const teacher = isBreak ? "" : document.getElementById("edit-teacher").value.trim();

  if (!isBreak && !subject) { hint.textContent = "Subject cannot be empty."; return; }
  const timeRe = /^\d{1,2}:\d{2}$/;
  if (!timeRe.test(start)) { hint.textContent = "Start time must be HH:MM (e.g. 10:45)."; return; }
  if (!timeRe.test(end))   { hint.textContent = "End time must be HH:MM (e.g. 11:45).";  return; }
  if (toMinutes(end) <= toMinutes(start)) { hint.textContent = "End must be after start."; return; }
  hint.textContent = "";

  const item = profiles[currentProfile][modalDayKey][modalItemIndex];
  item.subject = subject;
  item.start   = start;
  item.end     = end;
  item.type    = type;
  if (!isBreak) {
    if (room)    item.room    = room;    else delete item.room;
    if (teacher) item.teacher = teacher; else delete item.teacher;
  } else {
    item.room = ""; item.teacher = "";
  }

  profiles[currentProfile][modalDayKey].sort((a,b) => toMinutes(a.start) - toMinutes(b.start));
  saveEditsToStorage();

  const activeBtn = document.querySelector(`.tabs button[data-day="${currentDay}"]`);
  showDay(currentDay, activeBtn);
  closeModal();
}

/* =============================================
   SWIPE NAVIGATION
   ============================================= */
(function initSwipe() {
  let touchStartX = 0, touchStartY = 0, isSwiping = false;
  const THRESHOLD = 50;
  const wrapper = document.getElementById("scheduleWrapper") || document.querySelector("main");
  if (!wrapper) return;

  wrapper.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping   = false;
  }, { passive: true });
  wrapper.addEventListener("touchmove", e => {
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) + 10) isSwiping = true;
  }, { passive: true });
  wrapper.addEventListener("touchend", e => {
    if (!isSwiping) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < THRESHOLD) return;
    const currentIdx = DAY_KEYS.indexOf(currentDay);
    if (dx < 0) {
      const nextDay = DAY_KEYS[(currentIdx+1)%DAY_KEYS.length];
      showDay(nextDay, document.querySelector(`.tabs button[data-day="${nextDay}"]`), "left");
    } else {
      const prevDay = DAY_KEYS[(currentIdx-1+DAY_KEYS.length)%DAY_KEYS.length];
      showDay(prevDay, document.querySelector(`.tabs button[data-day="${prevDay}"]`), "right");
    }
    isSwiping = false;
  }, { passive: true });
})();

/* =============================================
   INIT
   ============================================= */
window.onload = () => {
  const saved = localStorage.getItem("timetable_profile");
  if (saved && profiles[saved]) {
    currentProfile = saved;
    document.querySelectorAll(".drawer-profile-btn").forEach(b => b.classList.remove("active"));
    const dBtn = document.getElementById(`dBtn-${currentProfile}`);
    if (dBtn) dBtn.classList.add("active");
    document.getElementById("dCheck-suhani").style.display = currentProfile==="suhani"?"":"none";
    document.getElementById("dCheck-laksh").style.display  = currentProfile==="laksh" ?"":"none";
    const avatar = document.getElementById("header-avatar");
    const dAva   = document.getElementById("drawer-avatar");
    const title  = document.getElementById("header-title");
    const dname  = document.getElementById("drawer-name");
    if (currentProfile === "laksh") {
      avatar.src = dAva.src = "https://i.pinimg.com/originals/f4/2a/f1/f42af16ba580f84430d39a5838ad0c70.jpg";
      title.textContent   = "Laksh's Timetable";
      dname.textContent   = "Laksh";
    }
  }

  const today    = getToday();
  const todayBtn = document.querySelector(`.tabs button[data-day="${today}"]`);
  showDay(today && DAY_KEYS.includes(today) ? today : "mon",
          todayBtn || document.querySelector(`.tabs button[data-day="mon"]`));

  updateBusySection();

  setInterval(() => {
    const activeBtn = document.querySelector(".tabs button.active");
    if (activeBtn && currentTab === "schedule") {
      const day     = activeBtn.dataset.day;
      const dayData = profiles[currentProfile][day];
      if (!dayData) return;
      const now = getNow();
      let nextClassTime = null;
      if (isToday(day)) dayData.forEach(item => {
        if (!isBreakItem(item) && toMinutes(item.start) > now && nextClassTime === null)
          nextClassTime = toMinutes(item.start);
      });
      updatePopup(nextClassTime, day);
    }
    updateBusySection();
  }, 60000);
};
