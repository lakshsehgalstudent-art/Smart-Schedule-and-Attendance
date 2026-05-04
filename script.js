/* ===================================================
   SMART ATTENDANCE SYSTEM — script.js
   --- DATE-BASED ARCHITECTURE ---
   - Timetable (editable structure, per weekday pattern)
   - AttendanceLog (permanent date-keyed history)
   - Calendar navigation
   - Add / Edit / Delete lectures
   =================================================== */

/* =============================================
   PART 1: DATA MODEL
   ============================================= */

const DEFAULT_PROFILES = {

  suhani: {
    mon: [
      {start:"10:45", end:"11:45", subject:"HRM", room:"R202", teacher:"Sunita Chhabra", type:"DSC"},
      {start:"11:45", end:"12:45", subject:"Corporate Accounting", room:"R301", teacher:"Devendra Malapati", type:"DSC"},
      {start:"12:45", end:"13:05", subject:"Lunch Break", type:"BREAK"},
      {start:"13:05", end:"14:05", subject:"GE II", room:"Th321", teacher:"Drishti Joshi", type:"GE"},
      {start:"14:05", end:"15:05", subject:"EVS", room:"R216", type:"DSC"},
      {start:"15:05", end:"16:05", subject:"EVS", room:"R216", type:"DSC"}
    ],
    tue: [
      {start:"10:45", end:"11:45", subject:"Company Law Tutorial G1", room:"R205", teacher:"Sindhu Mani", type:"TUTORIAL"},
      {start:"11:45", end:"12:45", subject:"HRM Tutorial G1", room:"R202", teacher:"Sunita Chhabra", type:"TUTORIAL"},
      {start:"12:45", end:"13:05", subject:"Lunch Break", type:"BREAK"},
      {start:"13:05", end:"14:05", subject:"Corporate Accounting", room:"R202", teacher:"Devendra Malapati", type:"DSC"},
      {start:"14:05", end:"15:05", subject:"Company Law", room:"R202", teacher:"Sindhu Mani", type:"DSC"},
      {start:"15:05", end:"16:05", subject:"VAC Semester II", type:"VAC"},
      {start:"16:05", end:"17:05", subject:"VAC Semester II", type:"VAC"}
    ],
    wed: [
      {start:"08:45", end:"09:45", subject:"GE II", room:"Th321", teacher:"Drishti Joshi", type:"GE"},
      {start:"09:45", end:"10:45", subject:"HRM", room:"R202", teacher:"Sunita Chhabra", type:"DSC"},
      {start:"10:45", end:"11:45", subject:"Company Law", room:"R219", teacher:"Sindhu Mani", type:"DSC"},
      {start:"11:45", end:"12:45", subject:"Company Law Tutorial G2", room:"R205", teacher:"Sindhu Mani", type:"TUTORIAL"},
      {start:"12:45", end:"13:05", subject:"Lunch Break", type:"BREAK"},
      {start:"13:05", end:"14:05", subject:"HRM Tutorial G2", room:"R207", teacher:"Sunita Chhabra", type:"TUTORIAL"}
    ],
    thu: [
      {start:"08:45", end:"09:45", subject:"EVS", room:"R202", type:"DSC"},
      {start:"09:45", end:"10:45", subject:"HRM", room:"R202", teacher:"Sunita Chhabra", type:"DSC"},
      {start:"10:45", end:"11:45", subject:"Corporate Accounting Tutorial", room:"R207", teacher:"P. Chengarayulu", type:"TUTORIAL"},
      {start:"11:45", end:"12:45", subject:"HRM Tutorial G3", room:"R207", teacher:"Sunita Chhabra", type:"TUTORIAL"},
      {start:"12:45", end:"13:05", subject:"Lunch Break", type:"BREAK"},
      {start:"13:05", end:"14:05", subject:"Corporate Accounting Tutorial", teacher:"P. Chengarayulu", type:"TUTORIAL"}
    ],
    fri: [
      {start:"08:45", end:"09:45", subject:"Corporate Accounting", room:"R201", teacher:"Devendra Malapati", type:"DSC"},
      {start:"09:45", end:"10:45", subject:"Break", type:"BREAK"},
      {start:"10:45", end:"11:45", subject:"Company Law Tutorial G3", room:"R205", teacher:"Sindhu Mani", type:"TUTORIAL"},
      {start:"11:45", end:"12:45", subject:"Company Law", room:"R321", teacher:"Sindhu Mani", type:"DSC"},
      {start:"12:45", end:"13:05", subject:"Lunch Break", type:"BREAK"},
      {start:"13:05", end:"14:05", subject:"GE II Practical", type:"PRACTICAL"},
      {start:"14:05", end:"15:05", subject:"GE II Practical", type:"PRACTICAL"},
      {start:"15:05", end:"16:05", subject:"GE II Practical", type:"PRACTICAL"}
    ],
    sat: [
      {start:"08:45", end:"09:45", subject:"SEC Semester II", type:"SEC"},
      {start:"09:45", end:"10:45", subject:"SEC Semester II", type:"SEC"},
      {start:"10:45", end:"11:45", subject:"SEC Semester II", type:"SEC"},
      {start:"11:45", end:"12:45", subject:"SEC Semester II", type:"SEC"},
      {start:"12:45", end:"13:05", subject:"Lunch Break", type:"BREAK"},
      {start:"13:05", end:"14:05", subject:"VAC Semester II", type:"VAC"},
      {start:"14:05", end:"15:05", subject:"VAC Semester II", type:"VAC"},
      {start:"15:05", end:"16:05", subject:"AEC Semester II", type:"AEC"},
      {start:"16:05", end:"17:05", subject:"AEC Semester II", type:"AEC"}
    ]
  },

  laksh: {
    mon: [
      {start:"08:30", end:"09:30", subject:"HRM", room:"R27", teacher:"Nisha Devi", type:"DSC"},
      {start:"09:30", end:"10:30", subject:"Company Law", room:"R1", teacher:"Abhishek", type:"DSC"},
      {start:"10:30", end:"11:30", subject:"Break Gap", type:"BREAK"},
      {start:"11:30", end:"12:30", subject:"VAC - Vedic Maths", room:"R33", teacher:"Priyanka Modi", type:"VAC"},
      {start:"13:30", end:"14:00", subject:"Lunch Break", type:"BREAK"},
      {start:"14:00", end:"15:00", subject:"SEC - Digital Marketing", room:"R18", teacher:"Tanisha", type:"SEC"}
    ],
    tue: [
      {start:"08:30", end:"09:30", subject:"PME", room:"R35", teacher:"Kritika", type:"DSC"},
      {start:"09:30", end:"10:30", subject:"EVS", room:"Library FF", teacher:"Franky Varah", type:"DSC"},
      {start:"10:30", end:"11:30", subject:"Corporate Accounting", room:"R27", teacher:"Priya Chaurasia", type:"DSC"},
      {start:"11:30", end:"12:30", subject:"Company Law", room:"R2", teacher:"Abhishek", type:"DSC"}
    ],
    wed: [
      {start:"08:30", end:"09:30", subject:"PME", room:"R15", teacher:"Kritika", type:"DSC"},
      {start:"09:30", end:"10:30", subject:"EVS", room:"SCR4", teacher:"EVSG1", type:"PRACTICAL"},
      {start:"10:30", end:"11:30", subject:"Tute Company Law", room:"T9", teacher:"Renu Aggarwal", type:"TUTORIAL"},
      {start:"11:30", end:"12:30", subject:"HRM", room:"R1", teacher:"Nisha Devi", type:"DSC"},
      {start:"12:30", end:"13:30", subject:"Tute PME", room:"T24", teacher:"Anuradha", type:"TUTORIAL"}
    ],
    thu: [
      {start:"08:30", end:"09:30", subject:"PME", room:"R15", teacher:"Kritika", type:"DSC"},
      {start:"09:30", end:"10:30", subject:"Corporate Accounting", room:"R33", teacher:"Priya Chaurasia", type:"DSC"},
      {start:"10:30", end:"11:30", subject:"EVS", room:"R30", teacher:"EVSG1", type:"PRACTICAL"},
      {start:"11:30", end:"12:30", subject:"Tute HRM", room:"T14", teacher:"Shashank", type:"TUTORIAL"}
    ],
    fri: [
      {start:"08:30", end:"09:30", subject:"HRM", room:"R18", teacher:"Nisha Devi", type:"DSC"},
      {start:"09:30", end:"10:30", subject:"Company Law", room:"R1", teacher:"Abhishek", type:"DSC"},
      {start:"10:30", end:"11:30", subject:"Tute Corporate Accounting", room:"T36", teacher:"Saroj", type:"TUTORIAL"},
      {start:"11:30", end:"12:30", subject:"Break", type:"BREAK"},
      {start:"12:30", end:"13:30", subject:"Corporate Accounting", room:"R1", teacher:"Priya Chaurasia", type:"DSC"},
      {start:"13:30", end:"14:00", subject:"Lunch Break", type:"BREAK"},
      {start:"14:00", end:"15:00", subject:"VAC - Vedic Maths", type:"VAC"}
    ],
    sat: []
  }
};

