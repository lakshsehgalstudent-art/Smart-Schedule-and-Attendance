/* ===================================================
   SMART ATTENDANCE SYSTEM — script.js
   --- OFFLINE-FIRST & PRODUCTION READY V9 ---
   - Durable IndexedDB Storage & Pending-Mutation Queue
   - Concurrency-Aware Sync Engine (Optimistic Locking + Conflict Preservation)
   - Assignments & Academic Tasks Tracker (Profile-Scoped Mode A)
   - Tests & Exams Tracker (Distinct Prep Status vs. Recorded Results)
   - Schedule Collapsible Upcoming Deadlines & Tests Summary
   - Full Preservation of Existing Attendance, Timetable, Audit & Analytics
   =================================================== */

/* =============================================
   MODULE: CONSTANTS & DEFAULTS
   ============================================= */
const SUPABASE_URL = "https://dztdpvokmwyvvxlzynls.supabase.co";
// NOTE: It is safe to expose the anon key in frontend JS code as long as your Row Level Security (RLS) policies are active.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6dGRwdm9rbXd5dnZ4bHp5bmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNjA3NjAsImV4cCI6MjEwMTczNjc2MH0.Cmrd1BKkuCpJzFWlbOGvJ6UhdgyQkLyYUbouZ0_drX0";

const supabaseClient = (window.supabase && typeof window.supabase.createClient === "function")
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const CONSTANTS = {
    PROFILES: ["suhani", "laksh"],
    DAY_KEYS: ["mon", "tue", "wed", "thu", "fri", "sat"],
    DAY_KEYS_FULL: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
    DAY_NAMES_FULL: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    DAY_NAMES: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    MONTH_NAMES: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    MONTH_NAMES_SHORT: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    PERIOD_TYPES: {
        "Semester": "🎓",
        "Vacation": "🏖",
        "Preparatory Leave": "📖",
        "Exam Period": "📝",
        "Custom": "📅"
    },
    TASK_TYPES: {
        assignment: "Assignment",
        project: "Project",
        presentation: "Presentation",
        practical: "Practical",
        revision: "Revision",
        reading: "Reading",
        other: "Other"
    },
    TASK_STATUSES: {
        not_started: "Not Started",
        in_progress: "In Progress",
        completed: "Completed"
    },
    TASK_PRIORITIES: {
        low: "Low",
        medium: "Medium",
        high: "High"
    },
    ASSESSMENT_TYPES: {
        class_test: "Class Test",
        internal_assessment: "Internal Assessment",
        mid_semester: "Mid-Semester",
        end_semester: "End-Semester",
        practical: "Practical",
        viva: "Viva",
        mock_test: "Mock Test",
        other: "Other"
    },
    PREP_STATUSES: {
        not_started: "Not Started",
        preparing: "Preparing",
        prepared: "Prepared"
    },
    STORAGE: {
        TIMELINE: "academic_timeline_v6",
        ATTENDANCE: "attendance_log_v1",
        PROFILE: "timetable_profile",
        METADATA: "smart_attendance_metadata",
        TASKS_FALLBACK: "smart_attendance_tasks_v9",
        ASSESSMENTS_FALLBACK: "smart_attendance_assessments_v9",
        AUTH_CACHE: "smart_attendance_auth_cache_v9"
    },
    IDB: {
        NAME: "smart_attendance_idb_v9",
        VERSION: 1
    },
    APP_VERSION: "9.0.0",
    SCHEMA_VERSION: "9.0"
};

const DEFAULT_TIMETABLES = {
    suhani: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] },
    laksh: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] }
};

/* =============================================
   MODULE: STATE
   ============================================= */
const State = {
    currentProfile: "suhani",
    selectedDate: "",
    currentTab: "schedule",
    scheduleStripExpanded: false,
    metadata: {
        schemaVersion: CONSTANTS.SCHEMA_VERSION,
        createdAt: "",
        lastModified: "",
        appVersion: CONSTANTS.APP_VERSION
    },
    modal: {
        mode: "view",
        dayKey: null,
        lectureId: null,
        periodId: null,
        versionId: null,
        originalValues: {}
    },
    versionManager: {
        periodId: null
    },
    calMonth: null,
    editingPeriodId: null,
    data: {
        timeline: [],
        attendance: { suhani: {}, laksh: {} }
    },
    tasks: [],        // Array of academic_tasks records (active & soft-deleted tombstones)
    assessments: [],  // Array of academic_assessments records (active & soft-deleted tombstones)
    conflicts: [],    // Unresolved data conflicts requiring user review
    taskFilters: {
        search: "",
        subject: "all",
        taskType: "all",
        status: "all",
        priority: "all",
        bucket: "all", // 'all' | 'overdue' | 'today' | 'upcoming' | 'completed'
        sortBy: "due_date" // 'due_date' | 'priority' | 'created_at'
    },
    assessmentFilters: {
        subject: "all",
        assessmentType: "all",
        prepStatus: "all",
        bucket: "all", // 'all' | 'upcoming' | 'overdue_unrecorded' | 'completed_scored'
        sortBy: "date_asc" // 'date_asc' | 'date_desc'
    }
};

/* =============================================
   MODULE: UTILITIES
   ============================================= */
const Utils = {
    pad2: (n) => String(n).padStart(2, "0"),
    dateToISO: (d) => `${d.getFullYear()}-${Utils.pad2(d.getMonth() + 1)}-${Utils.pad2(d.getDate())}`,
    isoToDate: (iso) => {
        if (!iso || typeof iso !== "string") return new Date();
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
    },
    todayISO: () => Utils.dateToISO(new Date()),
    nowISO: () => new Date().toISOString(),
    dayKeyFromDate: (d) => CONSTANTS.DAY_KEYS_FULL[d.getDay()],
    dayKeyFromISO: (iso) => Utils.dayKeyFromDate(Utils.isoToDate(iso)),
    shortDateLabel: (d) => `${d.getDate()} ${CONSTANTS.MONTH_NAMES_SHORT[d.getMonth()]}`,
    fullDateLabel: (d) => `${d.getDate()} ${CONSTANTS.MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`,
    mondayOfWeek: (d) => {
        const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const day = date.getDay();
        const diff = (day === 0 ? -6 : 1 - day);
        date.setDate(date.getDate() + diff);
        return date;
    },
    addDays: (iso, days) => {
        const d = Utils.isoToDate(iso);
        d.setDate(d.getDate() + days);
        return Utils.dateToISO(d);
    },
    daysBetween: (isoFrom, isoTo) => {
        const d1 = Utils.isoToDate(isoFrom);
        const d2 = Utils.isoToDate(isoTo);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);
        return Math.round((d2 - d1) / 86400000);
    },
    toMinutes: (t) => {
        if (!t) return 0;
        const [h, m] = String(t).split(":").map(Number);
        return (h || 0) * 60 + (m || 0);
    },
    getNowMins: () => {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
    },
    isLectureLive: (lecture, profile, isoDate) => {
        if (isoDate !== Utils.todayISO()) return false;
        const status = AttendanceManager.getStatus(profile, isoDate, lecture);
        if (status === "cancelled") return false;
        
        const now = Utils.getNowMins();
        const start = Utils.toMinutes(lecture.start);
        const end = Utils.toMinutes(lecture.end);
        return now >= start && now < end;
    },
    formatTimeDiff: (diff) => {
        const h = Math.floor(diff / 60), m = diff % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    },
    formatTimeRange: (start, end) => {
        const fmt = (t) => {
            const [h, m] = String(t).split(":").map(Number);
            const h12 = h % 12 || 12;
            return `${h12}:${(m || 0).toString().padStart(2, "0")}`;
        };
        const [h] = String(end).split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        return `${fmt(start)}\n${fmt(end)} ${ampm}`;
    },
    formatDisplayTime: (time) => {
        if (!time) return "";
        const [h, m] = String(time).split(":").map(Number);
        if (isNaN(h)) return "";
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${(m || 0).toString().padStart(2, "0")} ${ampm}`;
    },
    formatRelativeTimestamp: (isoStr) => {
        if (!isoStr) return "Never";
        try {
            const d = new Date(isoStr);
            if (isNaN(d.getTime())) return "Never";
            const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
            if (diffSec < 15) return "Just now";
            if (diffSec < 60) return `${diffSec}s ago`;
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin}m ago`;
            const diffHr = Math.floor(diffMin / 60);
            if (diffHr < 24) return `${diffHr}h ago`;
            return `${Utils.shortDateLabel(d)} ${Utils.formatDisplayTime(`${d.getHours()}:${d.getMinutes()}`)}`;
        } catch (_) {
            return "Unknown";
        }
    },
    isBreakItem: (item) => {
        if (!item) return true;
        const type = (item.type || "").toUpperCase();
        if (type === "BREAK") return true;
        const s = (item.subject || "").toLowerCase();
        return s.includes("break") || s.includes("lunch") || s.includes("gap");
    },
    isValid: (v) => v && v !== "-" && v !== "undefined",
    escapeHTML: (str) => String(str == null ? "" : str).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch])),
    createEmptyTimetables: () => {
        const tt = { laksh: {}, suhani: {} };
        CONSTANTS.DAY_KEYS.forEach(d => { tt.laksh[d] = []; tt.suhani[d] = []; });
        return tt;
    },
    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
    deepEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    generateId: (prefix) => {
        const rand = (typeof crypto !== "undefined" && crypto.getRandomValues)
            ? Array.from(crypto.getRandomValues(new Uint32Array(2))).map(n => n.toString(36)).join("")
            : Math.floor(Math.random() * 1e12).toString(36);
        return `${prefix}_${Date.now()}_${rand}`;
    },
    regenerateLectureIds: (timetables) => {
        CONSTANTS.PROFILES.forEach(prof => {
            if (!timetables[prof]) return;
            CONSTANTS.DAY_KEYS.forEach(day => {
                const arr = timetables[prof][day];
                if (!Array.isArray(arr)) return;
                arr.forEach(lecture => {
                    lecture.lectureId = Utils.generateId("lec");
                });
            });
        });
        return timetables;
    },
    getKnownSubjectsForProfile: (profile) => {
        const prof = profile || State.currentProfile;
        const set = new Set();
        // 1. From active and archived timeline timetables
        const timeline = (State.data && Array.isArray(State.data.timeline)) ? State.data.timeline : [];
        timeline.forEach(p => {
            if (!p || !Array.isArray(p.versions)) return;
            p.versions.forEach(v => {
                const tt = v && v.timetables && v.timetables[prof];
                if (!tt) return;
                CONSTANTS.DAY_KEYS.forEach(day => {
                    (tt[day] || []).forEach(item => {
                        if (item && item.subject && !Utils.isBreakItem(item)) {
                            set.add(AttendanceManager.cleanSubjectTitle(item.subject));
                        }
                    });
                });
            });
        });
        // 2. From attendance logs
        const att = (State.data && State.data.attendance && State.data.attendance[prof]) || {};
        Object.values(att).forEach(dayObj => {
            Object.values(dayObj || {}).forEach(rec => {
                if (rec && rec.subject && (rec.type || "").toUpperCase() !== "BREAK") {
                    set.add(AttendanceManager.cleanSubjectTitle(rec.subject));
                }
            });
        });
        // 3. From existing tasks and assessments for this profile
        (State.tasks || []).forEach(t => {
            if (t && !t.deleted_at && t.profile === prof && t.subject) set.add(t.subject.trim());
        });
        (State.assessments || []).forEach(a => {
            if (a && !a.deleted_at && a.profile === prof && a.subject) set.add(a.subject.trim());
        });
        return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
    }
};

/* =============================================
   MODULE: DURABLE INDEXEDDB LAYER (OfflineDB)
   ============================================= */
