class Debugger {
    constructor(tabId) {
        this._target = {
            tabId: tabId
        };
    }

    attach() {
        return new Promise((fulfill, reject) => {
            chrome.debugger.attach(this._target, '1.1', () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    fulfill();
                }
            });
        });
    }

    detach() {
        return new Promise((fulfill, reject) => {
            chrome.debugger.detach(this._target, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    fulfill();
                }
            });
        });
    }

    sendCommand(method, params) {
        return new Promise((fulfill, reject) => {
            chrome.debugger.sendCommand(this._target, method, params, (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    fulfill();
                }
            });
        });
    }
}
