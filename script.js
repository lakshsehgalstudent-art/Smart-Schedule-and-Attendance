/* ===================================================
   SMART ATTENDANCE SYSTEM — script.js
   --- FULLY REFACTORED ---
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
      {start:"13:05", end:"14:05", subject:"GE II", room:"Th321", teacher:"Drishti Joshi", type:"DSC", status:null},
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
      {start:"08:45", end:"09:45", subject:"GE II", room:"Th321", teacher:"Drishti Joshi", type:"DSC", status:null},
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
   PART 2: DATA MIGRATION (preserve legacy)
   ============================================= */
function migrateItem(item) {
  if (item.time && !item.start) {
    item.start = item.time;
    const [h, m] = item.time.split(":").map(Number);
    const endMins = h * 60 + m + 60;
    item.end = `${String(Math.floor(endMins / 60)).padStart(2,"0")}:${String(endMins % 60).padStart(2,"0")}`;
    delete item.time;
  }
  if (!item.type) {
    item.type = guessType(item);
  }
  if (item.status === undefined) {
    item.status = null;
  }
  return item;
}

function guessType(item) {
  const s = (item.subject || "").toLowerCase();
  const t = (item.tag || "").toLowerCase();
  if (s.includes("break") || s.includes("lunch") || s.includes("gap")) return "BREAK";
  if (s.includes("practical") || t === "practical") return "PRACTICAL";
  if (s.includes("tut") || t === "tutorial") return "TUTORIAL";
  if (s.includes("vac")) return "VAC";
  if (s.includes("aec")) return "AEC";
  if (s.includes("sec")) return "SEC";
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

const FULL_DATA_KEY = "timetable_full_data_v2";

let profiles = (() => {
  try {
    const saved = localStorage.getItem(FULL_DATA_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return migrateProfiles(parsed);
    }
  } catch (e) {
    console.warn("Could not load saved data:", e);
  }
  return migrateProfiles(JSON.parse(JSON.stringify(DEFAULT_PROFILES)));
})();

/* Modal state */
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
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}
function getTag(item) {
  if (item.tag) return item.tag;
  const s = item.subject.toLowerCase();
  if (s.includes("break") || s.includes("lunch") || s.includes("gap")) return "break";
  if (s.includes("tut") || s.includes("tute")) return "tutorial";
  if (s.includes("practical")) return "practical";
  return "lecture";
}
function isBreakItem(item) {
  const type = (item.type || "").toUpperCase();
  if (type === "BREAK") return true;
  return getTag(item) === "break";
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
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2,"0")} ${ampm}`;
}

function formatDisplayTime(time) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")}\n${ampm}`;
}

const DAY_KEYS  = ["mon","tue","wed","thu","fri","sat"];
const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat"];

/* =============================================
   STORAGE
   ============================================= */
