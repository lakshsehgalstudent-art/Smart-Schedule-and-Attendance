/* ===================================================
   SMART ATTENDANCE SYSTEM — script.js
   --- PRODUCTION READY V7 ---
   - Permanent Lecture IDs for unified attendance tracking
   - Dedicated Timetable Version Manager (No prompt/confirm dialogs)
   - Strict Overlap & Date Validation
   - Archiving & Data Backup Operations
   - Single Source of Truth via Central Resolver
   - Modular Functional Architecture
   =================================================== */

/* =============================================
   MODULE: CONSTANTS & DEFAULTS
   ============================================= */
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
    STORAGE: {
        TIMELINE: "academic_timeline_v6",
        ATTENDANCE: "attendance_log_v1",
        PROFILE: "timetable_profile",
        METADATA: "smart_attendance_metadata",
        LEGACY_TIMELINE_V5: "academic_timeline_v5",
        LEGACY_TIMELINE: "academic_timeline_v1",
        LEGACY_TIMETABLE: "timetable_structure_v4",
        LEGACY_V3: "timetable_full_data_v3",
        LEGACY_V2: "timetable_full_data_v2"
    },
    APP_VERSION: "7.0.0",
    SCHEMA_VERSION: "7.1"
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
    selectedDate: "", // ISO YYYY-MM-DD
    currentTab: "schedule",
    metadata: {
        schemaVersion: CONSTANTS.SCHEMA_VERSION,
        createdAt: "",
        lastModified: "",
        appVersion: CONSTANTS.APP_VERSION
    },
    modal: {
        mode: "view",
        dayKey: null,
        itemIndex: null,
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
    }
};

/* =============================================
   MODULE: UTILITIES
   ============================================= */
