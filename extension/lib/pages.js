class Pages {
    static reload() {
        return new Promise((fulfill, reject) => {
            const options = {
                bypassCache: true
            };
            chrome.tabs.reload(options, fulfill);
        });
    }

    static loadBlank() {
        return new Promise((fulfill, reject) => {
            const options = {
                url: 'about:blank'
            };
            chrome.tabs.update(options, fulfill);
        });
    }
}