function saveEditsToStorage() {
  try {
    localStorage.setItem(FULL_DATA_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.warn("Could not save:", e);
  }
}

/* =============================================
   DRAWER (hamburger menu)
   ============================================= */
function openDrawer() {
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

  // Update page visibility
  document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");

  // Update drawer nav
  document.querySelectorAll(".drawer-nav-item").forEach(b => b.classList.remove("active"));
  const navBtn = document.getElementById(`nav-${tab}`);
  if (navBtn) navBtn.classList.add("active");

  // Update header label
  const label = document.getElementById("header-tab-label");
  if (label) label.textContent = tab === "schedule" ? "Schedule" : "Attendance";

  // Show/hide popup
  const popup = document.getElementById("nextClassPopup");
  popup.style.display = tab === "schedule" ? "" : "none";

  if (tab === "attendance") renderAttendance();
}

/* =============================================
   PROFILE SWITCH
   ============================================= */
function switchProfile(profile, btn) {
  currentProfile = profile;
  localStorage.setItem("timetable_profile", profile);

  // Drawer profile buttons
  document.querySelectorAll(".drawer-profile-btn").forEach(b => b.classList.remove("active"));
  if (btn && btn.classList.contains("drawer-profile-btn")) btn.classList.add("active");

  // Drawer checks
  document.getElementById("dCheck-suhani").style.display = profile === "suhani" ? "" : "none";
  document.getElementById("dCheck-laksh").style.display  = profile === "laksh"  ? "" : "none";

  // Theme
  document.body.className = `theme-${profile}`;

  const avatar    = document.getElementById("header-avatar");
  const drawerAva = document.getElementById("drawer-avatar");
  const title     = document.getElementById("header-title");
  const dname     = document.getElementById("drawer-name");

  if (profile === "suhani") {
    avatar.src        = "https://i.pinimg.com/564x/02/a9/55/02a9551d5605cfb4a3f2ae976905f09e.jpg";
    drawerAva.src     = "https://i.pinimg.com/564x/02/a9/55/02a9551d5605cfb4a3f2ae976905f09e.jpg";
    title.innerHTML   = "Suhani's<br>Timetable";
    dname.textContent = "Suhani";
  } else {
    avatar.src        = "https://i.pinimg.com/originals/f4/2a/f1/f42af16ba580f84430d39a5838ad0c70.jpg";
    drawerAva.src     = "https://i.pinimg.com/originals/f4/2a/f1/f42af16ba580f84430d39a5838ad0c70.jpg";
    title.innerHTML   = "Laksh's<br>Timetable";
    dname.textContent = "Laksh";
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
    }, 200);
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
  let nextClassTime = null;
  let currentCardId = null;

  dayData.forEach((item, index) => {
    const startMin    = toMinutes(item.start);
    const endMin      = toMinutes(item.end);
    const isCurrent   = viewingToday && (now >= startMin && now < endMin);
    const tag         = getTag(item);
    const isBreakCard = isBreakItem(item);
    const cardId      = `card-${index}`;

    if (viewingToday && startMin > now && nextClassTime === null) nextClassTime = startMin;
    if (isCurrent) currentCardId = cardId;

    const roomChip    = !isBreakCard && isValid(item.room)    ? `<div class="room">📍 ${item.room}</div>` : '';
    const teacherChip = !isBreakCard && isValid(item.teacher) ? `<div class="teacher">👤 ${item.teacher}</div>` : '';
    const bottomRow   = (roomChip || teacherChip) ? `<div class="bottomRow">${roomChip}${teacherChip}</div>` : '';

    const tagLabel = isCurrent ? 'live' : tag;
    const tagText  = isCurrent ? '🔴 LIVE' : tag.toUpperCase();
    const extraClass = isBreakCard ? ' break-card' : '';

    let progressHTML = '';
    if (isCurrent) {
      const elapsed  = now - startMin;
      const duration = endMin - startMin || 60;
      const pct = Math.min(100, Math.max(0, (elapsed / duration) * 100));
      const progressColor = currentProfile === "suhani"
        ? `rgba(76,122,255,0.22)` : `rgba(201,168,76,0.2)`;
      const gradient = `linear-gradient(90deg, ${progressColor} 0%, ${progressColor} ${pct}%, rgba(255,255,255,0.0) ${pct}%, rgba(255,255,255,0.0) 100%)`;
      progressHTML = `<div class="progress-overlay" style="background:${gradient};"></div>`;
    }

    const liveCharSrc = currentProfile === "suhani"
      ? "https://media.tenor.com/oajbons5PGEAAAAC/shinchan-cute.gif"
      : "https://i.pinimg.com/originals/f4/2a/f1/f42af16ba580f84430d39a5838ad0c70.jpg";
    const charHTML = isCurrent
      ? `<div class="shinchan-live"><img src="${liveCharSrc}" alt="character"></div>` : '';

    const timeDisplay = formatTimeRange(item.start, item.end);

    // Status badge
    let statusBadge = '';
    if (!isBreakCard && item.status) {
      const labels = { attended:'✅ Done', missed:'❌ Missed', cancelled:'🚫 Off' };
      statusBadge = `<span class="status-badge ${item.status}">${labels[item.status] || ''}</span>`;
    }

    const statusAttr = item.status ? `data-status="${item.status}"` : '';

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
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
  }
  updatePopup(nextClassTime, day);
}

/* =============================================
   POPUP
   ============================================= */
function updatePopup(nextClassTime, day) {
  const popup = document.getElementById("nextClassPopup");
  const text  = popup.querySelector(".popup-text");
  const icon  = popup.querySelector(".popup-icon");
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
    if (dayData && dayData.length > 0) {
      const firstClass = dayData.find(item => !isBreakItem(item));
      if (firstClass) {
        text.textContent = `First class at ${formatDisplayTime(firstClass.start).replace('\n', ' ')}`;
        icon.textContent = "📅";
      } else {
        text.textContent = "No classes this day";
        icon.textContent = "😴";
      }
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
  return dayData
    .filter(item => !isBreakItem(item))
    .map(item => [toMinutes(item.start), toMinutes(item.end)]);
}

function hasClassesRemainingToday(profile, dayKey, nowMins) {
  const dayData = profiles[profile][dayKey];
  if (!dayData) return false;
  return dayData.some(item => !isBreakItem(item) && toMinutes(item.end) > nowMins);
}

function findNextCommonFreeTime() {
  const today    = getToday();
  const todayIdx = DAY_KEYS.indexOf(today);
  if (todayIdx === -1) return null;
  const now = getNow();
  const suhaniHasMore = hasClassesRemainingToday("suhani", today, now);
  const lakshHasMore  = hasClassesRemainingToday("laksh",  today, now);
  if (!suhaniHasMore && !lakshHasMore) return null;

  for (let offset = 0; offset < 7; offset++) {
    const dayIdx    = (todayIdx + offset) % DAY_KEYS.length;
    const dayKey    = DAY_KEYS[dayIdx];
    const isCurrentDay = (offset === 0);
    const sIntervals = getBusyIntervals("suhani", dayKey);
    const lIntervals = getBusyIntervals("laksh",  dayKey);
    const busySet = new Set();
    [...sIntervals, ...lIntervals].forEach(([s, e]) => {
      for (let m = s; m < e; m++) busySet.add(m);
    });
    const startMin = isCurrentDay ? now : 8 * 60;
    for (let m = startMin; m <= 22 * 60; m++) {
      if (!busySet.has(m) && m >= 8 * 60) {
        const dayLabel = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : DAY_NAMES[dayIdx];
        return `${dayLabel} at ${minsToDisplay(m)}`;
      }
    }
  }
  return "No overlap found this week";
}

function updateFreeTimeDisplay() {
  const row  = document.getElementById("freeTimeRow");
  const text = document.getElementById("freeTimeText");
  if (!row || !text) return;
  const result = findNextCommonFreeTime();
  if (result === null) {
    row.style.display = "none";
  } else {
    row.style.display = "flex";
    text.textContent  = `Next free time together: ${result}`;
  }
}

function updateBusySection() {
  const today = getToday();
  const now   = getNow();
  const check = (profile) => {
    const dayData = profiles[profile][today];
    if (!dayData) return null;
    for (const item of dayData) {
      const s = toMinutes(item.start);
      const e = toMinutes(item.end);
      if (now >= s && now < e && !isBreakItem(item)) return item.subject;
    }
    return null;
  };

  const suhaniClass = check("suhani");
  const lakshClass  = check("laksh");
  document.getElementById("indicatorSuhani").textContent = suhaniClass ? `🔴 In Class – ${suhaniClass}` : "🟢 Free";
  document.getElementById("indicatorLaksh").textContent  = lakshClass  ? `🔴 In Class – ${lakshClass}`  : "🟢 Free";

  const sum = document.getElementById("busySummary");
  if (suhaniClass && lakshClass)        sum.textContent = "Both are in class right now 📚";
  else if (!suhaniClass && !lakshClass) sum.textContent = "Both are free right now 🎉";
  else                                  sum.textContent = "";

  updateFreeTimeDisplay();
}

/* =============================================
   PART 4-5: ATTENDANCE ENGINE + MARKS SYSTEM
   ============================================= */

// Normalise subject name for grouping
function normaliseSubject(subject) {
  return subject
    .toLowerCase()
    .replace(/\s*(tutorial|tute|g1|g2|g3|group\s*\d)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate marks from attendance % for a given type
function calcMarks(pct, type) {
  const t = (type || "DSC").toUpperCase();
  if (t === "SEC" || t === "PRACTICAL" || t === "BREAK") return null; // no marks

  let slabs;
  if (t === "DSC") {
    slabs = [[85, 6], [75, 3.6], [70, 2.4], [67, 1.2], [0, 0]];
  } else if (t === "TUTORIAL") {
    slabs = [[85, 5], [75, 3], [70, 2], [67, 1], [0, 0]];
  } else { // VAC, AEC
    slabs = [[85, 2], [75, 1.6], [70, 1.2], [67, 0.8], [0, 0]];
  }
  for (const [threshold, marks] of slabs) {
    if (pct >= threshold) return marks;
  }
  return 0;
}

// Get next slab boundary
function nextSlab(type) {
  const t = (type || "DSC").toUpperCase();
  if (t === "SEC" || t === "PRACTICAL") return null;
  const boundaries = t === "DSC"      ? [67,70,75,85] :
                     t === "TUTORIAL" ? [67,70,75,85] : [67,70,75,85];
  return boundaries;
}

// --- NEW: Aggregate subjects across all days ---
function getSubjectStats() {
  const subjectMap = {}; // key → { subject, type, items: [] }

  for (const day of DAY_KEYS) {
    const dayData = profiles[currentProfile][day] || [];
    for (const item of dayData) {
      if (isBreakItem(item)) continue;
      const type = (item.type || guessType(item)).toUpperCase();
      if (type === "BREAK") continue;

      const key = `${normaliseSubject(item.subject)}__${type}`;
      if (!subjectMap[key]) {
        subjectMap[key] = { subject: item.subject, type, items: [] };
      }
      subjectMap[key].items.push(item);
    }
  }

  const result = [];
  for (const key in subjectMap) {
    const { subject, type, items } = subjectMap[key];
    const total    = items.filter(i => i.status !== "cancelled").length;
    const attended = items.filter(i => i.status === "attended").length;
    const pct      = total > 0 ? Math.round((attended / total) * 100) : 0;
    const marks    = calcMarks(pct, type);
    result.push({ subject, type, items, total, attended, pct, marks });
  }

  result.sort((a, b) => a.subject.localeCompare(b.subject));
  return result;
}

/* =============================================
   PART 7: SMART DECISION ENGINE
   ============================================= */
function getSmartInsight(attended, total, pct, type, remainingClasses) {
  const remaining = parseInt(remainingClasses) || 0;
  const slabs = nextSlab(type);

  // Simulate miss
  const newTotalIfMiss   = total + 1;
  const pctIfMiss        = newTotalIfMiss > 0 ? Math.round((attended / newTotalIfMiss) * 100) : 0;
  const marksIfMiss      = calcMarks(pctIfMiss, type);

  // Simulate attend
  const newTotalIfAttend = total + 1;
  const pctIfAttend      = newTotalIfAttend > 0 ? Math.round(((attended + 1) / newTotalIfAttend) * 100) : 0;
  const marksIfAttend    = calcMarks(pctIfAttend, type);

  const currentMarks = calcMarks(pct, type);

  let insight = null;
  let risk    = null; // 'warning' | 'high-risk'
  let riskMsg = null;

  if (type === "SEC" || type === "PRACTICAL") {
    insight = "No marks tracked for this type.";
  } else {
    // Safe to miss?
    if (pct >= 85 && pctIfMiss >= 85) {
      insight = "Safe to miss the next class — you're in the top slab.";
    } else if (marksIfMiss !== null && currentMarks !== null && marksIfMiss < currentMarks) {
      insight = "⚠️ Missing the next class will drop your marks slab!";
      risk = "high-risk";
      riskMsg = `Missing next class drops you to ${pctIfMiss}% (${marksIfMiss} marks vs ${currentMarks} now)`;
    } else if (marksIfAttend !== null && currentMarks !== null && marksIfAttend > currentMarks) {
      insight = "Attending the next class will move you up a slab!";
    } else if (pct < 75) {
      insight = "Below 75% — attend all upcoming classes.";
      risk = "high-risk";
      riskMsg = "Critical: Attendance is below the minimum threshold";
    } else if (pct >= 75 && pctIfMiss < 75) {
      insight = "Attending next class keeps you above 75%.";
      risk = "high-risk";
      riskMsg = "Missing next class will drop you below 75%";
    } else if (slabs) {
      const nextBoundary = slabs.find(b => b > pct);
      if (nextBoundary !== undefined) {
        const needed = Math.ceil(((nextBoundary / 100) * (total + 10)) - attended);
        insight = `${nextBoundary - pct}% away from next slab — need ~${Math.max(0, needed)} more classes.`;
        if (nextBoundary - pct <= 2) {
          risk = "warning";
          riskMsg = `You're ${nextBoundary - pct}% away from the ${nextBoundary}% slab boundary`;
        }
      } else {
        insight = "You're in the top slab — great work!";
      }
    }
  }

  // End-semester projection
  let projection = null;
  if (remaining > 0) {
    const maxMissable = Math.max(0, Math.floor(((pct / 100) * (total + remaining)) - attended + ((total + remaining) * 0.25)));
    const projMaxPct  = total + remaining > 0
      ? Math.round(((attended + remaining) / (total + remaining)) * 100) : 0;
    const projMinPct  = total + remaining > 0
      ? Math.round((attended / (total + remaining)) * 100) : 0;
    const projMarks   = calcMarks(projMinPct, type);
    projection = { remaining, maxMissable, projMaxPct, projMinPct, projMarks };
  }

  return { insight, risk, riskMsg, projection };
}

/* =============================================
   PART 6: ATTENDANCE DASHBOARD
   ============================================= */
function renderAttendance() {
  const container = document.getElementById("attendanceCards");
  const remainingClasses = document.getElementById("remainingClasses")?.value;
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

  stats.forEach(({ subject, type, total, attended, pct, marks }) => {
    const { insight, risk, riskMsg, projection } = getSmartInsight(attended, total, pct, type, remainingClasses);

    const pctClass = pct >= 75 ? "safe" : pct >= 67 ? "warn" : "danger";
    const hasMarks = marks !== null;
    const cardRiskClass = risk === "high-risk" ? " risk-critical" : risk === "warning" ? " risk-high" : "";
    const typeLabel = type === "DSC" ? "DSC" : type === "TUTORIAL" ? "Tutorial" :
                      type === "VAC" ? "VAC" : type === "AEC" ? "AEC" :
                      type === "SEC" ? "SEC" : type === "PRACTICAL" ? "Practical" : type;

    const alertHTML = risk
      ? `<div class="att-alert ${risk}"><span>${risk === 'high-risk' ? '🔴' : '⚠️'}</span><span>${riskMsg}</span></div>`
      : '';

    let projHTML = '';
    if (projection) {
      projHTML = `
        <div class="att-projection">
          <div class="att-proj-title">📆 End-Semester Projection</div>
          <div class="att-proj-row"><span>Max you can miss</span><span class="att-proj-val">${projection.maxMissable} classes</span></div>
          <div class="att-proj-row"><span>Best case %</span><span class="att-proj-val">${projection.projMaxPct}%</span></div>
          <div class="att-proj-row"><span>Worst case %</span><span class="att-proj-val">${projection.projMinPct}%</span></div>
          ${projection.projMarks !== null ? `<div class="att-proj-row"><span>Projected marks</span><span class="att-proj-val">${projection.projMarks}</span></div>` : ''}
        </div>`;
    }

    container.innerHTML += `
      <div class="att-subject-card${cardRiskClass}">
        <div class="att-card-header">
          <div class="att-subject-name">${subject}</div>
          <span class="att-type-badge ${type}">${typeLabel}</span>
        </div>
        <div class="att-stats-row">
          <div class="att-pct ${pctClass}">${total > 0 ? pct + '%' : '--'}</div>
          <div class="att-meta">
            <div class="att-count">${attended} attended / ${total} total</div>
            ${hasMarks ? `<div class="att-marks">Marks: ${marks} pts</div>` : '<div class="att-marks" style="color:rgba(255,255,255,0.3)">No marks tracked</div>'}
          </div>
        </div>
        <div class="att-progress-bg">
          <div class="att-progress-fill ${pctClass}" style="width:${Math.min(100, pct)}%"></div>
        </div>
        ${alertHTML}
        ${insight ? `<div class="att-insight">${insight}</div>` : ''}
        ${projHTML}
      </div>`;
  });
}

/* =============================================
   ATTENDANCE STATUS MARKING (Card buttons)
   ============================================= */
function markAttendance(status) {
  if (modalDayKey === null || modalItemIndex === null) return;
  const item = profiles[currentProfile][modalDayKey][modalItemIndex];
  if (!item) return;

  // Toggle off if same
  item.status = (item.status === status) ? null : status;

  // Update button states
  updateAttendanceBtnStates(item.status);

  saveEditsToStorage();

  // Live-update the card in schedule
  const cards = document.querySelectorAll('#schedule .card');
  if (cards[modalItemIndex]) {
    const card = cards[modalItemIndex];
    if (item.status) {
      card.setAttribute("data-status", item.status);
    } else {
      card.removeAttribute("data-status");
    }
    // update status badge
    const right = card.querySelector(".card-right");
    if (right) {
      const old = right.querySelector(".status-badge");
      if (old) old.remove();
      if (item.status) {
        const labels = { attended:'✅ Done', missed:'❌ Missed', cancelled:'🚫 Off' };
        const badge = document.createElement("span");
        badge.className = `status-badge ${item.status}`;
        badge.textContent = labels[item.status];
        right.appendChild(badge);
      }
    }
  }

  // Refresh attendance tab if visible
  if (currentTab === "attendance") renderAttendance();
}

function updateAttendanceBtnStates(status) {
  ["attended","missed","cancelled"].forEach(s => {
    const btn = document.getElementById(`attBtn-${s}`);
    if (btn) {
      btn.classList.toggle("active", status === s);
    }
  });
}

/* =============================================
   MODAL
   ============================================= */
function openModal(dayKey, itemIndex) {
  const item = profiles[currentProfile][dayKey][itemIndex];
  if (!item) return;

  modalDayKey    = dayKey;
  modalItemIndex = itemIndex;
  isEditing      = false;

  const tag = getTag(item);
  if (isBreakItem(item)) {
    item.subject = item.subject || "Break";
    item.room    = "";
    item.teacher = "";
  }

  document.getElementById("edit-subject").value = item.subject || "";
  document.getElementById("edit-start").value   = item.start   || "";
  document.getElementById("edit-end").value     = item.end     || "";
  document.getElementById("edit-room").value    = item.room    || "";
  document.getElementById("edit-teacher").value = item.teacher || "";

  const validTags = ["lecture", "tutorial", "break"];
  document.getElementById("editTag").value = validTags.includes(tag) ? tag : "lecture";

  updateModalBreakState(isBreakItem(item), true);

  // Show/hide attendance row for non-break items
  const attRow = document.getElementById("modalAttendanceRow");
  if (attRow) attRow.style.display = isBreakItem(item) ? "none" : "";

  // Set attendance button states
  updateAttendanceBtnStates(item.status);

  setReadonly(true);
  document.getElementById("editToggleBtn").style.display = "";
  document.getElementById("saveBtn").style.display       = "none";
  document.getElementById("cancelBtn").style.display     = "none";
  document.getElementById("modalHint").textContent       = "";

  const overlay = document.getElementById("editModal");
  overlay.style.display = "flex";
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("open", "visible")));
}

function closeModal() {
  const overlay = document.getElementById("editModal");
  overlay.classList.remove("visible");
  setTimeout(() => {
    overlay.classList.remove("open");
    overlay.style.display = "none";
    isEditing = false;
  }, 250);
}

function handleModalOverlayClick(e) {
  if (e.target === document.getElementById("editModal")) closeModal();
}

function setReadonly(val) {
  ["edit-subject","edit-start","edit-end","edit-room","edit-teacher"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (val) el.setAttribute("readonly", true);
    else     el.removeAttribute("readonly");
  });
  const tagSel = document.getElementById("editTag");
  if (tagSel) tagSel.disabled = val;
}

function updateModalBreakState(isBreak, readonly) {
  const roomField    = document.getElementById("edit-room").closest(".modal-field");
  const teacherField = document.getElementById("edit-teacher").closest(".modal-field");
  const subjectEl    = document.getElementById("edit-subject");
  if (isBreak) {
    roomField.style.display    = "none";
    teacherField.style.display = "none";
    subjectEl.classList.add("break-locked");
  } else {
    roomField.style.display    = "";
    teacherField.style.display = "";
    subjectEl.classList.remove("break-locked");
    if (!readonly) {
      document.getElementById("edit-room").removeAttribute("readonly");
      document.getElementById("edit-teacher").removeAttribute("readonly");
    }
  }
}

function onTagChange() {
  if (!isEditing) return;
  const isBreak = document.getElementById("editTag").value === "break";
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
    tag:     document.getElementById("editTag").value,
  };
  setReadonly(false);
  const isBreak = document.getElementById("editTag").value === "break";
  updateModalBreakState(isBreak, false);
  if (isBreak) document.getElementById("edit-subject").setAttribute("readonly", true);
  document.getElementById("editToggleBtn").style.display = "none";
  document.getElementById("saveBtn").style.display       = "";
  document.getElementById("cancelBtn").style.display     = "";
  document.getElementById(isBreak ? "edit-start" : "edit-subject").focus();
}

