// import dependencies
const express = require('express');
require('dotenv').config();

const {
    buildGraph
} = require('./services/graphBuilder');


// set up express server
const app = express();


// Endpoint for generating a graph.
app.get('/api/graph', async (req, res) => {
    const name = req.query.name;

    // Validate the artist name.
    if (
        typeof name !== 'string' ||
        !name.trim()
    ) {
        return res.status(400).json({
            error: 'Artist name is required'
        });
    }

    // Configure Server-Sent Events.
    res.setHeader(
        'Content-Type',
        'text/event-stream'
    );

    res.setHeader(
        'Cache-Control',
        'no-cache'
    );

    res.setHeader(
        'Connection',
        'keep-alive'
    );

    // Send headers immediately.
    res.flushHeaders();

    // Callback passed to graphBuilder.js.
    function emit(update) {
        if (
            !res.destroyed &&
            !res.writableEnded
        ) {
            res.write(
                `data: ${JSON.stringify(update)}\n\n`
            );
        }
    }

    try {
        // Generate the graph while streaming updates.
        await buildGraph(
            name.trim(),
            emit
        );
    } catch (error) {
        console.error(error);

        emit({
            type: 'error',
            message: 'Failed to generate graph'
        });
    } finally {
        // Close the stream when finished.
        res.end();
    }
});


// Start Express normally when this file
// is executed directly.
if (require.main === module) {
    const PORT = 3000;

    app.listen(PORT, () => {
        console.log(
            `RabbitHole running on port ${PORT}`
        );
    });
}


// Allow Vercel to use this Express app.
module.exports = app;