import { createGraph } from './graph.js';

const input = document.querySelector('#artist-input');
const button = document.querySelector('#search-button');
const status = document.querySelector('#status');
const cy = createGraph(document.querySelector('#graph'));

let source = null;
let rootId = null;
let layoutTimer = null;

function setStatus(message) {
  status.textContent = message;
}

function stopSearch() {
  if (source) {
    source.close();
    source = null;
  }
  clearTimeout(layoutTimer);
}

function drawGraph() {
  if (cy.nodes().length === 0) return;

  const root = rootId ? cy.getElementById(rootId) : null;

  cy.layout({
    name: 'breadthfirst',
    roots: root && !root.empty() ? root : undefined,
    directed: false,
    padding: 35,
    spacingFactor: 1.2,
    fit: true,
    animate: false
  }).run();
}

function scheduleLayout() {
  clearTimeout(layoutTimer);
  layoutTimer = setTimeout(drawGraph, 150);
}

function startSearch() {
  const artist = input.value.trim();

  if (!artist) {
    setStatus('Enter an artist name first.');
    return;
  }

  stopSearch();
  cy.elements().remove();
  rootId = null;
  button.disabled = true;

  setStatus(`Searching for ${artist}...`);

  const connection = new EventSource(
    `/api/graph?name=${encodeURIComponent(artist)}`
  );

  source = connection;

  connection.onmessage = (event) => {
    if (source !== connection) return;

    let message;

    try {
      message = JSON.parse(event.data);
    } catch (error) {
      console.error('Invalid graph update:', error);
      return;
    }

    switch (message.type) {
      case 'node':
        if (!cy.getElementById(message.data.id).length) {
          cy.add({
            group: 'nodes',
            data: message.data
          });

          if (
            rootId === null &&
            message.data.category === 'artist'
          ) {
            rootId = message.data.id;
          }

          scheduleLayout();
        }
        break;

      case 'edge':
        if (!cy.getElementById(message.data.id).length) {
          cy.add({
            group: 'edges',
            data: message.data
          });

          scheduleLayout();
        }
        break;

      case 'progress':
        setStatus(
          `Loading: ${message.nodes} nodes, ${message.requests} requests...`
        );
        break;

      case 'complete':
        stopSearch();
        button.disabled = false;
        drawGraph();

        if (message.reason === 'not_found') {
          setStatus(`No results for "${artist}". Try another artist.`);
        } else {
          setStatus(
            `Done: ${message.nodes} nodes, ${message.edges} connections.`
          );
        }
        break;

      case 'error':
        stopSearch();
        button.disabled = false;
        drawGraph();

        setStatus(
          message.message || 'Could not build the graph.'
        );
        break;
    }
  };

  connection.onerror = () => {
    if (source !== connection) return;

    stopSearch();
    button.disabled = false;
    drawGraph();

    setStatus(
      'Connection failed. Check that the backend is running and DISCOGS_TOKEN is set.'
    );
  };
}

button.addEventListener('click', startSearch);

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    startSearch();
  }
});

window.addEventListener('beforeunload', stopSearch);