function cancelEdit() {
  document.getElementById("edit-subject").value = originalValues.subject;
  document.getElementById("edit-start").value   = originalValues.start;
  document.getElementById("edit-end").value     = originalValues.end;
  document.getElementById("edit-room").value    = originalValues.room;
  document.getElementById("edit-teacher").value = originalValues.teacher;
  document.getElementById("editTag").value      = originalValues.tag || "lecture";
  const isBreak = (originalValues.tag === "break");
  updateModalBreakState(isBreak, true);
  setReadonly(true);
  isEditing = false;
  document.getElementById("editToggleBtn").style.display = "";
  document.getElementById("saveBtn").style.display       = "none";
  document.getElementById("cancelBtn").style.display     = "none";
  document.getElementById("modalHint").textContent       = "";
}

function saveEdit() {
  const hint    = document.getElementById("modalHint");
  const tag     = document.getElementById("editTag").value;
  const isBreak = (tag === "break");

  const subject = isBreak ? "Break" : document.getElementById("edit-subject").value.trim();
  const start   = document.getElementById("edit-start").value.trim();
  const end     = document.getElementById("edit-end").value.trim();
  const room    = isBreak ? "" : document.getElementById("edit-room").value.trim();
  const teacher = isBreak ? "" : document.getElementById("edit-teacher").value.trim();

  if (!isBreak && !subject) { hint.textContent = "Subject cannot be empty."; return; }
  const timeRe = /^\d{1,2}:\d{2}$/;
  if (!timeRe.test(start)) { hint.textContent = "Start time must be HH:MM (e.g. 10:45)."; return; }
  if (!timeRe.test(end))   { hint.textContent = "End time must be HH:MM (e.g. 11:45).";  return; }
  if (toMinutes(end) <= toMinutes(start)) { hint.textContent = "End time must be after start."; return; }
  hint.textContent = "";

  const item = profiles[currentProfile][modalDayKey][modalItemIndex];
  item.subject = subject;
  item.start   = start;
  item.end     = end;
  item.tag     = tag;
  if (!isBreak) {
    item.type = guessType(item);
    if (room)    item.room    = room;    else delete item.room;
    if (teacher) item.teacher = teacher; else delete item.teacher;
  } else {
    item.room    = "";
    item.teacher = "";
    item.type    = "BREAK";
  }

  profiles[currentProfile][modalDayKey].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  saveEditsToStorage();

  const activeBtn = document.querySelector(`.tabs button[data-day="${currentDay}"]`);
  showDay(currentDay, activeBtn);
  closeModal();
}

