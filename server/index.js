//import dependencies
const {express} = require('express');
require('dotenv').config();

// set up express server
const app = express();
const PORT = 3000;

app.get('/api/artists', async (req, res) => {
    try {
        const name = req.query.name;

        //if input is not a name, send back an error
        if (!name || typeof name !== 'string') {
            console.log("Name not inputted!");

            //bad request
            res.status(400).json({
                error: 'Must input a name!'
            });
        }

        const artist = await returnArtist(name);

        res.json(artist);
        
    } catch (error) {
        res.status(500).json({
            error: 'Artist could not be found!'
        })
        
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});