const OfflineDB = {
    db: null,
    memoryFallback: {
        app_state: {},
        tasks: {},
        assessments: {},
        mutation_queue: {},
        conflicts: {}
    },

    async init() {
        if (OfflineDB.db) return OfflineDB.db;
        if (typeof indexedDB === "undefined") {
            return null;
        }
        return new Promise((resolve) => {
            try {
                const req = indexedDB.open(CONSTANTS.IDB.NAME, CONSTANTS.IDB.VERSION);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains("app_state")) {
                        db.createObjectStore("app_state", { keyPath: "key" });
                    }
                    if (!db.objectStoreNames.contains("tasks")) {
                        const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
                        taskStore.createIndex("profile", "profile", { unique: false });
                        taskStore.createIndex("due_date", "due_date", { unique: false });
                    }
                    if (!db.objectStoreNames.contains("assessments")) {
                        const assStore = db.createObjectStore("assessments", { keyPath: "id" });
                        assStore.createIndex("profile", "profile", { unique: false });
                        assStore.createIndex("assessment_date", "assessment_date", { unique: false });
                    }
                    if (!db.objectStoreNames.contains("mutation_queue")) {
                        const qStore = db.createObjectStore("mutation_queue", { keyPath: "id" });
                        qStore.createIndex("dedupeKey", "dedupeKey", { unique: false });
                        qStore.createIndex("createdAt", "createdAt", { unique: false });
                    }
                    if (!db.objectStoreNames.contains("conflicts")) {
                        db.createObjectStore("conflicts", { keyPath: "id" });
                    }
                };
                req.onsuccess = (e) => {
                    OfflineDB.db = e.target.result;
                    resolve(OfflineDB.db);
                };
                req.onerror = () => {
                    console.warn("IndexedDB unavailable; falling back to localStorage/memory persistence.");
                    resolve(null);
                };
            } catch (err) {
                console.warn("IndexedDB open exception:", err);
                resolve(null);
            }
        });
    },

    async put(storeName, value) {
        await OfflineDB.init();
        const keyField = storeName === "app_state" ? "key" : "id";
        OfflineDB.memoryFallback[storeName][value[keyField]] = Utils.deepClone(value);

        // Mirror tasks & assessments to localStorage fallback in case IndexedDB is restricted in private browsing
        if (storeName === "tasks") {
            try { localStorage.setItem(CONSTANTS.STORAGE.TASKS_FALLBACK, JSON.stringify(Object.values(OfflineDB.memoryFallback.tasks))); } catch (_) {}
        } else if (storeName === "assessments") {
            try { localStorage.setItem(CONSTANTS.STORAGE.ASSESSMENTS_FALLBACK, JSON.stringify(Object.values(OfflineDB.memoryFallback.assessments))); } catch (_) {}
        }

        if (!OfflineDB.db) return value;
        return new Promise((resolve, reject) => {
            try {
                const tx = OfflineDB.db.transaction(storeName, "readwrite");
                const store = tx.objectStore(storeName);
                store.put(value);
                tx.oncomplete = () => resolve(value);
                tx.onerror = (e) => reject(e.target.error);
            } catch (err) {
                reject(err);
            }
        });
    },

    async putBulk(storeName, items) {
        await OfflineDB.init();
        const keyField = storeName === "app_state" ? "key" : "id";
        items.forEach(item => {
            OfflineDB.memoryFallback[storeName][item[keyField]] = Utils.deepClone(item);
        });
        if (!OfflineDB.db) return;
        return new Promise((resolve, reject) => {
            try {
                const tx = OfflineDB.db.transaction(storeName, "readwrite");
                const store = tx.objectStore(storeName);
                items.forEach(item => store.put(item));
                tx.oncomplete = () => resolve();
                tx.onerror = (e) => reject(e.target.error);
            } catch (err) {
                reject(err);
            }
        });
    },

    async get(storeName, key) {
        await OfflineDB.init();
        if (!OfflineDB.db) {
            return OfflineDB.memoryFallback[storeName][key] || null;
        }
        return new Promise((resolve) => {
            try {
                const tx = OfflineDB.db.transaction(storeName, "readonly");
                const req = tx.objectStore(storeName).get(key);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(OfflineDB.memoryFallback[storeName][key] || null);
            } catch (_) {
                resolve(OfflineDB.memoryFallback[storeName][key] || null);
            }
        });
    },

    async getAll(storeName) {
        await OfflineDB.init();
        if (!OfflineDB.db) {
            return Object.values(OfflineDB.memoryFallback[storeName]);
        }
        return new Promise((resolve) => {
            try {
                const tx = OfflineDB.db.transaction(storeName, "readonly");
                const req = tx.objectStore(storeName).getAll();
                req.onsuccess = () => {
                    const list = req.result || [];
                    const keyField = storeName === "app_state" ? "key" : "id";
                    list.forEach(item => {
                        OfflineDB.memoryFallback[storeName][item[keyField]] = item;
                    });
                    resolve(list);
                };
                req.onerror = () => resolve(Object.values(OfflineDB.memoryFallback[storeName]));
            } catch (_) {
                resolve(Object.values(OfflineDB.memoryFallback[storeName]));
            }
        });
    },

    async delete(storeName, key) {
        await OfflineDB.init();
        delete OfflineDB.memoryFallback[storeName][key];
        if (!OfflineDB.db) return;
        return new Promise((resolve) => {
            try {
                const tx = OfflineDB.db.transaction(storeName, "readwrite");
                tx.objectStore(storeName).delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch (_) {
                resolve();
            }
        });
    },

    async clearStore(storeName) {
        await OfflineDB.init();
        OfflineDB.memoryFallback[storeName] = {};
        if (!OfflineDB.db) return;
        return new Promise((resolve) => {
            try {
                const tx = OfflineDB.db.transaction(storeName, "readwrite");
                tx.objectStore(storeName).clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch (_) {
                resolve();
            }
        });
    },

    async clearAllUserData() {
        await Promise.all([
            OfflineDB.clearStore("app_state"),
            OfflineDB.clearStore("tasks"),
            OfflineDB.clearStore("assessments"),
            OfflineDB.clearStore("mutation_queue"),
            OfflineDB.clearStore("conflicts")
        ]);
        localStorage.removeItem(CONSTANTS.STORAGE.TIMELINE);
        localStorage.removeItem(CONSTANTS.STORAGE.ATTENDANCE);
        localStorage.removeItem(CONSTANTS.STORAGE.PROFILE);
        localStorage.removeItem(CONSTANTS.STORAGE.TASKS_FALLBACK);
        localStorage.removeItem(CONSTANTS.STORAGE.ASSESSMENTS_FALLBACK);
        localStorage.removeItem(CONSTANTS.STORAGE.AUTH_CACHE);
    }
};

/* =============================================
   MODULE: SYNCHRONIZATION & CONFLICT ENGINE (SyncManager)
   ============================================= */
const SyncManager = {
    isSyncing: false,
    retryTimer: null,
    retryCount: 0,
    status: "synced", // 'synced' | 'syncing' | 'pending' | 'offline' | 'error' | 'auth_required' | 'migration_missing' | 'conflict'
    lastSyncedAt: null,
    lastError: null,
    migrationMissing: false,
    authExpired: false,
    baseAppDataSnapshot: null, // Last known clean cloud snapshot of app_data.data for 3-way Read-Merge-Write

    async init() {
        await OfflineDB.init();
        const meta = await OfflineDB.get("app_state", "sync_meta");
        if (meta) {
            SyncManager.lastSyncedAt = meta.lastSyncedAt || null;
            SyncManager.migrationMissing = !!meta.migrationMissing;
        }
        const baseSnap = await OfflineDB.get("app_state", "cloud_base_snapshot");
        if (baseSnap && baseSnap.data) {
            SyncManager.baseAppDataSnapshot = baseSnap.data;
        }
        State.conflicts = await OfflineDB.getAll("conflicts");

        window.addEventListener("online", () => {
            SyncManager.retryCount = 0;
            SyncManager.refreshStatusUI();
            SyncManager.syncNow(false);
        });
        window.addEventListener("offline", () => {
            SyncManager.refreshStatusUI();
        });
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible" && navigator.onLine) {
                SyncManager.syncNow(false);
            }
        });

        await SyncManager.refreshStatusUI();
    },

    async saveSyncMeta() {
        await OfflineDB.put("app_state", {
            key: "sync_meta",
            lastSyncedAt: SyncManager.lastSyncedAt,
            migrationMissing: SyncManager.migrationMissing,
            updatedAt: Utils.nowISO()
        });
    },

    async saveBaseSnapshot(cloudData, updatedAt) {
        const cloned = Utils.deepClone(cloudData || { timeline: [], attendance: { suhani: {}, laksh: {} } });
        SyncManager.baseAppDataSnapshot = cloned;
        await OfflineDB.put("app_state", {
            key: "cloud_base_snapshot",
            data: cloned,
            updatedAt: updatedAt || Utils.nowISO()
        });
    },

    /**
     * Durable Enqueue: Persists every mutation to IndexedDB BEFORE returning.
     * Coalesces multiple rapid edits to the same record (dedupeKey) while preserving the original baseVersion/baseValue
     * so optimistic concurrency checks against the cloud remain accurate.
     */
    async enqueue(mutationInput) {
        const queue = await OfflineDB.getAll("mutation_queue");
        const existing = queue.find(m => m.dedupeKey === mutationInput.dedupeKey);

        const now = Utils.nowISO();
        const record = {
            id: existing ? existing.id : Utils.generateId("mut"),
            dedupeKey: mutationInput.dedupeKey,
            entityType: mutationInput.entityType, // 'attendance' | 'timeline' | 'task' | 'assessment'
            action: mutationInput.action,         // 'set' | 'upsert' | 'delete'
            profile: mutationInput.profile,       // 'suhani' | 'laksh' | 'shared'
            targetId: mutationInput.targetId,
            payload: Utils.deepClone(mutationInput.payload),
            // Preserve the initial baseValue / baseVersion from before the first unsynced offline edit
            baseValue: existing ? existing.baseValue : Utils.deepClone(mutationInput.baseValue),
            baseVersion: existing ? existing.baseVersion : (mutationInput.baseVersion || null),
            createdAt: existing ? existing.createdAt : now,
            updatedAt: now,
            attempts: existing ? existing.attempts : 0,
            lastError: null
        };

        await OfflineDB.put("mutation_queue", record);
        await SyncManager.refreshStatusUI();
        SyncManager.scheduleSync(400);
        return record;
    },

    scheduleSync(delayMs = 500) {
        if (SyncManager.retryTimer) clearTimeout(SyncManager.retryTimer);
        SyncManager.retryTimer = setTimeout(() => {
            SyncManager.syncNow(false);
        }, delayMs);
    },

    async getPendingQueue() {
        const list = await OfflineDB.getAll("mutation_queue");
        return list.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
    },

    isMissingTableError(error) {
        if (!error) return false;
        const code = String(error.code || "");
        const msg = String(error.message || "").toLowerCase();
        return (
            code === "42P01" ||
            code === "PGRST205" ||
            msg.includes("Could not find the table".toLowerCase()) ||
            (msg.includes("relation") && msg.includes("does not exist"))
        );
    },

    isAuthError(error) {
        if (!error) return false;
        const code = String(error.code || "");
        const status = Number(error.status || error.statusCode || 0);
        const msg = String(error.message || "").toLowerCase();
        return (
            status === 401 ||
            code === "PGRST301" ||
            msg.includes("jwt expired") ||
            msg.includes("invalid jwt") ||
            msg.includes("not authenticated")
        );
    },

    async recordConflict(conflictObj) {
        const entry = {
            id: conflictObj.id || Utils.generateId("conf"),
            entityType: conflictObj.entityType,
            targetId: conflictObj.targetId,
            profile: conflictObj.profile || State.currentProfile,
            title: conflictObj.title || "Concurrent Edit Detected",
            description: conflictObj.description || "This item was modified on another device before your offline change synchronized.",
            localValue: Utils.deepClone(conflictObj.localValue),
            cloudValue: Utils.deepClone(conflictObj.cloudValue),
            mutation: Utils.deepClone(conflictObj.mutation),
            detectedAt: Utils.nowISO()
        };
        await OfflineDB.put("conflicts", entry);
        State.conflicts = await OfflineDB.getAll("conflicts");
        UI.showToast(`Conflict detected on "${entry.title}". Review in Sync Status.`, "warn");
        await SyncManager.refreshStatusUI();
    },

    async resolveConflict(conflictId, choice) {
        const conflict = State.conflicts.find(c => c.id === conflictId);
        if (!conflict) return;

        if (choice === "keep_local") {
            // Re-enqueue mutation with updated baseVersion/baseValue matching current cloud value so it forces overwrite
            if (conflict.entityType === "task") {
                const localTask = Utils.deepClone(conflict.localValue);
                const cloudVer = (conflict.cloudValue && conflict.cloudValue.version) ? conflict.cloudValue.version : 1;
                localTask.version = cloudVer;
                localTask.updated_at = Utils.nowISO();
                await OfflineDB.put("tasks", localTask);
                TaskManager.replaceInMemory(localTask);
                await SyncManager.enqueue({
                    dedupeKey: `task__${localTask.id}`,
                    entityType: "task",
                    action: localTask.deleted_at ? "delete" : "upsert",
                    profile: localTask.profile,
                    targetId: localTask.id,
                    payload: localTask,
                    baseVersion: cloudVer,
                    baseValue: conflict.cloudValue
                });
            } else if (conflict.entityType === "assessment") {
                const localAss = Utils.deepClone(conflict.localValue);
                const cloudVer = (conflict.cloudValue && conflict.cloudValue.version) ? conflict.cloudValue.version : 1;
                localAss.version = cloudVer;
                localAss.updated_at = Utils.nowISO();
                await OfflineDB.put("assessments", localAss);
                AssessmentManager.replaceInMemory(localAss);
                await SyncManager.enqueue({
                    dedupeKey: `assessment__${localAss.id}`,
                    entityType: "assessment",
                    action: localAss.deleted_at ? "delete" : "upsert",
                    profile: localAss.profile,
                    targetId: localAss.id,
                    payload: localAss,
                    baseVersion: cloudVer,
                    baseValue: conflict.cloudValue
                });
            } else if (conflict.entityType === "attendance") {
                const mut = conflict.mutation;
                if (mut) {
                    AttendanceManager.applyLocalDirect(mut.profile, mut.payload.isoDate, mut.payload.lectureId, mut.payload.record);
                    await SyncManager.enqueue({
                        dedupeKey: mut.dedupeKey,
                        entityType: "attendance",
                        action: "set",
                        profile: mut.profile,
                        targetId: mut.targetId,
                        payload: mut.payload,
                        baseValue: conflict.cloudValue // Update baseValue to match current cloud so next merge succeeds
                    });
                }
            } else if (conflict.entityType === "timeline") {
                State.data.timeline = Utils.deepClone(conflict.localValue);
                localStorage.setItem(CONSTANTS.STORAGE.TIMELINE, JSON.stringify(State.data.timeline));
                await OfflineDB.put("app_state", { key: "app_data", data: State.data, updatedAt: Utils.nowISO() });
                await SyncManager.enqueue({
                    dedupeKey: "timeline__global",
                    entityType: "timeline",
                    action: "upsert",
                    profile: "shared",
                    targetId: "timeline",
                    payload: State.data.timeline,
                    baseValue: conflict.cloudValue
                });
            }
        } else {
            // Keep Cloud Version
            if (conflict.entityType === "task" && conflict.cloudValue) {
                await OfflineDB.put("tasks", conflict.cloudValue);
                TaskManager.replaceInMemory(conflict.cloudValue);
            } else if (conflict.entityType === "assessment" && conflict.cloudValue) {
                await OfflineDB.put("assessments", conflict.cloudValue);
                AssessmentManager.replaceInMemory(conflict.cloudValue);
            } else if (conflict.entityType === "attendance" && conflict.mutation) {
                const { profile, payload } = conflict.mutation;
                AttendanceManager.applyLocalDirect(profile, payload.isoDate, payload.lectureId, conflict.cloudValue);
            } else if (conflict.entityType === "timeline" && conflict.cloudValue) {
                State.data.timeline = Utils.deepClone(conflict.cloudValue);
                localStorage.setItem(CONSTANTS.STORAGE.TIMELINE, JSON.stringify(State.data.timeline));
                await OfflineDB.put("app_state", { key: "app_data", data: State.data, updatedAt: Utils.nowISO() });
            }
        }

        await OfflineDB.delete("conflicts", conflictId);
        State.conflicts = await OfflineDB.getAll("conflicts");
        UI.refreshCurrentView();
        await SyncManager.refreshStatusUI();
        if (choice === "keep_local") {
            SyncManager.syncNow(true);
        }
        if (document.getElementById("syncStatusModal")?.classList.contains("open")) {
            UI.renderSyncStatusModalBody();
        }
    },

    /**
     * Core Synchronization Flush:
     * Processes pending attendance/timeline mutations (via safe Read-Merge-Write on app_data)
     * and pending task/assessment mutations (via optimistic version check on academic_tasks & academic_assessments).
     */
    async syncNow(manualTrigger = false) {
        if (SyncManager.isSyncing) return false;
        if (!navigator.onLine) {
            await SyncManager.refreshStatusUI();
            if (manualTrigger) UI.showToast("Device is offline. Changes are safely queued on device.", "warn");
            return false;
        }
        if (!supabaseClient || !CloudManager.workspaceId) {
            await SyncManager.refreshStatusUI();
            return false;
        }

        const queue = await SyncManager.getPendingQueue();
        if (queue.length === 0 && !manualTrigger) {
            await SyncManager.refreshStatusUI();
            return true;
        }

        SyncManager.isSyncing = true;
        SyncManager.lastError = null;
        await SyncManager.refreshStatusUI();

        let allSucceeded = true;

        try {
            // Verify active session before pushing mutations
            const { data: sessionData, error: sessionErr } = await supabaseClient.auth.getSession();
            if (sessionErr || !sessionData || !sessionData.session) {
                SyncManager.authExpired = true;
                SyncManager.lastError = "Authentication session expired. Log in to synchronize pending changes.";
                SyncManager.isSyncing = false;
                await SyncManager.refreshStatusUI();
                if (manualTrigger) UI.showToast(SyncManager.lastError, "error");
                return false;
            }
            SyncManager.authExpired = false;

            // 1. Process Attendance & Timeline Mutations against public.app_data (Read-Merge-Write)
            const appDataMutations = queue.filter(m => m.entityType === "attendance" || m.entityType === "timeline");
            if (appDataMutations.length > 0) {
                const ok = await SyncManager.flushAppDataMutations(appDataMutations);
                if (!ok) allSucceeded = false;
            }

            // 2. Process Academic Tasks Mutations against public.academic_tasks
            const taskMutations = queue.filter(m => m.entityType === "task");
            for (const mut of taskMutations) {
                const ok = await SyncManager.flushSingleTaskMutation(mut);
                if (!ok) {
                    allSucceeded = false;
                    if (SyncManager.migrationMissing || SyncManager.authExpired) break;
                }
            }

            // 3. Process Academic Assessments Mutations against public.academic_assessments
            const assessmentMutations = queue.filter(m => m.entityType === "assessment");
            if (!SyncManager.migrationMissing && !SyncManager.authExpired) {
                for (const mut of assessmentMutations) {
                    const ok = await SyncManager.flushSingleAssessmentMutation(mut);
                    if (!ok) {
                        allSucceeded = false;
                        if (SyncManager.migrationMissing || SyncManager.authExpired) break;
                    }
                }
            } else if (assessmentMutations.length > 0) {
                allSucceeded = false;
            }

            // 4. If manual trigger or queue empty, pull latest remote tasks/assessments to ensure consistency
            if (allSucceeded) {
                await CloudManager.pullAcademicTables();
                SyncManager.lastSyncedAt = Utils.nowISO();
                SyncManager.retryCount = 0;
                await SyncManager.saveSyncMeta();
                if (manualTrigger) UI.showToast("Cloud synchronization complete.", "success");
            } else {
                SyncManager.scheduleBackoffRetry();
            }
        } catch (err) {
            console.error("SyncManager.syncNow error:", err);
            SyncManager.lastError = err.message || "Network error during synchronization.";
            allSucceeded = false;
            SyncManager.scheduleBackoffRetry();
        } finally {
            SyncManager.isSyncing = false;
            await SyncManager.refreshStatusUI();
            if (document.getElementById("syncStatusModal")?.classList.contains("open")) {
                UI.renderSyncStatusModalBody();
            }
        }

        return allSucceeded;
    },

    scheduleBackoffRetry() {
        if (SyncManager.migrationMissing || SyncManager.authExpired) return;
        SyncManager.retryCount = Math.min(SyncManager.retryCount + 1, 6);
        const delay = Math.min(30000, 1500 * Math.pow(2, SyncManager.retryCount - 1));
        SyncManager.scheduleSync(delay);
    },

    /**
     * Concurrency-Safe Read-Merge-Write for legacy `app_data` (attendance & timeline).
     * Never blindly overwrites the entire JSONB document with stale state:
     * 1. Reads current cloud `app_data.data`.
     * 2. For each queued attendance cell `(profile, isoDate, lectureId)`, checks if the cloud cell differs from `mut.baseValue`.
     *    - If cloud cell === `mut.baseValue` (or cloud cell === `mut.payload.record`), applies the change cleanly.
     *    - If cloud cell was changed concurrently to a different value by another device, preserves the cloud value AND records a conflict entry so the user can choose.
     * 3. For timeline mutations, compares `mut.baseValue` against cloud `timeline` and merges period/version edits or flags conflict if overlapping edits occurred.
     */
    async flushAppDataMutations(mutations) {
        try {
            const { data: cloudRow, error: fetchErr } = await supabaseClient
                .from("app_data")
                .select("*")
                .eq("workspace_id", CloudManager.workspaceId)
                .single();

            if (fetchErr) {
                if (SyncManager.isAuthError(fetchErr)) SyncManager.authExpired = true;
                SyncManager.lastError = fetchErr.message || "Failed to read cloud workspace data.";
                return false;
            }

            CloudManager.appDataId = cloudRow.id;
            const cloudData = cloudRow.data || { timeline: [], attendance: { suhani: {}, laksh: {} } };
            if (!cloudData.attendance) cloudData.attendance = { suhani: {}, laksh: {} };
            if (!cloudData.attendance.suhani) cloudData.attendance.suhani = {};
            if (!cloudData.attendance.laksh) cloudData.attendance.laksh = {};
            if (!Array.isArray(cloudData.timeline)) cloudData.timeline = [];

            const mergedData = Utils.deepClone(cloudData);
            const processedMutationIds = [];

            for (const mut of mutations) {
                if (mut.entityType === "attendance") {
                    const prof = mut.profile;
                    const { isoDate, lectureId, record } = mut.payload;
                    const cloudCell = (mergedData.attendance[prof] && mergedData.attendance[prof][isoDate])
                        ? (mergedData.attendance[prof][isoDate][lectureId] || null)
                        : null;

                    const baseCell = mut.baseValue || null;
                    const cloudStatus = cloudCell ? cloudCell.status : null;
                    const baseStatus = baseCell ? baseCell.status : null;
                    const targetStatus = record ? record.status : null;

                    if (cloudStatus !== baseStatus && cloudStatus !== targetStatus) {
                        // Concurrent modification on the same lecture attendance slot!
                        await SyncManager.recordConflict({
                            entityType: "attendance",
                            targetId: `${prof}_${isoDate}_${lectureId}`,
                            profile: prof,
                            title: `${(record && record.subject) || (cloudCell && cloudCell.subject) || "Lecture"} (${isoDate})`,
                            description: `Attendance for ${prof} on ${isoDate} was changed to "${cloudStatus || "unmarked"}" on another device while you marked it "${targetStatus || "unmarked"}" offline.`,
                            localValue: record,
                            cloudValue: cloudCell,
                            mutation: mut
                        });
                        processedMutationIds.push(mut.id);
                        continue;
                    }

                    // Safe to apply cell patch onto mergedData
                    if (!mergedData.attendance[prof]) mergedData.attendance[prof] = {};
                    if (!mergedData.attendance[prof][isoDate]) mergedData.attendance[prof][isoDate] = {};
                    if (record === null) {
                        delete mergedData.attendance[prof][isoDate][lectureId];
                        if (Object.keys(mergedData.attendance[prof][isoDate]).length === 0) {
                            delete mergedData.attendance[prof][isoDate];
                        }
                    } else {
                        mergedData.attendance[prof][isoDate][lectureId] = Utils.deepClone(record);
                    }
                    processedMutationIds.push(mut.id);
                } else if (mut.entityType === "timeline") {
                    const cloudTimeline = mergedData.timeline || [];
                    const baseTimeline = mut.baseValue || [];
                    const localTimeline = mut.payload || [];

                    if (!Utils.deepEqual(cloudTimeline, baseTimeline) && !Utils.deepEqual(cloudTimeline, localTimeline)) {
                        // Attempt non-overlapping period merge first
                        const mergedTimeline = SyncManager.tryMergeTimelines(baseTimeline, cloudTimeline, localTimeline);
                        if (mergedTimeline) {
                            mergedData.timeline = mergedTimeline;
                        } else {
                            await SyncManager.recordConflict({
                                entityType: "timeline",
                                targetId: "timeline",
                                profile: State.currentProfile,
                                title: "Academic Timeline & Timetable",
                                description: "The timetable was modified on another device while you had unsynchronized timetable changes.",
                                localValue: localTimeline,
                                cloudValue: cloudTimeline,
                                mutation: mut
                            });
                        }
                    } else {
                        mergedData.timeline = Utils.deepClone(localTimeline);
                    }
                    processedMutationIds.push(mut.id);
                }
            }

            // Write merged state back to Supabase app_data
            const { data: updatedRow, error: updateErr } = await supabaseClient
                .from("app_data")
                .update({ data: mergedData, updated_at: Utils.nowISO() })
                .eq("id", CloudManager.appDataId)
                .select()
                .single();

            if (updateErr) {
                if (SyncManager.isAuthError(updateErr)) SyncManager.authExpired = true;
                SyncManager.lastError = updateErr.message || "Failed to update cloud workspace data.";
                return false;
            }

            // Remove only the processed mutations from IndexedDB queue
            for (const mId of processedMutationIds) {
                await OfflineDB.delete("mutation_queue", mId);
            }

            // Update local State.data and base snapshot with the reconciled mergedData
            // (And re-apply any brand-new mutations that arrived while the request was in flight)
            await SyncManager.saveBaseSnapshot(mergedData, updatedRow?.updated_at);
            await SyncManager.reconcileIncomingAppData(mergedData);
            return true;
        } catch (err) {
            console.error("flushAppDataMutations exception:", err);
            SyncManager.lastError = err.message || "Error syncing attendance/timetable.";
            return false;
        }
    },

    /**
     * Attempts a safe 3-way merge of timeline periods by period ID if edits occurred in different periods or different profile timetables.
     */
    tryMergeTimelines(baseTimeline, cloudTimeline, localTimeline) {
        try {
            const baseMap = new Map((baseTimeline || []).map(p => [p.id, p]));
            const cloudMap = new Map((cloudTimeline || []).map(p => [p.id, p]));
            const localMap = new Map((localTimeline || []).map(p => [p.id, p]));
            const allIds = new Set([...cloudMap.keys(), ...localMap.keys()]);
            const result = [];

            for (const id of allIds) {
                const b = baseMap.get(id);
                const c = cloudMap.get(id);
                const l = localMap.get(id);

                if (Utils.deepEqual(c, l)) {
                    if (l) result.push(Utils.deepClone(l));
                } else if (Utils.deepEqual(b, c)) {
                    // Only changed locally
                    if (l) result.push(Utils.deepClone(l));
                } else if (Utils.deepEqual(b, l)) {
                    // Only changed in cloud
                    if (c) result.push(Utils.deepClone(c));
                } else {
                    // Both changed the same period — cannot auto-merge without risking schedule corruption
                    return null;
                }
            }

            const validation = Validation.validateTimeline(result);
            return validation.valid ? result : null;
        } catch (_) {
            return null;
        }
    },

    /**
     * Optimistic Concurrency Flush for a single Academic Task mutation.
     */
    async flushSingleTaskMutation(mut) {
        try {
            const task = mut.payload;
            // 1. Check current row in public.academic_tasks
            const { data: existingRow, error: selErr } = await supabaseClient
                .from("academic_tasks")
                .select("*")
                .eq("id", task.id)
                .maybeSingle();

            if (selErr) {
                if (SyncManager.isMissingTableError(selErr)) {
                    SyncManager.migrationMissing = true;
                    await SyncManager.saveSyncMeta();
                    SyncManager.lastError = "Database table 'academic_tasks' is missing. Run supabase_migration.sql in Supabase SQL Editor.";
                    return false;
                }
                if (SyncManager.isAuthError(selErr)) SyncManager.authExpired = true;
                SyncManager.lastError = selErr.message;
                return false;
            }

            SyncManager.migrationMissing = false;

            const rowPayload = {
                id: task.id,
                workspace_id: CloudManager.workspaceId,
                created_by: task.created_by || CloudManager.userId || null,
                profile: task.profile,
                title: task.title,
                description: task.description || "",
                subject: task.subject || "",
                task_type: task.task_type || "assignment",
                due_date: task.due_date,
                due_time: task.due_time || null,
                priority: task.priority || "medium",
                status: task.status || "not_started",
                estimated_minutes: task.estimated_minutes != null && task.estimated_minutes !== "" ? Number(task.estimated_minutes) : null,
                subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
                completed_at: task.completed_at || null,
                version: (mut.baseVersion ? mut.baseVersion + 1 : 1),
                created_at: task.created_at || Utils.nowISO(),
                updated_at: task.updated_at || Utils.nowISO(),
                deleted_at: task.deleted_at || null
            };

            if (!existingRow) {
                // Row does not exist on server yet -> INSERT
                const { data: inserted, error: insErr } = await supabaseClient
                    .from("academic_tasks")
                    .insert([rowPayload])
                    .select()
                    .single();

                if (insErr) {
                    if (SyncManager.isMissingTableError(insErr)) {
                        SyncManager.migrationMissing = true;
                        await SyncManager.saveSyncMeta();
                    }
                    SyncManager.lastError = insErr.message;
                    return false;
                }
                await OfflineDB.put("tasks", inserted);
                TaskManager.replaceInMemory(inserted);
                await OfflineDB.delete("mutation_queue", mut.id);
                return true;
            }

            // Row exists on server: check optimistic concurrency version
            const cloudVersion = Number(existingRow.version || 1);
            const expectedBaseVersion = mut.baseVersion != null ? Number(mut.baseVersion) : cloudVersion;

            if (cloudVersion > expectedBaseVersion && !SyncManager.isTaskContentEquivalent(existingRow, rowPayload)) {
                // Conflict detected: Cloud row was updated by another client since our baseVersion
                await OfflineDB.put("tasks", existingRow);
                TaskManager.replaceInMemory(existingRow);
                await SyncManager.recordConflict({
                    entityType: "task",
                    targetId: task.id,
                    profile: task.profile,
                    title: task.title || existingRow.title,
                    description: `Task "${existingRow.title}" was modified on another device (v${cloudVersion} vs your base v${expectedBaseVersion}).`,
                    localValue: rowPayload,
                    cloudValue: existingRow,
                    mutation: mut
                });
                await OfflineDB.delete("mutation_queue", mut.id);
                return true;
            }

            // Safe to UPDATE
            rowPayload.version = cloudVersion + 1;
            const { data: updated, error: updErr } = await supabaseClient
                .from("academic_tasks")
                .update(rowPayload)
                .eq("id", task.id)
                .select()
                .single();

            if (updErr) {
                SyncManager.lastError = updErr.message;
                return false;
            }

            await OfflineDB.put("tasks", updated);
            TaskManager.replaceInMemory(updated);
            await OfflineDB.delete("mutation_queue", mut.id);
            return true;
        } catch (err) {
            SyncManager.lastError = err.message || "Task sync failed.";
            return false;
        }
    },

    isTaskContentEquivalent(a, b) {
        if (!a || !b) return false;
        return (
            a.title === b.title &&
            a.description === b.description &&
            a.subject === b.subject &&
            a.task_type === b.task_type &&
            a.due_date === b.due_date &&
            (a.due_time || null) === (b.due_time || null) &&
            a.priority === b.priority &&
            a.status === b.status &&
            (a.deleted_at || null) === (b.deleted_at || null) &&
            Utils.deepEqual(a.subtasks || [], b.subtasks || [])
        );
    },

    /**
     * Optimistic Concurrency Flush for a single Academic Assessment mutation.
     */
    async flushSingleAssessmentMutation(mut) {
        try {
            const ass = mut.payload;
            const { data: existingRow, error: selErr } = await supabaseClient
                .from("academic_assessments")
                .select("*")
                .eq("id", ass.id)
                .maybeSingle();

            if (selErr) {
                if (SyncManager.isMissingTableError(selErr)) {
                    SyncManager.migrationMissing = true;
                    await SyncManager.saveSyncMeta();
                    SyncManager.lastError = "Database table 'academic_assessments' is missing. Run supabase_migration.sql in Supabase SQL Editor.";
                    return false;
                }
                if (SyncManager.isAuthError(selErr)) SyncManager.authExpired = true;
                SyncManager.lastError = selErr.message;
                return false;
            }

            SyncManager.migrationMissing = false;

            const rowPayload = {
                id: ass.id,
                workspace_id: CloudManager.workspaceId,
                created_by: ass.created_by || CloudManager.userId || null,
                profile: ass.profile,
                title: ass.title,
                subject: ass.subject || "",
                assessment_type: ass.assessment_type || "class_test",
                assessment_date: ass.assessment_date,
                assessment_time: ass.assessment_time || null,
                syllabus: ass.syllabus || "",
                prep_status: ass.prep_status || "not_started",
                target_marks: ass.target_marks != null && ass.target_marks !== "" ? Number(ass.target_marks) : null,
                max_marks: ass.max_marks != null && ass.max_marks !== "" ? Number(ass.max_marks) : null,
                obtained_marks: ass.obtained_marks != null && ass.obtained_marks !== "" ? Number(ass.obtained_marks) : null,
                notes: ass.notes || "",
                version: (mut.baseVersion ? mut.baseVersion + 1 : 1),
                created_at: ass.created_at || Utils.nowISO(),
                updated_at: ass.updated_at || Utils.nowISO(),
                deleted_at: ass.deleted_at || null
            };

            if (!existingRow) {
                const { data: inserted, error: insErr } = await supabaseClient
                    .from("academic_assessments")
                    .insert([rowPayload])
                    .select()
                    .single();

                if (insErr) {
                    if (SyncManager.isMissingTableError(insErr)) {
                        SyncManager.migrationMissing = true;
                        await SyncManager.saveSyncMeta();
                    }
                    SyncManager.lastError = insErr.message;
                    return false;
                }
                await OfflineDB.put("assessments", inserted);
                AssessmentManager.replaceInMemory(inserted);
                await OfflineDB.delete("mutation_queue", mut.id);
                return true;
            }

            const cloudVersion = Number(existingRow.version || 1);
            const expectedBaseVersion = mut.baseVersion != null ? Number(mut.baseVersion) : cloudVersion;

            if (cloudVersion > expectedBaseVersion && !SyncManager.isAssessmentContentEquivalent(existingRow, rowPayload)) {
                await OfflineDB.put("assessments", existingRow);
                AssessmentManager.replaceInMemory(existingRow);
                await SyncManager.recordConflict({
                    entityType: "assessment",
                    targetId: ass.id,
                    profile: ass.profile,
                    title: ass.title || existingRow.title,
                    description: `Assessment "${existingRow.title}" was modified on another device (v${cloudVersion} vs your base v${expectedBaseVersion}).`,
                    localValue: rowPayload,
                    cloudValue: existingRow,
                    mutation: mut
                });
                await OfflineDB.delete("mutation_queue", mut.id);
                return true;
            }

            rowPayload.version = cloudVersion + 1;
            const { data: updated, error: updErr } = await supabaseClient
                .from("academic_assessments")
                .update(rowPayload)
                .eq("id", ass.id)
                .select()
                .single();

            if (updErr) {
                SyncManager.lastError = updErr.message;
                return false;
            }

            await OfflineDB.put("assessments", updated);
            AssessmentManager.replaceInMemory(updated);
            await OfflineDB.delete("mutation_queue", mut.id);
            return true;
        } catch (err) {
            SyncManager.lastError = err.message || "Assessment sync failed.";
            return false;
        }
    },

    isAssessmentContentEquivalent(a, b) {
        if (!a || !b) return false;
        return (
            a.title === b.title &&
            a.subject === b.subject &&
            a.assessment_type === b.assessment_type &&
            a.assessment_date === b.assessment_date &&
            (a.assessment_time || null) === (b.assessment_time || null) &&
            a.syllabus === b.syllabus &&
            a.prep_status === b.prep_status &&
            Number(a.target_marks ?? -1) === Number(b.target_marks ?? -1) &&
            Number(a.max_marks ?? -1) === Number(b.max_marks ?? -1) &&
            Number(a.obtained_marks ?? -1) === Number(b.obtained_marks ?? -1) &&
            a.notes === b.notes &&
            (a.deleted_at || null) === (b.deleted_at || null)
        );
    },

    /**
     * Reconciles incoming cloud `app_data.data` (from bootstrap or Realtime) with any pending local mutations
     * so Realtime updates NEVER overwrite unsynchronized local edits.
     */
    async reconcileIncomingAppData(incomingCloudData) {
        const effective = Utils.deepClone(incomingCloudData || { timeline: [], attendance: { suhani: {}, laksh: {} } });
        if (!effective.attendance) effective.attendance = { suhani: {}, laksh: {} };
        if (!effective.attendance.suhani) effective.attendance.suhani = {};
        if (!effective.attendance.laksh) effective.attendance.laksh = {};
        if (!Array.isArray(effective.timeline)) effective.timeline = [];

        const queue = await SyncManager.getPendingQueue();
        for (const mut of queue) {
            if (mut.entityType === "attendance") {
                const prof = mut.profile;
                const { isoDate, lectureId, record } = mut.payload;
                if (!effective.attendance[prof]) effective.attendance[prof] = {};
                if (!effective.attendance[prof][isoDate]) effective.attendance[prof][isoDate] = {};
                if (record === null) {
                    delete effective.attendance[prof][isoDate][lectureId];
                    if (Object.keys(effective.attendance[prof][isoDate]).length === 0) {
                        delete effective.attendance[prof][isoDate];
                    }
                } else {
                    effective.attendance[prof][isoDate][lectureId] = Utils.deepClone(record);
                }
            } else if (mut.entityType === "timeline") {
                effective.timeline = Utils.deepClone(mut.payload);
            }
        }

        State.data = effective;
        localStorage.setItem(CONSTANTS.STORAGE.TIMELINE, JSON.stringify(State.data.timeline));
        localStorage.setItem(CONSTANTS.STORAGE.ATTENDANCE, JSON.stringify(State.data.attendance));
        await OfflineDB.put("app_state", { key: "app_data", data: State.data, updatedAt: Utils.nowISO() });
    },

    /**
     * Computes accurate sync state and updates Header Pill & Global Action Banner.
     * Never reports local-only saves as cloud-synchronized.
     */
    async refreshStatusUI() {
        const queue = await SyncManager.getPendingQueue();
        const pendingCount = queue.length;
        const conflictCount = (State.conflicts || []).length;
        const online = navigator.onLine;

        let pillClass = "state-synced";
        let pillText = "Synced";
        let bannerHTML = "";
        let bannerClass = "";

        if (conflictCount > 0) {
            SyncManager.status = "conflict";
            pillClass = "state-conflict";
            pillText = `${conflictCount} Conflict${conflictCount > 1 ? "s" : ""}`;
            bannerClass = "banner-danger";
            bannerHTML = `
                <span>⚠️ ${conflictCount} sync conflict${conflictCount > 1 ? "s" : ""} detected. Both versions are preserved.</span>
                <button type="button" onclick="openSyncStatusModal()">Resolve</button>
            `;
        } else if (SyncManager.authExpired) {
            SyncManager.status = "auth_required";
            pillClass = "state-auth";
            pillText = pendingCount > 0 ? `Auth Needed (${pendingCount})` : "Auth Needed";
            bannerClass = "banner-danger";
            bannerHTML = `
                <span>🔒 Session expired. ${pendingCount} local change${pendingCount === 1 ? "" : "s"} saved on device.</span>
                <button type="button" onclick="CloudManager.showAuthScreen('login')">Log in</button>
            `;
        } else if (SyncManager.migrationMissing) {
            SyncManager.status = "migration_missing";
            pillClass = "state-migration";
            pillText = pendingCount > 0 ? `Local (${pendingCount})` : "Migration Needed";
            bannerClass = "banner-warn";
            bannerHTML = `
                <span>🛠️ Run <b>supabase_migration.sql</b> in Supabase to sync Tasks &amp; Exams (${pendingCount} queued locally).</span>
                <button type="button" onclick="openSyncStatusModal()">Details</button>
            `;
        } else if (!online) {
            SyncManager.status = "offline";
            pillClass = "state-offline";
            pillText = pendingCount > 0 ? `Offline • ${pendingCount}` : "Offline";
            if (pendingCount > 0) {
                bannerClass = "banner-warn";
                bannerHTML = `
                    <span>📡 Offline mode — ${pendingCount} change${pendingCount === 1 ? "" : "s"} saved on device &amp; queued for sync.</span>
                    <button type="button" onclick="openSyncStatusModal()">Queue</button>
                `;
            }
        } else if (SyncManager.isSyncing) {
            SyncManager.status = "syncing";
            pillClass = "state-syncing";
            pillText = pendingCount > 0 ? `Syncing (${pendingCount})...` : "Syncing...";
        } else if (SyncManager.lastError && pendingCount > 0) {
            SyncManager.status = "error";
            pillClass = "state-error";
            pillText = `Sync Error (${pendingCount})`;
            bannerClass = "banner-danger";
            bannerHTML = `
                <span>⚠️ Cloud sync failed. ${pendingCount} change${pendingCount === 1 ? "" : "s"} safely preserved locally.</span>
                <button type="button" onclick="window.SyncManager.syncNow(true)">Retry</button>
            `;
        } else if (pendingCount > 0) {
            SyncManager.status = "pending";
            pillClass = "state-pending";
            pillText = `Pending (${pendingCount})`;
        } else {
            SyncManager.status = "synced";
            pillClass = "state-synced";
            pillText = "Synced";
        }

        const pillEl = document.getElementById("syncStatusPill");
        const textEl = document.getElementById("syncStatusText");
        if (pillEl && textEl) {
            pillEl.className = `sync-pill ${pillClass}`;
            textEl.textContent = pillText;
        }

        const bannerEl = document.getElementById("globalSyncBanner");
        if (bannerEl) {
            if (bannerHTML) {
                bannerEl.className = `global-sync-banner ${bannerClass}`;
                bannerEl.innerHTML = bannerHTML;
                bannerEl.classList.remove("hidden");
            } else {
                bannerEl.className = "global-sync-banner hidden";
                bannerEl.innerHTML = "";
            }
        }
    }
};

/* =============================================
   MODULE: CLOUD MANAGER (SUPABASE + OFFLINE BOOTSTRAP)
   ============================================= */