/* =============================================
   SWIPE NAVIGATION
   ============================================= */
(function initSwipe() {
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping   = false;
  const THRESHOLD = 50;
  const wrapper   = document.getElementById("scheduleWrapper") || document.querySelector("main");

  wrapper.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping   = false;
  }, { passive: true });

  wrapper.addEventListener("touchmove", (e) => {
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) + 10) isSwiping = true;
  }, { passive: true });

  wrapper.addEventListener("touchend", (e) => {
    if (!isSwiping) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < THRESHOLD) return;
    const currentIdx = DAY_KEYS.indexOf(currentDay);
    if (dx < 0) {
      const nextIdx = (currentIdx + 1) % DAY_KEYS.length;
      const nextDay = DAY_KEYS[nextIdx];
      showDay(nextDay, document.querySelector(`.tabs button[data-day="${nextDay}"]`), "left");
    } else {
      const prevIdx = (currentIdx - 1 + DAY_KEYS.length) % DAY_KEYS.length;
      const prevDay = DAY_KEYS[prevIdx];
      showDay(prevDay, document.querySelector(`.tabs button[data-day="${prevDay}"]`), "right");
    }
    isSwiping = false;
  }, { passive: true });
})();

/* =============================================
   INIT
   ============================================= */
window.onload = () => {
  // Restore profile
  const saved = localStorage.getItem("timetable_profile");
  if (saved && profiles[saved]) {
    currentProfile = saved;
    document.body.className = `theme-${currentProfile}`;

    // Sync drawer buttons
    document.querySelectorAll(".drawer-profile-btn").forEach(b => b.classList.remove("active"));
    const dBtn = document.getElementById(`dBtn-${currentProfile}`);
    if (dBtn) dBtn.classList.add("active");

    document.getElementById("dCheck-suhani").style.display = currentProfile === "suhani" ? "" : "none";
    document.getElementById("dCheck-laksh").style.display  = currentProfile === "laksh"  ? "" : "none";

    const avatar    = document.getElementById("header-avatar");
    const drawerAva = document.getElementById("drawer-avatar");
    const title     = document.getElementById("header-title");
    const dname     = document.getElementById("drawer-name");

    if (currentProfile === "laksh") {
      avatar.src        = "https://i.pinimg.com/originals/f4/2a/f1/f42af16ba580f84430d39a5838ad0c70.jpg";
      drawerAva.src     = "https://i.pinimg.com/originals/f4/2a/f1/f42af16ba580f84430d39a5838ad0c70.jpg";
      title.innerHTML   = "Laksh's<br>Timetable";
      dname.textContent = "Laksh";
    }
  }

  const today    = getToday();
  const todayBtn = document.querySelector(`.tabs button[data-day="${today}"]`);
  if (!todayBtn) {
    showDay("mon", document.querySelector(`.tabs button[data-day="mon"]`));
  } else {
    showDay(today, todayBtn);
  }

  updateBusySection();

  setInterval(() => {
    const activeBtn = document.querySelector(".tabs button.active");
    if (activeBtn) {
      const day     = activeBtn.dataset.day;
      const dayData = profiles[currentProfile][day];
      if (!dayData) return;
      const now = getNow();
      let nextClassTime = null;
      if (isToday(day)) {
        dayData.forEach(item => {
          const t = toMinutes(item.start);
          if (t > now && nextClassTime === null) nextClassTime = t;
        });
      }
      updatePopup(nextClassTime, day);
    }
    updateBusySection();
  }, 60000);
};