const DAY_KEYS  = ["mon","tue","wed","thu","fri","sat"];
const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_KEYS_FULL  = ["sun","mon","tue","wed","thu","fri","sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_NAMES_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* =============================================
   STORAGE KEYS
   ============================================= */
const TIMETABLE_KEY = "timetable_structure_v4";
const ATTENDANCE_KEY = "attendance_log_v1";
const PROFILE_KEY = "timetable_profile";
const LEGACY_KEY_V3 = "timetable_full_data_v3";
const LEGACY_KEY_V2 = "timetable_full_data_v2";

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
    item.type = tagMap[item.tag.toLowerCase()] || item.type || "DSC";
    delete item.tag;
  }
  // Strip legacy day-based status — moved to attendanceLog
  delete item.status;
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
      data[prof][day] = (data[prof][day] || []).map(migrateItem);
    }
  }
  return data;
}

/* =============================================
   STATE
   ============================================= */
let currentProfile   = "suhani";
let selectedDate     = todayISO();   // ISO date string (YYYY-MM-DD)
let currentTab       = "schedule";
let detailSubjectKey = null;

let modalDayKey      = null;   // weekday key for editing
let modalItemIndex   = null;
let modalMode        = "view"; // 'view' | 'edit' | 'add'
let isEditing        = false;
let originalValues   = {};

let calMonth = null; // {year, month}

/* =============================================
   LOAD TIMETABLE
   ============================================= */
let timetable = (() => {
  try {
    const saved = localStorage.getItem(TIMETABLE_KEY);
    if (saved) return migrateProfiles(JSON.parse(saved));
    // Migrate from legacy v3 (had per-item status which we now strip)
    const legacyV3 = localStorage.getItem(LEGACY_KEY_V3);
    if (legacyV3) {
      const data = migrateProfiles(JSON.parse(legacyV3));
      saveTimetable(data);
      return data;
    }
    const legacyV2 = localStorage.getItem(LEGACY_KEY_V2);
    if (legacyV2) {
      const data = migrateProfiles(JSON.parse(legacyV2));
      saveTimetable(data);
      return data;
    }
  } catch (e) { console.warn("Timetable load error:", e); }
  return migrateProfiles(JSON.parse(JSON.stringify(DEFAULT_PROFILES)));
})();

/* =============================================
   LOAD ATTENDANCE LOG
   Structure:
     attendanceLog = {
       suhani: {
         "2027-05-04": {
           "08:30-HRM": { status:"attended", subject:"HRM", start:"08:30", end:"09:30", type:"DSC", room:"R27", teacher:"Nisha Devi" }
         }
       },
       laksh: { ... }
     }
   We snapshot subject/time/type at marking time so history survives timetable deletion.
   ============================================= */
let attendanceLog = (() => {
  try {
    const saved = localStorage.getItem(ATTENDANCE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data && typeof data === "object") {
        if (!data.suhani) data.suhani = {};
        if (!data.laksh)  data.laksh  = {};
        return data;
      }
    }
  } catch(e) { console.warn("AttendanceLog load error:", e); }
  return { suhani: {}, laksh: {} };
})();

// One-time migration: pull legacy per-item statuses into attendanceLog (anchored to the upcoming/current week)
(function migrateLegacyStatuses() {
  try {
    const flag = "att_legacy_migrated_v1";
    if (localStorage.getItem(flag)) return;
    const legacy = localStorage.getItem(LEGACY_KEY_V3) || localStorage.getItem(LEGACY_KEY_V2);
    if (!legacy) { localStorage.setItem(flag, "1"); return; }
    const data = JSON.parse(legacy);
    const anchorMonday = mondayOfWeek(new Date());
    for (const prof of ["suhani","laksh"]) {
      if (!data[prof]) continue;
      for (const dayKey of DAY_KEYS) {
        const arr = data[prof][dayKey];
        if (!arr) continue;
        const offset = DAY_KEYS.indexOf(dayKey);
        const dateForDay = new Date(anchorMonday);
        dateForDay.setDate(anchorMonday.getDate() + offset);
        const iso = dateToISO(dateForDay);
        arr.forEach(item => {
          if (item && item.status && !isBreakItem(item)) {
            const cid = classId(item);
            if (!attendanceLog[prof][iso]) attendanceLog[prof][iso] = {};
            if (!attendanceLog[prof][iso][cid]) {
              attendanceLog[prof][iso][cid] = {
                status: item.status,
                subject: item.subject,
                start: item.start,
                end: item.end,
                type: (item.type || "DSC").toUpperCase(),
                room: item.room || "",
                teacher: item.teacher || "",
              };
            }
          }
        });
      }
    }
    saveAttendanceLog();
    localStorage.setItem(flag, "1");
  } catch(e) { console.warn("Legacy migration skipped:", e); }
})();

