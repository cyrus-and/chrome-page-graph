function save() {
    // fetch all the needed resources
    Promise.all([
        Manager.fetchGraph(graphId), // XXX should never be expired
        Files.fetch('/pages/graph/deps/d3.min.js'),
        Files.fetch('/pages/graph/toolbox.js'),
        Files.fetch('/pages/graph/toolbox.css'),
        Files.fetch('/pages/graph/canvas.css')
    ]).then((resources) => {
        // prepare the HTML file
        const [graph, d3Js, toolboxJs, toolboxCss, canvasCss] = resources;
        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Page Graph</title>
<script>
${d3Js}
${toolboxJs}
${Canvas.toString()}
const graph = {
    nodes: ${JSON.stringify(graph.nodes)},
    links: ${JSON.stringify(graph.links)}
};
</script>
<style>
${toolboxCss}
${canvasCss}
</style>
</head>
<body onload="new Canvas(graph)">
<ul id="toolbox"></ul>
</body>
</html>
`;
        // prepare the fake anchor
        const options = {
            type: 'text/html'
        };
        const blob = new Blob([html], options);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graph';
        // start the download
        a.click();
    }).catch((err) => {
        console.error(err);
        alert(`Cannot save: '${err}'`);
    });
}

(function () {
    // fetch the graph by ID
    window.graphId = location.hash.slice(1);
    Manager.fetchGraph(graphId).then((graph) => {
        // setup extension-related tools
        Toolbox.addTool('save', 'Save', save);
        // start the simulation
        window.nodes = graph.nodes;
        window.links = graph.links;
        new Canvas(graph);
    }).catch((err) => {
        console.error(err);
        alert(err.toString());
    });
})();
