const REQUEST_GAP_MS = 1100;

let queue = Promise.resolve();
let nextRequestTime = 0;

//makes the function stop for the inputted ms
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function rateLimitedFetch(url, options, budget) {
    //tasks run one after the other with use of queue
    const operation = queue.then(async () => {
        if (!budget.canRequest()) {
            return null;
        }

        //calculates the wait time
        const wait = Math.max(
            0, 
            nextRequestTime - Date.now()
        );

        if (wait >= budget.timeLeft()) {
            return null;
        }

        if (wait > 0) {
            await sleep(wait);
        }

        if (!budget.canRequest()) {
            return null;
        }

        budget.reserveRequest();

        nextRequestTime = Date.now() + REQUEST_GAP_MS;

        const controller = new AbortController();

        //automatically cancel request if time left is less than budget
        const timeout = setTimeout(
            () => controller.abort(),
            budget.timeLeft()
        );

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(
                    `Discogs API error: ${response.status}`
                );
            }

            return await response.json();

        } finally {
            clearTimeout(timeout);
        }
    
    });

    queue = operation.catch(() => {});

    return operation;
}

module.exports = { rateLimitedFetch };