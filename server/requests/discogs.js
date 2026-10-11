//import dependencies
const { rateLimitedFetch } = require('../services/rateLimiter');
const API_URL = 'https://api.discogs.com';

async function discogsFetch(path, budget) {
    const token = process.env.DISCOGS_TOKEN;

    if (!token) {
        throw new Error('Missing DISCOGS_TOKEN');
    }

    //runs a fetch with rate limiting
    return rateLimitedFetch(
        `${API_URL}${path}`,
        { 
            headers: {
                'User-Agent': 'RabbitHole/1.0',
                'Authorization': `Discogs token=${token}`,
                'Accept': 'application/json'
            }
        }, 
        budget
    );
}

async function searchArtist(name, budget) {
    //why did i not know this existed
    const params = new URLSearchParams({
        q: name, 
        type: 'artist',
        per_page: '1'
    });

    const data = await discogsFetch(
        `/database/search?${params}`,
        budget
    );

    console.log(JSON.stringify(data, null, 2));

    return data.results[0];
}

async function getArtistReleases(artistId, budget) {
    //grabs the artist releases
    return discogsFetch(
        `/artists/${artistId}/releases?per_page=100`,
        budget
    );
}

// Retrieve a master release.
async function getMaster(masterId, budget) {
    return discogsFetch(
        `/masters/${masterId}`,
        budget
    );
}

// Retrieve a specific release and its credits.
async function getRelease(releaseId, budget) {
    return discogsFetch(
        `/releases/${releaseId}`,
        budget
    );
}

module.exports = {
    searchArtist,
    getArtistReleases,
    getMaster,
    getRelease
};