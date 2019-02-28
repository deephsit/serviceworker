const applicationServerPublicKey = 'BCW6JPG-T7Jx0bYKMhAbL6j3DL3VTTib7dwvBjQ' +
    'C_496a12auzzKFnjgFjCsys_YtWkeMLhogfSlyM0CaIktx7o';

function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        var version = '1.0.3.5';
        registerServiceWorker().then(function (reg) {

            // update sw when version is not correct
            if (localStorage.getItem('sw_version') !== version) {
                reg.update().then(function () {
                    localStorage.setItem('sw_version', version)
                });
            }

            // registration worked
            // console.log('Registration succeeded. Scope is ' + reg.scope);
            self.addEventListener('install', function (event) {
                console.log('service worker is installing')
                event.waitUntil(event.skipWaiting());
                event.waitUntil(
                    caches.open('v1').then(function (cache) {
                        return cache.addAll([
                            '/',
                            '/dev',
                        ]);
                    })
                );
            });
            self.addEventListener('fetch', function (event) {
                console.log(event.request);
                event.respondWith(
                    caches.match(event.request).then(function (response) {
                        // proxy stuff

                        // if Service Worker has it, response, reduce http request
                        if (response) {
                            return response;
                        }

                        // if service worker do not have it, request remote site
                        var request = event.request.clone(); // origin request
                        return fetch(request).then(function (httpRes) {
                            console.log('http response', httpRes);
                            // got http response

                            // if failed
                            if (!httpRes || httpRes.status !== 200) {
                                return httpRes;
                            }

                            // if success, cache it
                            var responseClone = httpRes.clone();
                            caches.open('v1').then(function (cache) {
                                cache.put(event.request, responseClone);
                            });

                            return httpRes;
                        });
                    })
                );
            });
            self.addEventListener('activate', event => {
                event.waitUntil(
                    Promise.all([
                        // update client
                        self.clients.claim(),
                        // clear old version
                        caches.keys().then(function (cacheList) {
                            return Promise.all(
                                cacheList.map(function (cacheName) {
                                    if (cacheName !== 'v1') {
                                        return caches.delete(cacheName);
                                    }
                                })
                            );
                        })
                    ])
                );
                // let expectedCacheNames = Object.keys(CURRENT_CACHES).map(function (key) {
                //     return CURRENT_CACHES[key];
                // });
                // event.waitUntil(caches.keys().then(cacheNames => {
                //     return Promise.all(cacheNames.map(cacheName => {
                //         if (expectedCacheNames.indexOf(cacheName) === -1) {
                //             console.log('Deleting out of date cache:', cacheName);
                //             return caches.delete(cacheName);
                //         }
                //     }));
                // }));
            });
            // notification
            if (!('PushManager' in window)) {
                // Push isn't supported on this browser, disable or hide UI.
                return;
            }

            let promiseChain = new Promise((resolve, reject) => {
                    const permissionPromise = Notification.requestPermission(result => {
                        resolve(result);
                    });

                    if (permissionPromise) {
                        permissionPromise.then(resolve);
                    }
                })
                .then(result => {
                    if (result === 'granted') {
                        // reg.showNotification('Hello from CONNI!');
                        reg.pushManager.getSubscription().then(function (sub) {
                            if (sub === null) {
                                // Update UI to ask user to register for Push
                                console.log('Not subscribed to push service!');
                                subscribeUser();
                            } else {
                                // We have a subscription, update the database
                                console.log('Subscription object: ', sub);
                            }
                        });
                    } else {
                        console.log('no permission');
                    }
                });

            self.addEventListener('push', function (e) {
                console.log('function push executed', e)
                clients.matchAll().then(function (c) {
                    if (c.length === 0) {
                        // Show notification
                        e.waitUntil(
                            reg.pushManager.showNotification('Push notification')
                        );
                    } else {
                        // Send a message to the page to update the UI
                        console.log('Application is already open!');
                    }
                });
            });

            function subscribeUser() {
                const applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
                reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: applicationServerKey
                    })
                    .then(function (subscription) {
                        console.log('User is subscribed.');

                        // updateSubscriptionOnServer(subscription);

                        // isSubscribed = true;
                    })
                    .catch(function (err) {
                        console.log('Failed to subscribe the user: ', err);
                        updateBtn();
                    });
            }
        });
    })
}

function registerServiceWorker() {
    return navigator.serviceWorker.register('/serviceworker/serviceworker.js', {
            scope: '/serviceworker/'
        })
        .then(registration => {
            console.log('Service worker successfully registered.');
            return registration;
        })
        .catch(err => {
            console.error('Unable to register service worker.', err);
        });
}
