class Graph {
    static from(events) {
        // process the events
        const graph = new Graph();
        events.forEach((event) => {
            switch (event.method) {
            case 'Network.requestWillBeSent':
                graph._requestWillBeSent(event.params);
                break;

            case 'Network.responseReceived':
                graph._responseReceived(event.params);
                break;

            case 'Network.dataReceived':
                graph._dataReceived(event.params);
                break;

            case 'Network.loadingFinished':
                graph._loadingFinished(event.params);
                break;
            }
        });
        // {
        //     url: [
        //         {
        //             '<instance info>',
        //             initiators: [
        //                 url, ...
        //             ]
        //         },
        //         ...
        //     ]
        // }
        return graph._build();
    }

    constructor() {
        this._descriptors = new Map(); // requestId -> metadata
        this._objects = new Map(); // url -> [instance, ...]
    }

    _requestWillBeSent(params) {
        // process redirect responses separately as they have the same requestId
        // but initiator set to 'other'
        if (params.redirectResponse) {
            const descriptor = this._descriptors.get(params.requestId);
            if (!descriptor) {
                console.log(`[${params.requestId}] Redirect without a prior request: '${params.request.url}'`);
                return;
            }
            // update only the url
            descriptor.url = params.request.url;
        } else {
            // initialize the descriptor (some fields are filled later)
            const descriptor = {};
            this._descriptors.set(params.requestId, descriptor);
            descriptor.url = params.request.url;
            descriptor.requestParams = params;
            descriptor.responseParams = undefined;
            descriptor.size = 0;
        }
    }

    _responseReceived(params) {
        // skip incomplete requests
        const descriptor = this._descriptors.get(params.requestId);
        if (!descriptor) {
            console.log(`[${params.requestId}] Response without a prior request: '${params.response.url}'`);
            return;
        }
        // add the Network.responseReceived params
        descriptor.responseParams = params;
    }

    _dataReceived(params) {
        // skip incomplete requests
        const descriptor = this._descriptors.get(params.requestId);
        if (!descriptor) {
            console.log(`[${params.requestId}] Data without a prior request`);
            return;
        }
        // update the object (effective) size as response.encodedDataLength is
        // not reliable and the content-length header may not be present (e.g.,
        // chunked response)
        descriptor.size += params.dataLength;
    }

    _loadingFinished(params) {
        // skip incomplete requests
        const descriptor = this._descriptors.get(params.requestId);
        if (!descriptor) {
            console.log(`[${params.requestId}] Finished without a prior request`);
            return;
        }
        // check that a response has been received
        if (!descriptor.responseParams) {
            console.log(`[${params.requestId}] Finished without a prior response '${descriptor.url}'`);
            return;
        }
        // extract initiators and exclude chrome error pages data and extensions
        const initiators = _extractInitiators(descriptor.requestParams);
        const excludeRegex = /^(data:text\/html,chromewebdata$|chrome-extension:)/;
        if (initiators.find(i => i.match(excludeRegex))) {
            console.log(`[${params.requestId}] Initiated by a Chrome internal resource '${descriptor.url}'`);
            return;
        }
        // populate the instance
        const instance = {};
        instance.document = descriptor.requestParams.documentURL;
        instance.method = descriptor.requestParams.request.method;
        instance.status = descriptor.responseParams.response.status;
        instance.mime = descriptor.responseParams.response.mimeType;
        instance.size = descriptor.size;
        instance.initiators = initiators;
        // append this instance to the object
        const url = descriptor.url;
        let instances = this._objects.get(url);
        if (!instances) {
            instances = [];
            this._objects.set(url, instances);
        }
        instances.push(instance);
    }

    // XXX this can probably be improved...
    _build() {
        const nodes = [];
        const links = [];
        const map = new Map();
        const inDregrees = new Map();
        // first process all the objects and populate the map
        let nextId = 0;
        this._objects.forEach((_, url) => {
            map.set(url, nextId++);
        });
        // then populate the graph
        this._objects.forEach((instances, url) => {
            const objectId = map.get(url);
            // create the object for this url (type can change according to the
            // number of instances)
            nodes[objectId] = {
                type: 'node-placeholder',
                url: url
            };
            // process all its instances
            instances.forEach((instance) => {
                let instanceId;
                // the original node is the only instance
                if (instances.length == 1) {
                    instanceId = objectId;
                    nodes[instanceId].instance = instance;
                    nodes[instanceId].type = 'node-instance';
                }
                // the original node is just a placeholder
                else {
                    // create the instances
                    instanceId = nextId++;
                    nodes[instanceId] = {
                        type: 'node-instance',
                        url: url,
                        instance: instance
                    };
                    // link back to the original node
                    links.push({
                        source: objectId,
                        target: instanceId,
                        type: 'link-instance'
                    });
                }
                // link all the initiators anyway
                instance.initiators.forEach((initiatorUrl) => {
                    const initiatorId = map.get(initiatorUrl);
                    // exclude links with not captured initiators
                    if (typeof initiatorId === 'undefined') {
                        console.log(`Not captured: '${initiatorUrl}'`);
                        return;
                    }
                    // make the link
                    links.push({
                        source: instanceId,
                        target: initiatorId,
                        type: 'link-initiator'
                    });
                    // increase the number of inbound links
                    const inDregree = inDregrees.get(initiatorId) || 0;
                    inDregrees.set(initiatorId, inDregree + 1);
                });
            });
        });
        // assign the attribute
        nodes.forEach((node, id) => {
            const inDregree = inDregrees.get(id);
            node.inDregree = inDregree || 0;
        });
        // finally return the components
        return {
            nodes: nodes,
            links: links
        };
    }
}

// extract initiators from a Chrome request params
function _extractInitiators(requestParams) {
    const initiator = requestParams.initiator;
    switch (initiator.type) {
    case 'other': // user-initiated; do nothing
        return [];

    case 'parser':
        return [initiator.url];

    case 'script':
        // skip empty stack traces (TODO why does this even happen?)
        if (initiator.stack === undefined) {
            console.log(`[${requestParams.requestId}] Empty stack trace`);
            return [];
        }
        // keep unique initiators
        const set = new Set();
        initiator.stack.callFrames.forEach((frame) => {
            set.add(frame.url);
        });
        // skip empty URLs in call stack (TODO why does this even happen?)
        set.delete('');
        return Array.from(set);

    default:
        console.log(`[${requestParams.requestId}] Unknown initiator '${initiator.type}'`);
        return [];
    }
}