/* =============================================
   STORAGE HELPERS
   ============================================= */
function saveTimetable(data) {
  try { localStorage.setItem(TIMETABLE_KEY, JSON.stringify(data || timetable)); }
  catch(e) { console.warn("Save timetable error:", e); }
}
function saveAttendanceLog() {
  try { localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendanceLog)); }
  catch(e) { console.warn("Save attendanceLog error:", e); }
}

/* =============================================
   DATE HELPERS
   ============================================= */
function pad2(n){ return String(n).padStart(2,"0"); }
function dateToISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function isoToDate(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y, m-1, d);
}
function todayISO() { return dateToISO(new Date()); }
function dayKeyFromDate(d) { return DAY_KEYS_FULL[d.getDay()]; }
function dayKeyFromISO(iso) { return dayKeyFromDate(isoToDate(iso)); }
function shortDateLabel(d) { return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]}`; }
function fullDateLabel(d)  { return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`; }
function mondayOfWeek(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  return date;
}

/* =============================================
   TIME HELPERS
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
function isSelectedToday() { return selectedDate === todayISO(); }

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

/* =============================================
   CLASS ID
   ============================================= */
function classId(item) {
  return `${item.start}-${item.subject}`;
}

/* =============================================
   GET STATUS / SET STATUS (date-keyed)
   ============================================= */
function getStatus(profile, isoDate, item) {
  const day = attendanceLog[profile] && attendanceLog[profile][isoDate];
  if (!day) return null;
  const rec = day[classId(item)];
  return rec ? rec.status : null;
}

function setStatus(profile, isoDate, item, status) {
  if (!attendanceLog[profile]) attendanceLog[profile] = {};
  if (!attendanceLog[profile][isoDate]) attendanceLog[profile][isoDate] = {};
  const cid = classId(item);
  if (status === null) {
    delete attendanceLog[profile][isoDate][cid];
    if (Object.keys(attendanceLog[profile][isoDate]).length === 0) {
      delete attendanceLog[profile][isoDate];
    }
  } else {
    attendanceLog[profile][isoDate][cid] = {
      status,
      subject: item.subject,
      start: item.start,
      end: item.end,
      type: (item.type || "DSC").toUpperCase(),
      room: item.room || "",
      teacher: item.teacher || "",
    };
  }
  saveAttendanceLog();
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
  const fab = document.getElementById("fabAdd");
  if (fab) fab.style.display = tab === "schedule" ? "" : "none";
  if (tab === "attendance") renderAttendance();
}

/* =============================================
   PROFILE SWITCH
   ============================================= */
function switchProfile(profile, btn) {
  currentProfile = profile;
  localStorage.setItem(PROFILE_KEY, profile);
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
    title.textContent = "Suhani's Timetable";
    dname.textContent = "Suhani";
  } else {
    avatar.src = drawerAva.src = "https://i.pinimg.com/originals/f4/2a/f1/f42af16ba580f84430d39a5838ad0c70.jpg";
    title.textContent = "Laksh's Timetable";
    dname.textContent = "Laksh";
  }

  renderDateStrip();
  renderScheduleForSelected();
  updateBusySection();
  if (currentTab === "attendance") renderAttendance();
  closeDrawer();
}

/* =============================================
   DATE STRIP (rolling 7 days starting Monday of current week)
   ============================================= */
function renderDateStrip() {
  const tabsEl = document.getElementById("tabs");
  const titleEl = document.getElementById("dateStripTitle");
  if (!tabsEl) return;

  // Anchor on Monday of the week containing selectedDate
  const selDate = isoToDate(selectedDate);
  const monday = mondayOfWeek(selDate);

  // Show 6 days Mon..Sat
  tabsEl.innerHTML = "";
  const todayIso = todayISO();

  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = dateToISO(d);
    const dayLabel = DAY_NAMES[i];
    const dateLabel = shortDateLabel(d);
    const isToday = (iso === todayIso);
    const isActive = (iso === selectedDate);

    const btn = document.createElement("button");
    btn.dataset.iso = iso;
    btn.className = `${isActive ? "active " : ""}${isToday ? "is-today" : ""}`.trim();
    btn.innerHTML = `<span class="dt-day">${dayLabel}</span><span class="dt-date">${dateLabel}</span>`;
    btn.onclick = () => selectDate(iso);
    tabsEl.appendChild(btn);
  }

  // Title — week range or today indicator
  if (titleEl) {
    const sat = new Date(monday); sat.setDate(monday.getDate() + 5);
    const sameMonth = monday.getMonth() === sat.getMonth();
    const range = sameMonth
      ? `${monday.getDate()}–${sat.getDate()} ${MONTH_NAMES_SHORT[monday.getMonth()]}`
      : `${monday.getDate()} ${MONTH_NAMES_SHORT[monday.getMonth()]} – ${sat.getDate()} ${MONTH_NAMES_SHORT[sat.getMonth()]}`;
    const yearTxt = monday.getFullYear() !== sat.getFullYear()
      ? `${monday.getFullYear()}/${sat.getFullYear()}`
      : `${monday.getFullYear()}`;
    titleEl.textContent = `Week of ${range}, ${yearTxt}`;
  }
}

function selectDate(iso, direction = null) {
  const prevIso = selectedDate;
  selectedDate = iso;
  renderDateStrip();
  if (direction) {
    renderScheduleForSelected(direction);
  } else {
    // Compute direction based on date order
    const dir = (iso > prevIso) ? "left" : (iso < prevIso ? "right" : null);
    renderScheduleForSelected(dir);
  }
}

/* =============================================
   SCHEDULE RENDER
   ============================================= */
