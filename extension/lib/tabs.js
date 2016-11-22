class Tabs {
    static get(tabId) {
        return new Promise((fulfill, reject) => {
            chrome.tabs.get(tabId, (tab) => {
                if (tab) {
                    fulfill(tab);
                } else {
                    reject(new Error(`Cannot get tab by id '${tabId}'`));
                }
            });
        });
    }

    static getActive() {
        return new Promise((fulfill, reject) => {
            const options = {
                active: true,
                currentWindow: true
            };
            chrome.tabs.query(options, (tabs) => {
                if (tabs.length === 1) {
                    fulfill(tabs[0]);
                } else {
                    reject(new Error('Cannot get the current tab'));
                }
            });
        });
    }

    static create(url) {
        return new Promise((fulfill, reject) => {
            const options = {
                url: url
            };
            chrome.tabs.create(options, (tab) => {
                fulfill(tab);
            });
        });
    }
}
