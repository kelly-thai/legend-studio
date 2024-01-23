import {assert} from './assert';
import {trace} from './trace';

// pair of streams copying data across context until transferable streams land
// https://www.chromestatus.com/feature/5298733486964736

const STREAM_CLOSED = '#stream-closed';
const STREAM_ABORTED = '#stream-aborted';

/**
 * @param {MessageChannel} channel
 * @returns {WritableStream<any>}
 */
export function createWritableStreamFromMessageChannel(channel) {
    assert(channel instanceof MessageChannel, '"channel" is required instance of MessageChannel');

    return new WritableStream({
        write(chunk) {
            channel.port1.postMessage(chunk);
        },
        close() {
            channel.port1.postMessage(STREAM_CLOSED);
        },
        abort() {
            channel.port1.postMessage(STREAM_ABORTED);
            closePort(channel.port1);
            closePort(channel.port2);
        }
    });
}

/**
 * @param {MessagePort} port
 * @returns {ReadableStream<any>}
 */
export function createReadableStreamFromMessagePort(port) {
    assert(port instanceof MessagePort, '"port" is required instance of MessagePort');

    return new ReadableStream({
        start(controller) {
            port.onmessage = ({data}) => {
                if (data === STREAM_CLOSED) {
                    return controller.close();
                }

                if (data === STREAM_ABORTED) {
                    controller.error('aborted');
                    return undefined;
                }

                controller.enqueue(data);
                return undefined;
            };
        },
        cancel() {
            trace('aborted');
        }
    });
}

/**
 * @param {MessagePort} port
 */
function closePort(port) {
    assert(port instanceof MessagePort, '"port" is required instance of MessagePort');
    port.onmessage = null;
    port.close();
}
