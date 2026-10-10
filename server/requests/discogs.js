//import dependencies
const {express} = require('express');
require('dotenv').config();

// set up express server
const app = express();
const PORT = 3000;

async function returnArtist(name){
    const url = new URL('https://api.discogs.com/database/search');

    url.searchParams.set('q', name);
    url.searchParams.set('type', 'artist');

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'RabbitHole/1.0',
            'Authorization': `Discogs token=${process.env.DISCOGS_TOKEN}`    
        }
    });

    if (!response.ok) {
        //displays the error = from discogs API
        throw new Error(`Discogs API Error: ${response.status}`);
    }

    const data = await response.json();

    return data.results;
}

module.exports = { searchArtist };