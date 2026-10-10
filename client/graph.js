import cytoscape from 'cytoscape';

export function createGraph(container) {
    return cytoscape({
        container,
        elements: [],
        style: [
            {
                selector: 'node',
                style: {
                    'width': 110,
                    'height': 110,
                    'shape': 'round-rectangle',

                    'background-image': 'data(image)',
                    'background-fit': 'cover',
                    'background-clip': 'node',
                    'background-opacity': 1,

                    'label': 'data(label)',
                    'text-wrap': 'wrap',
                    'text-max-width': 120,
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'text-margin-y': 14,
                    'font-size': 11
                }
            },

            {
                selector: 'edge',
                style: {
                    'label': 'data(label)',
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle'
                }
            }
        ],
        layout: {
            name: 'breadthfirst'
        }
    });
}