const CloudManager = {
    workspaceId: null,
    appDataId: null,
    saveTimeout: null,
    userId: null,
    userEmail: null,
    realtimeChannel: null,

    async init() {
        UI.registerServiceWorker();
        await OfflineDB.init();
        await SyncManager.init();

        // Check for password recovery flow in URL hash
        if (window.location.hash && window.location.hash.includes('type=recovery')) {
            CloudManager.showAuthScreen('reset');
            return;
        }

        // Load cached auth/workspace state from IndexedDB or localStorage for instant offline startup
        const cachedAuth = await CloudManager.loadCachedAuthContext();

        // If device is offline and we have a cached authenticated profile/workspace, start immediately offline!
        if (!navigator.onLine && cachedAuth && cachedAuth.userId && cachedAuth.currentProfile) {
            await CloudManager.bootFromLocalCache(cachedAuth);
            return;
        }

        let session = null;
        if (supabaseClient) {
            try {
                const { data } = await supabaseClient.auth.getSession();
                session = data ? data.session : null;
            } catch (err) {
                console.warn("Session check failed (network):", err);
            }
        }

        if (!session) {
            // If offline or network failed and cached workspace exists, boot from local cache instead of locking out
            if (cachedAuth && cachedAuth.userId && cachedAuth.currentProfile) {
                if (!navigator.onLine) {
                    await CloudManager.bootFromLocalCache(cachedAuth);
                    return;
                }
                // Online but token expired: show "Continue Offline with Cached Workspace" button on login view
                const contBtn = document.getElementById("authContinueOfflineBtn");
                if (contBtn) contBtn.classList.remove("hidden");
            }
            CloudManager.showAuthScreen('login');
        } else {
            // Account Isolation Guard: If logging in with a DIFFERENT userId than cached, verify no unsynced mutations leak
            if (cachedAuth && cachedAuth.userId && cachedAuth.userId !== session.user.id) {
                const pending = await SyncManager.getPendingQueue();
                if (pending.length === 0) {
                    await OfflineDB.clearAllUserData();
                }
            }
            CloudManager.userId = session.user.id;
            CloudManager.userEmail = session.user.email || "";

            // Boot immediately from local cache if available for fast UX, then run cloud bootstrap
            if (cachedAuth && cachedAuth.userId === session.user.id && cachedAuth.currentProfile) {
                await CloudManager.bootFromLocalCache(cachedAuth);
                CloudManager.bootstrap(true);
            } else {
                CloudManager.showAuthScreen('loading', 'Connecting to Cloud...');
                await CloudManager.bootstrap(false);
            }
        }
    },

    async loadCachedAuthContext() {
        let ctx = await OfflineDB.get("app_state", "auth_context");
        if (!ctx) {
            try {
                const raw = localStorage.getItem(CONSTANTS.STORAGE.AUTH_CACHE);
                if (raw) ctx = JSON.parse(raw);
            } catch (_) {}
        }
        return ctx || null;
    },

    async saveCachedAuthContext() {
        const ctx = {
            key: "auth_context",
            userId: CloudManager.userId,
            userEmail: CloudManager.userEmail,
            workspaceId: CloudManager.workspaceId,
            appDataId: CloudManager.appDataId,
            currentProfile: State.currentProfile,
            updatedAt: Utils.nowISO()
        };
        try {
            localStorage.setItem(CONSTANTS.STORAGE.AUTH_CACHE, JSON.stringify(ctx));
        } catch (_) {}
        await OfflineDB.put("app_state", ctx);
    },

    async bootFromLocalCache(cachedAuth) {
        CloudManager.userId = cachedAuth.userId;
        CloudManager.userEmail = cachedAuth.userEmail || "";
        CloudManager.workspaceId = cachedAuth.workspaceId || null;
        CloudManager.appDataId = cachedAuth.appDataId || null;
        const savedProf = localStorage.getItem(CONSTANTS.STORAGE.PROFILE) || cachedAuth.currentProfile || "suhani";
        State.currentProfile = CONSTANTS.PROFILES.includes(savedProf) ? savedProf : "suhani";

        // Load app_data from IndexedDB or localStorage
        const cachedAppData = await OfflineDB.get("app_state", "app_data");
        if (cachedAppData && cachedAppData.data) {
            State.data = cachedAppData.data;
        } else {
            try {
                const tl = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE.TIMELINE) || "[]");
                const att = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE.ATTENDANCE) || '{"suhani":{},"laksh":{}}');
                State.data = { timeline: Array.isArray(tl) ? tl : [], attendance: att || { suhani: {}, laksh: {} } };
            } catch (_) {
                State.data = { timeline: [], attendance: { suhani: {}, laksh: {} } };
            }
        }

        // Load tasks and assessments from IndexedDB (with localStorage fallback)
        await TaskManager.loadFromLocal();
        await AssessmentManager.loadFromLocal();

        CloudManager.hideAuthScreen();
        UI.initApp();
        await SyncManager.refreshStatusUI();
    },

    async continueOfflineFromAuth() {
        const cachedAuth = await CloudManager.loadCachedAuthContext();
        if (cachedAuth && cachedAuth.currentProfile) {
            SyncManager.authExpired = true;
            await CloudManager.bootFromLocalCache(cachedAuth);
            UI.showToast("Loaded cached workspace in offline mode. Log in anytime to sync.", "warn");
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value;
        const errEl = document.getElementById('authError');
        
        errEl.style.display = 'none';
        errEl.classList.add('hidden');
        
        if (!email || !password) {
            errEl.textContent = 'Please enter both email and password.';
            errEl.style.display = 'block';
            errEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('loginBtn');
        btn.textContent = 'Logging in...';
        btn.disabled = true;

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                errEl.textContent = error.message;
                errEl.style.display = 'block';
                errEl.classList.remove('hidden');
                btn.textContent = 'Login';
                btn.disabled = false;
            } else {
                const cachedAuth = await CloudManager.loadCachedAuthContext();
                if (cachedAuth && cachedAuth.userId && cachedAuth.userId !== data.user.id) {
                    const pending = await SyncManager.getPendingQueue();
                    if (pending.length === 0) {
                        await OfflineDB.clearAllUserData();
                    }
                }
                CloudManager.userId = data.user.id;
                CloudManager.userEmail = data.user.email || email;
                SyncManager.authExpired = false;
                btn.textContent = 'Login';
                btn.disabled = false;
                CloudManager.showAuthScreen('loading', 'Loading your workspace...');
                await CloudManager.bootstrap(false);
            }
        } catch (err) {
            errEl.textContent = "Network error while signing in. Check your connection.";
            errEl.style.display = 'block';
            errEl.classList.remove('hidden');
            btn.textContent = 'Login';
            btn.disabled = false;
        }
    },

    async showForgotPassword() {
        CloudManager.showAuthScreen('forgot');
        document.getElementById('forgotEmail').value =
            document.getElementById('authEmail').value || '';
    },

    async handleForgotPassword(event) {
        event.preventDefault();

        const email = document.getElementById('forgotEmail').value.trim();
        const btn = document.getElementById('forgotBtn');
        const errorEl = document.getElementById('forgotError');
        const successEl = document.getElementById('forgotSuccess');

        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');

        btn.textContent = 'Sending...';
        btn.disabled = true;

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://lakshsehgalstudent-art.github.io/Smart-Schedule-and-Attendance/'
        });

        if (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
            btn.textContent = 'Send Reset Link';
            btn.disabled = false;
        } else {
            successEl.textContent = 'Reset link sent. Check your email.';
            successEl.classList.remove('hidden');
            btn.textContent = 'Email Sent';
        }
    },

    async handleUpdatePassword(event) {
        event.preventDefault();
        const pass1 = document.getElementById('resetPassword').value;
        const pass2 = document.getElementById('resetConfirmPassword').value;
        const btn = document.getElementById('resetBtn');
        const errorEl = document.getElementById('resetError');
        const successEl = document.getElementById('resetSuccess');

        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');

        if (pass1 !== pass2) {
            errorEl.textContent = 'Passwords do not match.';
            errorEl.classList.remove('hidden');
            return;
        }

        btn.textContent = 'Updating...';
        btn.disabled = true;

        const { error } = await supabaseClient.auth.updateUser({ password: pass1 });

        if (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
            btn.textContent = 'Update Password';
            btn.disabled = false;
        } else {
            successEl.textContent = 'Password updated! Redirecting to login...';
            successEl.classList.remove('hidden');
            btn.textContent = 'Success';
            setTimeout(async () => {
                window.location.hash = '';
                if (CloudManager.realtimeChannel) {
                    await supabaseClient.removeChannel(CloudManager.realtimeChannel);
                    CloudManager.realtimeChannel = null;
                }
                await supabaseClient.auth.signOut();
                window.location.reload();
            }, 2000);
        }
    },
   
    /**
     * Safe Logout Guard:
     * Never silently discards unsynchronized offline mutations.
     * Warns the user if pending changes exist and offers to Export a Backup first or confirm logout.
     */
    async handleLogout() {
        const pending = await SyncManager.getPendingQueue();
        if (pending.length > 0) {
            UI.showConfirm(
                `You have ${pending.length} unsynchronized offline change${pending.length === 1 ? "" : "s"} on this device.\n\nLogging out will clear local workspace data to protect account privacy. Export a backup first, or confirm to discard unsynced changes and log out.`,
                async () => {
                    await CloudManager.executeLogoutAndClear();
                }
            );
            return;
        }
        await CloudManager.executeLogoutAndClear();
    },

    async executeLogoutAndClear() {
        CloudManager.showAuthScreen('loading', 'Logging out...');
        if (CloudManager.realtimeChannel && supabaseClient) {
            try { await supabaseClient.removeChannel(CloudManager.realtimeChannel); } catch (_) {}
            CloudManager.realtimeChannel = null;
        }
        await OfflineDB.clearAllUserData();
        if (supabaseClient) {
            try { await supabaseClient.auth.signOut(); } catch (_) {}
        }
        window.location.reload();
    },

    async bootstrap(isBackground = false) {
        try {
            // 1. Identify or Create Profile
            let { data: profile, error: profileError } = await supabaseClient.from('profiles').select('*').eq('id', CloudManager.userId).single();
            if (profileError && profileError.code !== 'PGRST116') {
                console.error("Profile load error:", profileError);
                if (!isBackground) {
                    const cachedAuth = await CloudManager.loadCachedAuthContext();
                    if (cachedAuth && cachedAuth.currentProfile) {
                        await CloudManager.bootFromLocalCache(cachedAuth);
                        return;
                    }
                    CloudManager.showAuthScreen('loading', 'Error loading profile.<br><button onclick="CloudManager.bootstrap()" class="mt-4 px-4 py-2 bg-navy text-white rounded font-bold cursor-pointer">Retry</button>');
                }
                return;
            }
            if (!profile) {
                CloudManager.showAuthScreen('profile');
                return;
            }

            // Preserve user's active profile selection if already initialized, otherwise use their profile row default
            if (!UI.appInitialized) {
                const storedProf = localStorage.getItem(CONSTANTS.STORAGE.PROFILE);
                State.currentProfile = (storedProf && CONSTANTS.PROFILES.includes(storedProf))
                    ? storedProf
                    : profile.name.toLowerCase();
            }

            // 2. Locate Shared Workspace
            let { data: ws, error: wsError } = await supabaseClient.from('workspaces').select('*').eq('name', 'Shared Workspace').single();
            if (wsError && wsError.code !== 'PGRST116') {
                console.error("Workspace load error:", wsError);
                if (!isBackground) CloudManager.showAuthScreen('loading', 'Error loading workspace.<br><button onclick="CloudManager.bootstrap()" class="mt-4 px-4 py-2 bg-navy text-white rounded font-bold cursor-pointer">Retry</button>');
                return;
            }
            if (!ws) {
                const { data: newWs, error: insertWsError } = await supabaseClient.from('workspaces').insert([{ name: 'Shared Workspace' }]).select().single();
                if (insertWsError) {
                    console.error("Workspace create error:", insertWsError);
                    if (!isBackground) CloudManager.showAuthScreen('loading', 'Error creating workspace.<br><button onclick="CloudManager.bootstrap()" class="mt-4 px-4 py-2 bg-navy text-white rounded font-bold cursor-pointer">Retry</button>');
                    return;
                }
                ws = newWs;
            }
            CloudManager.workspaceId = ws.id;

            // 3. Ensure User is Member of Workspace
            const { data: member, error: memberError } = await supabaseClient.from('workspace_members').select('*').eq('workspace_id', ws.id).eq('user_id', CloudManager.userId).single();
            if (memberError && memberError.code !== 'PGRST116') {
                console.error("Membership load error:", memberError);
                if (!isBackground) CloudManager.showAuthScreen('loading', 'Error loading workspace membership.<br><button onclick="CloudManager.bootstrap()" class="mt-4 px-4 py-2 bg-navy text-white rounded font-bold cursor-pointer">Retry</button>');
                return;
            }
            if (!member) {
                const { error: insertMemberError } = await supabaseClient.from('workspace_members').insert([{ workspace_id: ws.id, user_id: CloudManager.userId }]);
                if (insertMemberError) {
                    console.error("Membership create error:", insertMemberError);
                    if (!isBackground) CloudManager.showAuthScreen('loading', 'Error creating workspace membership.<br><button onclick="CloudManager.bootstrap()" class="mt-4 px-4 py-2 bg-navy text-white rounded font-bold cursor-pointer">Retry</button>');
                    return;
                }
            }

            // 4. Load App Data
            let { data: appData, error: appDataError } = await supabaseClient.from('app_data').select('*').eq('workspace_id', ws.id).single();
            if (appDataError && appDataError.code !== 'PGRST116') {
                console.error("Cloud load error:", appDataError);
                if (!isBackground) CloudManager.showAuthScreen('loading', 'Cloud data could not be loaded due to a network or database error.<br><button onclick="CloudManager.bootstrap()" class="mt-4 px-4 py-2 bg-navy text-white rounded font-bold cursor-pointer">Retry</button>');
                return;
            }

            let cloudData = null;
            if (!appData) {
                cloudData = {
                    timeline: [],
                    attendance: { suhani: {}, laksh: {} }
                };
                const { data: newAppData, error: insertError } = await supabaseClient.from('app_data').insert([{ workspace_id: ws.id, data: cloudData }]).select().single();
                if (insertError) {
                    if (!isBackground) CloudManager.showAuthScreen('loading', 'Could not initialize workspace data.<br><button onclick="CloudManager.bootstrap()" class="mt-4 px-4 py-2 bg-navy text-white rounded font-bold cursor-pointer">Retry</button>');
                    return;
                }
                appData = newAppData;
            } else {
                cloudData = appData.data || { timeline: [], attendance: { suhani: {}, laksh: {} } };
            }

            CloudManager.appDataId = appData.id;
            await CloudManager.saveCachedAuthContext();

            // Save clean cloud snapshot as base if no pending app_data mutations exist
            const pendingQueue = await SyncManager.getPendingQueue();
            const hasPendingAppData = pendingQueue.some(m => m.entityType === "attendance" || m.entityType === "timeline");
            if (!hasPendingAppData) {
                await SyncManager.saveBaseSnapshot(cloudData, appData.updated_at);
            }

            // Reconcile incoming cloud data with any pending offline mutations so local edits are never lost
            await SyncManager.reconcileIncomingAppData(cloudData);
            localStorage.setItem(CONSTANTS.STORAGE.PROFILE, State.currentProfile);

            // 5. Load local tasks/assessments first, then flush pending queue and pull latest remote rows
            await TaskManager.loadFromLocal();
            await AssessmentManager.loadFromLocal();

            // 6. Setup Realtime Sync Safely
            CloudManager.setupRealtime();

            // 7. Init Application UI
            CloudManager.hideAuthScreen();
            UI.initApp();

            // 8. Flush any pending offline mutations and pull latest tasks/assessments
            if (pendingQueue.length > 0) {
                await SyncManager.syncNow(false);
            } else {
                await CloudManager.pullAcademicTables();
                SyncManager.lastSyncedAt = Utils.nowISO();
                await SyncManager.saveSyncMeta();
                await SyncManager.refreshStatusUI();
            }
            UI.refreshCurrentView();

        } catch (error) {
            console.error("Cloud Bootstrap Error:", error);
            const cachedAuth = await CloudManager.loadCachedAuthContext();
            if (cachedAuth && cachedAuth.currentProfile) {
                await CloudManager.bootFromLocalCache(cachedAuth);
            } else if (!isBackground) {
                CloudManager.showAuthScreen('loading', 'Error connecting to database. Please check connection.<br><button onclick="CloudManager.bootstrap()" class="mt-4 px-4 py-2 bg-navy text-white rounded font-bold cursor-pointer">Retry</button>');
            }
        }
    },

    /**
     * Pulls tasks and assessments from `public.academic_tasks` and `public.academic_assessments`.
     * Preserves any unsynced local mutations in `mutation_queue`.
     * Detects missing migration tables (`42P01` / `PGRST205`) without silently falling back to `app_data`.
     */
    async pullAcademicTables() {
        if (!supabaseClient || !CloudManager.workspaceId || !navigator.onLine) return;

        const queue = await SyncManager.getPendingQueue();
        const pendingTaskIds = new Set(queue.filter(m => m.entityType === "task").map(m => m.targetId));
        const pendingAssIds = new Set(queue.filter(m => m.entityType === "assessment").map(m => m.targetId));

        // 1. Fetch academic_tasks
        const { data: remoteTasks, error: tasksErr } = await supabaseClient
            .from("academic_tasks")
            .select("*")
            .eq("workspace_id", CloudManager.workspaceId);

        if (tasksErr) {
            if (SyncManager.isMissingTableError(tasksErr)) {
                SyncManager.migrationMissing = true;
                await SyncManager.saveSyncMeta();
                await SyncManager.refreshStatusUI();
                return;
            }
            console.warn("Error fetching academic_tasks:", tasksErr);
        } else if (Array.isArray(remoteTasks)) {
            SyncManager.migrationMissing = false;
            const localTasksMap = new Map(State.tasks.map(t => [t.id, t]));
            for (const rTask of remoteTasks) {
                if (pendingTaskIds.has(rTask.id)) continue; // Do not overwrite pending local mutation
                localTasksMap.set(rTask.id, rTask);
                await OfflineDB.put("tasks", rTask);
            }
            State.tasks = Array.from(localTasksMap.values());
        }

        // 2. Fetch academic_assessments
        const { data: remoteAss, error: assErr } = await supabaseClient
            .from("academic_assessments")
            .select("*")
            .eq("workspace_id", CloudManager.workspaceId);

        if (assErr) {
            if (SyncManager.isMissingTableError(assErr)) {
                SyncManager.migrationMissing = true;
                await SyncManager.saveSyncMeta();
                await SyncManager.refreshStatusUI();
                return;
            }
            console.warn("Error fetching academic_assessments:", assErr);
        } else if (Array.isArray(remoteAss)) {
            SyncManager.migrationMissing = false;
            const localAssMap = new Map(State.assessments.map(a => [a.id, a]));
            for (const rAss of remoteAss) {
                if (pendingAssIds.has(rAss.id)) continue; // Do not overwrite pending local mutation
                localAssMap.set(rAss.id, rAss);
                await OfflineDB.put("assessments", rAss);
            }
            State.assessments = Array.from(localAssMap.values());
        }

        await SyncManager.saveSyncMeta();
        UI.updateDrawerBadges();
        UI.updateSubjectDatalist();
    },

    async selectProfile(name) {
        CloudManager.showAuthScreen('loading', 'Setting up your profile...');
        const { error } = await supabaseClient.from('profiles').insert([{ id: CloudManager.userId, name: name }]);
        if (error) {
            console.error("Profile creation error:", error);
            CloudManager.showAuthScreen('loading', `Failed to create profile. Please try again.<br><button onclick="CloudManager.selectProfile('${name}')" class="mt-4 px-4 py-2 bg-navy text-white rounded font-bold cursor-pointer">Retry</button>`);
            return;
        }
        State.currentProfile = name.toLowerCase();
        localStorage.setItem(CONSTANTS.STORAGE.PROFILE, State.currentProfile);
        await CloudManager.bootstrap(false);
    },

    /**
     * Kept for backward compatibility; routes through SyncManager.syncNow().
     */
    scheduleSave() {
        SyncManager.scheduleSync(500);
    },

    setupRealtime() {
        if (!supabaseClient || !CloudManager.workspaceId) return;
        if (CloudManager.realtimeChannel) {
            supabaseClient.removeChannel(CloudManager.realtimeChannel);
            CloudManager.realtimeChannel = null;
        }
        CloudManager.realtimeChannel = supabaseClient.channel('schema-db-changes')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'app_data',
                filter: `workspace_id=eq.${CloudManager.workspaceId}`
            }, async (payload) => {
                if (payload.new && payload.new.data) {
                    const queue = await SyncManager.getPendingQueue();
                    const hasPendingAppData = queue.some(m => m.entityType === "attendance" || m.entityType === "timeline");
                    if (!hasPendingAppData) {
                        await SyncManager.saveBaseSnapshot(payload.new.data, payload.new.updated_at);
                    }
                    await SyncManager.reconcileIncomingAppData(payload.new.data);
                    UI.refreshCurrentView();
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'academic_tasks',
                filter: `workspace_id=eq.${CloudManager.workspaceId}`
            }, async (payload) => {
                const row = payload.new || payload.old;
                if (!row || !row.id) return;
                const queue = await SyncManager.getPendingQueue();
                const hasPending = queue.some(m => m.entityType === "task" && m.targetId === row.id);
                if (hasPending) return; // Never overwrite pending local edit with Realtime event

                if (payload.eventType === "DELETE") {
                    await OfflineDB.delete("tasks", row.id);
                    State.tasks = State.tasks.filter(t => t.id !== row.id);
                } else if (payload.new) {
                    await OfflineDB.put("tasks", payload.new);
                    TaskManager.replaceInMemory(payload.new);
                }
                UI.updateDrawerBadges();
                UI.refreshCurrentView();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'academic_assessments',
                filter: `workspace_id=eq.${CloudManager.workspaceId}`
            }, async (payload) => {
                const row = payload.new || payload.old;
                if (!row || !row.id) return;
                const queue = await SyncManager.getPendingQueue();
                const hasPending = queue.some(m => m.entityType === "assessment" && m.targetId === row.id);
                if (hasPending) return;

                if (payload.eventType === "DELETE") {
                    await OfflineDB.delete("assessments", row.id);
                    State.assessments = State.assessments.filter(a => a.id !== row.id);
                } else if (payload.new) {
                    await OfflineDB.put("assessments", payload.new);
                    AssessmentManager.replaceInMemory(payload.new);
                }
                UI.updateDrawerBadges();
                UI.refreshCurrentView();
            })
            .subscribe();
    },

    showAuthScreen(state, message = '') {
        const overlay = document.getElementById('authOverlay');
        const login = document.getElementById('authLoginView');
        const profile = document.getElementById('authProfileView');
        const loader = document.getElementById('authLoadingView');
        const forgot = document.getElementById('authForgotView');
        const reset = document.getElementById('authResetView');
        
        if (!overlay) return;
        overlay.style.display = 'flex';
        login.style.display = state === 'login' ? 'flex' : 'none';
        profile.style.display = state === 'profile' ? 'flex' : 'none';
        forgot.style.display = state === 'forgot' ? 'flex' : 'none';
        reset.style.display = state === 'reset' ? 'flex' : 'none';
        
        if (state === 'loading') {
            loader.style.display = 'flex';
            document.getElementById('authLoadingText').innerHTML = message;
        } else {
            loader.style.display = 'none';
        }
    },

    hideAuthScreen() {
        const overlay = document.getElementById('authOverlay');
        if (overlay) overlay.style.display = 'none';
    }
};

/* =============================================
   MODULE: VALIDATION
   ============================================= */
const Validation = {
    validateTimeline: (timelineArray) => {
        if (!Array.isArray(timelineArray)) return { valid: false, error: "Timeline data is corrupt." };

        const activePeriods = timelineArray.filter(p => !p.archived).sort((a, b) => a.startDate.localeCompare(b.startDate));
        const ids = new Set();
        const globalLectureIds = new Set();

        for (let i = 0; i < activePeriods.length; i++) {
            const p = activePeriods[i];
            const periodLectureIds = new Set();
            
            if (!p.id || ids.has(p.id)) return { valid: false, error: `Duplicate or missing Period ID detected.` };
            ids.add(p.id);
            if (!p.name || p.name.trim() === "") return { valid: false, error: "An academic period is missing a name." };
            if (!p.startDate || !p.endDate) return { valid: false, error: `Period '${p.name}' has blank dates.` };
            if (p.startDate > p.endDate) return { valid: false, error: `Period '${p.name}' ends before it starts.` };

            if (i < activePeriods.length - 1) {
                if (p.endDate >= activePeriods[i+1].startDate) {
                    return { valid: false, error: `Overlap detected: '${p.name}' overlaps with '${activePeriods[i+1].name}'.` };
                }
            }

            if (!p.versions || !Array.isArray(p.versions) || p.versions.length === 0) {
                return { valid: false, error: `Period '${p.name}' has no timetable versions.` };
            }
            
            p.versions.sort((a, b) => a.startDate.localeCompare(b.startDate));
            const vIds = new Set();
            
            for (let v = 0; v < p.versions.length; v++) {
                const ver = p.versions[v];
                if (!ver.id || vIds.has(ver.id)) return { valid: false, error: `Duplicate version ID in '${p.name}'.` };
                vIds.add(ver.id);
                if (!ver.startDate || !ver.endDate) return { valid: false, error: `A version in '${p.name}' has blank dates.` };
                if (ver.startDate > ver.endDate) return { valid: false, error: `A version in '${p.name}' ends before it starts.` };
                if (ver.startDate < p.startDate || ver.endDate > p.endDate) {
                    return { valid: false, error: `Version '${ver.name}' falls outside the bounds of period '${p.name}'.` };
                }

                if (v < p.versions.length - 1) {
                    const nextVer = p.versions[v+1];
                    if (ver.endDate >= nextVer.startDate) {
                        return { valid: false, error: `Timetable versions overlap in period '${p.name}'.` };
                    }
                    if (Utils.addDays(ver.endDate, 1) !== nextVer.startDate) {
                        return { valid: false, error: `There is a gap between timetable versions in period '${p.name}'. Versions must be continuous.` };
                    }
                }

                for (const prof of CONSTANTS.PROFILES) {
                    if (!ver.timetables[prof]) continue;
                    for (const day of CONSTANTS.DAY_KEYS) {
                        const arr = ver.timetables[prof][day];
                        if (!Array.isArray(arr)) continue;
                        
                        for (let k = 0; k < arr.length; k++) {
                            const item = arr[k];
                            if (!item.lectureId) return { valid: false, error: `Missing lectureId in ${p.name} -> ${ver.name} -> ${day}` };
                            periodLectureIds.add(item.lectureId);

                            const startMins = Utils.toMinutes(item.start);
                            const endMins = Utils.toMinutes(item.end);
                            if (endMins <= startMins) return { valid: false, error: `Invalid time range for '${item.subject}' in ${p.name}.` };

                            for (let j = k + 1; j < arr.length; j++) {
                                const cmp = arr[j];
                                const cStart = Utils.toMinutes(cmp.start);
                                const cEnd = Utils.toMinutes(cmp.end);
                                if (startMins < cEnd && endMins > cStart) {
                                    return { valid: false, error: `Overlapping lectures found in ${p.name} (${ver.name}) on ${day}.` };
                                }
                            }
                        }
                    }
                }
            }

            if (p.versions[0].startDate !== p.startDate) return { valid: false, error: `The first version in '${p.name}' must start on the period's start date.` };
            if (p.versions[p.versions.length - 1].endDate !== p.endDate) return { valid: false, error: `The last version in '${p.name}' must end on the period's end date.` };

            for (const lid of periodLectureIds) {
                if (globalLectureIds.has(lid)) {
                    return { valid: false, error: `Duplicate lectureId detected across Academic Periods:\n${lid}` };
                }
            }
            periodLectureIds.forEach(lid => globalLectureIds.add(lid));
        }

        return { valid: true };
    },
    fixVersionBoundaries: (period) => {
        if (!period.versions || period.versions.length === 0) return;
        period.versions.sort((a, b) => a.startDate.localeCompare(b.startDate));
        period.versions[0].startDate = period.startDate;
        period.versions[period.versions.length - 1].endDate = period.endDate;
    }
};

/* =============================================
   MODULE: STORAGE
   ============================================= */
const Storage = {
    init: () => {
        try {
            const meta = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE.METADATA));
            if (meta) { State.metadata = { ...State.metadata, ...meta }; } 
            else { State.metadata.createdAt = Utils.todayISO(); State.metadata.lastModified = Utils.todayISO(); }
        } catch (e) {}
    },
    saveMetadata: () => {
        State.metadata.lastModified = Utils.todayISO();
        localStorage.setItem(CONSTANTS.STORAGE.METADATA, JSON.stringify(State.metadata));
    },
    saveTimeline: () => {
        const validation = Validation.validateTimeline(State.data.timeline);
        if (!validation.valid) {
            UI.showAlert(`DATA CONFLICT PREVENTED SAVE:\n${validation.error}\n\nReverting changes.`);
            if (SyncManager.baseAppDataSnapshot && Array.isArray(SyncManager.baseAppDataSnapshot.timeline)) {
                State.data.timeline = Utils.deepClone(SyncManager.baseAppDataSnapshot.timeline);
            }
            return false;
        }
        
        localStorage.setItem(CONSTANTS.STORAGE.TIMELINE, JSON.stringify(State.data.timeline));
        Storage.saveMetadata();

        const baseTimeline = (SyncManager.baseAppDataSnapshot && SyncManager.baseAppDataSnapshot.timeline)
            ? SyncManager.baseAppDataSnapshot.timeline
            : [];

        // Persist durably in IndexedDB app_state and mutation_queue
        Storage.lastSavePromise = (async () => {
            await OfflineDB.put("app_state", { key: "app_data", data: State.data, updatedAt: Utils.nowISO() });
            await SyncManager.enqueue({
                dedupeKey: "timeline__global",
                entityType: "timeline",
                action: "upsert",
                profile: "shared",
                targetId: "timeline",
                payload: State.data.timeline,
                baseValue: baseTimeline
            });
        })();
        UI.updateSubjectDatalist();
        return true;
    },
    saveAttendance: (mutationMeta = null) => {
        localStorage.setItem(CONSTANTS.STORAGE.ATTENDANCE, JSON.stringify(State.data.attendance));
        Storage.saveMetadata();
        Storage.lastSavePromise = (async () => {
            await OfflineDB.put("app_state", { key: "app_data", data: State.data, updatedAt: Utils.nowISO() });
            if (mutationMeta) {
                await SyncManager.enqueue({
                    dedupeKey: `att__${mutationMeta.profile}__${mutationMeta.isoDate}__${mutationMeta.lectureId}`,
                    entityType: "attendance",
                    action: "set",
                    profile: mutationMeta.profile,
                    targetId: `${mutationMeta.isoDate}__${mutationMeta.lectureId}`,
                    payload: {
                        isoDate: mutationMeta.isoDate,
                        lectureId: mutationMeta.lectureId,
                        record: mutationMeta.newRecord
                    },
                    baseValue: mutationMeta.baseRecord
                });
            }
        })();
        return Storage.lastSavePromise;
    }
};

/* =============================================
   MODULE: RESOLVER (Single Source of Truth)
   ============================================= */
const Resolver = {
    resolveAcademicContext: (isoDate, includeArchived = false) => {
        const timeline = (State.data && Array.isArray(State.data.timeline)) ? State.data.timeline : [];
        const activePeriods = timeline.filter(p => p && !p.archived);
        
        let period = activePeriods.find(p => isoDate >= p.startDate && isoDate <= p.endDate) || null;
        if (!period && includeArchived) {
            const archivedPeriods = timeline.filter(p => p && p.archived);
            period = archivedPeriods.find(p => isoDate >= p.startDate && isoDate <= p.endDate) || null;
        }
        if (!period) return { period: null, version: null, dayData: [], type: "None", isHoliday: false, isExam: false };
        
        const isHoliday = ["Vacation", "Preparatory Leave"].includes(period.type);
        const isExam = period.type === "Exam Period";

        const versions = Array.isArray(period.versions) ? period.versions : [];
        const version = versions.find(v => v && isoDate >= v.startDate && isoDate <= v.endDate) 
                        || (versions.length > 0 ? versions[versions.length - 1] : null);

        const dayKey = Utils.dayKeyFromISO(isoDate);
        let dayData = [];
        
        if (!isHoliday && version && version.timetables && version.timetables[State.currentProfile]) {
            dayData = version.timetables[State.currentProfile][dayKey] || [];
        }

        return { period, version, dayData, type: period.type, isHoliday, isExam };
    }
};

/* =============================================
   MODULE: ASSIGNMENTS & ACADEMIC TASKS MANAGER (TaskManager)
   ============================================= */
