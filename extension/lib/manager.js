class Manager extends Port {
    constructor(tabId) {
        super();
        // connect to the event page
        this._port = chrome.runtime.connect({
            name: tabId.toString()
        });
    }

    static fetchGraph(graphId) {
        return new Promise((fulfill, reject) => {
            chrome.runtime.sendMessage(graphId, (graph) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    if (graph) {
                        fulfill(graph);
                    } else {
                        reject(new Error('Graph expired'));
                    }
                }
            });
        });
    }

    static run() {
        chrome.debugger.onEvent.addListener(Manager._debuggerEventHandler);
        chrome.runtime.onConnect.addListener(Manager._connectionHandler);
        chrome.runtime.onMessage.addListener(Manager._messageHandler);
        chrome.tabs.onRemoved.addListener(Manager._tabRemoveHandler);
    }

    static _debuggerEventHandler(source, method, params) {
        const tabId = source.tabId;
        const session = Manager._sessions.get(tabId);
        if (session) {
            session.update(method, params);
        }
    }

    static _connectionHandler(port) {
        // fetch or create a new session for this tab
        const tabId = parseInt(port.name);
        let session = Manager._sessions.get(tabId);
        if (!session) {
            session = new Session(tabId);
            Manager._sessions.set(tabId, session);
        }
        // set/update the port for this sesssion (i.e., a new popup instance)
        // and enable event reception
        session.setPort(port);
        session.enable();
        // reply the session status
        session.setListener('status', () => {
            session.postMessage('status', session.isStarted());
        });
        // attach the debugger to the tab and notify the popup
        session.setListener('start', () => {
            session.start().then(() => {
                session.postMessage('status', true);
            }).catch((err) => {
                console.error(err);
                session.postMessage('error', err.toString());
            });
        });
        // detach the debugger and notify the popup
        session.setListener('stop', () => {
            session.stop().then(() => {
                session.postMessage('status', false);
                // build the graph and display it in a new tab
                const events = session.fetchEvents();
                const graph = Graph.from(events);
                const graphId = new Date().getTime().toString();
                Manager._graphs.set(graphId, graph);
                return Tabs.create(`/pages/graph/graph.html#${graphId}`);
            }).catch((err) => {
                console.error(err);
                session.postMessage('error', err.toString());
            });
        });
    }

    static _messageHandler(message, sender, sendResponse) {
        // graphs can be dropped by Chrome when there are no more open tabs
        // belonging to this extension
        const graphId = message;
        const graph = Manager._graphs.get(graphId);
        sendResponse(graph);
    }

    static _tabRemoveHandler(tabId, removeInfo) {
        // remove the session associated to the closing tab
        Manager._sessions.delete(tabId);
    }
}

Manager._sessions = new Map();
Manager._graphs = new Map();
