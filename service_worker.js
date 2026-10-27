/* ==========================================================================
   SMART ATTENDANCE V9 — service-worker.js
   Offline-First Application Shell & Static Asset Cache for GitHub Pages
   ========================================================================== */

const SW_VERSION = "smart-attendance-v9.0.0";
const SHELL_CACHE = `${SW_VERSION}-shell`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;

// Core local files relative to the service worker scope (works at root / or /Smart-Schedule-and-Attendance/)
const CORE_SHELL_ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json"
];

// Optional local/external assets cached best-effort during install so missing avatars or offline CDNs never break install
const OPTIONAL_PRECACHE_ASSETS = [
    "./IMG_0162.jpeg",
    "./IMG_0163.jpeg",
    "https://cdn.tailwindcss.com",
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,900&family=DM+Serif+Display&display=swap"
];

/**
 * Determine whether a request targets Supabase APIs or authenticated endpoints.
 * CRITICAL SECURITY RULE: Never cache Supabase REST, Auth, Storage, or Realtime responses in the Service Worker.
 */
function isAuthenticatedOrApiRequest(urlObj, request) {
    if (request.method !== "GET") return true;
    const host = urlObj.hostname.toLowerCase();
    if (host.endsWith(".supabase.co") || host.includes("supabase")) return true;
    if (request.headers.get("Authorization") || request.headers.get("apikey")) return true;
    return false;
}

/**
 * Determine whether an external GET request is a safe static CDN asset (fonts, Tailwind, Supabase JS SDK).
 */
function isAllowedRuntimeStaticAsset(urlObj) {
    const host = urlObj.hostname.toLowerCase();
    return (
        host === "cdn.tailwindcss.com" ||
        host === "cdn.jsdelivr.net" ||
        host === "fonts.googleapis.com" ||
        host === "fonts.gstatic.com"
    );
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(SHELL_CACHE);
            // 1. Strictly cache core local app shell
            await cache.addAll(CORE_SHELL_ASSETS);

            // 2. Best-effort precache optional images & external CDN scripts
            await Promise.allSettled(
                OPTIONAL_PRECACHE_ASSETS.map(async (assetUrl) => {
                    try {
                        const req = new Request(assetUrl, { mode: assetUrl.startsWith("http") ? "cors" : "same-origin" });
                        const res = await fetch(req);
                        if (res && (res.ok || res.type === "opaque")) {
                            await cache.put(assetUrl, res);
                        }
                    } catch (_) {
                        // Fallback if no-cors needed for opaque script/font
                        try {
                            const noCorsReq = new Request(assetUrl, { mode: "no-cors" });
                            const noCorsRes = await fetch(noCorsReq);
                            if (noCorsRes) await cache.put(assetUrl, noCorsRes);
                        } catch (_err) {
                            // Ignore individual optional asset failure during install
                        }
                    }
                })
            );

            await self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys.map((key) => {
                    if (key !== SHELL_CACHE && key !== RUNTIME_CACHE) {
                        return caches.delete(key);
                    }
                    return Promise.resolve();
                })
            );
            await self.clients.claim();
        })()
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    const urlObj = new URL(request.url);

    // 1. NEVER intercept or cache non-GET or Supabase API/Auth requests
    if (isAuthenticatedOrApiRequest(urlObj, request)) {
        return;
    }

    // 2. HTML Navigation Requests: Network-First with fast fallback to cached ./index.html
    if (request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html")) {
        event.respondWith(
            (async () => {
                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && networkResponse.ok) {
                        const shellCache = await caches.open(SHELL_CACHE);
                        shellCache.put("./index.html", networkResponse.clone());
                    }
                    return networkResponse;
                } catch (_) {
                    const cachedIndex =
                        (await caches.match(request, { ignoreSearch: true })) ||
                        (await caches.match("./index.html")) ||
                        (await caches.match("./"));
                    if (cachedIndex) return cachedIndex;
                    return new Response(
                        "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Offline</title></head><body style='font-family:sans-serif;padding:2rem;text-align:center;'><h2>Smart Attendance is Offline</h2><p>Please connect to the internet once to cache the application shell.</p></body></html>",
                        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
                    );
                }
            })()
        );
        return;
    }

    // 3. Same-Origin Static Assets (style.css, script.js, manifest.json, avatars): Stale-While-Revalidate
    if (urlObj.origin === self.location.origin) {
        event.respondWith(
            (async () => {
                const cached = await caches.match(request, { ignoreSearch: true });
                const fetchPromise = fetch(request)
                    .then(async (networkRes) => {
                        if (networkRes && networkRes.ok) {
                            const cache = await caches.open(SHELL_CACHE);
                            await cache.put(request, networkRes.clone());
                        }
                        return networkRes;
                    })
                    .catch(() => null);

                if (cached) {
                    event.waitUntil(fetchPromise);
                    return cached;
                }
                const live = await fetchPromise;
                if (live) return live;
                return new Response("", { status: 504, statusText: "Offline Asset Unavailable" });
            })()
        );
        return;
    }

    // 4. Allowed External Static CDN Assets (Tailwind, Supabase JS SDK, Google Fonts): Cache-First with Background Refresh
    if (isAllowedRuntimeStaticAsset(urlObj)) {
        event.respondWith(
            (async () => {
                const cached = (await caches.match(request)) || (await caches.match(request.url));
                const updatePromise = fetch(request)
                    .then(async (networkRes) => {
                        if (networkRes && (networkRes.ok || networkRes.type === "opaque")) {
                            const runtimeCache = await caches.open(RUNTIME_CACHE);
                            await runtimeCache.put(request, networkRes.clone());
                        }
                        return networkRes;
                    })
                    .catch(() => null);

                if (cached) {
                    event.waitUntil(updatePromise);
                    return cached;
                }
                const live = await updatePromise;
                if (live) return live;
                return new Response("", { status: 504, statusText: "CDN Asset Offline" });
            })()
        );
    }
});

// Listen for client messages (e.g., SKIP_WAITING or manual sync ping)
self.addEventListener("message", (event) => {
    if (!event.data) return;
    if (event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});