const TaskManager = {
    editingTaskId: null,
    modalSubtasks: [],

    async loadFromLocal() {
        let list = await OfflineDB.getAll("tasks");
        if (!list || list.length === 0) {
            try {
                const raw = localStorage.getItem(CONSTANTS.STORAGE.TASKS_FALLBACK);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        list = parsed;
                        await OfflineDB.putBulk("tasks", list);
                    }
                }
            } catch (_) {}
        }
        State.tasks = Array.isArray(list) ? list : [];
        UI.updateDrawerBadges();
    },

    replaceInMemory(taskObj) {
        if (!taskObj || !taskObj.id) return;
        const idx = State.tasks.findIndex(t => t.id === taskObj.id);
        if (idx === -1) State.tasks.push(taskObj);
        else State.tasks[idx] = taskObj;
    },

    /**
     * Strictly filters tasks by the active profile (`State.currentProfile`) and excludes soft-deleted tombstones.
     */
    getProfileTasks(profile = null) {
        const prof = profile || State.currentProfile;
        return (State.tasks || []).filter(t => t && !t.deleted_at && t.profile === prof);
    },

    classifyTaskBucket(task, todayIso = null) {
        const today = todayIso || Utils.todayISO();
        if (task.status === "completed") return "completed";
        if (task.due_date < today) return "overdue";
        if (task.due_date === today) return "today";
        return "upcoming";
    },

    getCounts(profile = null) {
        const list = TaskManager.getProfileTasks(profile);
        const today = Utils.todayISO();
        let overdue = 0, dueToday = 0, upcoming = 0, completed = 0;
        list.forEach(t => {
            const b = TaskManager.classifyTaskBucket(t, today);
            if (b === "completed") completed++;
            else if (b === "overdue") overdue++;
            else if (b === "today") dueToday++;
            else upcoming++;
        });
        return { overdue, dueToday, upcoming, completed, pendingTotal: overdue + dueToday + upcoming };
    },

    getFilteredAndSortedTasks() {
        const f = State.taskFilters;
        const today = Utils.todayISO();
        const searchNorm = (f.search || "").trim().toLowerCase();

        const filtered = TaskManager.getProfileTasks().filter(t => {
            const bucket = TaskManager.classifyTaskBucket(t, today);
            if (f.bucket !== "all" && bucket !== f.bucket) return false;
            if (f.subject !== "all" && (t.subject || "").toLowerCase() !== f.subject.toLowerCase()) return false;
            if (f.taskType !== "all" && t.task_type !== f.taskType) return false;
            if (f.status !== "all" && t.status !== f.status) return false;
            if (f.priority !== "all" && t.priority !== f.priority) return false;
            if (searchNorm) {
                const hay = `${t.title || ""} ${t.description || ""} ${t.subject || ""}`.toLowerCase();
                if (!hay.includes(searchNorm)) return false;
            }
            return true;
        });

        const prioWeight = { high: 3, medium: 2, low: 1 };
        filtered.sort((a, b) => {
            // Keep non-completed above completed unless sorting by created_at
            if (a.status === "completed" && b.status !== "completed") return 1;
            if (a.status !== "completed" && b.status === "completed") return -1;

            if (f.sortBy === "priority") {
                const diff = (prioWeight[b.priority] || 0) - (prioWeight[a.priority] || 0);
                if (diff !== 0) return diff;
            } else if (f.sortBy === "created_at") {
                return (b.created_at || "").localeCompare(a.created_at || "");
            }

            // Default: Due date + time ascending
            if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
            const tA = a.due_time ? Utils.toMinutes(a.due_time) : 1439;
            const tB = b.due_time ? Utils.toMinutes(b.due_time) : 1439;
            return tA - tB;
        });

        return filtered;
    },

    setBucketFilter(bucket) {
        State.taskFilters.bucket = (State.taskFilters.bucket === bucket) ? "all" : bucket;
        TaskManager.render();
    },

    updateFilter(field, value) {
        State.taskFilters[field] = value;
        TaskManager.renderListOnly();
    },

    openModal(taskId = null) {
        UI.updateSubjectDatalist();
        const modal = document.getElementById("taskModal");
        if (!modal) return;

        TaskManager.editingTaskId = taskId;
        const hint = document.getElementById("tmHint");
        if (hint) hint.textContent = "";
        document.getElementById("tmSubtaskInput").value = "";

        if (taskId) {
            const t = TaskManager.getProfileTasks().find(x => x.id === taskId);
            if (!t) return;
            document.getElementById("tmTitle").textContent = "Edit Academic Task";
            document.getElementById("tmInputTitle").value = t.title || "";
            document.getElementById("tmInputSubject").value = t.subject || "";
            document.getElementById("tmInputType").value = t.task_type || "assignment";
            document.getElementById("tmInputDueDate").value = t.due_date || Utils.todayISO();
            document.getElementById("tmInputDueTime").value = t.due_time ? String(t.due_time).slice(0, 5) : "";
            document.getElementById("tmInputPriority").value = t.priority || "medium";
            document.getElementById("tmInputStatus").value = t.status || "not_started";
            document.getElementById("tmInputDuration").value = t.estimated_minutes != null ? t.estimated_minutes : "";
            document.getElementById("tmInputDesc").value = t.description || "";
            TaskManager.modalSubtasks = Utils.deepClone(Array.isArray(t.subtasks) ? t.subtasks : []);
        } else {
            document.getElementById("tmTitle").textContent = "Add Academic Task";
            document.getElementById("tmInputTitle").value = "";
            document.getElementById("tmInputSubject").value = "";
            document.getElementById("tmInputType").value = "assignment";
            document.getElementById("tmInputDueDate").value = State.selectedDate || Utils.todayISO();
            document.getElementById("tmInputDueTime").value = "";
            document.getElementById("tmInputPriority").value = "medium";
            document.getElementById("tmInputStatus").value = "not_started";
            document.getElementById("tmInputDuration").value = "";
            document.getElementById("tmInputDesc").value = "";
            TaskManager.modalSubtasks = [];
        }

        TaskManager.renderModalSubtasks();
        modal.style.display = "flex";
        requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("open", "visible")));
    },

    closeModal() {
        const modal = document.getElementById("taskModal");
        if (!modal) return;
        modal.classList.remove("visible");
        setTimeout(() => { modal.classList.remove("open"); modal.style.display = "none"; }, 220);
    },

    addModalSubtask() {
        const input = document.getElementById("tmSubtaskInput");
        const text = (input?.value || "").trim();
        if (!text) return;
        TaskManager.modalSubtasks.push({
            id: Utils.generateId("sub"),
            text,
            completed: false
        });
        input.value = "";
        TaskManager.renderModalSubtasks();
    },

    removeModalSubtask(subId) {
        TaskManager.modalSubtasks = TaskManager.modalSubtasks.filter(s => s.id !== subId);
        TaskManager.renderModalSubtasks();
    },

    toggleModalSubtask(subId) {
        const sub = TaskManager.modalSubtasks.find(s => s.id === subId);
        if (sub) sub.completed = !sub.completed;
        TaskManager.renderModalSubtasks();
    },

    renderModalSubtasks() {
        const container = document.getElementById("tmSubtasksList");
        if (!container) return;
        if (TaskManager.modalSubtasks.length === 0) {
            container.innerHTML = `<div class="text-xs text-gray-400 font-medium">No subtasks added.</div>`;
            return;
        }
        container.innerHTML = TaskManager.modalSubtasks.map(s => `
            <div class="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg text-xs font-semibold">
                <label class="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input type="checkbox" ${s.completed ? "checked" : ""} onchange="window.TaskManager.toggleModalSubtask('${s.id}')">
                    <span class="truncate ${s.completed ? "line-through text-gray-400" : "text-gray-800"}">${Utils.escapeHTML(s.text)}</span>
                </label>
                <button type="button" onclick="window.TaskManager.removeModalSubtask('${s.id}')" class="text-red-500 font-bold ml-2 px-1">✕</button>
            </div>
        `).join("");
    },

    async saveModal() {
        const title = document.getElementById("tmInputTitle").value.trim();
        const subject = document.getElementById("tmInputSubject").value.trim();
        const task_type = document.getElementById("tmInputType").value;
        const due_date = document.getElementById("tmInputDueDate").value;
        const due_time = document.getElementById("tmInputDueTime").value.trim() || null;
        const priority = document.getElementById("tmInputPriority").value;
        const status = document.getElementById("tmInputStatus").value;
        const estRaw = document.getElementById("tmInputDuration").value.trim();
        const description = document.getElementById("tmInputDesc").value.trim();
        const hint = document.getElementById("tmHint");

        if (!title) { hint.textContent = "Task title is required."; return; }
        if (!subject) { hint.textContent = "Subject / course is required."; return; }
        if (!due_date || !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) { hint.textContent = "A valid due date is required."; return; }
        let estimated_minutes = null;
        if (estRaw !== "") {
            estimated_minutes = parseInt(estRaw, 10);
            if (isNaN(estimated_minutes) || estimated_minutes < 0 || estimated_minutes > 100000) {
                hint.textContent = "Estimated duration must be between 0 and 100,000 minutes.";
                return;
            }
        }

        // Also capture any un-added text in subtask input
        const pendingSubText = (document.getElementById("tmSubtaskInput")?.value || "").trim();
        if (pendingSubText) {
            TaskManager.modalSubtasks.push({ id: Utils.generateId("sub"), text: pendingSubText, completed: false });
            document.getElementById("tmSubtaskInput").value = "";
        }

        const now = Utils.nowISO();
        let existing = TaskManager.editingTaskId
            ? State.tasks.find(t => t.id === TaskManager.editingTaskId)
            : null;

        const baseValue = existing ? Utils.deepClone(existing) : null;
        const baseVersion = existing ? (existing.version || 1) : null;

        const record = {
            id: existing ? existing.id : Utils.generateId("task"),
            workspace_id: CloudManager.workspaceId || "local_workspace",
            created_by: existing ? existing.created_by : (CloudManager.userId || null),
            profile: existing ? existing.profile : State.currentProfile,
            title,
            description,
            subject,
            task_type,
            due_date,
            due_time,
            priority,
            status,
            estimated_minutes,
            subtasks: Utils.deepClone(TaskManager.modalSubtasks),
            completed_at: status === "completed" ? (existing?.completed_at || now) : null,
            version: existing ? (existing.version || 1) : 1,
            created_at: existing ? existing.created_at : now,
            updated_at: now,
            deleted_at: null
        };

        // 1. Persist durably in IndexedDB BEFORE reporting save
        await OfflineDB.put("tasks", record);
        TaskManager.replaceInMemory(record);
        await SyncManager.enqueue({
            dedupeKey: `task__${record.id}`,
            entityType: "task",
            action: "upsert",
            profile: record.profile,
            targetId: record.id,
            payload: record,
            baseVersion,
            baseValue
        });

        TaskManager.closeModal();
        UI.updateDrawerBadges();
        UI.updateSubjectDatalist();
        UI.refreshCurrentView();
        UI.showToast(navigator.onLine ? "Task saved." : "Task saved offline (queued for sync).", "success");
    },

    async toggleComplete(taskId) {
        const existing = TaskManager.getProfileTasks().find(t => t.id === taskId);
        if (!existing) return;

        const baseValue = Utils.deepClone(existing);
        const baseVersion = existing.version || 1;
        const now = Utils.nowISO();
        const isCompleting = existing.status !== "completed";

        const updated = {
            ...Utils.deepClone(existing),
            status: isCompleting ? "completed" : "not_started",
            completed_at: isCompleting ? now : null,
            updated_at: now
        };

        await OfflineDB.put("tasks", updated);
        TaskManager.replaceInMemory(updated);
        await SyncManager.enqueue({
            dedupeKey: `task__${updated.id}`,
            entityType: "task",
            action: "upsert",
            profile: updated.profile,
            targetId: updated.id,
            payload: updated,
            baseVersion,
            baseValue
        });

        UI.updateDrawerBadges();
        UI.refreshCurrentView();
    },

    async toggleCardSubtask(taskId, subId) {
        const existing = TaskManager.getProfileTasks().find(t => t.id === taskId);
        if (!existing || !Array.isArray(existing.subtasks)) return;

        const baseValue = Utils.deepClone(existing);
        const baseVersion = existing.version || 1;
        const updated = Utils.deepClone(existing);
        const sub = updated.subtasks.find(s => s.id === subId);
        if (!sub) return;
        sub.completed = !sub.completed;

        // Automatically move status to in_progress if a subtask is checked while not_started
        const anyDone = updated.subtasks.some(s => s.completed);
        if (anyDone && updated.status === "not_started") {
            updated.status = "in_progress";
        }
        updated.updated_at = Utils.nowISO();

        await OfflineDB.put("tasks", updated);
        TaskManager.replaceInMemory(updated);
        await SyncManager.enqueue({
            dedupeKey: `task__${updated.id}`,
            entityType: "task",
            action: "upsert",
            profile: updated.profile,
            targetId: updated.id,
            payload: updated,
            baseVersion,
            baseValue
        });

        UI.refreshCurrentView();
    },

    deleteTask(taskId) {
        const existing = TaskManager.getProfileTasks().find(t => t.id === taskId);
        if (!existing) return;

        UI.showConfirm(`Delete task "${existing.title}"?\n\nThis action will remove the task from ${State.currentProfile}'s tracker.`, async () => {
            const baseValue = Utils.deepClone(existing);
            const baseVersion = existing.version || 1;
            const now = Utils.nowISO();
            // Durable soft-delete tombstone so offline deletions synchronize reliably and never resurrect
            const tombstone = {
                ...Utils.deepClone(existing),
                deleted_at: now,
                updated_at: now
            };

            await OfflineDB.put("tasks", tombstone);
            TaskManager.replaceInMemory(tombstone);
            await SyncManager.enqueue({
                dedupeKey: `task__${tombstone.id}`,
                entityType: "task",
                action: "delete",
                profile: tombstone.profile,
                targetId: tombstone.id,
                payload: tombstone,
                baseVersion,
                baseValue
            });

            UI.updateDrawerBadges();
            UI.refreshCurrentView();
            UI.showToast("Task deleted.", "info");
        });
    },

    render() {
        const container = document.getElementById("tasksContent");
        if (!container) return;

        const counts = TaskManager.getCounts();
        const subjects = Utils.getKnownSubjectsForProfile(State.currentProfile);
        const f = State.taskFilters;
        const profLabel = State.currentProfile.charAt(0).toUpperCase() + State.currentProfile.slice(1);

        const subjectOpts = `<option value="all">All Subjects</option>` + subjects.map(s =>
            `<option value="${Utils.escapeHTML(s)}" ${f.subject.toLowerCase() === s.toLowerCase() ? "selected" : ""}>${Utils.escapeHTML(s)}</option>`
        ).join("");

        const typeOpts = `<option value="all">All Types</option>` + Object.entries(CONSTANTS.TASK_TYPES).map(([k, v]) =>
            `<option value="${k}" ${f.taskType === k ? "selected" : ""}>${v}</option>`
        ).join("");

        const statusOpts = `<option value="all">All Statuses</option>` + Object.entries(CONSTANTS.TASK_STATUSES).map(([k, v]) =>
            `<option value="${k}" ${f.status === k ? "selected" : ""}>${v}</option>`
        ).join("");

        const prioOpts = `<option value="all">All Priorities</option>` + Object.entries(CONSTANTS.TASK_PRIORITIES).map(([k, v]) =>
            `<option value="${k}" ${f.priority === k ? "selected" : ""}>${v} Priority</option>`
        ).join("");

        container.innerHTML = `
            <div class="tracker-header-row">
                <div>
                    <h2 class="tracker-title">${Utils.escapeHTML(profLabel)}'s Assignments &amp; Tasks</h2>
                    <div class="tracker-sub">Track coursework, practicals, projects &amp; revision</div>
                </div>
                <button type="button" class="tracker-add-btn" onclick="window.TaskManager.openModal()">＋ Add Task</button>
            </div>

            <!-- 4-Tile KPI Overview (Tap to quick-filter) -->
            <div class="tracker-kpi-grid">
                <div class="tracker-kpi-card ${f.bucket === 'overdue' ? 'active-filter' : ''}" onclick="window.TaskManager.setBucketFilter('overdue')">
                    <div class="tracker-kpi-val danger">${counts.overdue}</div>
                    <div class="tracker-kpi-lbl">Overdue</div>
                </div>
                <div class="tracker-kpi-card ${f.bucket === 'today' ? 'active-filter' : ''}" onclick="window.TaskManager.setBucketFilter('today')">
                    <div class="tracker-kpi-val warn">${counts.dueToday}</div>
                    <div class="tracker-kpi-lbl">Due Today</div>
                </div>
                <div class="tracker-kpi-card ${f.bucket === 'upcoming' ? 'active-filter' : ''}" onclick="window.TaskManager.setBucketFilter('upcoming')">
                    <div class="tracker-kpi-val brand">${counts.upcoming}</div>
                    <div class="tracker-kpi-lbl">Upcoming</div>
                </div>
                <div class="tracker-kpi-card ${f.bucket === 'completed' ? 'active-filter' : ''}" onclick="window.TaskManager.setBucketFilter('completed')">
                    <div class="tracker-kpi-val safe">${counts.completed}</div>
                    <div class="tracker-kpi-lbl">Completed</div>
                </div>
            </div>

            <!-- Search, Filter & Sort Toolbar -->
            <div class="tracker-toolbar">
                <input type="search" id="taskSearchInput" class="tracker-search-input" placeholder="🔍 Search tasks by title, subject, or notes..." value="${Utils.escapeHTML(f.search)}" oninput="window.TaskManager.updateFilter('search', this.value)">
                <div class="tracker-filter-row">
                    <select class="tracker-select" onchange="window.TaskManager.updateFilter('subject', this.value)" aria-label="Filter by Subject">${subjectOpts}</select>
                    <select class="tracker-select" onchange="window.TaskManager.updateFilter('taskType', this.value)" aria-label="Filter by Task Type">${typeOpts}</select>
                </div>
                <div class="tracker-filter-row">
                    <select class="tracker-select" onchange="window.TaskManager.updateFilter('status', this.value)" aria-label="Filter by Status">${statusOpts}</select>
                    <select class="tracker-select" onchange="window.TaskManager.updateFilter('priority', this.value)" aria-label="Filter by Priority">${prioOpts}</select>
                </div>
                <div class="flex items-center justify-between gap-2 pt-1">
                    <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sort By</span>
                    <select class="tracker-select" style="max-width: 190px;" onchange="window.TaskManager.updateFilter('sortBy', this.value)" aria-label="Sort Tasks">
                        <option value="due_date" ${f.sortBy === 'due_date' ? 'selected' : ''}>Due Date (Earliest)</option>
                        <option value="priority" ${f.sortBy === 'priority' ? 'selected' : ''}>Priority (High → Low)</option>
                        <option value="created_at" ${f.sortBy === 'created_at' ? 'selected' : ''}>Recently Created</option>
                    </select>
                </div>
            </div>

            <div id="tasksListContainer"></div>
        `;

        TaskManager.renderListOnly();
    },

    renderListOnly() {
        const listEl = document.getElementById("tasksListContainer");
        if (!listEl) return;

        const tasks = TaskManager.getFilteredAndSortedTasks();
        if (tasks.length === 0) {
            const totalProfileTasks = TaskManager.getProfileTasks().length;
            listEl.innerHTML = `
                <div class="att-empty" style="padding: 36px 16px;">
                    <span class="att-empty-emoji">📝</span>
                    <div class="att-empty-text">
                        ${totalProfileTasks === 0
                            ? "No academic tasks or assignments yet.<br>Tap <b>＋ Add Task</b> to stay ahead of deadlines."
                            : "No tasks match your current filters."}
                    </div>
                </div>
            `;
            return;
        }

        const today = Utils.todayISO();
        listEl.innerHTML = tasks.map(t => {
            const bucket = TaskManager.classifyTaskBucket(t, today);
            const isCompleted = t.status === "completed";
            const diffDays = Utils.daysBetween(today, t.due_date);

            let dueBadgeText = "";
            let dueBadgeClass = "due-upcoming";
            if (isCompleted) {
                dueBadgeText = "✓ Completed";
                dueBadgeClass = "due-completed";
            } else if (diffDays < 0) {
                dueBadgeText = `Overdue by ${Math.abs(diffDays)}d`;
                dueBadgeClass = "due-overdue";
            } else if (diffDays === 0) {
                dueBadgeText = "Due Today";
                dueBadgeClass = "due-today";
            } else if (diffDays === 1) {
                dueBadgeText = "Due Tomorrow";
                dueBadgeClass = "due-today";
            } else {
                dueBadgeText = `In ${diffDays} days`;
                dueBadgeClass = "due-upcoming";
            }

            const dateStr = Utils.fullDateLabel(Utils.isoToDate(t.due_date));
            const timeStr = t.due_time ? ` · ${Utils.formatDisplayTime(String(t.due_time).slice(0, 5))}` : "";
            const estStr = t.estimated_minutes != null ? ` · ⏱️ ${Utils.formatTimeDiff(Number(t.estimated_minutes))}` : "";
            const typeLabel = CONSTANTS.TASK_TYPES[t.task_type] || "Task";
            const statusLabel = CONSTANTS.TASK_STATUSES[t.status] || "Pending";

            let subtasksHTML = "";
            if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
                const doneCount = t.subtasks.filter(s => s.completed).length;
                const pct = Math.round((doneCount / t.subtasks.length) * 100);
                subtasksHTML = `
                    <div class="ac-subtasks">
                        <div class="ac-subtask-header">
                            <span>Checklist</span>
                            <span>${doneCount}/${t.subtasks.length} (${pct}%)</span>
                        </div>
                        <div class="ac-subtask-bar"><div class="ac-subtask-fill" style="width:${pct}%"></div></div>
                        <div>
                            ${t.subtasks.map(s => `
                                <label class="ac-subtask-item ${s.completed ? 'done' : ''}">
                                    <input type="checkbox" ${s.completed ? 'checked' : ''} onchange="window.TaskManager.toggleCardSubtask('${t.id}', '${s.id}')">
                                    <span>${Utils.escapeHTML(s.text)}</span>
                                </label>
                            `).join("")}
                        </div>
                    </div>
                `;
            }

            return `
                <div class="academic-card border-${bucket}">
                    <div class="ac-top-row">
                        <div class="ac-check-title">
                            <button type="button" class="ac-complete-btn ${isCompleted ? 'completed' : ''}" onclick="window.TaskManager.toggleComplete('${t.id}')" aria-label="${isCompleted ? 'Reopen task' : 'Mark task completed'}" title="${isCompleted ? 'Reopen task' : 'Complete task'}">✓</button>
                            <div class="min-w-0 flex-1">
                                <div class="ac-title ${isCompleted ? 'line-through' : ''}">${Utils.escapeHTML(t.title)}</div>
                                <div class="text-xs font-bold text-gray-500 mt-0.5">📅 ${Utils.escapeHTML(dateStr)}${Utils.escapeHTML(timeStr)}${Utils.escapeHTML(estStr)}</div>
                            </div>
                        </div>
                        <span class="ac-badge ${dueBadgeClass}">${Utils.escapeHTML(dueBadgeText)}</span>
                    </div>

                    <div class="ac-badges">
                        <span class="ac-badge subject">${Utils.escapeHTML(t.subject)}</span>
                        <span class="ac-badge type">${Utils.escapeHTML(typeLabel)}</span>
                        <span class="ac-badge prio-${Utils.escapeHTML(t.priority)}">${Utils.escapeHTML(t.priority)} Priority</span>
                        <span class="ac-badge type">${Utils.escapeHTML(statusLabel)}</span>
                    </div>

                    ${t.description ? `<div class="ac-desc">${Utils.escapeHTML(t.description)}</div>` : ""}
                    ${subtasksHTML}

                    <div class="ac-footer">
                        <span>Updated ${Utils.escapeHTML(Utils.formatRelativeTimestamp(t.updated_at))}</span>
                        <div class="ac-actions">
                            <button type="button" class="ac-btn primary" onclick="window.TaskManager.toggleComplete('${t.id}')">${isCompleted ? '↩ Reopen' : '✓ Complete'}</button>
                            <button type="button" class="ac-btn" onclick="window.TaskManager.openModal('${t.id}')">✏️ Edit</button>
                            <button type="button" class="ac-btn danger" onclick="window.TaskManager.deleteTask('${t.id}')">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }
};

/* =============================================
   MODULE: TESTS & EXAMS TRACKER (AssessmentManager)
   ============================================= */
const AssessmentManager = {
    editingAssessmentId: null,
    resultModalAssessmentId: null,

    async loadFromLocal() {
        let list = await OfflineDB.getAll("assessments");
        if (!list || list.length === 0) {
            try {
                const raw = localStorage.getItem(CONSTANTS.STORAGE.ASSESSMENTS_FALLBACK);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        list = parsed;
                        await OfflineDB.putBulk("assessments", list);
                    }
                }
            } catch (_) {}
        }
        State.assessments = Array.isArray(list) ? list : [];
        UI.updateDrawerBadges();
    },

    replaceInMemory(assObj) {
        if (!assObj || !assObj.id) return;
        const idx = State.assessments.findIndex(a => a.id === assObj.id);
        if (idx === -1) State.assessments.push(assObj);
        else State.assessments[idx] = assObj;
    },

    /**
     * Strictly filters assessments by the active profile (`State.currentProfile`) and excludes soft-deleted tombstones.
     */
    getProfileAssessments(profile = null) {
        const prof = profile || State.currentProfile;
        return (State.assessments || []).filter(a => a && !a.deleted_at && a.profile === prof);
    },

    hasRecordedResult(ass) {
        return ass && ass.obtained_marks !== null && ass.obtained_marks !== undefined && ass.obtained_marks !== "";
    },

    classifyAssessmentBucket(ass, todayIso = null) {
        const today = todayIso || Utils.todayISO();
        if (AssessmentManager.hasRecordedResult(ass)) return "completed_scored";
        if (ass.assessment_date < today) return "overdue_unrecorded";
        if (ass.assessment_date === today) return "today";
        return "upcoming";
    },

    getCounts(profile = null) {
        const list = AssessmentManager.getProfileAssessments(profile);
        const today = Utils.todayISO();
        let upcoming = 0, todayCount = 0, awaitingResult = 0, scored = 0;
        list.forEach(a => {
            const b = AssessmentManager.classifyAssessmentBucket(a, today);
            if (b === "completed_scored") scored++;
            else if (b === "overdue_unrecorded") awaitingResult++;
            else if (b === "today") { todayCount++; upcoming++; }
            else upcoming++;
        });
        return { upcoming, todayCount, awaitingResult, scored, total: list.length };
    },

    getFilteredAndSortedAssessments() {
        const f = State.assessmentFilters;
        const today = Utils.todayISO();

        const filtered = AssessmentManager.getProfileAssessments().filter(a => {
            const b = AssessmentManager.classifyAssessmentBucket(a, today);
            if (f.bucket === "upcoming" && b !== "upcoming" && b !== "today") return false;
            if (f.bucket === "overdue_unrecorded" && b !== "overdue_unrecorded") return false;
            if (f.bucket === "completed_scored" && b !== "completed_scored") return false;
            if (f.subject !== "all" && (a.subject || "").toLowerCase() !== f.subject.toLowerCase()) return false;
            if (f.assessmentType !== "all" && a.assessment_type !== f.assessmentType) return false;
            if (f.prepStatus !== "all" && a.prep_status !== f.prepStatus) return false;
            return true;
        });

        filtered.sort((a, b) => {
            const cmp = a.assessment_date.localeCompare(b.assessment_date);
            if (cmp !== 0) return f.sortBy === "date_desc" ? -cmp : cmp;
            const tA = a.assessment_time ? Utils.toMinutes(a.assessment_time) : 0;
            const tB = b.assessment_time ? Utils.toMinutes(b.assessment_time) : 0;
            return f.sortBy === "date_desc" ? tB - tA : tA - tB;
        });

        return filtered;
    },

    setBucketFilter(bucket) {
        State.assessmentFilters.bucket = (State.assessmentFilters.bucket === bucket) ? "all" : bucket;
        AssessmentManager.render();
    },

    updateFilter(field, value) {
        State.assessmentFilters[field] = value;
        AssessmentManager.renderListOnly();
    },

    openModal(assId = null) {
        UI.updateSubjectDatalist();
        const modal = document.getElementById("assessmentModal");
        if (!modal) return;

        AssessmentManager.editingAssessmentId = assId;
        const hint = document.getElementById("amHint");
        if (hint) hint.textContent = "";

        if (assId) {
            const a = AssessmentManager.getProfileAssessments().find(x => x.id === assId);
            if (!a) return;
            document.getElementById("amTitle").textContent = "Edit Test / Exam";
            document.getElementById("amInputTitle").value = a.title || "";
            document.getElementById("amInputSubject").value = a.subject || "";
            document.getElementById("amInputType").value = a.assessment_type || "class_test";
            document.getElementById("amInputDate").value = a.assessment_date || Utils.todayISO();
            document.getElementById("amInputTime").value = a.assessment_time ? String(a.assessment_time).slice(0, 5) : "";
            document.getElementById("amInputPrep").value = a.prep_status || "not_started";
            document.getElementById("amInputSyllabus").value = a.syllabus || "";
            document.getElementById("amInputMaxMarks").value = a.max_marks != null ? a.max_marks : "";
            document.getElementById("amInputTargetMarks").value = a.target_marks != null ? a.target_marks : "";
            document.getElementById("amInputObtainedMarks").value = a.obtained_marks != null ? a.obtained_marks : "";
            document.getElementById("amInputNotes").value = a.notes || "";
        } else {
            document.getElementById("amTitle").textContent = "Add Test / Exam";
            document.getElementById("amInputTitle").value = "";
            document.getElementById("amInputSubject").value = "";
            document.getElementById("amInputType").value = "class_test";
            document.getElementById("amInputDate").value = State.selectedDate || Utils.todayISO();
            document.getElementById("amInputTime").value = "";
            document.getElementById("amInputPrep").value = "not_started";
            document.getElementById("amInputSyllabus").value = "";
            document.getElementById("amInputMaxMarks").value = "";
            document.getElementById("amInputTargetMarks").value = "";
            document.getElementById("amInputObtainedMarks").value = "";
            document.getElementById("amInputNotes").value = "";
        }

        modal.style.display = "flex";
        requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("open", "visible")));
    },

    closeModal() {
        const modal = document.getElementById("assessmentModal");
        if (!modal) return;
        modal.classList.remove("visible");
        setTimeout(() => { modal.classList.remove("open"); modal.style.display = "none"; }, 220);
    },

    validateMarks(maxRaw, targetRaw, obtainedRaw) {
        const max_marks = maxRaw !== "" && maxRaw != null ? Number(maxRaw) : null;
        const target_marks = targetRaw !== "" && targetRaw != null ? Number(targetRaw) : null;
        const obtained_marks = obtainedRaw !== "" && obtainedRaw != null ? Number(obtainedRaw) : null;

        if (max_marks !== null && (isNaN(max_marks) || max_marks <= 0)) {
            return { valid: false, error: "Maximum marks must be greater than 0." };
        }
        if (target_marks !== null && (isNaN(target_marks) || target_marks < 0)) {
            return { valid: false, error: "Target marks cannot be negative." };
        }
        if (obtained_marks !== null && (isNaN(obtained_marks) || obtained_marks < 0)) {
            return { valid: false, error: "Obtained marks cannot be negative." };
        }
        if (target_marks !== null && max_marks !== null && target_marks > max_marks) {
            return { valid: false, error: "Target marks cannot exceed maximum marks." };
        }
        if (obtained_marks !== null && max_marks !== null && obtained_marks > max_marks) {
            return { valid: false, error: "Obtained marks cannot exceed maximum marks." };
        }
        return { valid: true, max_marks, target_marks, obtained_marks };
    },

    async saveModal() {
        const title = document.getElementById("amInputTitle").value.trim();
        const subject = document.getElementById("amInputSubject").value.trim();
        const assessment_type = document.getElementById("amInputType").value;
        const assessment_date = document.getElementById("amInputDate").value;
        const assessment_time = document.getElementById("amInputTime").value.trim() || null;
        const prep_status = document.getElementById("amInputPrep").value;
        const syllabus = document.getElementById("amInputSyllabus").value.trim();
        const maxRaw = document.getElementById("amInputMaxMarks").value.trim();
        const targetRaw = document.getElementById("amInputTargetMarks").value.trim();
        const obtainedRaw = document.getElementById("amInputObtainedMarks").value.trim();
        const notes = document.getElementById("amInputNotes").value.trim();
        const hint = document.getElementById("amHint");

        if (!title) { hint.textContent = "Assessment title is required."; return; }
        if (!subject) { hint.textContent = "Subject / course is required."; return; }
        if (!assessment_date || !/^\d{4}-\d{2}-\d{2}$/.test(assessment_date)) {
            hint.textContent = "A valid assessment date is required.";
            return;
        }

        const marksCheck = AssessmentManager.validateMarks(maxRaw, targetRaw, obtainedRaw);
        if (!marksCheck.valid) {
            hint.textContent = marksCheck.error;
            return;
        }

        const now = Utils.nowISO();
        const existing = AssessmentManager.editingAssessmentId
            ? State.assessments.find(a => a.id === AssessmentManager.editingAssessmentId)
            : null;

        const baseValue = existing ? Utils.deepClone(existing) : null;
        const baseVersion = existing ? (existing.version || 1) : null;

        const record = {
            id: existing ? existing.id : Utils.generateId("exam"),
            workspace_id: CloudManager.workspaceId || "local_workspace",
            created_by: existing ? existing.created_by : (CloudManager.userId || null),
            profile: existing ? existing.profile : State.currentProfile,
            title,
            subject,
            assessment_type,
            assessment_date,
            assessment_time,
            syllabus,
            prep_status,
            target_marks: marksCheck.target_marks,
            max_marks: marksCheck.max_marks,
            obtained_marks: marksCheck.obtained_marks,
            notes,
            version: existing ? (existing.version || 1) : 1,
            created_at: existing ? existing.created_at : now,
            updated_at: now,
            deleted_at: null
        };

        await OfflineDB.put("assessments", record);
        AssessmentManager.replaceInMemory(record);
        await SyncManager.enqueue({
            dedupeKey: `assessment__${record.id}`,
            entityType: "assessment",
            action: "upsert",
            profile: record.profile,
            targetId: record.id,
            payload: record,
            baseVersion,
            baseValue
        });

        AssessmentManager.closeModal();
        UI.updateDrawerBadges();
        UI.updateSubjectDatalist();
        UI.refreshCurrentView();
        UI.showToast(navigator.onLine ? "Assessment saved." : "Assessment saved offline (queued for sync).", "success");
    },

    async cyclePrepStatus(assId) {
        const existing = AssessmentManager.getProfileAssessments().find(a => a.id === assId);
        if (!existing) return;

        const order = ["not_started", "preparing", "prepared"];
        const nextPrep = order[(order.indexOf(existing.prep_status) + 1) % order.length];
        const baseValue = Utils.deepClone(existing);
        const baseVersion = existing.version || 1;

        const updated = {
            ...Utils.deepClone(existing),
            prep_status: nextPrep,
            updated_at: Utils.nowISO()
        };

        await OfflineDB.put("assessments", updated);
        AssessmentManager.replaceInMemory(updated);
        await SyncManager.enqueue({
            dedupeKey: `assessment__${updated.id}`,
            entityType: "assessment",
            action: "upsert",
            profile: updated.profile,
            targetId: updated.id,
            payload: updated,
            baseVersion,
            baseValue
        });

        UI.refreshCurrentView();
    },

    openResultModal(assId) {
        const a = AssessmentManager.getProfileAssessments().find(x => x.id === assId);
        if (!a) return;
        AssessmentManager.resultModalAssessmentId = assId;

        document.getElementById("armSubtitle").textContent = `${a.title} · ${a.subject}`;
        document.getElementById("armObtained").value = a.obtained_marks != null ? a.obtained_marks : "";
        document.getElementById("armMax").value = a.max_marks != null ? a.max_marks : "";
        document.getElementById("armNotes").value = a.notes || "";
        document.getElementById("armHint").textContent = "";

        const modal = document.getElementById("assessmentResultModal");
        modal.style.display = "flex";
        requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("open", "visible")));
    },

    closeResultModal() {
        const modal = document.getElementById("assessmentResultModal");
        if (!modal) return;
        modal.classList.remove("visible");
        setTimeout(() => { modal.classList.remove("open"); modal.style.display = "none"; }, 220);
    },

    async saveResultModal() {
        const assId = AssessmentManager.resultModalAssessmentId;
        const existing = AssessmentManager.getProfileAssessments().find(a => a.id === assId);
        if (!existing) return;

        const obtainedRaw = document.getElementById("armObtained").value.trim();
        const maxRaw = document.getElementById("armMax").value.trim();
        const notes = document.getElementById("armNotes").value.trim();
        const hint = document.getElementById("armHint");

        if (obtainedRaw === "") {
            hint.textContent = "Please enter obtained marks (or tap Clear to remove recorded marks).";
            return;
        }

        const check = AssessmentManager.validateMarks(maxRaw, existing.target_marks, obtainedRaw);
        if (!check.valid) {
            hint.textContent = check.error;
            return;
        }

        const baseValue = Utils.deepClone(existing);
        const baseVersion = existing.version || 1;
        const updated = {
            ...Utils.deepClone(existing),
            obtained_marks: check.obtained_marks,
            max_marks: check.max_marks,
            notes,
            updated_at: Utils.nowISO()
        };

        await OfflineDB.put("assessments", updated);
        AssessmentManager.replaceInMemory(updated);
        await SyncManager.enqueue({
            dedupeKey: `assessment__${updated.id}`,
            entityType: "assessment",
            action: "upsert",
            profile: updated.profile,
            targetId: updated.id,
            payload: updated,
            baseVersion,
            baseValue
        });

        AssessmentManager.closeResultModal();
        UI.updateDrawerBadges();
        UI.refreshCurrentView();
        UI.showToast("Assessment result recorded.", "success");
    },

    async clearResultModal() {
        const assId = AssessmentManager.resultModalAssessmentId;
        const existing = AssessmentManager.getProfileAssessments().find(a => a.id === assId);
        if (!existing) return AssessmentManager.closeResultModal();

        const baseValue = Utils.deepClone(existing);
        const baseVersion = existing.version || 1;
        const updated = {
            ...Utils.deepClone(existing),
            obtained_marks: null,
            updated_at: Utils.nowISO()
        };

        await OfflineDB.put("assessments", updated);
        AssessmentManager.replaceInMemory(updated);
        await SyncManager.enqueue({
            dedupeKey: `assessment__${updated.id}`,
            entityType: "assessment",
            action: "upsert",
            profile: updated.profile,
            targetId: updated.id,
            payload: updated,
            baseVersion,
            baseValue
        });

        AssessmentManager.closeResultModal();
        UI.updateDrawerBadges();
        UI.refreshCurrentView();
        UI.showToast("Recorded result cleared.", "info");
    },

    deleteAssessment(assId) {
        const existing = AssessmentManager.getProfileAssessments().find(a => a.id === assId);
        if (!existing) return;

        UI.showConfirm(`Delete assessment "${existing.title}"?\n\nThis will remove the assessment from ${State.currentProfile}'s tracker.`, async () => {
            const baseValue = Utils.deepClone(existing);
            const baseVersion = existing.version || 1;
            const now = Utils.nowISO();
            const tombstone = {
                ...Utils.deepClone(existing),
                deleted_at: now,
                updated_at: now
            };

            await OfflineDB.put("assessments", tombstone);
            AssessmentManager.replaceInMemory(tombstone);
            await SyncManager.enqueue({
                dedupeKey: `assessment__${tombstone.id}`,
                entityType: "assessment",
                action: "delete",
                profile: tombstone.profile,
                targetId: tombstone.id,
                payload: tombstone,
                baseVersion,
                baseValue
            });

            UI.updateDrawerBadges();
            UI.refreshCurrentView();
            UI.showToast("Assessment deleted.", "info");
        });
    },

    render() {
        const container = document.getElementById("assessmentsContent");
        if (!container) return;

        const counts = AssessmentManager.getCounts();
        const subjects = Utils.getKnownSubjectsForProfile(State.currentProfile);
        const f = State.assessmentFilters;
        const profLabel = State.currentProfile.charAt(0).toUpperCase() + State.currentProfile.slice(1);

        const subjectOpts = `<option value="all">All Subjects</option>` + subjects.map(s =>
            `<option value="${Utils.escapeHTML(s)}" ${f.subject.toLowerCase() === s.toLowerCase() ? "selected" : ""}>${Utils.escapeHTML(s)}</option>`
        ).join("");

        const typeOpts = `<option value="all">All Assessment Types</option>` + Object.entries(CONSTANTS.ASSESSMENT_TYPES).map(([k, v]) =>
            `<option value="${k}" ${f.assessmentType === k ? "selected" : ""}>${v}</option>`
        ).join("");

        const prepOpts = `<option value="all">All Prep States</option>` + Object.entries(CONSTANTS.PREP_STATUSES).map(([k, v]) =>
            `<option value="${k}" ${f.prepStatus === k ? "selected" : ""}>Prep: ${v}</option>`
        ).join("");

        container.innerHTML = `
            <div class="tracker-header-row">
                <div>
                    <h2 class="tracker-title">${Utils.escapeHTML(profLabel)}'s Tests &amp; Exams</h2>
                    <div class="tracker-sub">Preparation readiness &amp; post-exam score tracker</div>
                </div>
                <button type="button" class="tracker-add-btn" onclick="window.AssessmentManager.openModal()">＋ Add Exam</button>
            </div>

            <!-- 4-Tile KPI Overview -->
            <div class="tracker-kpi-grid">
                <div class="tracker-kpi-card ${f.bucket === 'upcoming' ? 'active-filter' : ''}" onclick="window.AssessmentManager.setBucketFilter('upcoming')">
                    <div class="tracker-kpi-val brand">${counts.upcoming}</div>
                    <div class="tracker-kpi-lbl">Upcoming</div>
                </div>
                <div class="tracker-kpi-card" onclick="window.AssessmentManager.setBucketFilter('upcoming')">
                    <div class="tracker-kpi-val warn">${counts.todayCount}</div>
                    <div class="tracker-kpi-lbl">Today</div>
                </div>
                <div class="tracker-kpi-card ${f.bucket === 'overdue_unrecorded' ? 'active-filter' : ''}" onclick="window.AssessmentManager.setBucketFilter('overdue_unrecorded')">
                    <div class="tracker-kpi-val danger">${counts.awaitingResult}</div>
                    <div class="tracker-kpi-lbl">Past / Unscored</div>
                </div>
                <div class="tracker-kpi-card ${f.bucket === 'completed_scored' ? 'active-filter' : ''}" onclick="window.AssessmentManager.setBucketFilter('completed_scored')">
                    <div class="tracker-kpi-val safe">${counts.scored}</div>
                    <div class="tracker-kpi-lbl">Scored</div>
                </div>
            </div>

            <!-- Filter & Sort Toolbar -->
            <div class="tracker-toolbar">
                <div class="tracker-filter-row">
                    <select class="tracker-select" onchange="window.AssessmentManager.updateFilter('subject', this.value)" aria-label="Filter by Subject">${subjectOpts}</select>
                    <select class="tracker-select" onchange="window.AssessmentManager.updateFilter('assessmentType', this.value)" aria-label="Filter by Assessment Type">${typeOpts}</select>
                </div>
                <div class="tracker-filter-row">
                    <select class="tracker-select" onchange="window.AssessmentManager.updateFilter('prepStatus', this.value)" aria-label="Filter by Preparation Status">${prepOpts}</select>
                    <select class="tracker-select" onchange="window.AssessmentManager.updateFilter('sortBy', this.value)" aria-label="Sort Assessments">
                        <option value="date_asc" ${f.sortBy === 'date_asc' ? 'selected' : ''}>Date (Earliest First)</option>
                        <option value="date_desc" ${f.sortBy === 'date_desc' ? 'selected' : ''}>Date (Latest First)</option>
                    </select>
                </div>
            </div>

            <div id="assessmentsListContainer"></div>
        `;

        AssessmentManager.renderListOnly();
    },

    renderListOnly() {
        const listEl = document.getElementById("assessmentsListContainer");
        if (!listEl) return;

        const items = AssessmentManager.getFilteredAndSortedAssessments();
        if (items.length === 0) {
            const totalProfileAss = AssessmentManager.getProfileAssessments().length;
            listEl.innerHTML = `
                <div class="att-empty" style="padding: 36px 16px;">
                    <span class="att-empty-emoji">🎓</span>
                    <div class="att-empty-text">
                        ${totalProfileAss === 0
                            ? "No tests or exams scheduled yet.<br>Tap <b>＋ Add Exam</b> to track syllabus &amp; preparation."
                            : "No assessments match your current filters."}
                    </div>
                </div>
            `;
            return;
        }

        const today = Utils.todayISO();
        listEl.innerHTML = items.map(a => {
            const diffDays = Utils.daysBetween(today, a.assessment_date);
            const hasResult = AssessmentManager.hasRecordedResult(a);

            let dateBadgeText = "";
            let dateBadgeClass = "due-upcoming";
            let cardBorderClass = "border-upcoming";

            if (hasResult) {
                dateBadgeText = "Result Recorded";
                dateBadgeClass = "due-completed";
                cardBorderClass = "border-completed";
            } else if (diffDays < 0) {
                dateBadgeText = `${Math.abs(diffDays)}d ago · Awaiting Score`;
                dateBadgeClass = "due-overdue";
                cardBorderClass = "border-overdue";
            } else if (diffDays === 0) {
                dateBadgeText = "Today";
                dateBadgeClass = "due-today";
                cardBorderClass = "border-today";
            } else if (diffDays === 1) {
                dateBadgeText = "Tomorrow";
                dateBadgeClass = "due-today";
                cardBorderClass = "border-today";
            } else {
                dateBadgeText = `In ${diffDays} days`;
                dateBadgeClass = "due-upcoming";
                cardBorderClass = "border-upcoming";
            }

            const dateStr = Utils.fullDateLabel(Utils.isoToDate(a.assessment_date));
            const timeStr = a.assessment_time ? ` · ${Utils.formatDisplayTime(String(a.assessment_time).slice(0, 5))}` : "";
            const typeLabel = CONSTANTS.ASSESSMENT_TYPES[a.assessment_type] || "Assessment";
            const prepLabel = CONSTANTS.PREP_STATUSES[a.prep_status] || "Not Started";

            const targetTxt = a.target_marks != null
                ? `${a.target_marks}${a.max_marks != null ? ` / ${a.max_marks}` : ""}`
                : (a.max_marks != null ? `Max ${a.max_marks}` : "Not set");

            let resultTxt = "Not recorded yet";
            if (hasResult) {
                const pct = a.max_marks ? ` (${Math.round((Number(a.obtained_marks) / Number(a.max_marks)) * 100)}%)` : "";
                resultTxt = `${a.obtained_marks}${a.max_marks != null ? ` / ${a.max_marks}` : ""}${pct}`;
            }

            return `
                <div class="academic-card ${cardBorderClass}">
                    <div class="ac-top-row">
                        <div class="min-w-0 flex-1">
                            <div class="ac-title">${Utils.escapeHTML(a.title)}</div>
                            <div class="text-xs font-bold text-gray-500 mt-0.5">🗓️ ${Utils.escapeHTML(dateStr)}${Utils.escapeHTML(timeStr)}</div>
                        </div>
                        <span class="ac-badge ${dateBadgeClass}">${Utils.escapeHTML(dateBadgeText)}</span>
                    </div>

                    <div class="ac-badges">
                        <span class="ac-badge subject">${Utils.escapeHTML(a.subject)}</span>
                        <span class="ac-badge type">${Utils.escapeHTML(typeLabel)}</span>
                        <button type="button" class="ac-badge prep-${Utils.escapeHTML(a.prep_status)}" onclick="window.AssessmentManager.cyclePrepStatus('${a.id}')" title="Tap to cycle preparation status" style="border:none;cursor:pointer;">
                            📖 Prep: ${Utils.escapeHTML(prepLabel)} ↻
                        </button>
                    </div>

                    <!-- Distinct Preparation vs Post-Assessment Result Metrics -->
                    <div class="assessment-metrics-row">
                        <div class="am-block">
                            <span class="am-label">Target / Max</span>
                            <span class="am-val">${Utils.escapeHTML(targetTxt)}</span>
                        </div>
                        <div class="am-block" style="text-align:right;">
                            <span class="am-label">Recorded Result</span>
                            <span class="am-val ${hasResult ? 'scored' : ''}">${Utils.escapeHTML(resultTxt)}</span>
                        </div>
                    </div>

                    ${a.syllabus ? `<div class="ac-desc"><b>Syllabus:</b> ${Utils.escapeHTML(a.syllabus)}</div>` : ""}
                    ${a.notes ? `<div class="ac-desc"><b>Notes:</b> ${Utils.escapeHTML(a.notes)}</div>` : ""}

                    <div class="ac-footer">
                        <span>Updated ${Utils.escapeHTML(Utils.formatRelativeTimestamp(a.updated_at))}</span>
                        <div class="ac-actions">
                            <button type="button" class="ac-btn primary" onclick="window.AssessmentManager.openResultModal('${a.id}')">🎯 ${hasResult ? 'Edit Result' : 'Record Result'}</button>
                            <button type="button" class="ac-btn" onclick="window.AssessmentManager.openModal('${a.id}')">✏️ Edit</button>
                            <button type="button" class="ac-btn danger" onclick="window.AssessmentManager.deleteAssessment('${a.id}')">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }
};

/* =============================================
   MODULE: BACKUP & RESTORE
   ============================================= */
const BackupManager = {
    exportJSON: async () => {
        const pendingQueue = await SyncManager.getPendingQueue();
        const payload = {
            metadata: {
                ...State.metadata,
                appVersion: CONSTANTS.APP_VERSION,
                schemaVersion: CONSTANTS.SCHEMA_VERSION
            },
            exportDate: Utils.todayISO(),
            profile: State.currentProfile,
            timeline: State.data.timeline,
            attendance: State.data.attendance,
            tasks: State.tasks,
            assessments: State.assessments,
            pendingMutationsCount: pendingQueue.length
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
        const el = document.createElement('a');
        el.setAttribute("href", dataStr);
        el.setAttribute("download", `smart_attendance_backup_${Utils.todayISO()}.json`);
        document.body.appendChild(el);
        el.click();
        el.remove();
        UI.showToast("Backup exported successfully.", "success");
    },
    triggerImport: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (!parsed.timeline || !parsed.attendance) throw new Error("Invalid backup format (missing timeline or attendance).");
                    
                    const validation = Validation.validateTimeline(parsed.timeline);
                    if (!validation.valid) throw new Error(`Timeline Validation Failed: ${validation.error}`);
                    
                    const hasAcademic = Array.isArray(parsed.tasks) || Array.isArray(parsed.assessments);
                    const confirmMsg = hasAcademic
                        ? "Restore this backup?\n\nThis will restore timetable, attendance, academic tasks, and assessments to your workspace and queue them for cloud sync."
                        : "Restore this V8 backup?\n\nThis will restore timetable and attendance data while preserving your existing tasks and assessments.";

                    UI.showConfirm(confirmMsg, async () => {
                        State.data.timeline = parsed.timeline;
                        State.data.attendance = parsed.attendance;
                        Storage.saveTimeline();

                        // Queue attendance cells for sync
                        CONSTANTS.PROFILES.forEach(prof => {
                            const profLog = State.data.attendance[prof] || {};
                            Object.keys(profLog).forEach(iso => {
                                Object.keys(profLog[iso] || {}).forEach(lid => {
                                    Storage.saveAttendance({
                                        profile: prof,
                                        isoDate: iso,
                                        lectureId: lid,
                                        newRecord: profLog[iso][lid],
                                        baseRecord: null
                                    });
                                });
                            });
                        });

                        if (Array.isArray(parsed.tasks)) {
                            State.tasks = parsed.tasks;
                            await OfflineDB.putBulk("tasks", parsed.tasks);
                            for (const t of parsed.tasks) {
                                await SyncManager.enqueue({
                                    dedupeKey: `task__${t.id}`,
                                    entityType: "task",
                                    action: t.deleted_at ? "delete" : "upsert",
                                    profile: t.profile || State.currentProfile,
                                    targetId: t.id,
                                    payload: t,
                                    baseVersion: t.version || 1,
                                    baseValue: null
                                });
                            }
                        }

                        if (Array.isArray(parsed.assessments)) {
                            State.assessments = parsed.assessments;
                            await OfflineDB.putBulk("assessments", parsed.assessments);
                            for (const a of parsed.assessments) {
                                await SyncManager.enqueue({
                                    dedupeKey: `assessment__${a.id}`,
                                    entityType: "assessment",
                                    action: a.deleted_at ? "delete" : "upsert",
                                    profile: a.profile || State.currentProfile,
                                    targetId: a.id,
                                    payload: a,
                                    baseVersion: a.version || 1,
                                    baseValue: null
                                });
                            }
                        }

                        UI.updateDrawerBadges();
                        UI.refreshCurrentView();
                        await SyncManager.syncNow(true);
                        UI.showAlert("Backup restored locally and queued for cloud synchronization!");
                    });
                } catch(err) {
                    UI.showAlert("Import Failed:\n" + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
};

/* =============================================
   MODULE: UNMARKED LECTURES AUDIT MANAGER
   ============================================= */
const UnmarkedManager = {
    resolveHistoricalContext: (isoDate) => {
        return Resolver.resolveAcademicContext(isoDate, true);
    },

    getUnmarkedLectures: () => {
        const profile = State.currentProfile;
        if (!State.data || !Array.isArray(State.data.timeline)) return [];

        const today = Utils.todayISO();
        const profileAttendance = (State.data.attendance && State.data.attendance[profile]) ? State.data.attendance[profile] : {};
        const timeline = State.data.timeline;

        // Collect all valid past dates across active and archived academic periods
        const candidateDates = new Set();
        for (let i = 0; i < timeline.length; i++) {
            const p = timeline[i];
            if (!p || !p.startDate || !p.endDate) continue;
            if (["Vacation", "Preparatory Leave", "Exam Period"].includes(p.type)) continue;
            if (p.startDate >= today) continue;

            const endCap = p.endDate < today ? p.endDate : Utils.addDays(today, -1);
            if (p.startDate > endCap) continue;

            let cur = p.startDate;
            let safetyCount = 0;
            while (cur <= endCap && safetyCount < 2000) {
                candidateDates.add(cur);
                cur = Utils.addDays(cur, 1);
                safetyCount++;
            }
        }

        const sortedDates = Array.from(candidateDates).sort();
        const unmarked = [];
        const seenKeys = new Set();

        for (let i = 0; i < sortedDates.length; i++) {
            const isoDate = sortedDates[i];
            if (isoDate >= today) continue;

            const dObj = Utils.isoToDate(isoDate);
            const dow = dObj.getDay();
            if (dow === 0) continue; // Sunday has no scheduled timetable entries

            const ctx = UnmarkedManager.resolveHistoricalContext(isoDate);
            if (!ctx.period || !ctx.version || ctx.isHoliday || ctx.isExam) continue;
            if (!Array.isArray(ctx.dayData) || ctx.dayData.length === 0) continue;

            const dayName = CONSTANTS.DAY_NAMES_FULL[dow] || "";
            const dayRecords = profileAttendance[isoDate] || {};

            for (let j = 0; j < ctx.dayData.length; j++) {
                const lecture = ctx.dayData[j];
                if (!lecture || typeof lecture !== "object") continue;
                if (Utils.isBreakItem(lecture)) continue;

                const subject = (lecture.subject || "").trim();
                if (!subject) continue;

                const lectureId = lecture.lectureId;
                if (!lectureId) continue;

                const uniqueKey = `${isoDate}__${lectureId}`;
                if (seenKeys.has(uniqueKey)) continue;
                seenKeys.add(uniqueKey);

                const existingRecord = dayRecords[lectureId];
                if (existingRecord) continue; // Attended, Missed, or Cancelled are all marked

                unmarked.push({
                    date: isoDate,
                    subject: subject,
                    type: (lecture.type || "DSC").toUpperCase(),
                    start: lecture.start || "",
                    end: lecture.end || "",
                    room: Utils.isValid(lecture.room) ? String(lecture.room).trim() : "",
                    teacher: Utils.isValid(lecture.teacher) ? String(lecture.teacher).trim() : "",
                    lectureId: lectureId,
                    dayName: dayName,
                    profile: profile
                });
            }
        }

        return unmarked;
    },

    groupBySubject: (unmarkedList) => {
        const list = Array.isArray(unmarkedList) ? unmarkedList : UnmarkedManager.getUnmarkedLectures();
        const groupsMap = {};

        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (!item || !item.subject) continue;
            const normKey = AttendanceManager.normaliseSubject(item.subject) || item.subject.toLowerCase();
            if (!groupsMap[normKey]) {
                groupsMap[normKey] = {
                    normKey,
                    subject: item.subject.trim(),
                    lectures: []
                };
            }
            groupsMap[normKey].lectures.push(item);
        }

        const groups = Object.values(groupsMap);
        groups.sort((a, b) => a.subject.localeCompare(b.subject));

        for (let i = 0; i < groups.length; i++) {
            groups[i].lectures.sort((a, b) => {
                if (a.date !== b.date) {
                    return a.date < b.date ? 1 : -1;
                }
                return Utils.toMinutes(a.start) - Utils.toMinutes(b.start);
            });
        }

        return groups;
    },

    renderBannerHTML: (unmarkedList) => {
        const list = Array.isArray(unmarkedList) ? unmarkedList : UnmarkedManager.getUnmarkedLectures();
        const count = list.length;

        if (count === 0) {
            return `
                <button type="button" class="unmarked-audit-banner all-marked" onclick="window.openUnmarkedLectures()">
                    <div class="unmarked-banner-icon" aria-hidden="true">✓</div>
                    <div class="unmarked-banner-body">
                        <div class="unmarked-banner-title">All past lectures marked</div>
                        <div class="unmarked-banner-sub">Everything is up to date.</div>
                    </div>
                    <div class="unmarked-banner-chevron" aria-hidden="true">›</div>
                </button>
            `;
        }

        const label = count === 1 ? "1 Unmarked Lecture" : `${count} Unmarked Lectures`;
        const subText = count === 1
            ? "1 past lecture hasn't been marked yet. Tap to review."
            : "Some past lectures haven't been marked yet. Tap to review.";

        return `
            <button type="button" class="unmarked-audit-banner has-unmarked" onclick="window.openUnmarkedLectures()">
                <div class="unmarked-banner-icon" aria-hidden="true">⚠️</div>
                <div class="unmarked-banner-body">
                    <div class="unmarked-banner-title">${label}</div>
                    <div class="unmarked-banner-sub">${subText}</div>
                </div>
                <div class="unmarked-banner-chevron" aria-hidden="true">›</div>
            </button>
        `;
    },

    open: () => {
        UI.switchTab("unmarked");
    },

    close: () => {
        UI.switchTab("attendance");
    },

    markNow: (isoDate, lectureId) => {
        if (!isoDate) return;
        const targetCtx = Resolver.resolveAcademicContext(isoDate, false);
        if (!targetCtx.period) {
            const archivedCtx = Resolver.resolveAcademicContext(isoDate, true);
            if (archivedCtx.period && archivedCtx.period.archived) {
                archivedCtx.period.archived = false;
            }
        }
        State.selectedDate = isoDate;
        UI.switchTab("schedule");
        ScheduleManager.renderDateStrip();
        ScheduleManager.renderScheduleForSelected();

        if (lectureId) {
            setTimeout(() => {
                const cardEl = document.getElementById(`card-${lectureId}`);
                if (cardEl) {
                    cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    cardEl.classList.add("audit-focus-pulse");
                    setTimeout(() => cardEl.classList.remove("audit-focus-pulse"), 1800);
                }
            }, 220);
        }
    },

    render: () => {
        const container = document.getElementById("unmarkedContent");
        if (!container) return;

        const unmarkedList = UnmarkedManager.getUnmarkedLectures();
        const totalCount = unmarkedList.length;

        if (totalCount === 0) {
            container.innerHTML = `
                <button type="button" class="detail-back-btn" onclick="window.closeUnmarkedLectures()">← Back to Attendance</button>
                <div class="unmarked-header-block">
                    <h2 class="unmarked-page-title">Unmarked Lectures</h2>
                    <p class="unmarked-page-sub">Past lectures without an attendance entry</p>
                </div>
                <div class="unmarked-empty-state">
                    <div class="unmarked-empty-badge" aria-hidden="true">✓</div>
                    <div class="unmarked-empty-title">All past lectures are marked</div>
                    <div class="unmarked-empty-sub">No attendance entries appear to be missing.</div>
                </div>
            `;
            return;
        }

        const groups = UnmarkedManager.groupBySubject(unmarkedList);
        const countBannerText = totalCount === 1 ? "1 lecture needs attention" : `${totalCount} lectures need attention`;

        let sectionsHTML = "";
        for (let i = 0; i < groups.length; i++) {
            const grp = groups[i];
            const subCountLabel = grp.lectures.length === 1 ? "1 lecture" : `${grp.lectures.length} lectures`;

            let cardsHTML = "";
            for (let j = 0; j < grp.lectures.length; j++) {
                const lec = grp.lectures[j];
                const dObj = Utils.isoToDate(lec.date);
                const dateLabel = Utils.fullDateLabel(dObj);
                const timeRange = (lec.start && lec.end)
                    ? `${Utils.formatDisplayTime(lec.start)} – ${Utils.formatDisplayTime(lec.end)}`
                    : (lec.start ? Utils.formatDisplayTime(lec.start) : "");

                const roomText = lec.room ? `<span>📍 Room ${Utils.escapeHTML(lec.room)}</span>` : "";
                const teacherText = lec.teacher ? `<span>👤 ${Utils.escapeHTML(lec.teacher)}</span>` : "";
                const subMetaHTML = (roomText || teacherText)
                    ? `<div class="unmarked-card-submeta">${roomText}${teacherText}</div>`
                    : "";

                cardsHTML += `
                    <div class="unmarked-lecture-card">
                        <div class="unmarked-card-info">
                            <div class="unmarked-card-date">${Utils.escapeHTML(dateLabel)} · ${Utils.escapeHTML(lec.dayName)}</div>
                            <div class="unmarked-card-meta">
                                <span class="att-type-badge">${Utils.escapeHTML(lec.type)}</span>
                                ${timeRange ? `<span>${Utils.escapeHTML(timeRange)}</span>` : ""}
                            </div>
                            ${subMetaHTML}
                        </div>
                        <button type="button" class="unmarked-mark-btn" onclick="window.markUnmarkedLecture('${lec.date}', '${lec.lectureId}')">Mark Now</button>
                    </div>
                `;
            }

            sectionsHTML += `
                <div class="unmarked-subject-section">
                    <div class="unmarked-subject-heading">
                        <span>${Utils.escapeHTML(grp.subject)}</span>
                        <span class="unmarked-subject-count">${subCountLabel}</span>
                    </div>
                    <div class="unmarked-card-list">
                        ${cardsHTML}
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <button type="button" class="detail-back-btn" onclick="window.closeUnmarkedLectures()">← Back to Attendance</button>
            <div class="unmarked-header-block">
                <h2 class="unmarked-page-title">Unmarked Lectures</h2>
                <p class="unmarked-page-sub">Past lectures without an attendance entry</p>
                <div class="unmarked-count-pill">⚠️ ${countBannerText}</div>
            </div>
            ${sectionsHTML}
        `;
    }
};

/* =============================================
   MODULE: ATTENDANCE MANAGER
   ============================================= */
const AttendanceManager = {
    getStatus: (profile, isoDate, item) => {
        const day = State.data.attendance[profile] && State.data.attendance[profile][isoDate];
        if (!day) return null;
        const rec = day[item.lectureId]; 
        return rec ? rec.status : null;
    },
    applyLocalDirect: (profile, isoDate, lectureId, record) => {
        if (!State.data.attendance[profile]) State.data.attendance[profile] = {};
        if (!State.data.attendance[profile][isoDate]) State.data.attendance[profile][isoDate] = {};
        if (!record) {
            delete State.data.attendance[profile][isoDate][lectureId];
            if (Object.keys(State.data.attendance[profile][isoDate]).length === 0) {
                delete State.data.attendance[profile][isoDate];
            }
        } else {
            State.data.attendance[profile][isoDate][lectureId] = Utils.deepClone(record);
        }
        localStorage.setItem(CONSTANTS.STORAGE.ATTENDANCE, JSON.stringify(State.data.attendance));
        OfflineDB.put("app_state", { key: "app_data", data: State.data, updatedAt: Utils.nowISO() });
    },
    setStatus: (profile, isoDate, item, status) => {
        if (!State.data.attendance[profile]) State.data.attendance[profile] = {};
        if (!State.data.attendance[profile][isoDate]) State.data.attendance[profile][isoDate] = {};
        const cid = item.lectureId;

        // Capture baseRecord from clean cloud snapshot for conflict detection
        const snapAtt = SyncManager.baseAppDataSnapshot && SyncManager.baseAppDataSnapshot.attendance;
        const baseRecord = (snapAtt && snapAtt[profile] && snapAtt[profile][isoDate] && snapAtt[profile][isoDate][cid])
            ? Utils.deepClone(snapAtt[profile][isoDate][cid])
            : null;

        let newRecord = null;
        if (status === null) {
            delete State.data.attendance[profile][isoDate][cid];
            if (Object.keys(State.data.attendance[profile][isoDate]).length === 0) {
                delete State.data.attendance[profile][isoDate];
            }
        } else {
            newRecord = {
                status,
                subject: item.subject,
                start: item.start,
                end: item.end,
                type: (item.type || "DSC").toUpperCase(),
                room: item.room || "",
                teacher: item.teacher || "",
                updatedAt: Utils.nowISO()
            };
            State.data.attendance[profile][isoDate][cid] = newRecord;
        }
        Storage.saveAttendance({
            profile,
            isoDate,
            lectureId: cid,
            newRecord,
            baseRecord
        });
    },
    quickMark: (dayKey, lectureId, status, btnEl) => {
        const ctx = Resolver.resolveAcademicContext(State.selectedDate);
        if (!ctx.period || !ctx.version || ctx.isHoliday || ctx.isExam) return;
        
        const item = ctx.dayData.find(i => i.lectureId === lectureId);
        if (!item || Utils.isBreakItem(item)) return;

        const cur = AttendanceManager.getStatus(State.currentProfile, State.selectedDate, item);
        const newStatus = (cur === status) ? null : status;
        AttendanceManager.setStatus(State.currentProfile, State.selectedDate, item, newStatus);

        const cardId = `card-${lectureId}`;
        const card = document.getElementById(cardId);
        if (card) {
            if (newStatus) card.setAttribute("data-status", newStatus);
            else card.removeAttribute("data-status");
            card.querySelectorAll(".action-btn").forEach(b => {
                b.classList.remove("selected");
                if (newStatus && (
                    (b.classList.contains("act-attend") && newStatus === "attended") ||
                    (b.classList.contains("act-miss") && newStatus === "missed") ||
                    (b.classList.contains("act-cancel") && newStatus === "cancelled")
                )) { b.classList.add("selected"); }
            });
            const right = card.querySelector(".card-right");
            if (right) {
                const old = right.querySelector(".status-badge");
                if (old) old.remove();
                if (newStatus) {
                    const labels = { attended: '✅', missed: '❌', cancelled: '🚫' };
                    const badge = document.createElement("span");
                    badge.className = `status-badge ${newStatus}`;
                    badge.textContent = labels[newStatus];
                    right.appendChild(badge);
                }
            }
        }
        if (State.currentTab === "attendance") AttendanceManager.renderAttendance();
    },
    normaliseSubject: (subject) => (subject || "").toLowerCase().replace(/\s*(tutorial|tute|g1|g2|g3|group\s*\d)\s*/gi, '').replace(/\s+/g, ' ').trim(),
    cleanSubjectTitle: (subject) => (subject || "").replace(/\s*(tutorial|tute|g1|g2|g3|group\s*\d)\s*/gi, ' ').replace(/\s+/g, ' ').trim() || (subject || "").trim(),
    calcMarks: (pct, type) => {
        const t = (type || "DSC").toUpperCase();
        if (["SEC", "PRACTICAL", "BREAK", "GE"].includes(t)) return null;
        let slabs = t === "DSC" ? [[85, 6], [75, 3.6], [70, 2.4], [67, 1.2], [0, 0]] :
                    t === "TUTORIAL" ? [[85, 5], [75, 3], [70, 2], [67, 1], [0, 0]] :
                    [[85, 2], [75, 1.6], [70, 1.2], [67, 0.8], [0, 0]];
        for (const [threshold, marks] of slabs) if (pct >= threshold) return marks;
        return 0;
    },
    getSubjectStats: () => {
        const profileLog = State.data.attendance[State.currentProfile] || {};
        const subjectMap = {};

        for (const iso in profileLog) {
            const dayRecords = profileLog[iso];
            for (const cid in dayRecords) {
                const rec = dayRecords[cid];
                if (!rec || !rec.subject) continue;
                const type = (rec.type || "DSC").toUpperCase();
                if (type === "BREAK") continue;
                const key = `${AttendanceManager.normaliseSubject(rec.subject)}__${type}`;
                if (!subjectMap[key]) subjectMap[key] = { subject: rec.subject, type, history: [] };
                subjectMap[key].history.push({
                    iso, item: { subject: rec.subject, start: rec.start, end: rec.end, type, room: rec.room || "", teacher: rec.teacher || "" }, status: rec.status,
                });
            }
        }

        const result = [];
        for (const key in subjectMap) {
            const { subject, type, history } = subjectMap[key];
            const attended = history.filter(h => h.status === "attended").length;
            const missed = history.filter(h => h.status === "missed").length;
            const total = attended + missed;
            const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
            const marks = AttendanceManager.calcMarks(pct, type);
            history.sort((a, b) => (a.iso === b.iso ? Utils.toMinutes(a.item.start) - Utils.toMinutes(b.item.start) : (a.iso < b.iso ? 1 : -1)));
            result.push({ subject, type, history, attended, missed, total, pct, marks, key });
        }
        result.sort((a, b) => a.subject.localeCompare(b.subject));
        return result;
    },
    getSmartInsight: (attended, total, pct, type) => {
        if (["SEC", "PRACTICAL", "GE"].includes((type || "").toUpperCase())) return { insight: "No marks tracked for this type.", risk: null, riskMsg: null };
        if (total === 0) return { insight: "No classes marked yet. Start marking attendance!", risk: null, riskMsg: null };

        const marksNow = AttendanceManager.calcMarks(pct, type);
        const pctMiss = Math.round((attended / (total + 1)) * 100);
        const marksMiss = AttendanceManager.calcMarks(pctMiss, type);
        const pctAtt = Math.round(((attended + 1) / (total + 1)) * 100);
        const marksAtt = AttendanceManager.calcMarks(pctAtt, type);

        let insight = null, risk = null, riskMsg = null;

        if (pct >= 85 && pctMiss >= 85) insight = "Safe to miss next class — you're in the top slab.";
        else if (marksMiss !== null && marksNow !== null && marksMiss < marksNow) {
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
            const boundaries = [67, 70, 75, 85].filter(b => b > pct);
            if (boundaries.length) {
                const next = boundaries[0];
                insight = `${next - pct}% away from ${next}% slab.`;
                if (next - pct <= 3) { risk = "warning"; riskMsg = `Only ${next - pct}% away from ${next}% boundary`; }
            } else {
                insight = "Top slab — great work! 🎉";
            }
        }
        return { insight, risk, riskMsg };
    },
    renderAttendance: () => {
        const container = document.getElementById("attendanceCards");
        if (!container) return;

        const unmarkedList = UnmarkedManager.getUnmarkedLectures();
        const bannerHTML = UnmarkedManager.renderBannerHTML(unmarkedList);

        const stats = AttendanceManager.getSubjectStats();
        if (stats.length === 0) {
            container.innerHTML = `
                ${bannerHTML}
                <div class="att-empty">
                    <span class="att-empty-emoji">📭</span>
                    <div class="att-empty-text">No attendance data yet.<br>Mark classes in the Schedule tab.</div>
                </div>
            `;
            return;
        }

        const subjectGroupsMap = {};
        stats.forEach((stat) => {
            const normKey = AttendanceManager.normaliseSubject(stat.subject) || stat.subject.toLowerCase();
            if (!subjectGroupsMap[normKey]) {
                subjectGroupsMap[normKey] = {
                    normKey,
                    displayName: AttendanceManager.cleanSubjectTitle(stat.subject),
                    items: []
                };
            }
            if (stat.type === "DSC" && stat.subject) {
                subjectGroupsMap[normKey].displayName = AttendanceManager.cleanSubjectTitle(stat.subject);
            }
            subjectGroupsMap[normKey].items.push(stat);
        });

        const typeOrder = { "DSC": 1, "GE": 2, "SEC": 3, "VAC": 4, "AEC": 5, "TUTORIAL": 6, "PRACTICAL": 7 };
        const groups = Object.values(subjectGroupsMap).sort((a, b) => a.displayName.localeCompare(b.displayName));

        let groupsHTML = "";
        groups.forEach((group) => {
            group.items.sort((a, b) => {
                const oa = typeOrder[a.type] || 99;
                const ob = typeOrder[b.type] || 99;
                if (oa !== ob) return oa - ob;
                return a.type.localeCompare(b.type);
            });

            const gridClass = group.items.length === 1 ? "att-type-grid single-type" : "att-type-grid";
            let subCardsHTML = "";

            group.items.forEach(({ type, total, attended, pct, marks, key }) => {
                const { risk } = AttendanceManager.getSmartInsight(attended, total, pct, type);
                const pctClass = total > 0 ? (pct >= 75 ? "safe" : pct >= 67 ? "warn" : "danger") : "none";
                const borderClass = total > 0 ? `${pctClass}-border` : "";
                const riskDotHTML = risk === "high-risk"
                    ? `<span class="att-subcard-risk-dot" title="High risk">🔴</span>`
                    : risk === "warning"
                    ? `<span class="att-subcard-risk-dot" title="Warning">⚠️</span>`
                    : "";

                const marksHTML = marks !== null
                    ? `<div class="att-subcard-marks">🎯 ${marks} marks</div>`
                    : `<div class="att-subcard-marks no-marks">No marks tracked</div>`;

                const safeKey = String(key).replace(/'/g, "\\'");

                subCardsHTML += `
                    <div class="att-type-subcard ${borderClass}" onclick="window.openSubjectDetail('${safeKey}')">
                        <div class="att-subcard-top">
                            <span class="att-type-badge ${Utils.escapeHTML(type)}">${Utils.escapeHTML(type)}</span>
                            ${riskDotHTML}
                        </div>
                        <div class="att-subcard-pct ${pctClass}">${total > 0 ? pct + '%' : '--'}</div>
                        <div class="att-subcard-footer">
                            <div class="att-subcard-count">${attended} attended / ${total} total</div>
                            ${marksHTML}
                        </div>
                    </div>
                `;
            });

            groupsHTML += `
                <section class="att-subject-group">
                    <div class="att-group-header">
                        <h3 class="att-group-title">${Utils.escapeHTML(group.displayName)}</h3>
                    </div>
                    <div class="${gridClass}">
                        ${subCardsHTML}
                    </div>
                </section>
            `;
        });

        container.innerHTML = `${bannerHTML}${groupsHTML}`;
    }
};

/* =============================================
   MODULE: SCHEDULE MANAGER (+ COLLAPSIBLE DEADLINES & TESTS STRIP)
   ============================================= */
const ScheduleManager = {
    toggleAcademicStrip: () => {
        State.scheduleStripExpanded = !State.scheduleStripExpanded;
        ScheduleManager.renderAcademicSummaryStrip();
    },

    /**
     * Renders the compact, collapsible "Upcoming Deadlines & Tests" summary card
     * at the top of the Schedule tab (directly below the week date strip), strictly scoped to `State.currentProfile`.
     */
    renderAcademicSummaryStrip: () => {
        const container = document.getElementById("scheduleAcademicSummary");
        if (!container) return;

        const today = Utils.todayISO();
        const next14 = Utils.addDays(today, 14);

        const activeTasks = TaskManager.getProfileTasks()
            .filter(t => t.status !== "completed" && t.due_date <= next14)
            .sort((a, b) => a.due_date.localeCompare(b.due_date));

        const upcomingAssessments = AssessmentManager.getProfileAssessments()
            .filter(a => !AssessmentManager.hasRecordedResult(a) && a.assessment_date >= today && a.assessment_date <= next14)
            .sort((a, b) => a.assessment_date.localeCompare(b.assessment_date));

        const overdueCount = activeTasks.filter(t => t.due_date < today).length;
        const dueTodayCount = activeTasks.filter(t => t.due_date === today).length +
                              upcomingAssessments.filter(a => a.assessment_date === today).length;

        if (activeTasks.length === 0 && upcomingAssessments.length === 0) {
            container.innerHTML = "";
            return;
        }

        let pillsHTML = "";
        if (overdueCount > 0) {
            pillsHTML += `<span class="sas-pill overdue">${overdueCount} Overdue</span>`;
        }
        if (dueTodayCount > 0) {
            pillsHTML += `<span class="sas-pill today">${dueTodayCount} Today</span>`;
        }
        if (activeTasks.length > 0 && overdueCount === 0 && dueTodayCount === 0) {
            pillsHTML += `<span class="sas-pill">${activeTasks.length} Task${activeTasks.length > 1 ? "s" : ""}</span>`;
        }
        if (upcomingAssessments.length > 0) {
            pillsHTML += `<span class="sas-pill exam">${upcomingAssessments.length} Exam${upcomingAssessments.length > 1 ? "s" : ""}</span>`;
        }

        // Combine top 4 most urgent items for expanded preview
        const combined = [
            ...activeTasks.map(t => ({
                kind: "task",
                id: t.id,
                title: t.title,
                subject: t.subject,
                date: t.due_date,
                subLabel: CONSTANTS.TASK_TYPES[t.task_type] || "Task"
            })),
            ...upcomingAssessments.map(a => ({
                kind: "assessment",
                id: a.id,
                title: a.title,
                subject: a.subject,
                date: a.assessment_date,
                subLabel: CONSTANTS.ASSESSMENT_TYPES[a.assessment_type] || "Exam"
            }))
        ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);

        const itemsHTML = combined.map(item => {
            const diff = Utils.daysBetween(today, item.date);
            let badgeClass = "ac-badge due-upcoming";
            let badgeText = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff < 0 ? `${Math.abs(diff)}d overdue` : `In ${diff}d`;
            if (diff < 0) badgeClass = "ac-badge due-overdue";
            else if (diff <= 1) badgeClass = "ac-badge due-today";

            const clickAction = item.kind === "task"
                ? `window.switchTab('tasks')`
                : `window.switchTab('assessments')`;

            return `
                <div class="sas-item" onclick="${clickAction}">
                    <div class="sas-item-left">
                        <div class="sas-item-title">${item.kind === "task" ? "📝" : "🎓"} ${Utils.escapeHTML(item.title)}</div>
                        <div class="sas-item-sub">${Utils.escapeHTML(item.subject)} · ${Utils.escapeHTML(item.subLabel)} · ${Utils.escapeHTML(Utils.shortDateLabel(Utils.isoToDate(item.date)))}</div>
                    </div>
                    <span class="sas-item-badge ${badgeClass}">${Utils.escapeHTML(badgeText)}</span>
                </div>
            `;
        }).join("");

        const urgentClass = overdueCount > 0 ? "has-overdue" : dueTodayCount > 0 ? "has-urgent" : "";
        const expandedClass = State.scheduleStripExpanded ? "expanded" : "";

        container.innerHTML = `
            <div class="schedule-academic-strip ${urgentClass} ${expandedClass}">
                <button type="button" class="sas-header" onclick="window.ScheduleManager.toggleAcademicStrip()" aria-expanded="${State.scheduleStripExpanded}">
                    <div class="sas-title-group">
                        <span class="sas-icon" aria-hidden="true">📌</span>
                        <span class="sas-title">Upcoming Deadlines &amp; Tests</span>
                        <div class="sas-pills">${pillsHTML}</div>
                    </div>
                    <span class="sas-chevron" aria-hidden="true">▼</span>
                </button>
                <div class="sas-body">
                    ${itemsHTML}
                    <div class="sas-footer-links">
                        <button type="button" class="sas-link-btn" onclick="window.switchTab('tasks')">View All Tasks (${activeTasks.length})</button>
                        <button type="button" class="sas-link-btn" onclick="window.switchTab('assessments')">View Tests &amp; Exams (${upcomingAssessments.length})</button>
                    </div>
                </div>
            </div>
        `;
    },

    renderDateStrip: () => {
        const tabsEl = document.getElementById("tabs");
        const titleEl = document.getElementById("dateStripTitle");
        if (!tabsEl) return;

        const selDate = Utils.isoToDate(State.selectedDate);
        const monday = Utils.mondayOfWeek(selDate);
        tabsEl.innerHTML = "";
        const todayIso = Utils.todayISO();

        for (let i = 0; i < 6; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const iso = Utils.dateToISO(d);
            const isToday = (iso === todayIso);
            const isActive = (iso === State.selectedDate);

            const btn = document.createElement("button");
            btn.dataset.iso = iso;
            btn.className = `${isActive ? "active " : ""}${isToday ? "is-today" : ""}`.trim();
            btn.innerHTML = `<span class="dt-day">${CONSTANTS.DAY_NAMES[i]}</span><span class="dt-date">${Utils.shortDateLabel(d)}</span>`;
            btn.onclick = () => UI.selectDate(iso);
            tabsEl.appendChild(btn);
        }

        if (titleEl) {
            const sat = new Date(monday); sat.setDate(monday.getDate() + 5);
            const sameMonth = monday.getMonth() === sat.getMonth();
            const range = sameMonth
                ? `${monday.getDate()}–${sat.getDate()} ${CONSTANTS.MONTH_NAMES_SHORT[monday.getMonth()]}`
                : `${monday.getDate()} ${CONSTANTS.MONTH_NAMES_SHORT[monday.getMonth()]} – ${sat.getDate()} ${CONSTANTS.MONTH_NAMES_SHORT[sat.getMonth()]}`;
            const yearTxt = monday.getFullYear() !== sat.getFullYear() ? `${monday.getFullYear()}/${sat.getFullYear()}` : `${monday.getFullYear()}`;
            titleEl.textContent = `Week of ${range}, ${yearTxt}`;
        }

        ScheduleManager.renderAcademicSummaryStrip();
    },
    renderScheduleForSelected: (direction = null) => {
        const container = document.getElementById("schedule");
        if (!container) return;
        const ctx = Resolver.resolveAcademicContext(State.selectedDate);
        
        UI.updateHeaderLabels(ctx);
        UI.triggerFabVisibility(ctx);
        ScheduleManager.renderAcademicSummaryStrip();

        const viewingToday = State.selectedDate === Utils.todayISO();

        if (direction) {
            const outClass = direction === "left" ? "slide-out-left" : "slide-out-right";
            container.classList.add(outClass);
            setTimeout(() => {
                container.classList.remove(outClass);
                const inClass = direction === "left" ? "slide-in-left" : "slide-in-right";
                container.classList.add(inClass);
                ScheduleManager.renderSchedule(container, ctx, viewingToday);
                requestAnimationFrame(() => requestAnimationFrame(() => container.classList.remove(inClass)));
            }, 180);
        } else {
            ScheduleManager.renderSchedule(container, ctx, viewingToday);
        }
    },
    renderSchedule: (container, ctx, viewingToday) => {
        container.innerHTML = "";
        const dayKey = Utils.dayKeyFromISO(State.selectedDate);
        
        if (ctx.isHoliday) {
            const subText = ctx.type === "Vacation" ? "Enjoy your holidays.<br>No classes scheduled." : "No scheduled classes.";
            container.innerHTML = `
                <div class="sleep" style="padding-top:40px">
                    <span class="sleep-emoji">${CONSTANTS.PERIOD_TYPES[ctx.type]}</span>
                    <div class="sleep-title">${Utils.escapeHTML(ctx.period.name)}</div>
                    <div class="sleep-sub" style="margin-top:12px; font-weight:600">${subText}</div>
                </div>`;
            ScheduleManager.updatePopup(null, ctx);
            return;
        }
        
        if (ctx.isExam && (!ctx.dayData || ctx.dayData.length === 0)) {
            container.innerHTML = `
                <div class="sleep" style="padding-top:40px">
                    <span class="sleep-emoji">${CONSTANTS.PERIOD_TYPES["Exam Period"]}</span>
                    <div class="sleep-title">${Utils.escapeHTML(ctx.period.name)}</div>
                    <div class="sleep-sub" style="margin-top:12px; font-weight:600">No lectures scheduled.</div>
                </div>`;
            ScheduleManager.updatePopup(null, ctx);
            return;
        }

        if (!ctx.period) {
            container.innerHTML = `
                <div class="sleep" style="padding-top:40px">
                    <span class="sleep-emoji">📅</span>
                    <div class="sleep-title">No Academic Period</div>
                    <div class="sleep-sub" style="margin-top:12px; font-weight:600">Create an academic period in the Timeline Manager<br>to view and add classes.</div>
                </div>`;
            ScheduleManager.updatePopup(null, ctx);
            return;
        }

        if (!ctx.dayData || ctx.dayData.length === 0) {
            container.innerHTML = `
                <div class="sleep">
                    <span class="sleep-emoji">😴</span>
                    <div class="sleep-title">Rest Day!</div>
                    <div class="sleep-sub">No classes on this day. Tap ＋ to add one.</div>
                </div>`;
            ScheduleManager.updatePopup(null, ctx);
            return;
        }

        const now = Utils.getNowMins();
        let nextClassTime = null, currentCardId = null;

        const sortedData = [...ctx.dayData].sort((a,b) => Utils.toMinutes(a.start) - Utils.toMinutes(b.start));

        sortedData.forEach((item) => {
            if (!item.lectureId) item.lectureId = Utils.generateId("lec");
            const lectureId = item.lectureId;
            const startMin = Utils.toMinutes(item.start);
            const endMin = Utils.toMinutes(item.end);
            const isCurrent = Utils.isLectureLive(item, State.currentProfile, State.selectedDate);
            const isBreakCard = Utils.isBreakItem(item);
            const cardId = `card-${lectureId}`;

            if (viewingToday && startMin > now && nextClassTime === null && !isBreakCard) nextClassTime = startMin;
            if (isCurrent) currentCardId = cardId;

            const type = (item.type || "DSC").toUpperCase();
            const tagLabel = isCurrent ? "live" : Utils.escapeHTML(type);
            const tagText = isCurrent ? '<span class="live-dot"></span>LIVE' : Utils.escapeHTML(type);
            const extraClass = isBreakCard ? " break-card" : "";
            const roomChip = !isBreakCard && Utils.isValid(item.room) ? `<span class="room">📍 ${Utils.escapeHTML(item.room)}</span>` : '';
            const teacherChip = !isBreakCard && Utils.isValid(item.teacher) ? `<span class="teacher">👤 ${Utils.escapeHTML(item.teacher)}</span>` : '';
            const bottomRow = (roomChip || teacherChip) ? `<div class="bottomRow">${roomChip}${teacherChip}</div>` : '';

            let progressHTML = '';
            if (isCurrent) {
                const pct = Math.min(100, Math.max(0, ((now - startMin) / (endMin - startMin || 60)) * 100));
                progressHTML = `<div class="progress-overlay" style="--pct:${pct}%"></div>`;
            }

            const timeDisplay = Utils.formatTimeRange(item.start, item.end);
            const status = isBreakCard ? null : AttendanceManager.getStatus(State.currentProfile, State.selectedDate, item);
            let statusBadge = '';
            if (!isBreakCard && status && !ctx.isExam) {
                const labels = { attended: '✅', missed: '❌', cancelled: '🚫' };
                statusBadge = `<span class="status-badge ${status}">${labels[status] || ''}</span>`;
            }

            let actionsHTML = '';
            if (!isBreakCard && !ctx.isExam) {
                const aActive = status === "attended" ? " selected" : "";
                const mActive = status === "missed" ? " selected" : "";
                const cActive = status === "cancelled" ? " selected" : "";
                actionsHTML = `
                    <div class="card-actions" onclick="event.stopPropagation()">
                        <button class="action-btn act-attend${aActive}" onclick="window.quickMark('${dayKey}','${lectureId}','attended',this)" aria-label="Mark Attended">✅</button>
                        <button class="action-btn act-miss${mActive}" onclick="window.quickMark('${dayKey}','${lectureId}','missed',this)" aria-label="Mark Missed">❌</button>
                        <button class="action-btn act-cancel${cActive}" onclick="window.quickMark('${dayKey}','${lectureId}','cancelled',this)" aria-label="Mark Cancelled">🚫</button>
                    </div>`;
            }

            container.innerHTML += `
                <div id="${cardId}" class="card${isCurrent ? ' current' : ''}${extraClass}" ${status ? `data-status="${status}"` : ''} onclick="window.openModal('${dayKey}', '${lectureId}')">
                    ${progressHTML}
                    <div class="time">${Utils.escapeHTML(timeDisplay)}</div>
                    <div class="divider"></div>
                    <div class="content">
                        <div class="subject">${Utils.escapeHTML(item.subject)}</div>
                        ${bottomRow}
                        ${actionsHTML}
                    </div>
                    <div class="card-right">
                        <span class="tag ${tagLabel}">${tagText}</span>
                        ${statusBadge}
                    </div>
                </div>`;
        });

        if (currentCardId) {
            const el = document.getElementById(currentCardId);
            if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
        }
        ScheduleManager.updatePopup(nextClassTime, ctx);
    },
    updatePopup: (nextClassTime, ctx) => {
        const popup = document.getElementById("nextClassPopup");
        if (!popup) return;
        const text = popup.querySelector(".popup-text");
        const icon = popup.querySelector(".popup-icon");
        const viewingToday = State.selectedDate === Utils.todayISO();

        if (viewingToday) {
            if (nextClassTime !== null) {
                const diff = nextClassTime - Utils.getNowMins();
                text.textContent = diff <= 0 ? "Class starting now!" : `Next class in ${Utils.formatTimeDiff(diff)}`;
                icon.textContent = "⏳";
            } else {
                text.textContent = "No more classes today!";
                icon.textContent = "🎉";
            }
        } else {
            let firstClass = null;
            if (ctx.period && !ctx.isHoliday) {
                firstClass = ctx.dayData.find(item => !Utils.isBreakItem(item));
            }
            if (firstClass) {
                text.textContent = `${Utils.shortDateLabel(Utils.isoToDate(State.selectedDate))}: First class at ${Utils.formatDisplayTime(firstClass.start)}`;
                icon.textContent = "📅";
            } else {
                text.textContent = `No classes on ${Utils.shortDateLabel(Utils.isoToDate(State.selectedDate))}`;
                icon.textContent = "😴";
            }
        }
    }
};

/* =============================================
   MODULE: TIMELINE MANAGER
   ============================================= */
const TimelineManager = {
    renderTimeline: () => {
        const container = document.getElementById("timelineCards");
        if (!container) return;

        const header = document.querySelector("#tab-timeline .flex.items-center.justify-between");
        if (header && !document.getElementById("btnExport")) {
            header.innerHTML = `
                <h2 class="font-display text-xl text-navy">Academic Timeline</h2>
                <div class="flex gap-2">
                    <button class="cal-today-btn" style="padding: 6px 14px; border-color:var(--green); color:var(--green)" id="btnImport" onclick="window.importData()">📥 Import</button>
                    <button class="cal-today-btn" style="padding: 6px 14px" id="btnExport" onclick="window.exportData()">📤 Export</button>
                    <button class="cal-today-btn" style="padding: 6px 14px" onclick="window.openPeriodModal()">+ Add</button>
                </div>
            `;
        }

        container.innerHTML = "";
        const activePeriods = State.data.timeline.filter(p => !p.archived);
        
        if (activePeriods.length === 0) {
            container.innerHTML = `<div class="att-empty" style="padding:40px 10px;"><span class="att-empty-emoji">🗓️</span><div class="att-empty-text">No active academic periods.<br>Add one to start scheduling.</div></div>`;
            return;
        }

        activePeriods.forEach((period) => {
            const icon = CONSTANTS.PERIOD_TYPES[period.type] || "📅";
            const startStr = Utils.shortDateLabel(Utils.isoToDate(period.startDate));
            const endStr = Utils.shortDateLabel(Utils.isoToDate(period.endDate));
            
            let versionsHTML = '';
            if (period.versions && period.versions.length > 0) {
                versionsHTML = `<div class="mt-3 border-t border-gray-100 pt-3">
                    <div class="text-[0.75rem] font-bold tracking-widest uppercase text-gray-400 mb-2 flex justify-between items-center">
                        Versions
                        <button class="text-navy font-bold hover:underline" onclick="VersionManager.open('${period.id}')">Manage</button>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        ${period.versions.map(v => `
                            <div class="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                <span class="text-sm font-semibold text-gray-700">${Utils.escapeHTML(v.name)}</span>
                                <span class="text-xs text-gray-500 font-medium">${Utils.shortDateLabel(Utils.isoToDate(v.startDate))} – ${Utils.shortDateLabel(Utils.isoToDate(v.endDate))}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            }

            container.innerHTML += `
                <div class="att-subject-card" style="padding:16px; margin-bottom:12px;">
                    <div class="flex justify-between items-start mb-1">
                        <div class="font-bold text-lg text-gray-900 leading-tight">${Utils.escapeHTML(period.name)}</div>
                        <span class="att-type-badge timeline-tag">${Utils.escapeHTML(period.type)} ${icon}</span>
                    </div>
                    <div class="text-[0.82rem] text-gray-500 font-semibold tracking-wide">${startStr} – ${endStr}</div>
                    
                    <div class="flex gap-2 flex-wrap mt-3">
                        <button class="action-btn" onclick="window.openPeriodModal('${period.id}')">✏️ Edit Period</button>
                        <div class="ml-auto flex gap-1">
                            <button class="action-btn act-miss" style="padding: 5px 10px; margin-left: 4px;" onclick="window.archivePeriod('${period.id}')">📦 Archive</button>
                        </div>
                    </div>
                    
                    ${versionsHTML}
                </div>
            `;
        });
    },
    openPeriodModal: (editId = null) => {
        const overlay = document.getElementById("periodModal");
        if (!overlay) return;
        State.editingPeriodId = editId;

        const title = document.getElementById("pmTitle");
        const dupContainer = document.getElementById("pmDupContainer");
        const dupSelect = document.getElementById("pmDuplicate");
        
        dupSelect.innerHTML = `<option value="">-- Blank Timetable --</option>`;
        State.data.timeline.filter(p => !p.archived).forEach(p => {
            if (editId !== p.id) dupSelect.innerHTML += `<option value="${p.id}">${Utils.escapeHTML(p.name)}</option>`;
        });

        if (editId) {
            const p = State.data.timeline.find(t => t.id === editId);
            title.textContent = "Edit Period";
            document.getElementById("pmName").value = p.name;
            document.getElementById("pmType").value = p.type;
            document.getElementById("pmStart").value = p.startDate;
            document.getElementById("pmEnd").value = p.endDate;
            dupContainer.style.display = "none";
        } else {
            title.textContent = "Add Academic Period";
            document.getElementById("pmName").value = "";
            document.getElementById("pmType").value = "Semester";
            document.getElementById("pmStart").value = Utils.todayISO();
            document.getElementById("pmEnd").value = "";
            dupContainer.style.display = "";
            dupSelect.value = "";
        }

        document.getElementById("pmHint").textContent = "";
        overlay.style.display = "flex";
        requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("open", "visible")));
    },
    savePeriod: () => {
        const name = document.getElementById("pmName").value.trim();
        const type = document.getElementById("pmType").value;
        const start = document.getElementById("pmStart").value;
        const end = document.getElementById("pmEnd").value;
        const hint = document.getElementById("pmHint");

        if (!name) { hint.textContent = "Period name is required."; return; }
        if (!start || !end) { hint.textContent = "Start and End dates are required."; return; }
        if (start > end) { hint.textContent = "Start date cannot be after end date."; return; }

        if (State.editingPeriodId) {
            const p = State.data.timeline.find(t => t.id === State.editingPeriodId);
            if (p) {
                p.name = name; p.type = type; p.startDate = start; p.endDate = end;
                Validation.fixVersionBoundaries(p);
            }
        } else {
            let newVersions = [{
                id: Utils.generateId("v"),
                name: "Version 1",
                startDate: start,
                endDate: end,
                timetables: Utils.createEmptyTimetables()
            }];
            const dupSourceId = document.getElementById("pmDuplicate").value;
            if (dupSourceId) {
                const src = State.data.timeline.find(t => t.id === dupSourceId);
                if (src && src.versions.length > 0) {
                    const copied = Utils.deepClone(src.versions[src.versions.length-1].timetables);
                    Utils.regenerateLectureIds(copied);
                    newVersions[0].timetables = copied;
                }
            }
            State.data.timeline.push({
                id: Utils.generateId("p"),
                name: name, type: type, startDate: start, endDate: end, archived: false, versions: newVersions
            });
        }

        if (Storage.saveTimeline()) {
            TimelineManager.renderTimeline();
            if (State.currentTab === "schedule") {
                ScheduleManager.renderDateStrip();
                ScheduleManager.renderScheduleForSelected();
            }
            document.getElementById("periodModal").classList.remove("visible");
            setTimeout(() => { document.getElementById("periodModal").style.display = "none"; }, 220);
        }
    }
};

/* =============================================
   MODULE: VERSION MANAGER
   ============================================= */
const VersionManager = {
    open: (periodId) => {
        State.versionManager.periodId = periodId;
        VersionManager.renderList();
        const overlay = document.getElementById("versionManagerModal");
        if (!overlay) return;
        overlay.style.display = "flex";
        requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("open", "visible")));
    },
    close: () => {
        const overlay = document.getElementById("versionManagerModal");
        if (!overlay) return;
        overlay.classList.remove("visible");
        setTimeout(() => { overlay.classList.remove("open"); overlay.style.display = "none"; }, 220);
    },
    renderList: () => {
        const p = State.data.timeline.find(t => t.id === State.versionManager.periodId);
        if (!p) return VersionManager.close();

        document.getElementById("vmTitle").textContent = `${p.name} Versions`;
        const body = document.getElementById("vmBody");
        
        let html = `<div class="flex flex-col gap-3">`;
        p.versions.forEach((v) => {
            html += `
                <div class="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                    <div class="flex justify-between items-start mb-2">
                        <div class="font-bold text-gray-900">${Utils.escapeHTML(v.name)}</div>
                        <div class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            ${Utils.shortDateLabel(Utils.isoToDate(v.startDate))} – ${Utils.shortDateLabel(Utils.isoToDate(v.endDate))}
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button class="text-xs font-bold text-navy hover:underline px-2 py-1 bg-blue-50 rounded" onclick="VersionManager.rename('${v.id}')">Rename</button>
                        <button class="text-xs font-bold text-red-600 hover:underline px-2 py-1 bg-red-50 rounded ml-auto" onclick="VersionManager.delete('${v.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;

        body.innerHTML = html;
        document.getElementById("vmFooter").innerHTML = `
            <button class="modal-btn save-btn w-full mt-2" onclick="VersionManager.showCreateForm()">＋ Create Version</button>
        `;
    },
    showCreateForm: () => {
        const p = State.data.timeline.find(t => t.id === State.versionManager.periodId);
        document.getElementById("vmTitle").textContent = `Create New Version`;
        
        let opts = '';
        p.versions.forEach(v => { opts += `<option value="${v.id}">${Utils.escapeHTML(v.name)}</option>`; });

        document.getElementById("vmBody").innerHTML = `
            <div class="modal-field mb-3">
                <label>Version Name</label>
                <input type="text" id="vmNewName" placeholder="e.g. Mid-Sem Revision">
            </div>
            <div class="modal-field mb-3">
                <label>Start Date</label>
                <input type="date" id="vmNewStart" min="${p.startDate}" max="${p.endDate}">
                <div class="hint text-gray-500 mt-1 text-xs">Previous version will automatically end the day before.</div>
            </div>
            <div class="modal-field mb-3">
                <label>Copy Timetable From</label>
                <select id="vmNewCopy">${opts}</select>
            </div>
            <div class="modal-hint text-red-500 text-xs font-semibold" id="vmFormHint"></div>
        `;
        document.getElementById("vmFooter").innerHTML = `
            <button class="modal-btn save-btn" onclick="VersionManager.submitCreate()">💾 Create</button>
            <button class="modal-btn cancel-btn" onclick="VersionManager.renderList()">Back</button>
        `;
    },
    submitCreate: () => {
        const p = State.data.timeline.find(t => t.id === State.versionManager.periodId);
        const name = document.getElementById("vmNewName").value.trim();
        const start = document.getElementById("vmNewStart").value;
        const copyId = document.getElementById("vmNewCopy").value;
        const hint = document.getElementById("vmFormHint");

        if (!name || !start || !copyId) { hint.textContent = "All fields required."; return; }
        if (start <= p.startDate || start > p.endDate) { hint.textContent = `Date must be between ${p.startDate} and ${p.endDate}`; return; }
        
        const overlappingVersion = p.versions.find(v => start >= v.startDate && start <= v.endDate);
        if (!overlappingVersion) { hint.textContent = "Invalid date alignment."; return; }
        if (start === overlappingVersion.startDate) { hint.textContent = "A version already starts on this date."; return; }

        const copySource = p.versions.find(v => v.id === copyId);
        const prevEndDate = Utils.addDays(start, -1);
        
        const copiedTimetables = Utils.deepClone(copySource.timetables);
        Utils.regenerateLectureIds(copiedTimetables);

        const newVersion = {
            id: Utils.generateId("v"),
            name: name,
            startDate: start,
            endDate: overlappingVersion.endDate,
            timetables: copiedTimetables
        };

        overlappingVersion.endDate = prevEndDate;
        p.versions.push(newVersion);
        p.versions.sort((a,b) => a.startDate.localeCompare(b.startDate));

        if (Storage.saveTimeline()) {
            TimelineManager.renderTimeline();
            if (State.currentTab === "schedule") ScheduleManager.renderScheduleForSelected();
            VersionManager.renderList();
        }
    },
    delete: (vId) => {
        const p = State.data.timeline.find(t => t.id === State.versionManager.periodId);
        if (p.versions.length <= 1) {
            UI.showAlert("Cannot delete the only version. Edit the period dates instead.");
            return;
        }

        UI.showConfirm("Are you sure you want to delete this version? The timeline will automatically merge to cover the gap.", () => {
            const vIndex = p.versions.findIndex(v => v.id === vId);
            const deleted = p.versions[vIndex];
            
            if (vIndex > 0) {
                p.versions[vIndex - 1].endDate = deleted.endDate;
            } else if (vIndex === 0) {
                p.versions[vIndex + 1].startDate = deleted.startDate;
            }
            
            p.versions.splice(vIndex, 1);
            if (Storage.saveTimeline()) {
                TimelineManager.renderTimeline();
                if (State.currentTab === "schedule") ScheduleManager.renderScheduleForSelected();
                VersionManager.renderList();
            }
        });
    },
    rename: (vId) => {
        const p = State.data.timeline.find(t => t.id === State.versionManager.periodId);
        const v = p.versions.find(x => x.id === vId);
        
        document.getElementById("vmTitle").textContent = `Rename Version`;
        document.getElementById("vmBody").innerHTML = `
            <div class="modal-field mb-3">
                <label>New Name</label>
                <input type="text" id="vmRenameInput" value="${Utils.escapeHTML(v.name)}">
            </div>
            <div class="modal-hint text-red-500 text-xs font-semibold" id="vmFormHint"></div>
        `;
        document.getElementById("vmFooter").innerHTML = `
            <button class="modal-btn save-btn" onclick="VersionManager.submitRename('${vId}')">💾 Save</button>
            <button class="modal-btn cancel-btn" onclick="VersionManager.renderList()">Cancel</button>
        `;
    },
    submitRename: (vId) => {
        const p = State.data.timeline.find(t => t.id === State.versionManager.periodId);
        const v = p.versions.find(x => x.id === vId);
        const newName = document.getElementById("vmRenameInput").value.trim();
        
        if (!newName) { document.getElementById("vmFormHint").textContent = "Name cannot be empty."; return; }
        
        v.name = newName;
        if (Storage.saveTimeline()) {
            TimelineManager.renderTimeline();
            VersionManager.renderList();
        }
    }
};

/* =============================================
   MODULE: MODAL (LECTURE EDITOR)
   ============================================= */
const ModalManager = {
    openModal: (dayKey, lectureId) => {
        const ctx = Resolver.resolveAcademicContext(State.selectedDate);
        if (!ctx.period || !ctx.version) return;
        const item = ctx.dayData.find(i => i.lectureId === lectureId);
        if (!item) return;

        State.modal = { mode: "view", dayKey, lectureId, periodId: ctx.period.id, versionId: ctx.version.id };
        
        document.getElementById("modalTitle").textContent = "Class Details";
        if (Utils.isBreakItem(item)) item.subject = item.subject || "Break";

        document.getElementById("edit-subject").value = item.subject || "";
        document.getElementById("edit-start").value = item.start || "";
        document.getElementById("edit-end").value = item.end || "";
        document.getElementById("edit-room").value = item.room || "";
        document.getElementById("edit-teacher").value = item.teacher || "";
        
        const validTypes = ["DSC","SEC","VAC","AEC","GE","TUTORIAL","PRACTICAL","BREAK"];
        const typeVal = (item.type || "DSC").toUpperCase();
        document.getElementById("editTag").value = validTypes.includes(typeVal) ? typeVal : "DSC";

        ModalManager.updateBreakState(Utils.isBreakItem(item), true);
        ModalManager.setReadonly(true);
        document.getElementById("editToggleBtn").style.display = "";
        document.getElementById("saveBtn").style.display = "none";
        document.getElementById("cancelBtn").style.display = "none";
        document.getElementById("deleteBtn").style.display = "none";
        document.getElementById("modalHint").textContent = "";

        ModalManager.show();
    },
    openAddModal: () => {
        const ctx = Resolver.resolveAcademicContext(State.selectedDate);
        if (!ctx.period || !ctx.version || ctx.isHoliday || ctx.isExam) return;

        State.modal = { mode: "add", dayKey: Utils.dayKeyFromISO(State.selectedDate), lectureId: null, periodId: ctx.period.id, versionId: ctx.version.id };
        document.getElementById("modalTitle").textContent = `New Lecture · ${CONSTANTS.DAY_NAMES[CONSTANTS.DAY_KEYS.indexOf(State.modal.dayKey)]} ${Utils.shortDateLabel(Utils.isoToDate(State.selectedDate))}`;

        ["edit-subject","edit-start","edit-end","edit-room","edit-teacher"].forEach(id => document.getElementById(id).value = "");
        document.getElementById("editTag").value = "DSC";

        ModalManager.updateBreakState(false, false);
        ModalManager.setReadonly(false);
        document.getElementById("editToggleBtn").style.display = "none";
        document.getElementById("saveBtn").style.display = "";
        document.getElementById("cancelBtn").style.display = "";
        document.getElementById("deleteBtn").style.display = "none";
        document.getElementById("modalHint").textContent = "";

        ModalManager.show();
        setTimeout(() => document.getElementById("edit-subject").focus(), 250);
    },
    show: () => {
        UI.updateSubjectDatalist();
        const overlay = document.getElementById("editModal");
        if (!overlay) return;
        overlay.style.display = "flex";
        requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("open", "visible")));
    },
    close: () => {
        const overlay = document.getElementById("editModal");
        if (!overlay) return;
        overlay.classList.remove("visible");
        setTimeout(() => { overlay.classList.remove("open"); overlay.style.display = "none"; }, 220);
    },
    setReadonly: (val) => {
        ["edit-subject","edit-start","edit-end","edit-room","edit-teacher"].forEach(id => {
            const el = document.getElementById(id);
            if (el) { if (val) el.setAttribute("readonly", true); else el.removeAttribute("readonly"); }
        });
        const tagEl = document.getElementById("editTag");
        if (tagEl) tagEl.disabled = val;
    },
    updateBreakState: (isBreak, readonly) => {
        const roomF = document.getElementById("edit-room").closest(".modal-field") || document.getElementById("edit-room").parentElement;
        const teachF = document.getElementById("edit-teacher").closest(".modal-field") || document.getElementById("edit-teacher").parentElement;
        const subjE = document.getElementById("edit-subject");

        if (isBreak) {
            if (roomF) roomF.style.display = "none";
            if (teachF) teachF.style.display = "none";
            if (subjE) subjE.classList.add("break-locked");
        } else {
            if (roomF) roomF.style.display = "";
            if (teachF) teachF.style.display = "";
            if (subjE) {
                subjE.classList.remove("break-locked");
                if (!readonly) {
                    document.getElementById("edit-room").removeAttribute("readonly");
                    document.getElementById("edit-teacher").removeAttribute("readonly");
                }
            }
        }
    },
    toggleEdit: () => {
        State.modal.mode = "edit";
        State.modal.originalValues = {
            subject: document.getElementById("edit-subject").value,
            start: document.getElementById("edit-start").value,
            end: document.getElementById("edit-end").value,
            room: document.getElementById("edit-room").value,
            teacher: document.getElementById("edit-teacher").value,
            type: document.getElementById("editTag").value
        };
        ModalManager.setReadonly(false);
        const isBreak = document.getElementById("editTag").value === "BREAK";
        ModalManager.updateBreakState(isBreak, false);
        if (isBreak) document.getElementById("edit-subject").setAttribute("readonly", true);
        
        document.getElementById("editToggleBtn").style.display = "none";
        document.getElementById("saveBtn").style.display = "";
        document.getElementById("cancelBtn").style.display = "";
        document.getElementById("deleteBtn").style.display = "";
    },
    cancelEdit: () => {
        if (State.modal.mode === "add") { ModalManager.close(); return; }
        document.getElementById("edit-subject").value = State.modal.originalValues.subject;
        document.getElementById("edit-start").value = State.modal.originalValues.start;
        document.getElementById("edit-end").value = State.modal.originalValues.end;
        document.getElementById("edit-room").value = State.modal.originalValues.room;
        document.getElementById("edit-teacher").value = State.modal.originalValues.teacher;
        document.getElementById("editTag").value = State.modal.originalValues.type || "DSC";
        
        ModalManager.updateBreakState(State.modal.originalValues.type === "BREAK", true);
        ModalManager.setReadonly(true);
        State.modal.mode = "view";
        document.getElementById("editToggleBtn").style.display = "";
        document.getElementById("saveBtn").style.display = "none";
        document.getElementById("cancelBtn").style.display = "none";
        document.getElementById("deleteBtn").style.display = "none";
        document.getElementById("modalHint").textContent = "";
    },
    saveEdit: () => {
        const hint = document.getElementById("modalHint");
        const type = document.getElementById("editTag").value;
        const isBreak = type === "BREAK";
        const subject = isBreak ? "Break" : document.getElementById("edit-subject").value.trim();
        const start = document.getElementById("edit-start").value.trim();
        const end = document.getElementById("edit-end").value.trim();
        const room = isBreak ? "" : document.getElementById("edit-room").value.trim();
        const teacher = isBreak ? "" : document.getElementById("edit-teacher").value.trim();

        if (!isBreak && !subject) { hint.textContent = "Subject cannot be empty."; return; }
        const timeRe = /^\d{1,2}:\d{2}$/;
        if (!timeRe.test(start)) { hint.textContent = "Start time must be HH:MM."; return; }
        if (!timeRe.test(end)) { hint.textContent = "End time must be HH:MM."; return; }
        if (Utils.toMinutes(end) <= Utils.toMinutes(start)) { hint.textContent = "End must be after start."; return; }

        const p = State.data.timeline.find(t => t.id === State.modal.periodId);
        if (!p) { ModalManager.close(); return; }
        const targetVersion = p.versions.find(v => v.id === State.modal.versionId);
        if (!targetVersion) return;

        const arr = targetVersion.timetables[State.currentProfile][State.modal.dayKey] = targetVersion.timetables[State.currentProfile][State.modal.dayKey] || [];

        const newStartMins = Utils.toMinutes(start);
        const newEndMins = Utils.toMinutes(end);
        const hasOverlap = arr.some((existingItem) => {
            if (State.modal.mode === "edit" && existingItem.lectureId === State.modal.lectureId) return false;
            const exStart = Utils.toMinutes(existingItem.start);
            const exEnd = Utils.toMinutes(existingItem.end);
            return (newStartMins < exEnd && newEndMins > exStart);
        });

        if (hasOverlap) {
            hint.textContent = "Time overlaps with an existing schedule item.";
            return;
        }

        if (State.modal.mode === "add") {
            const newItem = { 
                lectureId: Utils.generateId("lec"),
                subject, start, end, type 
            };
            if (!isBreak) { if (room) newItem.room = room; if (teacher) newItem.teacher = teacher; }
            arr.push(newItem);
        } else {
            const item = arr.find(i => i.lectureId === State.modal.lectureId);
            if (!item) { ModalManager.close(); return; }
            item.subject = subject; item.start = start; item.end = end; item.type = type;
            if (!isBreak) {
                if (room) item.room = room; else delete item.room;
                if (teacher) item.teacher = teacher; else delete item.teacher;
            } else { delete item.room; delete item.teacher; }
        }

        arr.sort((a,b) => Utils.toMinutes(a.start) - Utils.toMinutes(b.start));
        
        if (Storage.saveTimeline()) {
            ScheduleManager.renderScheduleForSelected();
            ModalManager.close();
        }
    },
    deleteLecture: () => {
        if (State.modal.mode === "add" || !State.modal.lectureId) { ModalManager.close(); return; }
        const p = State.data.timeline.find(t => t.id === State.modal.periodId);
        if (!p) return;
        const targetVersion = p.versions.find(v => v.id === State.modal.versionId);
        if (!targetVersion) return;

        const arr = targetVersion.timetables[State.currentProfile][State.modal.dayKey];
        if (!arr) return;

        UI.showConfirm("Delete this lecture from this version?\n\nNote: Past attendance history is permanently preserved.", () => {
            const idx = arr.findIndex(i => i.lectureId === State.modal.lectureId);
            if (idx !== -1) arr.splice(idx, 1);
            if (Storage.saveTimeline()) {
                ScheduleManager.renderScheduleForSelected();
                ModalManager.close();
            }
        });
    }
};

/* =============================================
   MODULE: CALENDAR MANAGER
   ============================================= */
const CalendarManager = {
    render: () => {
        const titleEl = document.getElementById("calTitle");
        const grid = document.getElementById("calGrid");
        if (!titleEl || !grid || !State.calMonth) return;
        const { year, month } = State.calMonth;
        titleEl.textContent = `${CONSTANTS.MONTH_NAMES[month]} ${year}`;

        const first = new Date(year, month, 1);
        const startDow = first.getDay(); 
        const daysInMonth = new Date(year, month+1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();

        const todayIso = Utils.todayISO();
        const profileLog = State.data.attendance[State.currentProfile] || {};

        let cells = [];
        for (let i = startDow - 1; i >= 0; i--) cells.push({ d: new Date(year, month - 1, prevMonthDays - i), muted: true });
        for (let day = 1; day <= daysInMonth; day++) cells.push({ d: new Date(year, month, day), muted: false });
        while (cells.length % 7 !== 0 || cells.length < 42) {
            const last = cells[cells.length - 1].d;
            const next = new Date(last); next.setDate(last.getDate() + 1);
            cells.push({ d: next, muted: next.getMonth() !== month });
            if (cells.length >= 42) break;
        }

        grid.innerHTML = "";
        cells.forEach(({ d, muted }) => {
            const iso = Utils.dateToISO(d);
            const hasData = !!profileLog[iso] && Object.keys(profileLog[iso]).length > 0;
            const btn = document.createElement("button");
            btn.className = `cal-day${muted ? " muted" : ""}${iso === todayIso ? " today" : ""}${iso === State.selectedDate ? " selected" : ""}${hasData ? " has-data" : ""}`;
            btn.textContent = d.getDate();
            btn.onclick = () => {
                UI.selectDate(iso);
                CalendarManager.close();
            };
            grid.appendChild(btn);
        });
    },
    open: () => {
        const d = Utils.isoToDate(State.selectedDate);
        State.calMonth = { year: d.getFullYear(), month: d.getMonth() };
        CalendarManager.render();
        const overlay = document.getElementById("calendarModal");
        if (!overlay) return;
        overlay.style.display = "flex";
        requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("open","visible")));
    },
    close: () => {
        const overlay = document.getElementById("calendarModal");
        if (!overlay) return;
        overlay.classList.remove("visible");
        setTimeout(() => { overlay.classList.remove("open"); overlay.style.display="none"; }, 220);
    },
    navMonth: (delta) => {
        if (!State.calMonth) return;
        let m = State.calMonth.month + delta, y = State.calMonth.year;
        if (m < 0) { m = 11; y--; } if (m > 11){ m = 0; y++; }
        State.calMonth = { year: y, month: m };
        CalendarManager.render();
    }
};

