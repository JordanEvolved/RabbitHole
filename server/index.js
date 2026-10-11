const express = require('express');
require('dotenv').config();

const {
    buildGraph
} = require('./services/graphBuilder');

const app = express();

app.get('/api/graph', async (req, res) => {
    const name = req.query.name;

    if (
        typeof name !== 'string' ||
        !name.trim()
    ) {
        return res.status(400).json({
            error: 'Artist name is required'
        });
    }

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

    res.flushHeaders();

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
        res.end();
    }
});

if (require.main === module) {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(
            `RabbitHole running on port ${PORT}`
        );
    });
}

module.exports = app;