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
import is from '@sindresorhus/is';

import {assert} from './assert';
import {trace} from './trace';
import {getServiceWorker} from './worker-helpers';
import {createReadableStreamFromMessagePort, createWritableStreamFromMessageChannel} from './stream-helpers';

const TAG_REQUEST = 'download-request';
const TAG_RESPONSE = 'download-response';

/** @type {Map<string, Array>} */
const entries = new Map(); // pending downloads in worker context

/**
 * @param {ReadableStream} stream
 * @param {string} filename
 * @returns {Promise<void>}
 */
export async function download(stream, filename) {
    assert(stream instanceof ReadableStream, '"stream" is required readable stream');
    assert(is.nonEmptyString(filename), '"filename" is required string');

    // creates communication channel with service worker with response handler
    const channel = new MessageChannel();
    channel.port1.onmessage = handleDownloadResponse;

    // grabs service worker and handles it download along with response channel port
    const sw = await getServiceWorker();
    sw.postMessage(createDownloadRequest(filename), [channel.port2]);

    // creates new data stream over communication channel and pipes given stream in it
    return stream.pipeTo(createWritableStreamFromMessageChannel(channel));
}

/**
 * Service worker receives download message from main context with data and port and keeps it for later.
 * Also signals main context over the port that it is ready to handle fetch.
 * @param {ExtendableMessageEvent} event
 */
export function handleDownloadMessage(event) {
    if (event.data && event.data.tag === TAG_REQUEST) {
        trace(self, handleDownloadMessage, JSON.stringify(event.data));
        const data = event.data;
        const port = event.ports[0];

        const entry = [createReadableStreamFromMessagePort(port), data, port];
        entries.set(data.url, entry);
        port.postMessage({tag: TAG_RESPONSE, downloadUrl: data.url});
    }
}

/**
 * Service worker (for previously seen download request) responds with transferred data
 * from original stream and new headers.
 * @param {FetchEvent} event
 */
export function handleDownloadFetch(event) {
    const url = event.request.url;
    const entry = entries.get(url);

    if (entry) {
        entries.delete(url);
        trace(self, handleDownloadFetch, url);

        const [stream, data] = entry;
        const {filename} = data;
        const headers = new Headers({
            'Content-Type': 'application/octet-stream; charset=utf-8',
            'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
            'Content-Security-Policy': 'default-src \'none\'',
        });

        event.respondWith(new Response(stream, {headers}));
    }
}

/**
 * Main context creates new message to be passed to the service worker.
 * @param {string} filename
 * @returns {object}
 */
function createDownloadRequest(filename) {
    const PREFIX = 6;
    const prefix = String(Math.random()).slice(-PREFIX);
    const url = new URL(`${prefix}/${filename}`, window.location.href).toString();
    return {tag: TAG_REQUEST, filename, url};
}

/**
 * Main context opens new download URL received from the service worker.
 * @param {MessageEvent} event
 */
function handleDownloadResponse(event) {
    trace(self, handleDownloadResponse, event);
    const data = event.data || {};

    if (data.tag === TAG_RESPONSE && is.nonEmptyString(data.downloadUrl)) {
        openInIframe(data.downloadUrl);
    }
}

/**
 * Main context opens given URL in new hidden IFRAME.
 * @param {string} src
 * @returns {HTMLIFrameElement}
 */
function openInIframe(src) {
    const iframe = document.createElement('iframe');
    iframe.hidden = true;
    iframe.src = src;
    document.body.appendChild(iframe);
    return iframe; // TODO: leak?
}