/* =============================================
   MODULE: ANALYTICS MANAGER
   ============================================= */
const AnalyticsManager = {
    getProfileStats: (profile) => {
        const profileLog = State.data.attendance[profile] || {};
        let totalMarked = 0;
        let totalAttended = 0;
        const subjectMap = {};

        for (const iso in profileLog) {
            const dayRecords = profileLog[iso];
            for (const cid in dayRecords) {
                const rec = dayRecords[cid];
                if (!rec || !rec.subject) continue;
                const type = (rec.type || "DSC").toUpperCase();
                if (type === "BREAK") continue;
                if (rec.status === "attended" || rec.status === "missed") {
                    totalMarked++;
                    if (rec.status === "attended") totalAttended++;
                }
                const key = `${AttendanceManager.normaliseSubject(rec.subject)}__${type}`;
                if (!subjectMap[key]) subjectMap[key] = { subject: rec.subject, type, attended: 0, missed: 0, total: 0 };
                if (rec.status === "attended") { subjectMap[key].attended++; subjectMap[key].total++; }
                else if (rec.status === "missed") { subjectMap[key].missed++; subjectMap[key].total++; }
            }
        }
        const pct = totalMarked > 0 ? Math.round((totalAttended / totalMarked) * 100) : 0;
        const subjects = Object.values(subjectMap).map(s => ({
            ...s,
            pct: s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0,
            status: s.total === 0 ? "none" : (s.total > 0 && (s.attended/s.total)*100 >= 75 ? "safe" : (s.attended/s.total)*100 >= 67 ? "warn" : "danger")
        })).sort((a,b) => a.subject.localeCompare(b.subject));

        return { totalMarked, totalAttended, pct, subjects };
    },

    renderAnalytics: () => {
        const container = document.getElementById("analyticsContent");
        if (!container) return;

        const profile = State.currentProfile;
        const stats = AnalyticsManager.getProfileStats(profile);
        const otherProfile = profile === "laksh" ? "suhani" : "laksh";
        const otherStats = AnalyticsManager.getProfileStats(otherProfile);

        const overallStatus = stats.totalMarked === 0 ? "No data" : (stats.pct >= 75 ? "Safe" : stats.pct >= 67 ? "Warning" : "Critical");
        const statusClass = stats.totalMarked === 0 ? "neutral" : (stats.pct >= 75 ? "safe" : stats.pct >= 67 ? "warn" : "danger");

        const below67 = stats.subjects.filter(s => s.total > 0 && s.pct < 67);
        const between67_75 = stats.subjects.filter(s => s.total > 0 && s.pct >= 67 && s.pct < 75);
        const above75 = stats.subjects.filter(s => s.total > 0 && s.pct >= 75);

        const markedSubjects = stats.subjects.filter(s => s.total > 0);
        markedSubjects.sort((a,b) => b.pct - a.pct);
        const bestSub = markedSubjects.length > 0 ? markedSubjects[0] : null;
        const worstSub = markedSubjects.length > 0 ? markedSubjects[markedSubjects.length - 1] : null;

        const lakshStats = profile === "laksh" ? stats : otherStats;
        const suhaniStats = profile === "suhani" ? stats : otherStats;

        let leaderboardHTML = '';
        if (lakshStats.totalMarked === 0 && suhaniStats.totalMarked === 0) {
            leaderboardHTML = `<div class="text-center py-4 text-gray-500 font-medium text-sm">No attendance data for comparison yet.</div>`;
        } else {
            const lPct = lakshStats.totalMarked > 0 ? lakshStats.pct : null;
            const sPct = suhaniStats.totalMarked > 0 ? suhaniStats.pct : null;
            let comparisonText = "";
            if (lPct !== null && sPct !== null) {
                const diff = Math.abs(lPct - sPct).toFixed(1);
                if (lPct > sPct) comparisonText = `Laksh leads by ${diff} percentage points.`;
                else if (sPct > lPct) comparisonText = `Suhani leads by ${diff} percentage points.`;
                else comparisonText = `Both are tied at ${lPct}%.`;
            } else if (lPct !== null) {
                comparisonText = `Only Laksh has attendance data recorded.`;
            } else {
                comparisonText = `Only Suhani has attendance data recorded.`;
            }

            leaderboardHTML = `
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-center">
                        <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Laksh</div>
                        <div class="text-2xl font-black text-navy mb-1">${lakshStats.totalMarked > 0 ? lakshStats.pct + '%' : 'No data'}</div>
                        <div class="text-xs text-gray-500 font-semibold">${lakshStats.totalAttended}/${lakshStats.totalMarked} marked classes</div>
                    </div>
                    <div class="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-center">
                        <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Suhani</div>
                        <div class="text-2xl font-black text-navy mb-1">${suhaniStats.totalMarked > 0 ? suhaniStats.pct + '%' : 'No data'}</div>
                        <div class="text-xs text-gray-500 font-semibold">${suhaniStats.totalAttended}/${suhaniStats.totalMarked} marked classes</div>
                    </div>
                </div>
                <div class="text-center text-sm font-bold text-gray-700 bg-blue-50/60 py-2.5 px-3 rounded-lg border border-blue-100">${comparisonText}</div>
            `;
        }

        let subjectsHTML = stats.subjects.length === 0 ? `<div class="text-center py-4 text-gray-500 text-sm">No subjects found.</div>` : '';
        stats.subjects.forEach(s => {
            const key = `${AttendanceManager.normaliseSubject(s.subject)}__${s.type}`;
            const safeKey = String(key).replace(/'/g, "\\'");
            const pctCol = s.status === "safe" ? "text-green-600" : s.status === "warn" ? "text-amber-600" : s.status === "danger" ? "text-red-600" : "text-gray-400";
            subjectsHTML += `
                <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl mb-2.5 shadow-sm cursor-pointer hover:border-navy transition-all" onclick="window.openSubjectDetail('${safeKey}')">
                    <div>
                        <div class="font-bold text-gray-900 text-sm">${Utils.escapeHTML(s.subject)}</div>
                        <div class="text-xs font-semibold text-gray-400 mt-0.5">${Utils.escapeHTML(s.type)} · ${s.attended} Attended · ${s.missed} Missed · ${s.total} Total</div>
                    </div>
                    <div class="text-right">
                        <div class="font-black text-base ${pctCol}">${s.total > 0 ? s.pct + '%' : '--'}</div>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${s.status === 'safe' ? 'bg-green-50 text-green-700' : s.status === 'warn' ? 'bg-amber-50 text-amber-700' : s.status === 'danger' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'}">${overallStatusText(s.status)}</span>
                    </div>
                </div>
            `;
        });
        
        const profileLog = State.data.attendance[profile] || {};
        const buckets = {};
        for (const iso in profileLog) {
            const dayRecords = profileLog[iso];
            for (const cid in dayRecords) {
                const rec = dayRecords[cid];
                if (!rec || !rec.subject || (rec.type || "").toUpperCase() === "BREAK") continue;
                const status = rec.status;
                if (status !== "attended" && status !== "missed") continue;
                const mIso = Utils.dateToISO(Utils.mondayOfWeek(Utils.isoToDate(iso)));
                if (!buckets[mIso]) buckets[mIso] = { a: 0, m: 0, mIso };
                if (status === "attended") buckets[mIso].a += 1; else buckets[mIso].m += 1;
            }
        }
        const weeksAsc = Object.values(buckets).sort((x, y) => x.mIso < y.mIso ? -1 : 1);
        let cumA = 0, cumT = 0;
        const weeks = weeksAsc.map((w, i) => {
            cumA += w.a; cumT += (w.a + w.m);
            return { week: i + 1, attended: w.a, missed: w.m, pct: cumT > 0 ? Math.round((cumA / cumT) * 100) : 0 };
        });

        container.innerHTML = `
            <div class="mb-6">
                <h2 class="font-display text-xl text-navy mb-1 capitalize">${Utils.escapeHTML(profile)}'s Analytics Dashboard</h2>
                <p class="text-xs text-gray-500 font-medium">Comprehensive attendance performance and insights</p>
            </div>

            <!-- Overall Attendance Card -->
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Overall Attendance</div>
                <div class="flex items-end justify-between mb-3">
                    <div class="text-4xl font-black ${statusClass}">${stats.totalMarked > 0 ? stats.pct + '%' : '--'}</div>
                    <div class="text-right">
                        <span class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${stats.pct >= 75 ? 'bg-green-100 text-green-800' : stats.pct >= 67 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}">${overallStatus}</span>
                    </div>
                </div>
                <div class="text-xs font-semibold text-gray-600">${stats.totalAttended} classes attended out of ${stats.totalMarked} marked classes</div>
            </div>
            
            <!-- Overall Trend -->
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Overall Attendance Trend</div>
                <div class="text-[10px] font-semibold text-gray-400 mb-3">Cumulative performance tracked over time</div>
                <div class="graph-container"><canvas id="overallAttChart" class="graph-canvas w-full" style="height:180px;"></canvas></div>
                <div class="graph-legend mt-3 text-center text-xs font-bold" id="overall-graph-legend"></div>
            </div>

            <!-- Laksh vs Suhani Leaderboard -->
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Laksh vs Suhani Leaderboard</div>
                ${leaderboardHTML}
            </div>

            <!-- Best & Worst Subjects -->
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">🌟 Best Subject</div>
                    <div class="font-bold text-gray-900 text-sm truncate">${bestSub ? Utils.escapeHTML(bestSub.subject) : 'No data'}</div>
                    <div class="text-green-600 font-black text-lg mt-1">${bestSub ? bestSub.pct + '%' : '--'}</div>
                </div>
                <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">⚠️ Lowest Subject</div>
                    <div class="font-bold text-gray-900 text-sm truncate">${worstSub ? Utils.escapeHTML(worstSub.subject) : 'No data'}</div>
                    <div class="text-red-600 font-black text-lg mt-1">${worstSub ? worstSub.pct + '%' : '--'}</div>
                </div>
            </div>

            <!-- Risk Summary -->
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Attendance Risk Summary</div>
                <div class="flex flex-col gap-2 text-xs font-semibold">
                    <div class="flex justify-between items-center py-2 border-b border-gray-100">
                        <span class="text-red-600">🔴 Critical (&lt; 67%)</span>
                        <span class="font-bold text-gray-900">${below67.length} subjects</span>
                    </div>
                    <div class="flex justify-between items-center py-2 border-b border-gray-100">
                        <span class="text-amber-600">🟡 Warning (67% – 75%)</span>
                        <span class="font-bold text-gray-900">${between67_75.length} subjects</span>
                    </div>
                    <div class="flex justify-between items-center py-2">
                        <span class="text-green-600">🟢 Safe (&ge; 75%)</span>
                        <span class="font-bold text-gray-900">${above75.length} subjects</span>
                    </div>
                </div>
            </div>

            <!-- Subject Performance List -->
            <div class="mb-6">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Subject Performance</div>
                ${subjectsHTML}
            </div>
        `;

        requestAnimationFrame(() => {
            UI.drawTrendChart("overallAttChart", "overall-graph-legend", weeks);
        });
    }
};

function overallStatusText(status) {
    if (status === 'safe') return 'Safe';
    if (status === 'warn') return 'Warning';
    if (status === 'danger') return 'Critical';
    return 'No data';
}

/* =============================================
   MODULE: PROFILE MANAGER
   ============================================= */
const ProfileManager = {
    renderProfile: async () => {
        const container = document.getElementById("profileContent");
        if (!container) return;

        let email = CloudManager.userEmail || "Offline cached session";
        if (supabaseClient && navigator.onLine) {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session && session.user && session.user.email) {
                    email = session.user.email;
                }
            } catch (_) {}
        }
        const profile = State.currentProfile;
        const authStatusLabel = !navigator.onLine ? "Offline Ready" : SyncManager.authExpired ? "Re-login Required" : "Authenticated";
        const authBadgeCol = !navigator.onLine ? "text-amber-700 bg-amber-50" : SyncManager.authExpired ? "text-red-700 bg-red-50" : "text-green-600 bg-green-50";

        container.innerHTML = `
            <div class="mb-6">
                <h2 class="font-display text-xl text-navy mb-1">Profile &amp; Account</h2>
                <p class="text-xs text-gray-500 font-medium">Manage your active profile, sync status, and security</p>
            </div>

            <!-- Current Profile Card -->
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6 flex items-center gap-4">
                <img src="${profile === 'suhani' ? 'IMG_0162.jpeg' : 'IMG_0163.jpeg'}" class="w-16 h-16 rounded-full object-cover border-2 border-navy shadow-sm">
                <div>
                    <div class="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Profile</div>
                    <div class="text-xl font-black text-navy capitalize">${Utils.escapeHTML(profile)}</div>
                    <div class="text-xs text-gray-500 font-medium mt-0.5">Shared Workspace Member (Profile-Scoped View)</div>
                </div>
            </div>

            <!-- Switch Profile -->
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Switch Profile</div>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="window.switchProfile('laksh')" class="flex items-center gap-3 p-3 rounded-xl border ${profile === 'laksh' ? 'border-navy bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'} transition-all cursor-pointer">
                        <img src="IMG_0163.jpeg" class="w-10 h-10 rounded-full object-cover border border-gray-300">
                        <span class="font-bold text-gray-800 text-sm">Laksh</span>
                    </button>
                    <button onclick="window.switchProfile('suhani')" class="flex items-center gap-3 p-3 rounded-xl border ${profile === 'suhani' ? 'border-navy bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'} transition-all cursor-pointer">
                        <img src="IMG_0162.jpeg" class="w-10 h-10 rounded-full object-cover border border-gray-300">
                        <span class="font-bold text-gray-800 text-sm">Suhani</span>
                    </button>
                </div>
            </div>

            <!-- Account Information -->
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Account &amp; Synchronization</div>
                <div class="text-sm font-bold text-gray-800 bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center justify-between mb-3">
                    <span class="truncate mr-2">📧 ${Utils.escapeHTML(email)}</span>
                    <span class="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${authBadgeCol}">${authStatusLabel}</span>
                </div>
                <div class="flex gap-2">
                    <button type="button" onclick="openSyncStatusModal()" class="flex-1 bg-gray-100 text-navy font-bold py-2.5 rounded-xl text-xs cursor-pointer">🔄 Sync &amp; Queue Inspector</button>
                    <button type="button" onclick="window.exportData()" class="flex-1 bg-gray-100 text-navy font-bold py-2.5 rounded-xl text-xs cursor-pointer">📤 Export Full Backup</button>
                </div>
            </div>

            <!-- Change Password -->
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Change Password</div>
                <form onsubmit="ProfileManager.handleChangePassword(event)" class="flex flex-col gap-3">
                    <div>
                        <label class="text-xs font-bold text-gray-600 mb-1 block">Current Password</label>
                        <input type="password" id="cpCurrent" class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-navy" required autocomplete="current-password">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-600 mb-1 block">New Password</label>
                        <input type="password" id="cpNew" class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-navy" required minlength="6" autocomplete="new-password">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-600 mb-1 block">Confirm New Password</label>
                        <input type="password" id="cpConfirm" class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-navy" required minlength="6" autocomplete="new-password">
                    </div>
                    <p id="cpError" class="text-red-600 text-xs font-semibold hidden"></p>
                    <p id="cpSuccess" class="text-green-600 text-xs font-semibold hidden"></p>
                    <button type="submit" id="cpBtn" class="w-full bg-navy text-white font-bold py-2.5 rounded-lg text-sm mt-1 transition-transform active:scale-95 cursor-pointer">Update Password</button>
                </form>
            </div>

            <!-- Logout -->
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <button onclick="CloudManager.handleLogout()" class="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl text-sm transition-all hover:bg-red-100 flex items-center justify-center gap-2 cursor-pointer">
                    <span>🚪 Log out of Workspace</span>
                </button>
            </div>
        `;
    },

    handleChangePassword: async (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('cpCurrent').value;
        const newPass = document.getElementById('cpNew').value;
        const confirmPass = document.getElementById('cpConfirm').value;
        const errEl = document.getElementById('cpError');
        const successEl = document.getElementById('cpSuccess');
        const btn = document.getElementById('cpBtn');

        errEl.classList.add('hidden');
        successEl.classList.add('hidden');

        if (!navigator.onLine) {
            errEl.textContent = 'Changing password requires an active internet connection.';
            errEl.classList.remove('hidden');
            return;
        }

        if (newPass !== confirmPass) {
            errEl.textContent = 'New passwords do not match.';
            errEl.classList.remove('hidden');
            return;
        }

        if (newPass === currentPass) {
            errEl.textContent = 'New password must be different from current password.';
            errEl.classList.remove('hidden');
            return;
        }

        btn.textContent = 'Verifying & Updating...';
        btn.disabled = true;

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session || !session.user.email) {
            errEl.textContent = 'No active session found.';
            errEl.classList.remove('hidden');
            btn.textContent = 'Update Password';
            btn.disabled = false;
            return;
        }

        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: session.user.email,
            password: currentPass
        });

        if (signInError) {
            errEl.textContent = 'Incorrect current password.';
            errEl.classList.remove('hidden');
            btn.textContent = 'Update Password';
            btn.disabled = false;
            return;
        }

        const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPass });

        if (updateError) {
            errEl.textContent = updateError.message;
            errEl.classList.remove('hidden');
            btn.textContent = 'Update Password';
            btn.disabled = false;
        } else {
            successEl.textContent = 'Password successfully updated!';
            successEl.classList.remove('hidden');
            btn.textContent = 'Updated Successfully';
            document.getElementById('cpCurrent').value = '';
            document.getElementById('cpNew').value = '';
            document.getElementById('cpConfirm').value = '';
            setTimeout(() => {
                btn.textContent = 'Update Password';
                btn.disabled = false;
                successEl.classList.add('hidden');
            }, 3000);
        }
    }
};

