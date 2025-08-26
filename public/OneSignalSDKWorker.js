/* global OneSignalDeferred, OneSignal */
/* eslint-disable */

// OneSignal Service Worker
// This file is required for OneSignal push notifications to work in the browser

self.addEventListener('install', function (event) {
  console.log('[OneSignal SW]: Installing service worker...')
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', function (event) {
  console.log('[OneSignal SW]: Activating service worker...')
  event.waitUntil(self.clients.claim())
})

// Import OneSignal Service Worker Scripts
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js')