function renderScheduleForSelected(direction = null) {
  const container = document.getElementById("schedule");
  const dayKey = dayKeyFromISO(selectedDate);
  const dayData = (timetable[currentProfile] && timetable[currentProfile][dayKey]) || [];
  // Sort defensively
  dayData.sort((a,b) => toMinutes(a.start) - toMinutes(b.start));
  const viewingToday = isSelectedToday();

  if (direction) {
    const outClass = direction === "left" ? "slide-out-left" : "slide-out-right";
    container.classList.add(outClass);
    setTimeout(() => {
      container.classList.remove(outClass);
      const inClass = direction === "left" ? "slide-in-left" : "slide-in-right";
      container.classList.add(inClass);
      renderSchedule(container, dayData, viewingToday, dayKey);
      requestAnimationFrame(() => requestAnimationFrame(() => container.classList.remove(inClass)));
    }, 180);
  } else {
    renderSchedule(container, dayData, viewingToday, dayKey);
  }
}

function renderSchedule(container, dayData, viewingToday, dayKey) {
  container.innerHTML = "";
  if (!dayData || dayData.length === 0) {
    container.innerHTML = `
      <div class="sleep">
        <span class="sleep-emoji">😴</span>
        <div class="sleep-title">Rest Day!</div>
        <div class="sleep-sub">No classes on this day. Tap ＋ to add one.</div>
      </div>`;
    updatePopup(null, dayKey);
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
    const tagText    = isCurrent ? '<span class="live-dot"></span>LIVE' : type;
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

    const charHTML = '';

    const timeDisplay = formatTimeRange(item.start, item.end);

    // Status from attendanceLog (date-based)
    const status = isBreakCard ? null : getStatus(currentProfile, selectedDate, item);

    let statusBadge = '';
    if (!isBreakCard && status) {
      const labels = { attended:'✅', missed:'❌', cancelled:'🚫' };
      statusBadge = `<span class="status-badge ${status}">${labels[status] || ''}</span>`;
    }

    const statusAttr = status ? `data-status="${status}"` : '';

    let actionsHTML = '';
    if (!isBreakCard) {
      const aActive = status === "attended"  ? " selected" : "";
      const mActive = status === "missed"    ? " selected" : "";
      const cActive = status === "cancelled" ? " selected" : "";
      actionsHTML = `
        <div class="card-actions" onclick="event.stopPropagation()">
          <button class="action-btn act-attend${aActive}"
            onclick="quickMark('${dayKey}',${index},'attended',this)">✅</button>
          <button class="action-btn act-miss${mActive}"
            onclick="quickMark('${dayKey}',${index},'missed',this)">❌</button>
          <button class="action-btn act-cancel${cActive}"
            onclick="quickMark('${dayKey}',${index},'cancelled',this)">🚫</button>
        </div>`;
    }

    container.innerHTML += `
      <div id="${cardId}" class="card${isCurrent ? ' current' : ''}${extraClass}"
           ${statusAttr}
           onclick="openModal('${dayKey}', ${index})">
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
  updatePopup(nextClassTime, dayKey);
}

/* =============================================
   QUICK MARK (writes to attendanceLog by selectedDate)
   ============================================= */
function quickMark(dayKey, itemIndex, status, btnEl) {
  const item = timetable[currentProfile][dayKey][itemIndex];
  if (!item || isBreakItem(item)) return;

  const cur = getStatus(currentProfile, selectedDate, item);
  const newStatus = (cur === status) ? null : status;
  setStatus(currentProfile, selectedDate, item, newStatus);

  const cardId = `card-${itemIndex}`;
  const card = document.getElementById(cardId);
  if (card) {
    if (newStatus) card.setAttribute("data-status", newStatus);
    else card.removeAttribute("data-status");
    card.querySelectorAll(".action-btn").forEach(b => {
      b.classList.remove("selected");
      if (newStatus) {
        if ((b.classList.contains("act-attend")  && newStatus === "attended")  ||
            (b.classList.contains("act-miss")    && newStatus === "missed")    ||
            (b.classList.contains("act-cancel")  && newStatus === "cancelled")) {
          b.classList.add("selected");
        }
      }
    });
    const right = card.querySelector(".card-right");
    if (right) {
      const old = right.querySelector(".status-badge");
      if (old) old.remove();
      if (newStatus) {
        const labels = { attended:'✅', missed:'❌', cancelled:'🚫' };
        const badge = document.createElement("span");
        badge.className = `status-badge ${newStatus}`;
        badge.textContent = labels[newStatus];
        right.appendChild(badge);
      }
    }
  }
  if (currentTab === "attendance") renderAttendance();
}

/* =============================================
   POPUP
   ============================================= */
function updatePopup(nextClassTime, dayKey) {
  const popup = document.getElementById("nextClassPopup");
  if (!popup) return;
  const text = popup.querySelector(".popup-text");
  const icon = popup.querySelector(".popup-icon");
  const viewingToday = isSelectedToday();

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
    const dayData = timetable[currentProfile][dayKey] || [];
    const firstClass = dayData.find(item => !isBreakItem(item));
    if (firstClass) {
      const dLabel = shortDateLabel(isoToDate(selectedDate));
      text.textContent = `${dLabel}: First class at ${formatDisplayTime(firstClass.start)}`;
      icon.textContent = "📅";
    } else {
      text.textContent = `No classes on ${shortDateLabel(isoToDate(selectedDate))}`;
      icon.textContent = "😴";
    }
  }
}

/* =============================================
   WHO'S BUSY / NEXT COMMON FREE TIME
   (Always uses today's weekday pattern from timetable)
   ============================================= */
function getBusyIntervals(profile, dayKey) {
  const dayData = (timetable[profile] && timetable[profile][dayKey]) || [];
  const intervals = dayData
    .filter(i => !isBreakItem(i))
    .map(i => [toMinutes(i.start), toMinutes(i.end)])
    .filter(([s,e]) => e > s)
    .sort((a,b) => a[0] - b[0]);
  const merged = [];
  for (const iv of intervals) {
    if (merged.length && iv[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], iv[1]);
    } else merged.push([iv[0], iv[1]]);
  }
  return merged;
}
function isUserBusyNow(profile, dayKey, nowMins) {
  return getBusyIntervals(profile, dayKey).some(([s, e]) => nowMins >= s && nowMins < e);
}
function hasClassesRemainingToday(profile, dayKey, nowMins) {
  return getBusyIntervals(profile, dayKey).some(([s, e]) => e > nowMins);
}
function getCombinedBusyIntervals(dayKey) {
  const all = [
    ...getBusyIntervals("suhani", dayKey),
    ...getBusyIntervals("laksh",  dayKey),
  ].sort((a,b) => a[0] - b[0]);
  const merged = [];
  for (const iv of all) {
    if (merged.length && iv[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], iv[1]);
    } else merged.push([iv[0], iv[1]]);
  }
  return merged;
}
function findNextBothFreeTransition(dayKey, nowMins) {
  const combined = getCombinedBusyIntervals(dayKey);
  for (const [, e] of combined) if (e > nowMins) return e;
  return null;
}
function findNextCommonFreeTime() {
  const today = dayKeyFromDate(new Date());
  if (!DAY_KEYS.includes(today)) return null;
  const now = getNow();
  const sBusy = isUserBusyNow("suhani", today, now);
  const lBusy = isUserBusyNow("laksh",  today, now);
  if (!sBusy && !lBusy) return null;
  const t = findNextBothFreeTransition(today, now);
  if (t === null) return null;
  return `Today at ${minsToDisplay(t)}`;
}

function updateBusySection() {
  const today = dayKeyFromDate(new Date()), now = getNow();
  const check = profile => {
    const dayData = (timetable[profile] && timetable[profile][today]) || [];
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
    row.classList.add("hidden");
  }
}

/* =============================================
   ATTENDANCE ENGINE
   --- now reads from attendanceLog (date-based) ---
   ============================================= */
function normaliseSubject(subject) {
  return (subject || "")
    .toLowerCase()
    .replace(/\s*(tutorial|tute|g1|g2|g3|group\s*\d)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcMarks(pct, type) {
  const t = (type||"DSC").toUpperCase();
  if (["SEC","PRACTICAL","BREAK","GE"].includes(t)) return null;
  let slabs;
  if (t === "DSC")           slabs = [[85,6],[75,3.6],[70,2.4],[67,1.2],[0,0]];
  else if (t === "TUTORIAL") slabs = [[85,5],[75,3],[70,2],[67,1],[0,0]];
  else                       slabs = [[85,2],[75,1.6],[70,1.2],[67,0.8],[0,0]];
  for (const [threshold, marks] of slabs) if (pct >= threshold) return marks;
  return 0;
}

const SLABS = [
  { id:"top",   label:"85%+ (Full marks)", emoji:"🟢", lo:85,  hi:Infinity, color:"good" },
  { id:"high",  label:"75 – 85%",           emoji:"🟡", lo:75,  hi:85,        color:"good" },
  { id:"mid",   label:"70 – 75%",           emoji:"🟠", lo:70,  hi:75,        color:"warn" },
  { id:"low",   label:"67 – 70%",           emoji:"🔴", lo:67,  hi:70,        color:"bad"  },
];

function slabMarks(slabId, type) {
  const t = (type || "DSC").toUpperCase();
  if (["SEC","PRACTICAL","BREAK","GE"].includes(t)) return null;
  const map = {
    DSC:      { top:6,   high:3.6, mid:2.4, low:1.2 },
    TUTORIAL: { top:5,   high:3,   mid:2,   low:1   },
    VAC:      { top:2,   high:1.6, mid:1.2, low:0.8 },
    AEC:      { top:2,   high:1.6, mid:1.2, low:0.8 },
  };
  const row = map[t] || map.DSC;
  return row[slabId] !== undefined ? row[slabId] : null;
}

function computeSlabAnalysis(A, T, F, type) {
  const finalTotal = T + F;
  if (F <= 0 || finalTotal <= 0) return null;

  const bestPct  = ((A + F) / finalTotal) * 100;
  const worstPct = (A / finalTotal) * 100;

  const pctIfMissOne = ((A + F - 1) / finalTotal) * 100;
  const criticalNoMiss = (F >= 1) && (pctIfMissOne < 67);

  const results = SLABS.map(slab => {
    const rawMax = (A + F) - (slab.lo * finalTotal) / 100;
    let xMax = Math.floor(rawMax + 1e-9);

    let xMin;
    if (slab.hi === Infinity) {
      xMin = 0;
    } else {
      const rawMin = (A + F) - (slab.hi * finalTotal) / 100;
      xMin = Math.floor(rawMin + 1e-9) + 1;
    }

    xMax = Math.min(F, xMax);
    xMin = Math.max(0, xMin);

    const achievable = (xMax >= 0) && (xMin <= F) && (xMax >= xMin) &&
                       (bestPct >= slab.lo - 1e-9);
    const slabReachable = bestPct >= slab.lo - 1e-9;

    let maxMiss = null, mustAttend = null;
    if (achievable && slabReachable) {
      maxMiss = xMax;
      mustAttend = F - xMax;
      if (mustAttend < 0) mustAttend = 0;
    }
    return {
      ...slab,
      achievable: achievable && slabReachable,
      maxMiss,
      mustAttend,
      marks: slabMarks(slab.id, type),
    };
  });

  return {
    A, T, F,
    finalTotal,
    bestPct: Math.round(bestPct * 10) / 10,
    worstPct: Math.round(worstPct * 10) / 10,
    criticalNoMiss,
    slabs: results,
  };
}

/**
 * Build per-subject stats from attendanceLog.
 * Each unique (normalisedSubject + type) becomes one subject card.
 * History persists even if the lecture has been deleted from the timetable.
 */
function getSubjectStats() {
  const profileLog = attendanceLog[currentProfile] || {};
  const subjectMap = {};

  // Walk every dated entry
  for (const iso in profileLog) {
    const dayRecords = profileLog[iso];
    for (const cid in dayRecords) {
      const rec = dayRecords[cid];
      if (!rec || !rec.subject) continue;
      const type = (rec.type || "DSC").toUpperCase();
      if (type === "BREAK") continue;
      const key = `${normaliseSubject(rec.subject)}__${type}`;
      if (!subjectMap[key]) {
        subjectMap[key] = {
          subject: rec.subject,
          type,
          history: [],   // array of {iso, item:{subject,start,end,...}, status}
        };
      }
      subjectMap[key].history.push({
        iso,
        item: {
          subject: rec.subject,
          start: rec.start,
          end: rec.end,
          type,
          room: rec.room || "",
          teacher: rec.teacher || "",
        },
        status: rec.status,
      });
    }
  }

  const result = [];
  for (const key in subjectMap) {
    const { subject, type, history } = subjectMap[key];
    const attended = history.filter(h => h.status === "attended").length;
    const missed   = history.filter(h => h.status === "missed").length;
    const total    = attended + missed;
    const pct      = total > 0 ? Math.round((attended / total) * 100) : 0;
    const marks    = calcMarks(pct, type);
    // Sort history by date+time descending (most recent first)
    history.sort((a,b) => (a.iso === b.iso
      ? toMinutes(a.item.start) - toMinutes(b.item.start)
      : (a.iso < b.iso ? 1 : -1)));
    result.push({ subject, type, history, attended, missed, total, pct, marks, key });
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
          <span class="att-type-badge ${type}">${type}</span>
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
  const stat = getSubjectStats().find(s => s.key === key);
  if (!stat) return;

  currentTab = "subject-detail";
  document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
  document.getElementById("tab-subject-detail").classList.add("active");
  document.getElementById("nextClassPopup").style.display = "none";
  document.getElementById("fabAdd").style.display = "none";
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
  const { subject, type, total, attended, pct, marks, history } = stat;
  const pctClass = total > 0 ? (pct>=75?"safe":pct>=67?"warn":"danger") : "neutral";
  const { insight, risk, riskMsg } = getSmartInsight(attended, total, pct, type);

  // History from attendanceLog (date-based, sorted desc)
  let historyHTML = '';
  if (history.length === 0) {
    historyHTML = `<div class="history-empty">No attendance marked yet.</div>`;
  } else {
    historyHTML = '<div class="history-list">';
    history.forEach(({ iso, item, status }) => {
      const icons  = { attended:'✅', missed:'❌', cancelled:'🚫' };
      const labels = { attended:'Attended', missed:'Missed', cancelled:'Cancelled' };
      const timeStr = `${formatDisplayTime(item.start)} – ${formatDisplayTime(item.end)}`;
      const dateLabel = fullDateLabel(isoToDate(iso));
      historyHTML += `
        <div class="history-item">
          <div class="history-status">${icons[status]||''}</div>
          <div class="history-info">
            <div class="history-date">${item.subject}</div>
            <div class="history-day">${dateLabel} · ${timeStr}</div>
          </div>
          <span class="history-label ${status}">${labels[status]||''}</span>
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
   WEEK-WISE GRAPH (uses ISO weeks)
   ============================================= */
function buildWeeklyData(stat) {
  // Group history by ISO week (Monday-anchored), keep only attended/missed
  const buckets = {}; // mondayISO -> {a, m}
  stat.history.forEach(({ iso, status }) => {
    if (status !== "attended" && status !== "missed") return;
    const monday = mondayOfWeek(isoToDate(iso));
    const mIso = dateToISO(monday);
    if (!buckets[mIso]) buckets[mIso] = { a:0, m:0, mIso };
    if (status === "attended") buckets[mIso].a += 1;
    else buckets[mIso].m += 1;
  });
  const weeksAsc = Object.values(buckets).sort((x,y) => x.mIso < y.mIso ? -1 : 1);
  if (weeksAsc.length === 0) return [];
  let cumA = 0, cumT = 0;
  return weeksAsc.map((w, i) => {
    cumA += w.a;
    cumT += (w.a + w.m);
    const pct = cumT > 0 ? Math.round((cumA / cumT) * 100) : 0;
    return { week: i + 1, attended: w.a, missed: w.m, pct };
  });
}

function drawAttChart(stat) {
  const canvas = document.getElementById("attChart");
  const legendEl = document.getElementById("graph-legend");
  if (!canvas) return;
  const weeks = buildWeeklyData(stat);

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

  if (weeks.length === 0) {
    ctx.fillStyle = "#9999bb";
    ctx.font = `600 13px 'DM Sans', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Mark some classes to see your weekly trend", W/2, H/2);
    if (legendEl) legendEl.innerHTML = '';
    return;
  }

  const padL = 38, padR = 14, padT = 14, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const yMax = 100, yMin = 0;
  const yToPx = (v) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const n = weeks.length;
  const xToPx = (i) => n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW;

  ctx.strokeStyle = "#eef0f4";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#9999bb";
  ctx.font = `600 10px 'DM Sans', sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  [0, 25, 50, 75, 100].forEach(v => {
    const y = yToPx(v);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    ctx.fillText(v + "%", padL - 6, y);
  });

  ctx.strokeStyle = "#d97706";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padL, yToPx(75)); ctx.lineTo(W - padR, yToPx(75));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#9999bb";
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  weeks.forEach((w, i) => ctx.fillText(`W${w.week}`, xToPx(i), padT + plotH + 8));

  const points = weeks.map((w, i) => ({ x: xToPx(i), y: yToPx(w.pct), pct: w.pct }));
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

  ctx.strokeStyle = "#0f2460";
  ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  points.forEach((p) => {
    const color = p.pct >= 75 ? "#16a34a" : p.pct >= 67 ? "#d97706" : "#dc2626";
    ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = color; ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `bold 10px 'DM Sans', sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(p.pct + "%", p.x, Math.max(padT + 10, p.y - 9));
  });

  if (legendEl) {
    let trendHTML = '';
    if (weeks.length >= 2) {
      const diff = weeks[weeks.length - 1].pct - weeks[0].pct;
      if (diff > 1)      trendHTML = `<span class="graph-trend up">↗ Improving <span style="color:#9999bb;font-weight:600">+${diff}%</span></span>`;
      else if (diff < -1)trendHTML = `<span class="graph-trend down">↘ Declining <span style="color:#9999bb;font-weight:600">${diff}%</span></span>`;
      else               trendHTML = `<span class="graph-trend flat">→ Steady</span>`;
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
   END-SEM SIMULATOR
   ============================================= */
function renderEndSem(key) {
  const stat = getSubjectStats().find(s => s.key === key);
  if (!stat) return;
  const safeId  = key.replace(/[^a-z0-9]/gi, '_');
  const inputEl = document.getElementById(`endsem-input-${safeId}`);
  const resEl   = document.getElementById(`endsem-result-${safeId}`);
  if (!inputEl || !resEl) return;

  const rawVal = inputEl.value;
  const F = parseInt(rawVal, 10);
  if (!rawVal || isNaN(F) || F < 0) { resEl.innerHTML = ''; return; }
  if (F === 0) {
    resEl.innerHTML = `
      <div class="endsem-result">
        <div class="endsem-row"><span class="endsem-label">No future classes</span><span class="endsem-val">—</span></div>
      </div>`;
    return;
  }

  const A = stat.attended, T = stat.total, type = stat.type;
  const analysis = computeSlabAnalysis(A, T, F, type);
  if (!analysis) { resEl.innerHTML = ''; return; }

  const headerHTML = `
    <div class="endsem-result">
      <div class="endsem-row"><span class="endsem-label">Total classes (projected)</span><span class="endsem-val">${analysis.finalTotal}</span></div>
      <div class="endsem-row"><span class="endsem-label">Best case % (attend all ${F})</span><span class="endsem-val good">${analysis.bestPct}%</span></div>
      <div class="endsem-row"><span class="endsem-label">Worst case % (miss all ${F})</span><span class="endsem-val ${analysis.worstPct>=75?'warn':'bad'}">${analysis.worstPct}%</span></div>
    </div>`;

  if (analysis.criticalNoMiss) {
    resEl.innerHTML = `
      ${headerHTML}
      <div class="slab-analysis">
        <div class="slab-analysis-title">Max Miss Analysis</div>
        <div class="slab-row critical">
          <div class="slab-head"><span class="slab-emoji">❌</span><span class="slab-label">You cannot miss ANY class</span></div>
          <div class="slab-detail">Even missing one class drops you below 67%. Attend every remaining class.</div>
        </div>
      </div>`;
    return;
  }

  const slabRowsHTML = analysis.slabs.map(slab => {
    if (!slab.achievable) {
      return `
        <div class="slab-row not-achievable">
          <div class="slab-head">
            <span class="slab-emoji">${slab.emoji}</span>
            <span class="slab-label">${slab.label}</span>
            <span class="slab-tag muted">Not achievable</span>
          </div>
          <div class="slab-detail">Even attending all ${F} remaining classes can't reach this slab.</div>
        </div>`;
    }
    const marksTxt = slab.marks !== null ? `${slab.marks} marks` : 'No attendance marks';
    const marksClass = slab.marks !== null ? slab.color : 'muted';
    let guidance = '';
    if (slab.mustAttend === 0)      guidance = `You're already in this slab — miss up to <b>${slab.maxMiss}</b> of ${F}.`;
    else if (slab.mustAttend === F) guidance = `Attend all <b>${F}</b> remaining classes (cannot miss any to stay here).`;
    else                            guidance = `Attend at least <b>${slab.mustAttend}</b> out of ${F} (miss up to <b>${slab.maxMiss}</b>).`;

    return `
      <div class="slab-row ${slab.color}">
        <div class="slab-head">
          <span class="slab-emoji">${slab.emoji}</span>
          <span class="slab-label">${slab.label}</span>
          <span class="slab-tag ${marksClass}">${marksTxt}</span>
        </div>
        <div class="slab-stats">
          <div class="slab-stat"><span class="slab-stat-val">${slab.maxMiss}</span><span class="slab-stat-lbl">max miss</span></div>
          <div class="slab-stat"><span class="slab-stat-val">${slab.mustAttend}</span><span class="slab-stat-lbl">min attend</span></div>
          <div class="slab-stat"><span class="slab-stat-val">${slab.marks !== null ? slab.marks : '—'}</span><span class="slab-stat-lbl">marks</span></div>
        </div>
        <div class="slab-detail">${guidance}</div>
      </div>`;
  }).join('');

  const belowRowHTML = `
    <div class="slab-row danger">
      <div class="slab-head">
        <span class="slab-emoji">🚫</span>
        <span class="slab-label">Below 67%</span>
        <span class="slab-tag bad">0 marks</span>
      </div>
      <div class="slab-detail">Avoid this — debarment risk. Do not let attendance fall here.</div>
    </div>`;

  resEl.innerHTML = `
    ${headerHTML}
    <div class="slab-analysis">
      <div class="slab-analysis-title">Max Miss Analysis</div>
      ${slabRowsHTML}
      ${belowRowHTML}
    </div>`;
}

/* =============================================
   MODAL — VIEW / EDIT / ADD / DELETE
   ============================================= */
function openModal(dayKey, itemIndex) {
  const item = timetable[currentProfile][dayKey][itemIndex];
  if (!item) return;
  modalDayKey = dayKey; modalItemIndex = itemIndex; modalMode = "view"; isEditing = false;

  document.getElementById("modalTitle").textContent = "Class Details";

  if (isBreakItem(item)) item.subject = item.subject || "Break";

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
  document.getElementById("deleteBtn").style.display     = "none";
  document.getElementById("modalHint").textContent       = "";

  showModal();
}

function openAddModal() {
  modalMode = "add";
  modalDayKey = dayKeyFromISO(selectedDate);
  modalItemIndex = null;
  isEditing = true;

  document.getElementById("modalTitle").textContent =
    `New Lecture · ${DAY_NAMES[DAY_KEYS.indexOf(modalDayKey)] || ''} ${shortDateLabel(isoToDate(selectedDate))}`;

  document.getElementById("edit-subject").value = "";
  document.getElementById("edit-start").value   = "";
  document.getElementById("edit-end").value     = "";
  document.getElementById("edit-room").value    = "";
  document.getElementById("edit-teacher").value = "";
  document.getElementById("editTag").value      = "DSC";

  updateModalBreakState(false, false);
  setReadonly(false);
  document.getElementById("editToggleBtn").style.display = "none";
  document.getElementById("saveBtn").style.display       = "";
  document.getElementById("cancelBtn").style.display     = "";
  document.getElementById("deleteBtn").style.display     = "none";
  document.getElementById("modalHint").textContent       = "";

  showModal();
  setTimeout(() => document.getElementById("edit-subject").focus(), 250);
}

function showModal() {
  const overlay = document.getElementById("editModal");
  overlay.style.display = "flex";
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("open","visible")));
}