/* =============================================
   MODULE: UI & BINDINGS
   ============================================= */
const UI = {
    registerServiceWorker: () => {
        if ("serviceWorker" in navigator) {
            window.addEventListener("load", () => {
                navigator.serviceWorker.register("./service-worker.js", { scope: "./" })
                    .catch(err => console.warn("Service worker registration skipped or failed:", err));
            });
        }
    },

    showToast: (message, type = "info") => {
        const container = document.getElementById("toastContainer");
        if (!container) return;
        const el = document.createElement("div");
        const typeClass = type === "warn" ? "toast-warn" : type === "error" ? "toast-error" : type === "success" ? "toast-success" : "";
        el.className = `app-toast ${typeClass}`;
        el.innerHTML = `<span>${Utils.escapeHTML(message)}</span>`;
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = "0";
            el.style.transition = "opacity 200ms ease";
            setTimeout(() => el.remove(), 220);
        }, 3200);
    },

    updateSubjectDatalist: () => {
        const dl = document.getElementById("subjectSuggestionsList");
        if (!dl) return;
        const subjects = Utils.getKnownSubjectsForProfile(State.currentProfile);
        dl.innerHTML = subjects.map(s => `<option value="${Utils.escapeHTML(s)}"></option>`).join("");
    },

    updateDrawerBadges: () => {
        const taskCounts = TaskManager.getCounts(State.currentProfile);
        const assCounts = AssessmentManager.getCounts(State.currentProfile);

        const taskBadge = document.getElementById("drawerBadgeTasks");
        if (taskBadge) {
            if (taskCounts.pendingTotal > 0) {
                taskBadge.textContent = String(taskCounts.pendingTotal);
                taskBadge.className = `drawer-badge ${taskCounts.overdue > 0 ? "urgent" : ""}`;
                taskBadge.classList.remove("hidden");
            } else {
                taskBadge.classList.add("hidden");
            }
        }

        const assBadge = document.getElementById("drawerBadgeAssessments");
        if (assBadge) {
            if (assCounts.upcoming > 0) {
                assBadge.textContent = String(assCounts.upcoming);
                assBadge.className = `drawer-badge ${assCounts.todayCount > 0 ? "urgent" : ""}`;
                assBadge.classList.remove("hidden");
            } else {
                assBadge.classList.add("hidden");
            }
        }
    },

    openSyncStatusModal: async () => {
        await UI.renderSyncStatusModalBody();
        const modal = document.getElementById("syncStatusModal");
        if (!modal) return;
        modal.style.display = "flex";
        requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("open", "visible")));
    },

    closeSyncStatusModal: () => {
        const modal = document.getElementById("syncStatusModal");
        if (!modal) return;
        modal.classList.remove("visible");
        setTimeout(() => { modal.classList.remove("open"); modal.style.display = "none"; }, 220);
    },

    renderSyncStatusModalBody: async () => {
        const body = document.getElementById("ssmBody");
        if (!body) return;
        const queue = await SyncManager.getPendingQueue();
        const conflicts = State.conflicts || [];
        const online = navigator.onLine;

        let conflictsHTML = "";
        if (conflicts.length > 0) {
            conflictsHTML = `
                <div class="mb-5">
                    <div class="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">⚠️ Unresolved Sync Conflicts (${conflicts.length})</div>
                    <div class="flex flex-col gap-3">
                        ${conflicts.map(c => `
                            <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs">
                                <div class="font-bold text-gray-900 mb-1">${Utils.escapeHTML(c.title)}</div>
                                <div class="text-gray-600 mb-2">${Utils.escapeHTML(c.description)}</div>
                                <div class="flex gap-2">
                                    <button type="button" class="ac-btn primary flex-1" onclick="window.SyncManager.resolveConflict('${c.id}', 'keep_local')">Keep My Local Edit</button>
                                    <button type="button" class="ac-btn flex-1" onclick="window.SyncManager.resolveConflict('${c.id}', 'keep_cloud')">Keep Cloud Version</button>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }

        let migrationNoticeHTML = "";
        if (SyncManager.migrationMissing) {
            migrationNoticeHTML = `
                <div class="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 mb-4">
                    <div class="font-bold mb-1">🛠️ Database Migration Required for Cloud Sync</div>
                    <div>The <code>academic_tasks</code> and/or <code>academic_assessments</code> tables were not found in Supabase. All tasks and exams are safely stored on your device in IndexedDB. Apply <b>supabase_migration.sql</b> in your Supabase SQL Editor and tap <b>Sync Now</b>.</div>
                </div>
            `;
        }

        let queueHTML = `<div class="text-xs text-gray-500 font-semibold py-2">No pending offline mutations. Everything is synchronized.</div>`;
        if (queue.length > 0) {
            queueHTML = `
                <div class="flex flex-col gap-2 max-h-44 overflow-y-auto">
                    ${queue.map(m => `
                        <div class="flex items-center justify-between bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-xs">
                            <div>
                                <div class="font-bold text-gray-800 uppercase">${Utils.escapeHTML(m.entityType)} · ${Utils.escapeHTML(m.action)}</div>
                                <div class="text-gray-500">Profile: ${Utils.escapeHTML(m.profile)} · ${Utils.escapeHTML(Utils.formatRelativeTimestamp(m.updatedAt))}</div>
                            </div>
                            <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Queued</span>
                        </div>
                    `).join("")}
                </div>
            `;
        }

        body.innerHTML = `
            ${conflictsHTML}
            ${migrationNoticeHTML}
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mb-4 text-xs flex flex-col gap-2">
                <div class="flex justify-between">
                    <span class="text-gray-500 font-semibold">Network Connectivity:</span>
                    <span class="font-bold ${online ? 'text-green-600' : 'text-amber-600'}">${online ? '🟢 Online' : '🟠 Offline'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500 font-semibold">Pending Local Changes:</span>
                    <span class="font-bold text-navy">${queue.length}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500 font-semibold">Last Cloud Sync:</span>
                    <span class="font-bold text-gray-700">${Utils.escapeHTML(Utils.formatRelativeTimestamp(SyncManager.lastSyncedAt))}</span>
                </div>
                ${SyncManager.lastError ? `<div class="text-red-600 font-semibold pt-1 border-t border-gray-200">Last Error: ${Utils.escapeHTML(SyncManager.lastError)}</div>` : ""}
            </div>
            <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pending Mutation Queue</div>
            ${queueHTML}
        `;
    },

    showAlert: (msg) => {
        UI.showConfirm(msg, () => {}, true);
    },
    showConfirm: (msg, callback, isAlert = false) => {
        const modal = document.getElementById("customConfirmModal");
        if (!modal) return;
        const titleEl = document.getElementById("ccmTitle");
        if (titleEl) titleEl.textContent = isAlert ? "Notice" : "Confirm Action";
        document.getElementById("ccmMessage").textContent = msg;
        
        const btnYes = document.getElementById("ccmYes");
        const btnNo = document.getElementById("ccmNo");
        
        btnYes.textContent = isAlert ? "OK" : "Yes, Confirm";
        btnYes.style.background = isAlert ? "var(--navy)" : "var(--red)";
        btnNo.style.display = isAlert ? "none" : "block";

        btnYes.onclick = () => {
            modal.classList.remove("visible");
            setTimeout(() => { modal.classList.remove("open"); modal.style.display = "none"; callback(); }, 220);
        };
        btnNo.onclick = () => {
            modal.classList.remove("visible");
            setTimeout(() => { modal.classList.remove("open"); modal.style.display = "none"; }, 220);
        };

        modal.style.display = "flex";
        requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("open", "visible")));
    },
    drawTrendChart: (canvasId, legendId, weeks) => {
        const canvas = document.getElementById(canvasId);
        const legendEl = document.getElementById(legendId);
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const W = canvas.parentElement.offsetWidth || 320, H = 180;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + "px"; canvas.style.height = H + "px";
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
        if (weeks.length === 0) {
            ctx.fillStyle = "#9999bb"; ctx.font = `600 13px 'DM Sans', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("Not enough attendance data yet", W / 2, H / 2);
            if(legendEl) legendEl.innerHTML = "";
        } else {
            const padL = 38, padR = 14, padT = 14, padB = 28, plotW = W - padL - padR, plotH = H - padT - padB;
            const yToPx = (v) => padT + plotH - ((v) / 100) * plotH;
            const xToPx = (i) => weeks.length === 1 ? padL + plotW / 2 : padL + (i / (weeks.length - 1)) * plotW;

            ctx.strokeStyle = "#eef0f4"; ctx.lineWidth = 1; ctx.fillStyle = "#9999bb"; ctx.font = `600 10px 'DM Sans', sans-serif`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
            [0, 25, 50, 75, 100].forEach(v => { const y = yToPx(v); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.fillText(v + "%", padL - 6, y); });
            ctx.strokeStyle = "#d97706"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(padL, yToPx(75)); ctx.lineTo(W - padR, yToPx(75)); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = "#9999bb"; ctx.textAlign = "center"; ctx.textBaseline = "top";
            weeks.forEach((w, i) => ctx.fillText(`W${w.week}`, xToPx(i), padT + plotH + 8));

            const points = weeks.map((w, i) => ({ x: xToPx(i), y: yToPx(w.pct), pct: w.pct }));
            if (points.length >= 2) {
                const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
                grad.addColorStop(0, "rgba(15, 36, 96, 0.18)"); grad.addColorStop(1, "rgba(15, 36, 96, 0.02)");
                ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(points[0].x, padT + plotH);
                points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.lineTo(points[points.length - 1].x, padT + plotH); ctx.closePath(); ctx.fill();
            }
            ctx.strokeStyle = "#0f2460"; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath();
            points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();
            points.forEach((p) => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI); ctx.fillStyle = "#fff"; ctx.fill();
                ctx.lineWidth = 2.5; ctx.strokeStyle = p.pct >= 75 ? "#16a34a" : p.pct >= 67 ? "#d97706" : "#dc2626"; ctx.stroke();
                ctx.fillStyle = ctx.strokeStyle; ctx.font = `bold 10px 'DM Sans', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
                ctx.fillText(p.pct + "%", p.x, Math.max(padT + 10, p.y - 9));
            });
            if (legendEl) {
                let trendHTML = weeks.length >= 2 ? (weeks[weeks.length - 1].pct - weeks[0].pct > 1 ? `<span class="graph-trend up text-green-600">↗ Improving</span>` : weeks[weeks.length - 1].pct - weeks[0].pct < -1 ? `<span class="graph-trend down text-red-600">↘ Declining</span>` : `<span class="graph-trend flat text-gray-500">→ Steady</span>`) : `<span class="graph-trend flat text-gray-500">→ Just getting started</span>`;
                legendEl.innerHTML = `${trendHTML} <span class="graph-summary ml-2 text-gray-400">High ${Math.max(...weeks.map(w => w.pct))}% · Low ${Math.min(...weeks.map(w => w.pct))}%</span>`;
            }
        }
    },
    appInitialized: false,
    initApp: () => {
        if (UI.appInitialized) {
            UI.updateDrawerBadges();
            UI.updateSubjectDatalist();
            UI.refreshCurrentView();
            return;
        }
        UI.appInitialized = true;

        Storage.init();
        State.selectedDate = Utils.todayISO();
        if (Utils.isoToDate(State.selectedDate).getDay() === 0) State.selectedDate = Utils.addDays(State.selectedDate, 1);
        
        UI.switchProfile(State.currentProfile);
        UI.initSwipe();
        UI.scheduleMidnightRefresh();
        
        setInterval(() => {
            if (State.currentTab === "schedule") {
                ScheduleManager.renderScheduleForSelected();
            }
        }, 60000);
    },
    refreshCurrentView: () => {
        if (State.currentTab === "schedule") {
            ScheduleManager.renderDateStrip();
            ScheduleManager.renderScheduleForSelected();
        } else if (State.currentTab === "attendance") {
            AttendanceManager.renderAttendance();
        } else if (State.currentTab === "tasks") {
            TaskManager.render();
        } else if (State.currentTab === "assessments") {
            AssessmentManager.render();
        } else if (State.currentTab === "unmarked") {
            UnmarkedManager.render();
        } else if (State.currentTab === "timeline") {
            TimelineManager.renderTimeline();
        } else if (State.currentTab === "analytics") {
            AnalyticsManager.renderAnalytics();
        } else if (State.currentTab === "profile") {
            ProfileManager.renderProfile();
        }
    },
    switchTab: (tab) => {
        State.currentTab = tab;
        UI.closeDrawer();
        document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
        const tabEl = document.getElementById(`tab-${tab}`);
        if (tabEl) tabEl.classList.add("active");
        
        document.querySelectorAll(".drawer-nav-item").forEach(b => b.classList.remove("active"));
        const navId = (tab === "unmarked" || tab === "subject-detail") ? "nav-attendance" : `nav-${tab}`;
        const navBtn = document.getElementById(navId);
        if (navBtn) navBtn.classList.add("active");
        
        const popup = document.getElementById("nextClassPopup");
        if (popup) popup.style.display = tab === "schedule" ? "" : "none";
        
        if (tab === "attendance") {
            document.getElementById("header-tab-label").textContent = "Attendance";
            AttendanceManager.renderAttendance();
            document.getElementById("fabAdd").style.display = "none";
        } else if (tab === "tasks") {
            document.getElementById("header-tab-label").textContent = "Assignments & Tasks";
            TaskManager.render();
            document.getElementById("fabAdd").style.display = "none";
        } else if (tab === "assessments") {
            document.getElementById("header-tab-label").textContent = "Tests & Exams";
            AssessmentManager.render();
            document.getElementById("fabAdd").style.display = "none";
        } else if (tab === "unmarked") {
            document.getElementById("header-tab-label").textContent = "Unmarked Lectures";
            UnmarkedManager.render();
            document.getElementById("fabAdd").style.display = "none";
        } else if (tab === "timeline") {
            document.getElementById("header-tab-label").textContent = "Academic Timeline";
            TimelineManager.renderTimeline();
            document.getElementById("fabAdd").style.display = "none";
        } else if (tab === "analytics") {
            document.getElementById("header-tab-label").textContent = "Analytics & Leaderboard";
            AnalyticsManager.renderAnalytics();
            document.getElementById("fabAdd").style.display = "none";
        } else if (tab === "profile") {
            document.getElementById("header-tab-label").textContent = "Profile & Account";
            ProfileManager.renderProfile();
            document.getElementById("fabAdd").style.display = "none";
        } else if (tab === "subject-detail") {
            document.getElementById("header-tab-label").textContent = "Subject Detail";
            document.getElementById("fabAdd").style.display = "none";
        } else {
            const ctx = Resolver.resolveAcademicContext(State.selectedDate);
            UI.updateHeaderLabels(ctx);
            UI.triggerFabVisibility(ctx);
            ScheduleManager.renderScheduleForSelected();
        }
    },
    switchProfile: (profile) => {
        if (!CONSTANTS.PROFILES.includes(profile)) return;
        State.currentProfile = profile;
        localStorage.setItem(CONSTANTS.STORAGE.PROFILE, profile);
        CloudManager.saveCachedAuthContext();

        document.querySelectorAll(".drawer-profile-btn").forEach(b => b.classList.remove("active"));
        const btn = document.getElementById(`dBtn-${profile}`);
        if (btn) btn.classList.add("active");
        
        const dCheckS = document.getElementById("dCheck-suhani");
        const dCheckL = document.getElementById("dCheck-laksh");
        if (dCheckS) dCheckS.style.display = profile === "suhani" ? "" : "none";
        if (dCheckL) dCheckL.style.display = profile === "laksh" ? "" : "none";

        const avatar = document.getElementById("header-avatar");
        const drawerAva = document.getElementById("drawer-avatar");
        const title = document.getElementById("header-title");
        const dname = document.getElementById("drawer-name");

        if (profile === "suhani") {
            if(avatar) avatar.src = "IMG_0162.jpeg";
            if(drawerAva) drawerAva.src = "IMG_0162.jpeg";
            if(title) title.textContent = "Suhani's Timetable";
            if(dname) dname.textContent = "Suhani";
        } else {
            if(avatar) avatar.src = "IMG_0163.jpeg";
            if(drawerAva) drawerAva.src = "IMG_0163.jpeg";
            if(title) title.textContent = "Laksh's Timetable";
            if(dname) dname.textContent = "Laksh";
        }

        UI.updateDrawerBadges();
        UI.updateSubjectDatalist();

        if (State.currentTab === "subject-detail") {
            UI.switchTab("attendance");
        } else {
            UI.refreshCurrentView();
        }
        UI.closeDrawer();
    },
    selectDate: (iso, direction = null) => {
        const prevIso = State.selectedDate;
        State.selectedDate = iso;
        ScheduleManager.renderDateStrip();
        ScheduleManager.renderScheduleForSelected(direction || ((iso > prevIso) ? "left" : "right"));
    },
    updateHeaderLabels: (ctx) => {
        if (State.currentTab !== "schedule") return;
        const d = Utils.isoToDate(State.selectedDate);
        const dayName = CONSTANTS.DAY_NAMES_FULL[d.getDay()];
        const headerLabel = document.getElementById("header-tab-label");
        if (headerLabel) headerLabel.textContent = (ctx.period ? `${ctx.period.name} • ` : `NO PERIOD • `) + `${d.getDate()} ${CONSTANTS.MONTH_NAMES_SHORT[d.getMonth()]} • ${dayName}`.toUpperCase();
    },
    triggerFabVisibility: (ctx) => {
        const fab = document.getElementById("fabAdd");
        if (!fab || State.currentTab !== "schedule") return;
        fab.style.display = (ctx.period && !ctx.isHoliday && !ctx.isExam) ? "" : "none";
    },
    openDrawer: () => { document.getElementById("drawer").classList.add("open"); document.getElementById("drawerOverlay").classList.add("open"); },
    closeDrawer: () => { document.getElementById("drawer").classList.remove("open"); document.getElementById("drawerOverlay").classList.remove("open"); },
    initSwipe: () => {
        let touchStartX = 0, touchStartY = 0, isSwiping = false;
        const THRESHOLD = 50;
        const wrapper = document.getElementById("scheduleWrapper") || document.querySelector("main");
        if (!wrapper) return;

        wrapper.addEventListener("touchstart", e => {
            if (State.currentTab !== "schedule") return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isSwiping = false;
        }, { passive: true });
        wrapper.addEventListener("touchmove", e => {
            if (State.currentTab !== "schedule") return;
            if (Math.abs(e.touches[0].clientX - touchStartX) > Math.abs(e.touches[0].clientY - touchStartY) + 10) isSwiping = true;
        }, { passive: true });
        wrapper.addEventListener("touchend", e => {
            if (State.currentTab !== "schedule" || !isSwiping) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) < THRESHOLD) return;
            const cur = Utils.isoToDate(State.selectedDate);
            const next = new Date(cur);
            if (dx < 0) next.setDate(cur.getDate() + 1); else next.setDate(cur.getDate() - 1);
            if (next.getDay() === 0) next.setDate(next.getDate() + (dx < 0 ? 1 : -1));
            UI.selectDate(Utils.dateToISO(next), dx < 0 ? "left" : "right");
            isSwiping = false;
        }, { passive: true });
    },
    scheduleMidnightRefresh: () => {
        const now = new Date();
        const nextMid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
        setTimeout(() => {
            const newToday = Utils.todayISO();
            if (State.selectedDate < newToday) State.selectedDate = newToday;
            UI.updateDrawerBadges();
            UI.refreshCurrentView();
            UI.scheduleMidnightRefresh();
        }, Math.max(1000, nextMid - now));
    }
};

