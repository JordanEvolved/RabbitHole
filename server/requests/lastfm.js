const { json } = require('express');
const { rateLimitedFetch } = require('../services/rateLimiter');
const API_URL = 'http://ws.audioscrobbler.com/2.0/';

async function fmTopAlbums(id, budget) {
    const params = new URLSearchParams({
        method: 'artist.gettopalbums',
        mbid: id,
        api_key: process.env.LASTFM_KEY,
        limit: 10,
        format: 'json',
    });

    const data = await rateLimitedFetch(
        `${API_URL}${path}`,
        {}, 
        budget
    );

    const response = data.json();
    


}