class Canvas {
    constructor(graph) {
        this._graph = graph;
        // SVG initialization
        this._svg = d3.select('body').append('svg');
        this._holder = this._svg.append('g');
        // parameters
        this._params = {
            arrowWidthRatio: 2,
            arrowLengthRatio: 2,
            bulletRadius: 5,
            bulletStrokeWidth: 0.5,
            nodeRadius: 20,
            zoomRange: [0.1, 5],
            charge: -200,
            linkDistanceBase: 100,
            linkDistanceStep: 50,
            linkDistanceRandomness: 1,
            fixedNodesSaturation: 0.5
        };
        // setup
        this._setupDefs();
        this._setupSimulation();
        this._setupMimeClassification();
        this._setupNodeDrag();
        this._setupPanAndZoom();
        this._setupWindowResize();
        this._setupInformationDisplay();
        this._setupTools();
    }

    _setupDefs() {
        const defs = this._svg.append('defs');
        // link start marker (arrow)
        const arrowWidth = this._params.nodeRadius * this._params.arrowWidthRatio;
        const arrowLength = this._params.nodeRadius * this._params.arrowLengthRatio;
        defs.append('marker')
            .attr('id', 'link-initiator-start-marker')
            .attr('viewBox', '0 0 2 2')
            .attr('refX', 0)
            .attr('refY', 1)
            .attr('markerUnits', 'userSpaceOnUse')
            .attr('markerWidth', arrowWidth)
            .attr('markerHeight', arrowLength)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M 0 0 L 0 2 L 2 1 z');
        // link end marker (bullet)
        const bulletDiameter = this._params.bulletRadius * 2;
        defs.append('marker')
            .attr('id', 'link-initiator-end-marker')
            .attr('viewBox', `0 0 ${bulletDiameter} ${bulletDiameter}`)
            .attr('refX', this._params.nodeRadius + this._params.bulletRadius)
            .attr('refY', this._params.bulletRadius)
            .attr('markerUnits', 'userSpaceOnUse')
            .attr('markerWidth', bulletDiameter)
            .attr('markerHeight', bulletDiameter)
            .attr('orient', 'auto')
            .append('circle')
            .attr('r', this._params.bulletRadius - this._params.bulletStrokeWidth)
            .attr('cx', this._params.bulletRadius)
            .attr('cy', this._params.bulletRadius)
            .attr('stroke-width', this._params.bulletStrokeWidth);
        // fixed node filter
        defs.append('filter')
            .attr('id', 'fixed-node-filter')
            .append('feColorMatrix')
            .attr('in', 'SourceGraphic')
            .attr('type', 'saturate')
            .attr('values', this._params.fixedNodesSaturation);
    }

    _setupSimulation() {
        // create a force simulation
        this._simulation = d3.forceSimulation()
            .force('link', d3.forceLink().distance((data) => {
                // having many inbound links on the source node causes the link
                // length to increase to differentiate from other inbound links
                // with less/more inbound links themselves
                const source = this._params.linkDistanceBase +
                      Math.log(data.source.inDregree + 1) * this._params.linkDistanceStep;
                // having many inbound links on the target node causes the link
                // length to be randomized to accommodate more source nodes
                const target = Math.random() *
                      (data.target.inDregree * this._params.linkDistanceRandomness);
                // sum both the contributions
                return source + target;
            }))
            .force('charge', d3.forceManyBody().strength(this._params.charge));
        // add nodes and then links data to the simulation
        this._simulation
            .nodes(this._graph.nodes)
            .force('link')
            .links(this._graph.links);
        // create links elements (*over* nodes)
        this._linkElements = this._holder.selectAll()
            .append('g')
            .data(this._graph.links)
            .enter()
            .append('line')
            .attr('class', data => `link ${data.type}`);
        // create nodes
        this._nodeElements = this._holder.selectAll()
            .append('g')
            .data(this._graph.nodes)
            .enter()
            .append('circle')
            .attr('r', this._params.nodeRadius)
            .attr('class', data => `node ${data.type} ${data.inDregree ? '' : 'node-single'}`);
        // handle tick update
        this._simulation.on('tick', () => {
            this._linkElements
                .attr('x1', data => data.source.x)
                .attr('y1', data => data.source.y)
                .attr('x2', data => data.target.x)
                .attr('y2', data => data.target.y);
            this._nodeElements
                .attr('cx', data => data.x)
                .attr('cy', data => data.y);
        });
    }

