//import dependencies
require('dotenv').config();

// let name = 'Nirvana';

async function searchArtist(name){
    const url = new URL('https://api.discogs.com/database/search');

    url.searchParams.set('q', name);
    url.searchParams.set('type', 'artist');
    url.searchParams.set('per_page', '1');

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
    console.log(JSON.stringify(data, null, 2));

    return data.results[0];
}

// searchArtist(name);

module.exports = { searchArtist };