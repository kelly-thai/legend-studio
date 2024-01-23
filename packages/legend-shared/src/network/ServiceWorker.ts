/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {trace} from './trace';

export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () =>
            navigator.serviceWorker.register('service-worker.js')
                .then(reg => trace(registerServiceWorker, 'registered', reg.scope))
                .catch(error => trace(registerServiceWorker, 'error', error)), {once: true});
    }
}

/**
 * @param {string} [clientUrl]
 * @returns {Promise<ServiceWorker | undefined>}
 */
export function getServiceWorker(clientUrl) {
    if (!('serviceWorker' in navigator)) {
        return Promise.reject(new Error('Service worker is not available; HTTPS protocol is required.'));
    }

    return navigator.serviceWorker.getRegistration(clientUrl).then(reg => {
        const pending = reg.installing || reg.waiting;

        return reg.active || new Promise(resolve => {
            const listener = () => {
                if (pending.state === 'activated') {
                    pending.removeEventListener('statechange', listener);
                    resolve(reg.active);
                }
            };

            pending.addEventListener('statechange', listener);
        });
    });
}