    _setupMimeClassification() {
        // color scale
        const mimeColors = d3.scaleOrdinal(d3.schemeCategory10);
        // normalize mime type categories
        const normalize = function (mime) {
            switch (true) {
            case /^text\/html$/.test(mime):
                return 'document';
            case /^text\/css$/.test(mime):
                return 'css';
            case /javascript/.test(mime):
                return 'javascript';
            case /^image\//.test(mime):
                return 'image';
            case /json/.test(mime):
                return 'json';
            case /font/.test(mime):
                return 'font';
            default:
                return 'other';
            }
        };
        // colorize instance nodes
        this._holder
            .selectAll('.node-instance')
            .style('fill', data => mimeColors(normalize(data.instance.mime)));
    }

    _setupNodeDrag() {
        const simulation = this._simulation;
        // create the drag behavior
        const dragstarted = function (data) {
            if (!d3.event.active) {
                simulation
                    .alphaTarget(0.3)
                    .restart();
            }
            data.fx = data.x;
            data.fy = data.y;
            d3.select(this).raise();
        };
        const dragged = function (data) {
            data.fx = d3.event.x;
            data.fy = d3.event.y;
        };
        const dragended = function (data) {
            if (!d3.event.active) {
                simulation.alphaTarget(0);
            }
            d3.select(this).classed('node-fixed', true);
        };
        const drag = d3.drag()
              .on('start', dragstarted)
              .on('drag', dragged)
              .on('end', dragended);
        // enable node dragging
        this._nodeElements.call(drag);
        // allow to release nodes on double click
        this._nodeElements.on('dblclick', function (data) {
            d3.event.stopPropagation();
            d3.select(this).classed('node-fixed', false);
            data.fx = null;
            data.fy = null;
        });
    }

    _setupPanAndZoom() {
        const zoomRange = this._params.zoomRange;
        const zoom = d3.zoom();
        zoom.scaleExtent(zoomRange).on('zoom', () => {
            this._holder.attr('transform', d3.event.transform);
        });
        this._svg.call(zoom);
    }

    _setupWindowResize() {
        d3.select(window).on('resize', () => {
            // always fit the svg to window
            this._svg.attr('width', window.innerWidth);
            this._svg.attr('height', window.innerHeight);
        });
        // set the force center in the middle of the window once
        d3.select(window).on('resize')();
        this._simulation
            .force('centerX', d3.forceX(window.innerWidth / 2))
            .force('centerY', d3.forceY(window.innerHeight / 2));
    }

    _setupInformationDisplay() {
        // display object information
        const infoContainer = d3.select('body').append('div').attr('id', 'info');
        infoContainer.html('<p>Move the mouse over the nodes to show the details.<br/>' +
                           'Nodes can be dragged around and the canvas supports zooming and panning.<br/>' +
                           'Dragging a node fixes its position; double click to release it.</p>');
        this._nodeElements.on('mouseenter', (data) => {
            // create the information table
            const table = infoContainer.html('').append('table');
            const row = table.append('tr');
            // add the URL anyway
            row.append('th').text('URL');
            row.append('td').text(data.url);
            // add instance information if any
            if (data.instance) {
                const attrs = [
                    {name: 'document', label: 'Document'},
                    {name: 'method', label: 'Method'},
                    {name: 'status', label: 'Status'},
                    {name: 'mime', label: 'MIME'},
                    {name: 'size', label: 'Size (B)'}
                ];
                attrs.forEach((attr) => {
                    const row = table.append('tr');
                    row.append('th').text(attr.label);
                    row.append('td').text(data.instance[attr.name]);
                });
            }
        });
    }

    _setupTools() {
        Toolbox.addTool('stop', 'Stop', () => {
            this._simulation.stop();
        });
    }
}
