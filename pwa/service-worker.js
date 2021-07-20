/* eslint-disable import/no-extraneous-dependencies */
import { precacheAndRoute } from 'workbox-precaching';
/* eslint-disable no-undef */
/* eslint-disable compat/compat */
/* eslint-disable no-restricted-globals */
self.importScripts('swenv.js');
if (typeof idb === 'undefined') {
  self.importScripts('idb.js');
}

precacheAndRoute(self.__WB_MANIFEST);

const resourcePrefix = swenv?.S3_PUBLIC_PREFIX;

const CACHE_NAME = 'dev-v1';

const urlsToPrefetch = [
  `${resourcePrefix}/console-vehicles/trailer.obj`,
  `${resourcePrefix}/console-vehicles/suv.obj`,
  `${resourcePrefix}/console-vehicles/sev.obj`,
  `${resourcePrefix}/console-vehicles/bus.obj`,
  `${resourcePrefix}/console-vehicles/saloon.obj`,

  `${resourcePrefix}/console-vehicles/trailer.png`,
  `${resourcePrefix}/console-vehicles/suv.png`,
  `${resourcePrefix}/console-vehicles/sev.png`,
  `${resourcePrefix}/console-vehicles/bus.png`,
  `${resourcePrefix}/console-vehicles/saloon.png`,
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      cache.addAll(urlsToPrefetch.map(urlToPrefetch => new Request(urlToPrefetch))).then(() => {
        // console.log('All resources have been fetched and cached.');
      });
    })
  );
});

const fallbackDbPatterns = [new RegExp(`${resourcePrefix}/maps/.+json`)];

const needCachePatterns = [...fallbackDbPatterns, new RegExp(`${resourcePrefix}/utc-map-gl/.+`)];

const ifURLNeedCache = url => needCachePatterns.some(p => p.test(url));

const ifURLNeedFallback = url => fallbackDbPatterns.some(p => p.test(url));

const isResponseSuccess = res => res.status >= 200 && res.status < 400;

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // 该fetch请求已经缓存
      if (response && isResponseSuccess(response)) {
        // console.log('[Hit Valid Cache]', event.request);
        return response;
      }

      if (ifURLNeedCache(event.request.url)) {
        return fetch(event.request)
          .then(resp => {
            return caches.open(CACHE_NAME).then(async cache => {
              const respClone = resp.clone();
              const respClone2 = resp.clone();
              cache.put(event.request, respClone);

              const suffix = 'json';
              if (ifURLNeedFallback(event.request.url) && event.request.url.endsWith(`.${suffix}`)) {
                if (isResponseSuccess(respClone)) {
                  respClone2.json().then(json => {
                    writeDB('fallback', suffix, event.request.url, json);
                  });
                } else {
                  // console.log('Get fallback data ing', event.request.url);
                  const cacheResp = await readDB('fallback', suffix, event.request.url).then(item => {
                    const blob = new Blob([JSON.stringify(item, null, 2)], {
                      type: 'application/json',
                    });

                    return new Response(blob, { status: 200, statusText: '' });
                  });

                  // console.log(cacheResp);

                  if (cacheResp) {
                    return cacheResp;
                  }

                  return fetch(event.request);
                }
              }
              return resp;
            });
          })
          .catch(err => {
            // console.log('Fetch failed', event.request.url, err);
          });
      }

      return fetch(event.request);
    })
  );
});

function createDB(database, objectStore) {
  idb.openDB(database, 1, {
    upgrade(db) {
      db.createObjectStore(objectStore);
    },
  });
}

function writeDB(database, objectStore, key, value) {
  idb.openDB(database, 1).then(db => {
    return db.put(objectStore, value, key);
  });
}

function readDB(database, objectStore, key) {
  return idb.openDB(database, 1).then(db => {
    return db.get(objectStore, key);
  });
}

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keyList => {
        return Promise.all(
          keyList.map(key => {
            return caches.delete(key);
          })
        );
      }),
      createDB('fallback', 'json'),
    ])
  );
});

export {};