const Utils = {
    pad2: (n) => String(n).padStart(2, "0"),
    dateToISO: (d) => `${d.getFullYear()}-${Utils.pad2(d.getMonth() + 1)}-${Utils.pad2(d.getDate())}`,
    isoToDate: (iso) => {
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(y, m - 1, d);
    },
    todayISO: () => Utils.dateToISO(new Date()),
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
    toMinutes: (t) => {
        if (!t) return 0;
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    },
    getNowMins: () => {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
    },
    formatTimeDiff: (diff) => {
        const h = Math.floor(diff / 60), m = diff % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    },
    formatTimeRange: (start, end) => {
        const fmt = (t) => {
            const [h, m] = t.split(":").map(Number);
            const h12 = h % 12 || 12;
            return `${h12}:${m.toString().padStart(2, "0")}`;
        };
        const [h] = end.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        return `${fmt(start)}\n${fmt(end)} ${ampm}`;
    },
    formatDisplayTime: (time) => {
        const [h, m] = time.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
    },
    isBreakItem: (item) => {
        const type = (item.type || "").toUpperCase();
        if (type === "BREAK") return true;
        const s = (item.subject || "").toLowerCase();
        return s.includes("break") || s.includes("lunch") || s.includes("gap");
    },
    isValid: (v) => v && v !== "-" && v !== "undefined",
    createEmptyTimetables: () => {
        const tt = { laksh: {}, suhani: {} };
        CONSTANTS.DAY_KEYS.forEach(d => { tt.laksh[d] = []; tt.suhani[d] = []; });
        return tt;
    },
    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
    generateId: (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random()*1000000)}`,
    // Academic Period duplication intentionally generates NEW lectureIds.
    // These lectures belong to a completely new semester, so they must never
    // share identity (or attendance history) with the lectures they were
    // copied from. This is the ONLY place lectureIds should be mass-regenerated;
    // version splits must keep using the original IDs untouched.
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
        // Global set: lectureIds must never repeat across different Academic Periods.
        // (Different Periods are entirely different semesters/events.)
        const globalLectureIds = new Set();

        for (let i = 0; i < activePeriods.length; i++) {
            const p = activePeriods[i];
            // Per-period set: version splits intentionally duplicate lectureIds
            // within the SAME period, so collisions here are expected and allowed.
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

                // Check Timetable Overlaps and valid Lecture IDs
                for (const prof of CONSTANTS.PROFILES) {
                    if (!ver.timetables[prof]) continue;
                    for (const day of CONSTANTS.DAY_KEYS) {
                        const arr = ver.timetables[prof][day];
                        if (!Array.isArray(arr)) continue;
                        
                        for (let k = 0; k < arr.length; k++) {
                            const item = arr[k];
                            if (!item.lectureId) return { valid: false, error: `Missing lectureId in ${p.name} -> ${ver.name} -> ${day}` };
                            // lectureIds may repeat across timetable versions WITHIN the same
                            // Academic Period, since version splits intentionally duplicate them
                            // to preserve attendance continuity for the same underlying lecture.
                            periodLectureIds.add(item.lectureId);

                            const startMins = Utils.toMinutes(item.start);
                            const endMins = Utils.toMinutes(item.end);
                            if (endMins <= startMins) return { valid: false, error: `Invalid time range for '${item.subject}' in ${p.name}.` };

                            // Overlap check within the same day
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

            // Academic Periods represent entirely different semesters, so a
            // lectureId belonging to one Period must never appear in another.
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
   MODULE: STORAGE & MIGRATION
   ============================================= */
const Storage = {
    init: () => {
        // Load Metadata
        try {
            const meta = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE.METADATA));
            if (meta) {
                State.metadata = { ...State.metadata, ...meta };
            } else {
                State.metadata.createdAt = Utils.todayISO();
                State.metadata.lastModified = Utils.todayISO();
            }
        } catch (e) {}

        const savedProfile = localStorage.getItem(CONSTANTS.STORAGE.PROFILE);
        if (savedProfile && CONSTANTS.PROFILES.includes(savedProfile)) {
            State.currentProfile = savedProfile;
        }

        try {
            const att = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE.ATTENDANCE));
            if (att && typeof att === "object") {
                State.data.attendance = { suhani: att.suhani || {}, laksh: att.laksh || {} };
            }
        } catch (e) { console.warn("Attendance load error:", e); }

        try {
            let timelineRaw = localStorage.getItem(CONSTANTS.STORAGE.TIMELINE);
            if (timelineRaw) {
                State.data.timeline = JSON.parse(timelineRaw);
                Storage.ensureStrictLectureIdsAndMigrateAttendance();
            } else {
                Storage.runMigrations();
                Storage.ensureStrictLectureIdsAndMigrateAttendance();
            }
            // Migration invariant: lectureIds must never collide across different
            // Academic Periods. Repair automatically when it is safe to do so (no
            // attendance history depends on the colliding IDs); otherwise leave the
            // data untouched and let validation surface the conflict on next save.
            Storage.repairCrossPeriodLectureIds();
            State.data.timeline.sort((a, b) => a.startDate.localeCompare(b.startDate));
        } catch (e) {
            console.warn("Timeline load error:", e);
            State.data.timeline = [];
        }
    },
    saveMetadata: () => {
        State.metadata.lastModified = Utils.todayISO();
        localStorage.setItem(CONSTANTS.STORAGE.METADATA, JSON.stringify(State.metadata));
    },
    saveTimeline: () => {
        const validation = Validation.validateTimeline(State.data.timeline);
        if (!validation.valid) {
            UI.showAlert(`DATA CONFLICT PREVENTED SAVE:\n${validation.error}\n\nReverting changes.`);
            Storage.init(); 
            return false;
        }
        localStorage.setItem(CONSTANTS.STORAGE.TIMELINE, JSON.stringify(State.data.timeline));
        Storage.saveMetadata();
        return true;
    },
    saveAttendance: () => {
        localStorage.setItem(CONSTANTS.STORAGE.ATTENDANCE, JSON.stringify(State.data.attendance));
        Storage.saveMetadata();
    },
    ensureStrictLectureIdsAndMigrateAttendance: () => {
        let timelineMutated = false;
        let attendanceMutated = false;

        State.data.timeline.forEach(p => {
            if (!p.archived) p.archived = false;
            if (p.versions) {
                p.versions.forEach(v => {
                    CONSTANTS.PROFILES.forEach(prof => {
                        if (v.timetables && v.timetables[prof]) {
                            CONSTANTS.DAY_KEYS.forEach(day => {
                                if (v.timetables[prof][day]) {
                                    v.timetables[prof][day].forEach(item => {
                                        // If missing or using a legacy derived ID (e.g. "08:30-HRM")
                                        if (!item.lectureId || !item.lectureId.startsWith("lec_")) {
                                            const oldId = item.lectureId || `${item.start}-${item.subject}`;
                                            const newId = Utils.generateId("lec");
                                            item.lectureId = newId;
                                            timelineMutated = true;

                                            // Migrate Attendance Records mapped to this specific version and day
                                            const profAtt = State.data.attendance[prof];
                                            if (profAtt) {
                                                for (const iso in profAtt) {
                                                    // Map only if the date falls in this version and matches the weekday
                                                    if (iso >= v.startDate && iso <= v.endDate && Utils.dayKeyFromISO(iso) === day) {
                                                        if (profAtt[iso][oldId]) {
                                                            profAtt[iso][newId] = profAtt[iso][oldId];
                                                            delete profAtt[iso][oldId];
                                                            attendanceMutated = true;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            }
        });

        if (timelineMutated) {
            localStorage.setItem(CONSTANTS.STORAGE.TIMELINE, JSON.stringify(State.data.timeline));
        }
        if (attendanceMutated) {
            localStorage.setItem(CONSTANTS.STORAGE.ATTENDANCE, JSON.stringify(State.data.attendance));
        }
        if (timelineMutated || attendanceMutated) {
            Storage.saveMetadata();
        }
    },
    runMigrations: () => {
        let legacyData = localStorage.getItem(CONSTANTS.STORAGE.LEGACY_TIMELINE_V5) ||
                         localStorage.getItem(CONSTANTS.STORAGE.LEGACY_TIMELINE) ||
                         localStorage.getItem(CONSTANTS.STORAGE.LEGACY_TIMETABLE);
        
        let migratedTT = Utils.deepClone(DEFAULT_TIMETABLES);
        
        if (legacyData) {
            try {
                let parsed = JSON.parse(legacyData);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].versions) {
                    State.data.timeline = parsed;
                    localStorage.setItem(CONSTANTS.STORAGE.TIMELINE, JSON.stringify(State.data.timeline));
                    return;
                } else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].timetables) {
                    migratedTT = parsed[0].timetables;
                } else if (!Array.isArray(parsed) && parsed.suhani) {
                    migratedTT = parsed;
                }
            } catch(e) {}
        }

        for (const prof in migratedTT) {
            for (const day in migratedTT[prof]) {
                migratedTT[prof][day] = migratedTT[prof][day].map(item => {
                    if (item.time && !item.start) {
                        item.start = item.time;
                        const [h, m] = item.time.split(":").map(Number);
                        const endMins = h * 60 + m + 60;
                        item.end = `${Utils.pad2(Math.floor(endMins/60))}:${Utils.pad2(endMins%60)}`;
                        delete item.time;
                    }
                    if (!item.type) {
                        const s = (item.subject || "").toLowerCase();
                        item.type = s.includes("break") ? "BREAK" : s.includes("practical") ? "PRACTICAL" : s.includes("tut") ? "TUTORIAL" : "DSC";
                    }
                    delete item.status;
                    return item;
                });
            }
        }

        const startISO = "2024-01-01";
        const endISO = "2030-12-31";

        State.data.timeline = [{
            id: Utils.generateId("p"),
            name: "Current Timetable",
            type: "Semester",
            startDate: startISO,
            endDate: endISO,
            archived: false,
            versions: [{
                id: Utils.generateId("v"),
                name: "Base Timetable",
                startDate: startISO,
                endDate: endISO,
                timetables: migratedTT
            }]
        }];
        
        localStorage.setItem(CONSTANTS.STORAGE.TIMELINE, JSON.stringify(State.data.timeline));
    },
    // Migration safety net: old databases predating the cross-Period lectureId
    // invariant may contain the same lectureId reused in two different Academic
    // Periods. Different Periods are entirely different semesters, so this must
    // be corrected. We NEVER call Utils.regenerateLectureIds() here (that helper
    // is reserved exclusively for explicit Period duplication) — instead we
    // remap only the specific colliding IDs, and only when it is provably safe.
    repairCrossPeriodLectureIds: () => {
        const sorted = [...State.data.timeline].sort((a, b) => a.startDate.localeCompare(b.startDate));
        const seenIds = new Set();
        let mutated = false;

        // Every lectureId that attendance history actually references, across
        // both profiles and all dates. Colliding IDs in this set are off-limits
        // for automatic repair — we must never silently orphan attendance.
        const attendedIds = new Set();
        CONSTANTS.PROFILES.forEach(prof => {
            const profAtt = State.data.attendance[prof];
            if (!profAtt) return;
            for (const iso in profAtt) {
                for (const lid in profAtt[iso]) attendedIds.add(lid);
            }
        });

        const collectPeriodIds = (period) => {
            const idSet = new Set();
            (period.versions || []).forEach(v => {
                CONSTANTS.PROFILES.forEach(prof => {
                    if (!v.timetables || !v.timetables[prof]) return;
                    CONSTANTS.DAY_KEYS.forEach(day => {
                        const arr = v.timetables[prof][day];
                        if (!Array.isArray(arr)) return;
                        arr.forEach(item => { if (item.lectureId) idSet.add(item.lectureId); });
                    });
                });
            });
            return idSet;
        };

        sorted.forEach(period => {
            const periodIds = collectPeriodIds(period);
            const collidingIds = [...periodIds].filter(id => seenIds.has(id));

            if (collidingIds.length > 0) {
                const unsafeIds = collidingIds.filter(id => attendedIds.has(id));

                if (unsafeIds.length === 0) {
                    // Safe to repair: build a stable old-ID -> new-ID map so that
                    // lectures continuing across this Period's own version splits
                    // still keep sharing an ID with each other, just a new one.
                    const idMap = new Map();
                    collidingIds.forEach(id => idMap.set(id, Utils.generateId("lec")));

                    (period.versions || []).forEach(v => {
                        CONSTANTS.PROFILES.forEach(prof => {
                            if (!v.timetables || !v.timetables[prof]) return;
                            CONSTANTS.DAY_KEYS.forEach(day => {
                                const arr = v.timetables[prof][day];
                                if (!Array.isArray(arr)) return;
                                arr.forEach(item => {
                                    if (idMap.has(item.lectureId)) item.lectureId = idMap.get(item.lectureId);
                                });
                            });
                        });
                    });

                    mutated = true;
                }
                // If any colliding ID is referenced by attendance, we leave this
                // Period's IDs completely untouched. Validation.validateTimeline
                // will then surface the conflict as a save-time error instead of
                // us silently orphaning that attendance record.
            }

            collectPeriodIds(period).forEach(id => seenIds.add(id));
        });

        if (mutated) {
            localStorage.setItem(CONSTANTS.STORAGE.TIMELINE, JSON.stringify(State.data.timeline));
            Storage.saveMetadata();
        }
    }
};

/* =============================================
   MODULE: RESOLVER (Single Source of Truth)
   ============================================= */
const Resolver = {
    resolveAcademicContext: (isoDate) => {
        const activePeriods = State.data.timeline.filter(p => !p.archived);
        
        const period = activePeriods.find(p => isoDate >= p.startDate && isoDate <= p.endDate) || null;
        if (!period) return { period: null, version: null, dayData: [], type: "None", isHoliday: false, isExam: false };
        
        const isHoliday = ["Vacation", "Preparatory Leave"].includes(period.type);
        const isExam = period.type === "Exam Period";

        const version = period.versions.find(v => isoDate >= v.startDate && isoDate <= v.endDate) 
                        || period.versions[period.versions.length - 1];

        const dayKey = Utils.dayKeyFromISO(isoDate);
        let dayData = [];
        
        if (!isHoliday && version && version.timetables && version.timetables[State.currentProfile]) {
            dayData = version.timetables[State.currentProfile][dayKey] || [];
        }

        return { period, version, dayData, type: period.type, isHoliday, isExam };
    }
};

/* =============================================
   MODULE: BACKUP & RESTORE
   ============================================= */
const BackupManager = {
    exportJSON: () => {
        const payload = {
            metadata: State.metadata,
            exportDate: Utils.todayISO(),
            profile: State.currentProfile,
            timeline: State.data.timeline,
            attendance: State.data.attendance
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
        const el = document.createElement('a');
        el.setAttribute("href", dataStr);
        el.setAttribute("download", `smart_attendance_backup_${Utils.todayISO()}.json`);
        document.body.appendChild(el);
        el.click();
        el.remove();
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
                    if (!parsed.timeline || !parsed.attendance) throw new Error("Invalid backup format.");
                    
                    const validation = Validation.validateTimeline(parsed.timeline);
                    if (!validation.valid) throw new Error(`Timeline Validation Failed: ${validation.error}`);
                    
                    State.data.timeline = parsed.timeline;
                    State.data.attendance = parsed.attendance;
                    if (parsed.profile && CONSTANTS.PROFILES.includes(parsed.profile)) {
                        State.currentProfile = parsed.profile;
                    }
                    if (parsed.metadata) {
                        State.metadata = { ...State.metadata, ...parsed.metadata };
                    }
                    
                    Storage.saveTimeline();
                    Storage.saveAttendance();
                    localStorage.setItem(CONSTANTS.STORAGE.PROFILE, State.currentProfile);
                    
                    UI.showAlert("Backup restored successfully!");
                    window.location.reload();
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
   MODULE: ATTENDANCE MANAGER
   ============================================= */
const AttendanceManager = {
    getStatus: (profile, isoDate, item) => {
        const day = State.data.attendance[profile] && State.data.attendance[profile][isoDate];
        if (!day) return null;
        const rec = day[item.lectureId]; 
        return rec ? rec.status : null;
    },
    setStatus: (profile, isoDate, item, status) => {
        if (!State.data.attendance[profile]) State.data.attendance[profile] = {};
        if (!State.data.attendance[profile][isoDate]) State.data.attendance[profile][isoDate] = {};
        const cid = item.lectureId;
        if (status === null) {
            delete State.data.attendance[profile][isoDate][cid];
            if (Object.keys(State.data.attendance[profile][isoDate]).length === 0) {
                delete State.data.attendance[profile][isoDate];
            }
        } else {
            State.data.attendance[profile][isoDate][cid] = {
                status,
                subject: item.subject,
                start: item.start,
                end: item.end,
                type: (item.type || "DSC").toUpperCase(),
                room: item.room || "",
                teacher: item.teacher || "",
            };
        }
        Storage.saveAttendance();
    },
    quickMark: (dayKey, itemIndex, status, btnEl) => {
        const ctx = Resolver.resolveAcademicContext(State.selectedDate);
        if (!ctx.period || !ctx.version || ctx.isHoliday || ctx.isExam) return;
        
        const item = ctx.dayData[itemIndex];
        if (!item || Utils.isBreakItem(item)) return;

        const cur = AttendanceManager.getStatus(State.currentProfile, State.selectedDate, item);
        const newStatus = (cur === status) ? null : status;
        AttendanceManager.setStatus(State.currentProfile, State.selectedDate, item, newStatus);

        const cardId = `card-${itemIndex}`;
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
                )) {
                    b.classList.add("selected");
                }
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
                if (!subjectMap[key]) {
                    subjectMap[key] = { subject: rec.subject, type, history: [] };
                }
                subjectMap[key].history.push({
                    iso,
                    item: { subject: rec.subject, start: rec.start, end: rec.end, type, room: rec.room || "", teacher: rec.teacher || "" },
                    status: rec.status,
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
        const stats = AttendanceManager.getSubjectStats();
        if (stats.length === 0) {
            container.innerHTML = `<div class="att-empty"><span class="att-empty-emoji">📭</span><div class="att-empty-text">No attendance data yet.<br>Mark classes in the Schedule tab.</div></div>`;
            return;
        }
        container.innerHTML = "";
        stats.forEach(({ subject, type, total, attended, pct, marks, key }) => {
            const { insight, risk, riskMsg } = AttendanceManager.getSmartInsight(attended, total, pct, type);
            const pctClass = total > 0 ? (pct >= 75 ? "safe" : pct >= 67 ? "warn" : "danger") : "none";
            const cardRiskClass = risk === "high-risk" ? " risk-critical" : risk === "warning" ? " risk-high" : "";
            const alertHTML = risk ? `<div class="att-alert ${risk}"><span>${risk === 'high-risk' ? '🔴' : '⚠️'}</span><span>${riskMsg}</span></div>` : '';
            const marksHTML = marks !== null ? `<div class="att-marks">🎯 ${marks} marks</div>` : '';

            container.innerHTML += `
                <div class="att-subject-card${cardRiskClass}" onclick="window.openSubjectDetail('${key}')">
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
                        <div class="att-progress-fill ${pctClass}" style="width:${Math.min(100, pct)}%"></div>
                    </div>
                    ${alertHTML}
                    ${insight ? `<div class="att-insight">${insight}</div>` : ''}
                    <div class="att-tap-hint">Tap for details →</div>
                </div>`;
        });
    }
};

/* =============================================
   MODULE: SCHEDULE MANAGER
   ============================================= */
const ScheduleManager = {
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
    },
    renderScheduleForSelected: (direction = null) => {
        const container = document.getElementById("schedule");
        const ctx = Resolver.resolveAcademicContext(State.selectedDate);
        
        UI.updateHeaderLabels(ctx);
        UI.triggerFabVisibility(ctx);

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
                    <div class="sleep-title">${ctx.period.name}</div>
                    <div class="sleep-sub" style="margin-top:12px; font-weight:600">${subText}</div>
                </div>`;
            ScheduleManager.updatePopup(null, ctx);
            return;
        }
        
        if (ctx.isExam && (!ctx.dayData || ctx.dayData.length === 0)) {
            container.innerHTML = `
                <div class="sleep" style="padding-top:40px">
                    <span class="sleep-emoji">${CONSTANTS.PERIOD_TYPES["Exam Period"]}</span>
                    <div class="sleep-title">${ctx.period.name}</div>
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

        sortedData.forEach((item, index) => {
            const startMin = Utils.toMinutes(item.start);
            const endMin = Utils.toMinutes(item.end);
            const isCurrent = viewingToday && (now >= startMin && now < endMin);
            const isBreakCard = Utils.isBreakItem(item);
            const cardId = `card-${index}`;

            if (viewingToday && startMin > now && nextClassTime === null && !isBreakCard) nextClassTime = startMin;
            if (isCurrent) currentCardId = cardId;

            const type = (item.type || "DSC").toUpperCase();
            const tagLabel = isCurrent ? "live" : type;
            const tagText = isCurrent ? '<span class="live-dot"></span>LIVE' : type;
            const extraClass = isBreakCard ? " break-card" : "";
            const roomChip = !isBreakCard && Utils.isValid(item.room) ? `<span class="room">📍 ${item.room}</span>` : '';
            const teacherChip = !isBreakCard && Utils.isValid(item.teacher) ? `<span class="teacher">👤 ${item.teacher}</span>` : '';
            const bottomRow = (roomChip || teacherChip) ? `<div class="bottomRow">${roomChip}${teacherChip}</div>` : '';

            let progressHTML = '';
            if (isCurrent) {
                const pct = Math.min(100, Math.max(0, ((now - startMin) / (endMin - startMin || 60)) * 100));
                progressHTML = `<div class="progress-overlay" style="background:linear-gradient(90deg,rgba(29,61,155,0.06) 0%,rgba(29,61,155,0.06) ${pct}%,transparent ${pct}%,transparent 100%);"></div>`;
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
                        <button class="action-btn act-attend${aActive}" onclick="window.quickMark('${dayKey}',${index},'attended',this)">✅</button>
                        <button class="action-btn act-miss${mActive}" onclick="window.quickMark('${dayKey}',${index},'missed',this)">❌</button>
                        <button class="action-btn act-cancel${cActive}" onclick="window.quickMark('${dayKey}',${index},'cancelled',this)">🚫</button>
                    </div>`;
            }

            container.innerHTML += `
                <div id="${cardId}" class="card${isCurrent ? ' current' : ''}${extraClass}" ${status ? `data-status="${status}"` : ''} onclick="window.openModal('${dayKey}', ${index})">
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
    },
    updateBusySection: () => {
        const todayISO = Utils.todayISO();
        const ctx = Resolver.resolveAcademicContext(todayISO);
        const now = Utils.getNowMins();
        const dayKey = Utils.dayKeyFromISO(todayISO);

        const checkBusy = (profile) => {
            if (!ctx.period || ctx.isHoliday) return null;
            const data = ctx.version.timetables[profile][dayKey] || [];
            for (const item of data) {
                const s = Utils.toMinutes(item.start), e = Utils.toMinutes(item.end);
                if (now >= s && now < e && !Utils.isBreakItem(item)) return item.subject;
            }
            return null;
        };

        const sc = checkBusy("suhani"), lc = checkBusy("laksh");
        document.getElementById("indicatorSuhani").textContent = sc ? `🔴 ${sc}` : "🟢 Free";
        document.getElementById("indicatorLaksh").textContent = lc ? `🔴 ${lc}` : "🟢 Free";

        const sum = document.getElementById("busySummary");
        if (sc && lc) sum.textContent = "Both in class 📚";
        else if (!sc && !lc) sum.textContent = "Both free 🎉";
        else sum.textContent = "";

        const row = document.getElementById("freeTimeRow");
        const text = document.getElementById("freeTimeText");
        
        let nextFree = null;
        if ((sc || lc) && ctx.period && !ctx.isHoliday) {
            const allIntervals = [];
            [ctx.version.timetables.suhani[dayKey] || [], ctx.version.timetables.laksh[dayKey] || []].forEach(arr => {
                arr.filter(i => !Utils.isBreakItem(i)).forEach(i => allIntervals.push([Utils.toMinutes(i.start), Utils.toMinutes(i.end)]));
            });
            allIntervals.sort((a,b) => a[0] - b[0]);
            
            let merged = [];
            for (const iv of allIntervals) {
                if (merged.length && iv[0] <= merged[merged.length-1][1]) {
                    merged[merged.length-1][1] = Math.max(merged[merged.length-1][1], iv[1]);
                } else merged.push(iv);
            }
            
            for (const [, e] of merged) {
                if (e > now) { nextFree = `Today at ${Utils.formatDisplayTime(Utils.pad2(Math.floor(e/60))+":"+Utils.pad2(e%60))}`; break; }
            }
        }

        if (nextFree && row && text) {
            row.style.display = "flex";
            row.classList.remove("hidden");
            text.textContent = `Next free together: ${nextFree}`;
        } else if (row) {
            row.style.display = "none";
            row.classList.add("hidden");
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
                                <span class="text-sm font-semibold text-gray-700">${v.name}</span>
                                <span class="text-xs text-gray-500 font-medium">${Utils.shortDateLabel(Utils.isoToDate(v.startDate))} – ${Utils.shortDateLabel(Utils.isoToDate(v.endDate))}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            }

            container.innerHTML += `
                <div class="att-subject-card" style="padding:16px; margin-bottom:12px;">
                    <div class="flex justify-between items-start mb-1">
                        <div class="font-bold text-lg text-gray-900 leading-tight">${period.name}</div>
                        <span class="att-type-badge timeline-tag">${period.type} ${icon}</span>
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
        State.editingPeriodId = editId;

        const title = document.getElementById("pmTitle");
        const dupContainer = document.getElementById("pmDupContainer");
        const dupSelect = document.getElementById("pmDuplicate");
        
        dupSelect.innerHTML = `<option value="">-- Blank Timetable --</option>`;
        State.data.timeline.filter(p => !p.archived).forEach(p => {
            if (editId !== p.id) dupSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
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
                    // Academic Period duplication intentionally generates NEW lectureIds.
                    // These lectures belong to a completely new semester.
                    // lectureIds must never be shared across different Academic Periods.
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
        overlay.style.display = "flex";
        requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("open", "visible")));
    },
    close: () => {
        const overlay = document.getElementById("versionManagerModal");
        overlay.classList.remove("visible");
        setTimeout(() => { overlay.classList.remove("open"); overlay.style.display = "none"; }, 220);
    },
    renderList: () => {
        const p = State.data.timeline.find(t => t.id === State.versionManager.periodId);
        if (!p) return VersionManager.close();

        document.getElementById("vmTitle").textContent = `${p.name} Versions`;
        const body = document.getElementById("vmBody");
        
        let html = `<div class="flex flex-col gap-3">`;
        p.versions.forEach((v, index) => {
            html += `
                <div class="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                    <div class="flex justify-between items-start mb-2">
                        <div class="font-bold text-gray-900">${v.name}</div>
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
        p.versions.forEach(v => { opts += `<option value="${v.id}">${v.name}</option>`; });

        document.getElementById("vmBody").innerHTML = `
            <div class="modal-field mb-3">
                <label>Version Name</label>
                <input type="text" id="vmNewName" placeholder="e.g. Mid-Sem Revision">
            </div>
            <div class="modal-field mb-3">
                <label>Start Date</label>
                <input type="date" id="vmNewStart" min="${p.startDate}" max="${p.endDate}">
                <div class="hint text-gray-500 mt-1">Previous version will automatically end the day before.</div>
            </div>
            <div class="modal-field mb-3">
                <label>Copy Timetable From</label>
                <select id="vmNewCopy">${opts}</select>
            </div>
            <div class="modal-hint" id="vmFormHint"></div>
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
        
        const newVersion = {
            id: Utils.generateId("v"),
            name: name,
            startDate: start,
            endDate: overlappingVersion.endDate,
            // Version splits intentionally preserve lectureIds.
            // Both timetable versions represent the same underlying lecture
            // across timetable revisions, allowing attendance continuity.
            timetables: Utils.deepClone(copySource.timetables)
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
                <input type="text" id="vmRenameInput" value="${v.name}">
            </div>
            <div class="modal-hint" id="vmFormHint"></div>
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
    openModal: (dayKey, itemIndex) => {
        const ctx = Resolver.resolveAcademicContext(State.selectedDate);
        if (!ctx.period || !ctx.version) return;
        const item = ctx.dayData[itemIndex];
        if (!item) return;

        State.modal = { mode: "view", dayKey, itemIndex, periodId: ctx.period.id, versionId: ctx.version.id };
        
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

        State.modal = { mode: "add", dayKey: Utils.dayKeyFromISO(State.selectedDate), itemIndex: null, periodId: ctx.period.id, versionId: ctx.version.id };
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
        const overlay = document.getElementById("editModal");
        overlay.style.display = "flex";
        requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("open", "visible")));
    },
    close: () => {
        const overlay = document.getElementById("editModal");
        overlay.classList.remove("visible");
        setTimeout(() => { overlay.classList.remove("open"); overlay.style.display = "none"; }, 220);
    },
    setReadonly: (val) => {
        ["edit-subject","edit-start","edit-end","edit-room","edit-teacher"].forEach(id => {
            const el = document.getElementById(id);
            if (val) el.setAttribute("readonly", true); else el.removeAttribute("readonly");
        });
        document.getElementById("editTag").disabled = val;
    },
    updateBreakState: (isBreak, readonly) => {
        const roomF = document.getElementById("edit-room").closest(".modal-field") || document.getElementById("edit-room").parentElement;
        const teachF = document.getElementById("edit-teacher").closest(".modal-field") || document.getElementById("edit-teacher").parentElement;
        const subjE = document.getElementById("edit-subject");

        if (isBreak) {
            if (roomF) roomF.style.display = "none";
            if (teachF) teachF.style.display = "none";
            subjE.classList.add("break-locked");
        } else {
            if (roomF) roomF.style.display = "";
            if (teachF) teachF.style.display = "";
            subjE.classList.remove("break-locked");
            if (!readonly) {
                document.getElementById("edit-room").removeAttribute("readonly");
                document.getElementById("edit-teacher").removeAttribute("readonly");
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

        // Overlap constraint validation
        const newStartMins = Utils.toMinutes(start);
        const newEndMins = Utils.toMinutes(end);
        const hasOverlap = arr.some((existingItem, idx) => {
            if (State.modal.mode === "edit" && idx === State.modal.itemIndex) return false;
            // Ensure no overlaps at all for clean rendering logic
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
            const item = arr[State.modal.itemIndex];
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
            ScheduleManager.updateBusySection();
            ModalManager.close();
        }
    },
    deleteLecture: () => {
        if (State.modal.mode === "add" || State.modal.itemIndex === null) { ModalManager.close(); return; }
        const p = State.data.timeline.find(t => t.id === State.modal.periodId);
        if (!p) return;
        const targetVersion = p.versions.find(v => v.id === State.modal.versionId);
        if (!targetVersion) return;

        const arr = targetVersion.timetables[State.currentProfile][State.modal.dayKey];
        if (!arr || !arr[State.modal.itemIndex]) return;

        UI.showConfirm("Delete this lecture from this version?\n\nNote: Past attendance history is permanently preserved.", () => {
            arr.splice(State.modal.itemIndex, 1);
            if (Storage.saveTimeline()) {
                ScheduleManager.renderScheduleForSelected();
                ScheduleManager.updateBusySection();
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
        overlay.style.display = "flex";
        requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("open","visible")));
    },
    close: () => {
        const overlay = document.getElementById("calendarModal");
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
   MODULE: UI & BINDINGS
   ============================================= */
const UI = {
    injectModals: () => {
        if (!document.getElementById("versionManagerModal")) {
            document.body.insertAdjacentHTML('beforeend', `
            <div id="versionManagerModal" class="modal-overlay" onclick="if(event.target.id === 'versionManagerModal') VersionManager.close()">
                <div class="modal-box">
                    <div class="modal-handle"></div>
                    <div class="modal-header">
                        <span class="modal-title" id="vmTitle">Manage Versions</span>
                        <button class="modal-close" onclick="VersionManager.close()">✕</button>
                    </div>
                    <div class="modal-body" id="vmBody" style="max-height: 50vh; overflow-y: auto;"></div>
                    <div class="modal-footer" id="vmFooter"></div>
                </div>
            </div>
            <div id="customConfirmModal" class="modal-overlay">
                <div class="modal-box" style="padding-bottom: 24px;">
                    <div class="modal-handle"></div>
                    <div class="modal-header" style="margin-bottom: 12px;">
                        <span class="modal-title">Confirm Action</span>
                    </div>
                    <div class="modal-body" id="ccmMessage" style="font-size: 0.9rem; color: #555; white-space: pre-wrap; margin-bottom: 20px;"></div>
                    <div class="modal-footer" style="display:flex; gap: 10px;">
                        <button class="modal-btn save-btn" style="background:var(--red); color:#fff" id="ccmYes">Yes, Confirm</button>
                        <button class="modal-btn cancel-btn" id="ccmNo">Cancel</button>
                    </div>
                </div>
            </div>
            `);
        }
    },
    showAlert: (msg) => {
        UI.showConfirm(msg, () => {}, true);
    },
    showConfirm: (msg, callback, isAlert = false) => {
        const modal = document.getElementById("customConfirmModal");
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
    init: () => {
        UI.injectModals();
        Storage.init();
        State.selectedDate = Utils.todayISO();
        if (Utils.isoToDate(State.selectedDate).getDay() === 0) State.selectedDate = Utils.addDays(State.selectedDate, 1);
        
        UI.switchProfile(State.currentProfile);
        UI.initSwipe();
        UI.scheduleMidnightRefresh();
        
        setInterval(() => {
            if (State.currentTab === "schedule") {
                const ctx = Resolver.resolveAcademicContext(State.selectedDate);
                let nextClassTime = null;
                if (State.selectedDate === Utils.todayISO() && ctx.dayData) {
                    ctx.dayData.forEach(item => {
                        if (!Utils.isBreakItem(item) && Utils.toMinutes(item.start) > Utils.getNowMins() && nextClassTime === null) nextClassTime = Utils.toMinutes(item.start);
                    });
                }
                ScheduleManager.updatePopup(nextClassTime, ctx);
            }
            ScheduleManager.updateBusySection();
        }, 60000);
    },
    switchTab: (tab) => {
        State.currentTab = tab;
        UI.closeDrawer();
        document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
        document.getElementById(`tab-${tab}`).classList.add("active");
        document.querySelectorAll(".drawer-nav-item").forEach(b => b.classList.remove("active"));
        const navBtn = document.getElementById(`nav-${tab}`);
        if (navBtn) navBtn.classList.add("active");
        
        const popup = document.getElementById("nextClassPopup");
        if (popup) popup.style.display = tab === "schedule" ? "" : "none";
        
        if (tab === "attendance") {
            document.getElementById("header-tab-label").textContent = "Attendance";
            AttendanceManager.renderAttendance();
            document.getElementById("fabAdd").style.display = "none";
        } else if (tab === "timeline") {
            document.getElementById("header-tab-label").textContent = "Academic Timeline";
            TimelineManager.renderTimeline();
            document.getElementById("fabAdd").style.display = "none";
        } else {
            const ctx = Resolver.resolveAcademicContext(State.selectedDate);
            UI.updateHeaderLabels(ctx);
            UI.triggerFabVisibility(ctx);
            ScheduleManager.renderScheduleForSelected();
        }
    },
    switchProfile: (profile) => {
        State.currentProfile = profile;
        localStorage.setItem(CONSTANTS.STORAGE.PROFILE, profile);
        document.querySelectorAll(".drawer-profile-btn").forEach(b => b.classList.remove("active"));
        const btn = document.getElementById(`dBtn-${profile}`);
        if (btn) btn.classList.add("active");
        document.getElementById("dCheck-suhani").style.display = profile === "suhani" ? "" : "none";
        document.getElementById("dCheck-laksh").style.display = profile === "laksh" ? "" : "none";

        const avatar = document.getElementById("header-avatar");
        const drawerAva = document.getElementById("drawer-avatar");
        const title = document.getElementById("header-title");
        const dname = document.getElementById("drawer-name");

        if (profile === "suhani") {
            avatar.src = drawerAva.src = "IMG_0162.jpeg";
            title.textContent = "Suhani's Timetable";
            dname.textContent = "Suhani";
        } else {
            avatar.src = drawerAva.src = "IMG_0163.jpeg";
            title.textContent = "Laksh's Timetable";
            dname.textContent = "Laksh";
        }

        if (State.currentTab === "schedule") {
            ScheduleManager.renderDateStrip();
            ScheduleManager.renderScheduleForSelected();
            ScheduleManager.updateBusySection();
        } else if (State.currentTab === "attendance") {
            AttendanceManager.renderAttendance();
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
        headerLabel.textContent = (ctx.period ? `${ctx.period.name} • ` : `NO PERIOD • `) + `${d.getDate()} ${CONSTANTS.MONTH_NAMES_SHORT[d.getMonth()]} • ${dayName}`.toUpperCase();
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

        wrapper.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; isSwiping = false; }, { passive: true });
        wrapper.addEventListener("touchmove", e => { if (Math.abs(e.touches[0].clientX - touchStartX) > Math.abs(e.touches[0].clientY - touchStartY) + 10) isSwiping = true; }, { passive: true });
        wrapper.addEventListener("touchend", e => {
            if (!isSwiping) return;
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
            ScheduleManager.renderDateStrip();
            ScheduleManager.renderScheduleForSelected();
            ScheduleManager.updateBusySection();
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
                        <div class="history-date">${item.subject}</div>
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

    document.getElementById("subjectDetailContent").innerHTML = `
        <button class="detail-back-btn" onclick="window.goBackToAttendance()">← Back</button>
        <div class="detail-hero">
            <div class="detail-subject-name">${stat.subject}</div>
            <div class="detail-type-row"><span class="detail-type-badge">${stat.type}</span></div>
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
            ${insight ? `<div class="att-insight" style="margin-top:10px">${insight}</div>` : ''}
            ${risk ? `<div class="att-alert ${risk}" style="margin-top:10px"><span>${risk === 'high-risk' ? '🔴' : '⚠️'}</span><span>${riskMsg}</span></div>` : ''}
        </div>` : ''}
        <div class="detail-section">
            <div class="detail-section-title">Week-wise Attendance Trend</div>
            <div class="graph-container"><canvas id="attChart" class="graph-canvas"></canvas></div>
            <div class="graph-legend" id="graph-legend"></div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title">End-Semester Simulator</div>
            <div class="endsem-input-row">
                <input type="number" id="endsem-input-${stat.key.replace(/[^a-z0-9]/gi, '_')}" class="endsem-input" placeholder="Remaining classes" min="0" max="200" oninput="window.renderEndSem('${stat.key}')">
                <button class="endsem-btn" onclick="document.getElementById('endsem-input-${stat.key.replace(/[^a-z0-9]/gi, '_')}').value=''; window.renderEndSem('${stat.key}')">Reset</button>
            </div>
            <div id="endsem-result-${stat.key.replace(/[^a-z0-9]/gi, '_')}"></div>
        </div>
        <div class="detail-section"><div class="detail-section-title">Class History</div>${historyHTML}</div>
    `;

    const canvas = document.getElementById("attChart");
    const legendEl = document.getElementById("graph-legend");
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

    if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.parentElement.offsetWidth || 320, H = 180;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + "px"; canvas.style.height = H + "px";
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
        if (weeks.length === 0) {
            ctx.fillStyle = "#9999bb"; ctx.font = `600 13px 'DM Sans', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("Mark some classes to see your weekly trend", W / 2, H / 2);
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
                let trendHTML = weeks.length >= 2 ? (weeks[weeks.length - 1].pct - weeks[0].pct > 1 ? `<span class="graph-trend up">↗ Improving</span>` : weeks[weeks.length - 1].pct - weeks[0].pct < -1 ? `<span class="graph-trend down">↘ Declining</span>` : `<span class="graph-trend flat">→ Steady</span>`) : `<span class="graph-trend flat">→ Just getting started</span>`;
                legendEl.innerHTML = `${trendHTML}<span class="graph-summary">High ${Math.max(...weeks.map(w => w.pct))}% · Low ${Math.min(...weeks.map(w => w.pct))}%</span>`;
            }
        }
    }
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
window.onload = UI.init;
window.openDrawer = UI.openDrawer;
window.closeDrawer = UI.closeDrawer;
window.switchTab = UI.switchTab;
window.switchProfile = (profile) => UI.switchProfile(profile);

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
    document.getElementById("periodModal").classList.remove("visible");
    setTimeout(() => { document.getElementById("periodModal").style.display = "none"; }, 220);
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

window.VersionManager = VersionManager;

// Global Integrations
window.quickMark = AttendanceManager.quickMark;
window.goBackToAttendance = () => UI.switchTab("attendance");
window.exportData = BackupManager.exportJSON;
window.importData = BackupManager.triggerImport;