function closeModal() {
  const overlay = document.getElementById("editModal");
  overlay.classList.remove("visible");
  setTimeout(() => {
    overlay.classList.remove("open");
    overlay.style.display="none";
    isEditing=false;
    modalMode="view";
  }, 220);
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
  modalMode = "edit";
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
  document.getElementById("deleteBtn").style.display     = "";
  document.getElementById("edit-subject").focus();
}

function cancelEdit() {
  if (modalMode === "add") { closeModal(); return; }
  document.getElementById("edit-subject").value = originalValues.subject;
  document.getElementById("edit-start").value   = originalValues.start;
  document.getElementById("edit-end").value     = originalValues.end;
  document.getElementById("edit-room").value    = originalValues.room;
  document.getElementById("edit-teacher").value = originalValues.teacher;
  document.getElementById("editTag").value      = originalValues.type || "DSC";
  updateModalBreakState(originalValues.type === "BREAK", true);
  setReadonly(true);
  isEditing = false;
  modalMode = "view";
  document.getElementById("editToggleBtn").style.display = "";
  document.getElementById("saveBtn").style.display       = "none";
  document.getElementById("cancelBtn").style.display     = "none";
  document.getElementById("deleteBtn").style.display     = "none";
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

  const arr = timetable[currentProfile][modalDayKey] = timetable[currentProfile][modalDayKey] || [];

  if (modalMode === "add") {
    const newItem = { subject, start, end, type };
    if (!isBreak) {
      if (room)    newItem.room    = room;
      if (teacher) newItem.teacher = teacher;
    }
    arr.push(newItem);
  } else {
    const item = arr[modalItemIndex];
    if (!item) { closeModal(); return; }
    item.subject = subject;
    item.start   = start;
    item.end     = end;
    item.type    = type;
    if (!isBreak) {
      if (room)    item.room    = room;    else delete item.room;
      if (teacher) item.teacher = teacher; else delete item.teacher;
    } else {
      delete item.room; delete item.teacher;
    }
  }

  arr.sort((a,b) => toMinutes(a.start) - toMinutes(b.start));
  saveTimetable();

  renderScheduleForSelected();
  updateBusySection();
  closeModal();
}