/* =============================================
   EXTENSIONS (Graphs & Simulators)
   ============================================= */
window.openSubjectDetail = (key) => {
    const stat = AttendanceManager.getSubjectStats().find(s => s.key === key);
    if (!stat) return;

    State.currentTab = "subject-detail";
    document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
    document.getElementById("tab-subject-detail").classList.add("active");
    document.getElementById("nextClassPopup").style.display = "none";
    document.getElementById("fabAdd").style.display = "none";
    document.getElementById("header-tab-label").textContent = "Subject Detail";
    
    const pctClass = stat.total > 0 ? (stat.pct >= 75 ? "safe" : stat.pct >= 67 ? "warn" : "danger") : "neutral";
    const { insight, risk, riskMsg } = AttendanceManager.getSmartInsight(stat.attended, stat.total, stat.pct, stat.type);

    let historyHTML = stat.history.length === 0 ? `<div class="history-empty">No attendance marked yet.</div>` : '<div class="history-list">';
    if (stat.history.length > 0) {
        stat.history.forEach(({ iso, item, status }) => {
            const icons = { attended: '✅', missed: '❌', cancelled: '🚫' };
            const labels = { attended: 'Attended', missed: 'Missed', cancelled: 'Cancelled' };
            historyHTML += `
                <div class="history-item">
                    <div class="history-status">${icons[status] || ''}</div>
                    <div class="history-info">
                        <div class="history-date">${Utils.escapeHTML(item.subject)}</div>
                        <div class="history-day">${Utils.fullDateLabel(Utils.isoToDate(iso))} · ${Utils.formatDisplayTime(item.start)} – ${Utils.formatDisplayTime(item.end)}</div>
                    </div>
                    <span class="history-label ${status}">${labels[status] || ''}</span>
                </div>`;
        });
        historyHTML += '</div>';
    }

    let decisionHTML = '';
    if (stat.total > 0) {
        let chipClass = "safe", chipText = "✅ Safe to miss next";
        if (risk === "high-risk") { chipClass = "danger"; chipText = "🔴 Cannot miss next class"; }
        else if (risk === "warning") { chipClass = "warning"; chipText = "⚠️ Be careful next class"; }
        decisionHTML = `<div class="decision-chip ${chipClass}">${chipText}</div>`;
    }

    const marksDisplay = stat.marks !== null ? `<div class="detail-stat"><div class="detail-stat-val neutral">${stat.marks}</div><div class="detail-stat-label">Marks</div></div>` : '';
    const safeDomId = stat.key.replace(/[^a-z0-9]/gi, '_');
    const safeJsKey = String(stat.key).replace(/'/g, "\\'");

    document.getElementById("subjectDetailContent").innerHTML = `
        <button class="detail-back-btn" onclick="window.goBackToAttendance()">← Back</button>
        <div class="detail-hero">
            <div class="detail-subject-name">${Utils.escapeHTML(stat.subject)}</div>
            <div class="detail-type-row"><span class="detail-type-badge">${Utils.escapeHTML(stat.type)}</span></div>
            <div class="detail-stats-row">
                <div class="detail-stat"><div class="detail-stat-val ${pctClass}">${stat.total > 0 ? stat.pct + '%' : '--'}</div><div class="detail-stat-label">Attendance</div></div>
                <div class="detail-stat"><div class="detail-stat-val neutral">${stat.attended}/${stat.total}</div><div class="detail-stat-label">Attended/Total</div></div>
                ${marksDisplay}
            </div>
        </div>
        ${stat.total > 0 ? `
        <div class="detail-section">
            <div class="detail-section-title">Decision</div>
            ${decisionHTML}
            ${insight ? `<div class="att-insight" style="margin-top:10px">${Utils.escapeHTML(insight)}</div>` : ''}
            ${risk ? `<div class="att-alert ${risk}" style="margin-top:10px"><span>${risk === 'high-risk' ? '🔴' : '⚠️'}</span><span>${Utils.escapeHTML(riskMsg)}</span></div>` : ''}
        </div>` : ''}
        <div class="detail-section">
            <div class="detail-section-title">Week-wise Attendance Trend</div>
            <div class="graph-container"><canvas id="attChart" class="graph-canvas w-full" style="height:180px;"></canvas></div>
            <div class="graph-legend mt-3 text-center text-xs font-bold" id="graph-legend"></div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title">End-Semester Simulator</div>
            <div class="endsem-input-row">
                <input type="number" id="endsem-input-${safeDomId}" class="endsem-input" placeholder="Remaining classes" min="0" max="200" oninput="window.renderEndSem('${safeJsKey}')">
                <button class="endsem-btn" onclick="document.getElementById('endsem-input-${safeDomId}').value=''; window.renderEndSem('${safeJsKey}')">Reset</button>
            </div>
            <div id="endsem-result-${safeDomId}"></div>
        </div>
        <div class="detail-section"><div class="detail-section-title">Class History</div>${historyHTML}</div>
    `;

    const buckets = {};
    stat.history.forEach(({ iso, status }) => {
        if (status !== "attended" && status !== "missed") return;
        const mIso = Utils.dateToISO(Utils.mondayOfWeek(Utils.isoToDate(iso)));
        if (!buckets[mIso]) buckets[mIso] = { a: 0, m: 0, mIso };
        if (status === "attended") buckets[mIso].a += 1; else buckets[mIso].m += 1;
    });
    const weeksAsc = Object.values(buckets).sort((x, y) => x.mIso < y.mIso ? -1 : 1);
    let cumA = 0, cumT = 0;
    const weeks = weeksAsc.map((w, i) => {
        cumA += w.a; cumT += (w.a + w.m);
        return { week: i + 1, attended: w.a, missed: w.m, pct: cumT > 0 ? Math.round((cumA / cumT) * 100) : 0 };
    });

    requestAnimationFrame(() => {
        UI.drawTrendChart("attChart", "graph-legend", weeks);
    });
};

window.renderEndSem = (key) => {
    const stat = AttendanceManager.getSubjectStats().find(s => s.key === key);
    const safeId = key.replace(/[^a-z0-9]/gi, '_');
    const inputEl = document.getElementById(`endsem-input-${safeId}`);
    const resEl = document.getElementById(`endsem-result-${safeId}`);
    if (!stat || !inputEl || !resEl) return;

    const F = parseInt(inputEl.value, 10);
    if (!inputEl.value || isNaN(F) || F < 0) { resEl.innerHTML = ''; return; }
    if (F === 0) { resEl.innerHTML = `<div class="endsem-result"><div class="endsem-row"><span class="endsem-label">No future classes</span><span class="endsem-val">—</span></div></div>`; return; }

    const A = stat.attended, T = stat.total, finalTotal = T + F;
    const bestPct = ((A + F) / finalTotal) * 100, worstPct = (A / finalTotal) * 100;
    
    const headerHTML = `<div class="endsem-result"><div class="endsem-row"><span class="endsem-label">Total classes (projected)</span><span class="endsem-val">${finalTotal}</span></div><div class="endsem-row"><span class="endsem-label">Best case %</span><span class="endsem-val good">${Math.round(bestPct*10)/10}%</span></div><div class="endsem-row"><span class="endsem-label">Worst case %</span><span class="endsem-val ${worstPct>=75?'warn':'bad'}">${Math.round(worstPct*10)/10}%</span></div></div>`;

    if ((F >= 1) && (((A + F - 1) / finalTotal) * 100 < 67)) {
        resEl.innerHTML = `${headerHTML}<div class="slab-analysis"><div class="slab-analysis-title">Max Miss Analysis</div><div class="slab-row critical"><div class="slab-head"><span class="slab-emoji">❌</span><span class="slab-label">You cannot miss ANY class</span></div><div class="slab-detail">Even missing one drops you below 67%.</div></div></div>`;
        return;
    }

    const slabs = [{ id: "top", label: "85%+", emoji: "🟢", lo: 85, hi: Infinity, color: "good" }, { id: "high", label: "75 – 85%", emoji: "🟡", lo: 75, hi: 85, color: "good" }, { id: "mid", label: "70 – 75%", emoji: "🟠", lo: 70, hi: 75, color: "warn" }, { id: "low", label: "67 – 70%", emoji: "🔴", lo: 67, hi: 70, color: "bad" }];
    const slabRowsHTML = slabs.map(slab => {
        let xMax = Math.floor((A + F) - (slab.lo * finalTotal) / 100 + 1e-9);
        let xMin = slab.hi === Infinity ? 0 : Math.max(0, Math.floor((A + F) - (slab.hi * finalTotal) / 100 + 1e-9) + 1);
        xMax = Math.min(F, xMax);

        if (!(xMax >= 0 && xMin <= F && xMax >= xMin && bestPct >= slab.lo - 1e-9)) {
            return `<div class="slab-row not-achievable"><div class="slab-head"><span class="slab-emoji">${slab.emoji}</span><span class="slab-label">${slab.label}</span><span class="slab-tag muted">Not achievable</span></div></div>`;
        }
        const mustAttend = Math.max(0, F - xMax);
        const marks = AttendanceManager.calcMarks(slab.lo, stat.type);
        const marksTxt = marks !== null ? `${marks} marks` : 'No attendance marks';
        return `<div class="slab-row ${slab.color}"><div class="slab-head"><span class="slab-emoji">${slab.emoji}</span><span class="slab-label">${slab.label}</span><span class="slab-tag ${marks !== null ? slab.color : 'muted'}">${marksTxt}</span></div><div class="slab-stats"><div class="slab-stat"><span class="slab-stat-val">${xMax}</span><span class="slab-stat-lbl">max miss</span></div><div class="slab-stat"><span class="slab-stat-val">${mustAttend}</span><span class="slab-stat-lbl">min attend</span></div><div class="slab-stat"><span class="slab-stat-val">${marks !== null ? marks : '—'}</span><span class="slab-stat-lbl">marks</span></div></div></div>`;
    }).join('');

    resEl.innerHTML = `${headerHTML}<div class="slab-analysis"><div class="slab-analysis-title">Max Miss Analysis</div>${slabRowsHTML}<div class="slab-row danger"><div class="slab-head"><span class="slab-emoji">🚫</span><span class="slab-label">Below 67%</span><span class="slab-tag bad">0 marks</span></div><div class="slab-detail">Avoid this — debarment risk.</div></div></div>`;
};

/* =============================================
   WINDOW BINDINGS (HTML INTERFACE)
   ============================================= */
window.onload = CloudManager.init;
window.openDrawer = UI.openDrawer;
window.closeDrawer = UI.closeDrawer;
window.switchTab = UI.switchTab;
window.switchProfile = (profile) => UI.switchProfile(profile);
window.openSyncStatusModal = UI.openSyncStatusModal;
window.closeSyncStatusModal = UI.closeSyncStatusModal;

// Calendar Navigation
window.openCalendar = CalendarManager.open;
window.closeCalendar = CalendarManager.close;
window.calNavMonth = CalendarManager.navMonth;
window.calJumpToToday = () => { UI.selectDate(Utils.todayISO()); CalendarManager.close(); };
window.handleCalendarOverlayClick = (e) => { if (e.target.id === "calendarModal") CalendarManager.close(); };

// Lecture Modals
window.openModal = ModalManager.openModal;
window.openAddModal = ModalManager.openAddModal;
window.closeModal = ModalManager.close;
window.toggleEdit = ModalManager.toggleEdit;
window.cancelEdit = ModalManager.cancelEdit;
window.saveEdit = ModalManager.saveEdit;
window.deleteLecture = ModalManager.deleteLecture;
window.onTagChange = () => {
    if (State.modal.mode === "view") return;
    const isBreak = document.getElementById("editTag").value === "BREAK";
    ModalManager.updateBreakState(isBreak, false);
    if (isBreak) {
        document.getElementById("edit-subject").value = "Break";
        document.getElementById("edit-room").value = "";
        document.getElementById("edit-teacher").value = "";
        document.getElementById("edit-subject").setAttribute("readonly", true);
    } else {
        document.getElementById("edit-subject").removeAttribute("readonly");
        if (document.getElementById("edit-subject").value === "Break") document.getElementById("edit-subject").value = "";
        document.getElementById("edit-subject").focus();
    }
};
window.handleModalOverlayClick = (e) => { if (e.target.id === "editModal") ModalManager.close(); };

// Timeline & Version Modals
window.openPeriodModal = TimelineManager.openPeriodModal;
window.closePeriodModal = () => {
    const pm = document.getElementById("periodModal");
    if (!pm) return;
    pm.classList.remove("visible");
    setTimeout(() => { pm.style.display = "none"; }, 220);
};
window.savePeriod = TimelineManager.savePeriod;
window.handlePeriodModalOverlayClick = (e) => { if (e.target.id === "periodModal") window.closePeriodModal(); };
window.archivePeriod = (id) => {
    UI.showConfirm("Are you sure you want to archive this period?\n\nIt will be hidden from the active timeline, but historical attendance records will remain intact.", () => {
        const p = State.data.timeline.find(t => t.id === id);
        if (p) {
            p.archived = true;
            if (Storage.saveTimeline()) {
                TimelineManager.renderTimeline();
                if (State.currentTab === "schedule") {
                    ScheduleManager.renderDateStrip();
                    ScheduleManager.renderScheduleForSelected();
                }
            }
        }
    });
};

// Expose Managers Globally
window.VersionManager = VersionManager;
window.AnalyticsManager = AnalyticsManager;
window.ProfileManager = ProfileManager;
window.UnmarkedManager = UnmarkedManager;
window.ScheduleManager = ScheduleManager;
window.TaskManager = TaskManager;
window.AssessmentManager = AssessmentManager;
window.SyncManager = SyncManager;
window.OfflineDB = OfflineDB;
window.CloudManager = CloudManager;

// Global Integrations
window.quickMark = AttendanceManager.quickMark;
window.goBackToAttendance = () => UI.switchTab("attendance");
window.openUnmarkedLectures = UnmarkedManager.open;
window.closeUnmarkedLectures = UnmarkedManager.close;
window.markUnmarkedLecture = UnmarkedManager.markNow;
window.exportData = BackupManager.exportJSON;
window.importData = BackupManager.triggerImport;