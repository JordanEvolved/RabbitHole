
import cytoscape from 'cytoscape';

export function createGraph(container) {
  return cytoscape({
    container: container,

    elements: [],

    style: [
      {
        selector: 'node',
        style: {
          'width': 90,
          'height': 90,

          'background-color': '#7ea87a',
          'background-opacity': 1,

          'border-width': 2,
          'border-color': '#4f7a55',

          'label': 'data(label)',

          'color': '#2e4a36',
          'font-size': 12,
          'font-weight': 'bold',

          'text-wrap': 'wrap',
          'text-max-width': 120,

          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-margin-y': 18
        }
      },

      // Artist nodes
      {
        selector: 'node[category = "artist"]',
        style: {
          'shape': 'ellipse',
          'background-color': '#7ea87a'
        }
      },

      // Producer nodes
      {
        selector: 'node[category = "producer"]',
        style: {
          'shape': 'ellipse',
          'background-color': '#f6dcd6',
          'border-color': '#cc9287'
        }
      },

      // Album nodes
      {
        selector: 'node[category = "album"]',
        style: {
          'shape': 'round-rectangle',
          'background-color': '#d6e8cf'
        }
      },

      // Only use background images when available
      {
        selector: 'node[?image]',
        style: {
          'background-image': 'data(image)',
          'background-fit': 'cover',
          'background-clip': 'node'
        }
      },

      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#a0b99c',
          'target-arrow-color': '#a0b99c',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 0.8,

          'curve-style': 'bezier',

          'label': 'data(label)',
          'font-size': 10,
          'color': '#4f7a55',
          'text-background-color': '#fbfdf8',
          'text-background-opacity': 0.9,
          'text-background-padding': 3
        }
      },

      // Selected node
      {
        selector: 'node:selected',
        style: {
          'border-width': 5,
          'border-color': '#2e4a36'
        }
      }
    ],

    layout: {
      name: 'preset'
    },

    wheelSensitivity: 0.3
  });
}
