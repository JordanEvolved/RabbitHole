
import { createGraph } from './graph.js';

// Find our HTML elements
const form = document.getElementById('search-form');
const input = document.getElementById('artist-input');
const status = document.getElementById('status');
const graphPanel = document.getElementById('graph-panel');

const details = document.getElementById('details');
const detailsName = document.getElementById('details-name');
const detailsDescription =
  document.getElementById('details-description');

// Create the Cytoscape graph
const cy = createGraph(document.getElementById('cy'));

let currentStream = null;
let layoutTimer = null;
let rootId = null;
let pendingEdges = [];

// Position nodes in a readable graph
function updateLayout() {
  if (cy.nodes().length === 0) return;

  cy.layout({
    name: 'breadthfirst',
    roots: rootId
      ? cy.getElementById(rootId)
      : undefined,
    directed: false,
    spacingFactor: 1.3,
    animate: true,
    animationDuration: 300,
    fit: true,
    padding: 65
  }).run();
}

// Avoid constantly rearranging the graph
function scheduleLayout() {
  clearTimeout(layoutTimer);

  layoutTimer = setTimeout(updateLayout, 300);
}

// Add edges once their nodes exist
function addPendingEdges() {
  pendingEdges = pendingEdges.filter(edge => {
    if (cy.getElementById(edge.id).length) {
      return false;
    }

    const sourceExists =
      cy.getElementById(edge.source).length > 0;

    const targetExists =
      cy.getElementById(edge.target).length > 0;

    if (!sourceExists || !targetExists) {
      return true;
    }

    cy.add({
      group: 'edges',
      data: edge
    });

    scheduleLayout();
    return false;
  });
}

// Handle messages from your Express backend
function handleUpdate(update) {

  if (update.type === 'node') {
    const node = update.data;

    if (!node?.id) return;

    if (!cy.getElementById(node.id).length) {
      if (!rootId) rootId = node.id;

      cy.add({
        group: 'nodes',
        data: node
      });

      addPendingEdges();
      scheduleLayout();
    }
  }

  if (update.type === 'edge') {
    if (!update.data?.id) return;

    pendingEdges.push(update.data);
    addPendingEdges();
  }

  if (update.type === 'progress') {
    status.textContent =
      `Exploring... ${update.nodes ?? cy.nodes().length} nodes found`;
  }

  if (update.type === 'complete') {
    status.textContent =
      `Exploration complete! ${cy.nodes().length} nodes and ` +
      `${cy.edges().length} connections found.`;

    currentStream?.close();
    currentStream = null;

    scheduleLayout();
  }

  if (update.type === 'error') {
    status.textContent =
      update.message || 'Something went wrong.';

    currentStream?.close();
    currentStream = null;
  }
}

// Search for an artist
function searchArtist(name) {

  // Close previous search
  currentStream?.close();
  currentStream = null;

  clearTimeout(layoutTimer);

  // Clear previous graph
  cy.elements().remove();
  pendingEdges = [];
  rootId = null;

  // Show graph workspace
  graphPanel.hidden = false;
  details.hidden = true;

  // Cytoscape must know the container is visible
  cy.resize();

  status.textContent = `Searching for ${name}...`;

  // Call Express
  const source = new EventSource(
    `/api/graph?name=${encodeURIComponent(name)}`
  );

  currentStream = source;

  // Receive each streamed update
  source.onmessage = event => {
    if (currentStream !== source) return;

    try {
      const update = JSON.parse(event.data);
      handleUpdate(update);
    } catch (error) {
      console.error('Invalid graph update:', error);
    }
  };

  source.onerror = () => {
    if (currentStream !== source) return;

    status.textContent =
      'Could not connect to the graph server. ' +
      'Check that Express is running.';

    source.close();
    currentStream = null;
  };
}

// Run a search when user clicks Search or presses Enter
form.addEventListener('submit', event => {
  event.preventDefault();

  const name = input.value.trim();

  if (name) {
    searchArtist(name);
  }
});

// Show information when a node is clicked
cy.on('tap', 'node', event => {
  const node = event.target;
  const data = node.data();

  details.hidden = false;

  detailsName.textContent =
    data.label || 'Unknown';

  detailsDescription.textContent =
    `Type: ${data.category || 'Unknown'}` +
    (data.year ? ` • Year: ${data.year}` : '');

  node.select();
});

// Clicking background hides information
cy.on('tap', event => {
  if (event.target === cy) {
    details.hidden = true;
    cy.nodes().unselect();
  }
});