function deleteLecture() {
  if (modalMode === "add" || modalItemIndex === null) { closeModal(); return; }
  const arr = timetable[currentProfile][modalDayKey];
  if (!arr || !arr[modalItemIndex]) { closeModal(); return; }

  const ok = confirm("Delete this lecture from the timetable?\n\nNote: Past attendance history will be preserved.");
  if (!ok) return;

  arr.splice(modalItemIndex, 1);
  // 🚨 DO NOT touch attendanceLog — history must survive
  saveTimetable();

  renderScheduleForSelected();
  updateBusySection();
  closeModal();
}

/* =============================================
   CALENDAR
   ============================================= */
function openCalendar() {
  const d = isoToDate(selectedDate);
  calMonth = { year: d.getFullYear(), month: d.getMonth() };
  renderCalendar();
  const overlay = document.getElementById("calendarModal");
  overlay.style.display = "flex";
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("open","visible")));
}
function closeCalendar() {
  const overlay = document.getElementById("calendarModal");
  overlay.classList.remove("visible");
  setTimeout(() => { overlay.classList.remove("open"); overlay.style.display="none"; }, 220);
}
function handleCalendarOverlayClick(e) {
  if (e.target === document.getElementById("calendarModal")) closeCalendar();
}
function calNavMonth(delta) {
  if (!calMonth) return;
  let m = calMonth.month + delta;
  let y = calMonth.year;
  if (m < 0) { m = 11; y--; }
  if (m > 11){ m = 0;  y++; }
  calMonth = { year: y, month: m };
  renderCalendar();
}
function calJumpToToday() {
  selectedDate = todayISO();
  renderDateStrip();
  renderScheduleForSelected();
  updateBusySection();
  closeCalendar();
}
function renderCalendar() {
  const titleEl = document.getElementById("calTitle");
  const grid    = document.getElementById("calGrid");
  if (!titleEl || !grid || !calMonth) return;
  const { year, month } = calMonth;
  titleEl.textContent = `${MONTH_NAMES[month]} ${year}`;

  const first = new Date(year, month, 1);
  const startDow = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const todayIso = todayISO();
  const profileLog = attendanceLog[currentProfile] || {};

  let cells = [];
  // Leading days (prev month)
  for (let i = startDow - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const d = new Date(year, month - 1, day);
    cells.push({ d, muted: true });
  }
  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ d: new Date(year, month, day), muted: false });
  }
  // Trailing days
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].d;
    const next = new Date(last); next.setDate(last.getDate() + 1);
    cells.push({ d: next, muted: next.getMonth() !== month });
    if (cells.length >= 42) break;
  }

  grid.innerHTML = "";
  cells.forEach(({ d, muted }) => {
    const iso = dateToISO(d);
    const hasData = !!profileLog[iso] && Object.keys(profileLog[iso]).length > 0;
    const isToday = iso === todayIso;
    const isSelected = iso === selectedDate;

    const btn = document.createElement("button");
    btn.className = `cal-day${muted ? " muted" : ""}${isToday ? " today" : ""}${isSelected ? " selected" : ""}${hasData ? " has-data" : ""}`;
    btn.textContent = d.getDate();
    btn.onclick = () => {
      selectedDate = iso;
      renderDateStrip();
      renderScheduleForSelected();
      updateBusySection();
      closeCalendar();
    };
    grid.appendChild(btn);
  });
}

