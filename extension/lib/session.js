class Session extends Port {
    constructor(tabId) {
        super();
        this._debugger = new Debugger(tabId);
        this._events = [];
        this._isStarted = false;
    }

    setPort(port) {
        this._port = port;
    }

    start() {
        // attach the tab and enable network domain events
        return this._debugger.attach()
            .then(() => this._debugger.sendCommand('Network.enable'))
            .then(() => {
                // start over
                this._events = [];
                this._isStarted = true;
            });
    }

    update(method, params) {
        // log a new event
        this._events.push({
            method: method,
            params: params
        });
    }

    stop() {
        // detach the tab
        return this._debugger.detach()
            .then(() => {
                this._isStarted = false;
            });
    }

    fetchEvents() {
        return this._events;
    }

    isStarted() {
        return this._isStarted;
    }
}
