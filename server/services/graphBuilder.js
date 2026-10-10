const {
    searchArtist,
    getArtistReleases,
    getMaster,
    getRelease
} = require('../requests/discogs.js');

const {
    createBudget,
    BudgetExceeded
} = require('./budget.js');

// Match producer-related credit roles.
const PRODUCER_ROLE = /\bproduc(?:er|ed|tion|ing)\b/i;

// Extract producers from an already-fetched release.
// No additional API requests are made here.
function findProducer(release) {
    const credits = [
        ...(release.extraartists ?? []),
        ...(release.tracklist ?? []).flatMap(
            track => track.extraartists ?? []
        )
    ];

    const producers = new Map();

    for (const credit of credits) {
        if (
            credit.id &&
            PRODUCER_ROLE.test(credit.role ?? '')
        ) {
            producers.set(credit.id, {
                id: credit.id,
                name: credit.name,
                role: credit.role
            });
        }
    }

    return [...producers.values()];
}

// Find an album associated with an artist.
// Compare a small number of candidates using
// Discogs community have + want counts.
async function findAlbum(
    artistId,
    budget,
    usedMasters,
    candidates = 2
) {
    const listing = await getArtistReleases(
        artistId,
        budget
    );

    if (!listing) return null;

    const masters = (listing.releases ?? []).filter(
        item =>
            item.type === 'master' &&
            item.role === 'Main' &&
            !usedMasters.has(item.id)
    );

    // Prefer releases marked as albums.
    const albums = masters.filter(item =>
        /\bAlbum\b/i.test(item.format ?? '')
    );

    const selected = (
        albums.length ? albums : masters
    ).slice(0, candidates);

    let best = null;

    for (const item of selected) {
        // Each candidate needs two more requests:
        // master details + representative release.
        if (
            !budget.canRequest() ||
            budget.requests + 2 > budget.maxRequests
        ) {
            break;
        }

        const master = await getMaster(
            item.id,
            budget
        );

        if (!master?.main_release) continue;

        const release = await getRelease(
            master.main_release,
            budget
        );

        if (!release) break;

        const popularity =
            (release.community?.have ?? 0) +
            (release.community?.want ?? 0);

        if (!best || popularity > best.popularity) {
            best = {
                masterId: master.id,
                releaseId: release.id,
                title: master.title,
                year: master.year,
                popularity,
                artists: release.artists ?? [],
                producers: findProducer(release)
            };
        }
    }

    return best;
}

// Generate the graph and emit updates as they are found.
async function buildGraph(
    artistName,
    emit = () => {},
    options = {}
) {
    const budget = createBudget(options);

    const graph = {
        nodes: [],
        edges: []
    };

    // Prevent duplicates and repeated API exploration.
    const nodeIds = new Set();
    const edgeIds = new Set();
    const expandedArtists = new Set();
    const queuedArtists = new Set();
    const usedMasters = new Set();

    // Queue for breadth-first exploration.
    const artistQueue = [];

    function addNode(data) {
        if (
            nodeIds.has(data.id) ||
            graph.nodes.length >= budget.maxNodes
        ) {
            return false;
        }

        nodeIds.add(data.id);
        graph.nodes.push({ data });

        // Stream the new node immediately.
        emit({
            type: 'node',
            data
        });

        return true;
    }

    function addEdge(source, target, label) {
        // Cytoscape edges must reference existing nodes.
        if (
            !nodeIds.has(source) ||
            !nodeIds.has(target)
        ) {
            return;
        }

        const id = `${source}:${label}:${target}`;

        if (edgeIds.has(id)) return;

        edgeIds.add(id);

        const data = {
            id,
            source,
            target,
            label
        };

        graph.edges.push({ data });

        // Stream the new edge immediately.
        emit({
            type: 'edge',
            data
        });
    }

    function queueArtist(artist) {
        if (
            !artist?.id ||
            queuedArtists.has(artist.id) ||
            expandedArtists.has(artist.id)
        ) {
            return;
        }

        queuedArtists.add(artist.id);
        artistQueue.push(artist);
    }

    function progress() {
        emit({
            type: 'progress',
            nodes: graph.nodes.length,
            requests: budget.requests,
            maxNodes: budget.maxNodes,
            maxRequests: budget.maxRequests
        });
    }

    let reason = 'finished';

    try {
        // Start with the artist the user searched for.
        const start = await searchArtist(
            artistName,
            budget
        );

        if (!start) {
            reason = 'not_found';
        } else {
            addNode({
                id: `artist-${start.id}`,
                label: start.title,
                category: 'artist'
            });

            queueArtist({
                id: start.id,
                name: start.title
            });

            progress();
        }

        // Breadth-first traversal.
        while (
            artistQueue.length > 0 &&
            graph.nodes.length < budget.maxNodes &&
            budget.canRequest()
        ) {
            // A full album lookup needs at least:
            // listing + master + release.
            if (
                budget.requests + 3 >
                budget.maxRequests
            ) {
                reason = 'request_budget';
                break;
            }

            const artist = artistQueue.shift();

            queuedArtists.delete(artist.id);

            if (expandedArtists.has(artist.id)) {
                continue;
            }

            expandedArtists.add(artist.id);

            const album = await findAlbum(
                artist.id,
                budget,
                usedMasters,
                options.candidates ?? 2
            );

            if (!album) {
                progress();
                continue;
            }

            usedMasters.add(album.masterId);

            const albumId = `album-${album.masterId}`;

            addNode({
                id: albumId,
                label: album.title,
                category: 'album',
                year: album.year,
                masterId: album.masterId,
                releaseId: album.releaseId,
                popularity: album.popularity
            });

            addEdge(
                `artist-${artist.id}`,
                albumId,
                'released'
            );

            // Discover additional main artists.
            for (const credited of album.artists) {
                if (!credited.id) continue;

                const artistId = `artist-${credited.id}`;

                addNode({
                    id: artistId,
                    label: credited.name,
                    category: 'artist'
                });

                addEdge(
                    artistId,
                    albumId,
                    'released'
                );

                if (nodeIds.has(artistId)) {
                    queueArtist(credited);
                }
            }

            // Discover producers credited on the album.
            for (const producer of album.producers) {
                const producerId =
                    `artist-${producer.id}`;

                addNode({
                    id: producerId,
                    label: producer.name,
                    category: 'producer',
                    role: producer.role
                });

                addEdge(
                    producerId,
                    albumId,
                    'produced'
                );

                if (nodeIds.has(producerId)) {
                    queueArtist(producer);
                }

                if (
                    graph.nodes.length >=
                    budget.maxNodes
                ) {
                    break;
                }
            }

            progress();
        }

        if (graph.nodes.length >= budget.maxNodes) {
            reason = 'node_limit';
        } else if (!budget.canRequest()) {
            reason = 'budget_or_deadline';
        }

    } catch (error) {
        if (
            error instanceof BudgetExceeded ||
            error.name === 'AbortError'
        ) {
            reason = 'deadline';
        } else {
            reason = 'error';

            emit({
                type: 'error',
                message: error.message
            });
        }
    }

    emit({
        type: 'complete',
        reason,
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        requests: budget.requests
    });

    return graph;
}

module.exports = {
    findProducer,
    findAlbum,
    buildGraph
};