/* =============================================
   SWIPE NAVIGATION (date-based)
   ============================================= */
(function initSwipe() {
  let touchStartX = 0, touchStartY = 0, isSwiping = false;
  const THRESHOLD = 50;
  const wrapper = document.getElementById("scheduleWrapper") || document.querySelector("main");
  if (!wrapper) return;

  wrapper.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = false;
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
    const cur = isoToDate(selectedDate);
    const next = new Date(cur);
    if (dx < 0) next.setDate(cur.getDate() + 1);  // swipe left -> next day
    else        next.setDate(cur.getDate() - 1);  // swipe right -> prev day
    // Skip Sundays (timetable is Mon–Sat)
    if (next.getDay() === 0) next.setDate(next.getDate() + (dx < 0 ? 1 : -1));
    selectDate(dateToISO(next), dx < 0 ? "left" : "right");
    isSwiping = false;
  }, { passive: true });
})();

/* =============================================
   MIDNIGHT ROLLOVER
   ============================================= */
function scheduleMidnightRefresh() {
  const now = new Date();
  const nextMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0, 0, 5);
  const ms = nextMid - now;
  setTimeout(() => {
    // If user was on "today", roll selectedDate forward to new today
    const newToday = todayISO();
    if (selectedDate < newToday) selectedDate = newToday;
    renderDateStrip();
    renderScheduleForSelected();
    updateBusySection();
    scheduleMidnightRefresh();
  }, Math.max(1000, ms));
}

/* =============================================
   INIT
   ============================================= */
window.onload = () => {
  const saved = localStorage.getItem(PROFILE_KEY);
  if (saved && timetable[saved]) {
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
      title.textContent = "Laksh's Timetable";
      dname.textContent = "Laksh";
    }
  }

  // If today is Sunday, snap to Monday for the schedule view
  selectedDate = todayISO();
  if (isoToDate(selectedDate).getDay() === 0) {
    const d = isoToDate(selectedDate);
    d.setDate(d.getDate() + 1);
    selectedDate = dateToISO(d);
  }

  renderDateStrip();
  renderScheduleForSelected();
  updateBusySection();
  scheduleMidnightRefresh();

  setInterval(() => {
    if (currentTab === "schedule") {
      const dayKey = dayKeyFromISO(selectedDate);
      const dayData = (timetable[currentProfile] && timetable[currentProfile][dayKey]) || [];
      const now = getNow();
      let nextClassTime = null;
      if (isSelectedToday()) dayData.forEach(item => {
        if (!isBreakItem(item) && toMinutes(item.start) > now && nextClassTime === null)
          nextClassTime = toMinutes(item.start);
      });
      updatePopup(nextClassTime, dayKey);
    }
    updateBusySection();
  }, 60000);
};
