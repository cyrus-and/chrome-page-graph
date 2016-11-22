class Port {
    constructor() {
        this._listeners = new Map();
    }

    enable() {
        this._port.onMessage.addListener(this._messageHandler.bind(this));
    }

    postMessage(type, payload) {
        // common message format
        this._port.postMessage({
            type: type,
            payload: payload
        });
    }

    setListener(type, listener) {
        this._listeners.set(type, listener);
    }

    _messageHandler(message) {
        const listener = this._listeners.get(message.type);
        if (!listener) {
            console.error(`Unknown message type '${message.type}'`);
            return;
        }
        listener(message.payload);
    }
}
