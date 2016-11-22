class Toolbox {
    static addTool(id, label, action) {
        // create and add tool button container
        const toolbox = document.getElementById('toolbox');
        const tool = document.createElement('li');
        toolbox.appendChild(tool);
        // create and add tool button
        const toolButton = document.createElement('input');
        tool.appendChild(toolButton);
        toolButton.id = id;
        toolButton.type = 'button';
        toolButton.value = label;
        toolButton.addEventListener('click', action);
    }
}
