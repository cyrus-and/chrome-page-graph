function notifyUser(message) {
    console.log(message);
    const li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    const log = document.getElementById('log');
    log.appendChild(li);
}

function setupPopup(tab) {
    const manager = new Manager(tab.id);
    // static controls
    document.getElementById('blank').addEventListener('click', Pages.loadBlank);
    document.getElementById('reload').addEventListener('click', Pages.reload);
    // start button
    const start = document.getElementById('start');
    start.addEventListener('click', function () {
        // immediately disable this button
        this.disabled = true;
        // request a new session
        manager.postMessage('start');
    });
    // stop button
    const stop = document.getElementById('stop');
    stop.addEventListener('click', function () {
        // immediately disable this button
        this.disabled = true;
        // request to finish the current session
        manager.postMessage('stop');
    });
    // report error to the user
    manager.setListener('error', (message) => {
        manager.postMessage('status');
        notifyUser(message);
    });
    // update the UI
    manager.setListener('status', (started) => {
        if (started) {
            start.disabled = true;
            stop.disabled = false;
        } else {
            start.disabled = false;
            stop.disabled = true;
        }
    });
    // enable events and start with asking the status for this tab
    manager.enable();
    manager.postMessage('status');
}

// connect to the event page and start popup
Tabs.getActive()
    .then(setupPopup)
    .catch(notifyUser);
