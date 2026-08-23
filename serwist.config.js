// @ts-check

/** @type {import("@serwist/sw").PrecacheEntry[]} */
const precacheEntries = [
  { url: "/", revision: "1" },
  { url: "/reports", revision: "1" },
  { url: "/dashboard", revision: "1" },
  { url: "/admin", revision: "1" },
  { url: "/manifest.json", revision: "1" },
];

/** @type {import("@serwist/sw").RuntimeCaching[]} */
const runtimeCaching = [
  {
    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "google-fonts-cache",
      expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
    },
  },
  {
    urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "gstatic-fonts-cache",
      expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
    },
  },
  {
    urlPattern: /\/api\/.*/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "api-cache",
      expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
      networkTimeoutSeconds: 5,
    },
  },
  {
    urlPattern: /\/_next\/static\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "next-static-cache",
      expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
    },
  },
];

export default {
  precacheEntries,
  runtimeCaching,
};
