const DEFAULTS = {
    maxRequests: 45,
    maxNodes: 45,
    maxTimeMS: 55000
};

//a custom error for budgets being exceeded for easy debugging
class BudgetExceeded extends Error {
    constructor(message = 'Graph budget exhausted') {
        super(message);
        this.name = 'BudgetExceeded';
    }
}

//creates the budget per user
function createBudget(options = {}) {
    //copies properties of both, with overrides overtaking defaults
    const limits = {...DEFAULTS, ...options};

    return {
        ...limits,
        requests: 0,
        deadline: Date.now() + limits.maxTimeMs,

        //calculates remaining time to make graph
        timeLeft() {
            return Math.max(0, this.deadline - Date.now());
        },

        //checks if anymore requests can be made
        canRequest() {
            return (
                this.requests < this.maxRequests &&
                this.timeLeft() > 0
            )
        },

        //continues making requests until budget is exceeded
        reserveRequest() {
            if (!this.canRequest()) {
                throw new BudgetExceeded();
            }

            this.requests++;
        }
    };
}

module.exports = {
    createBudget,
    BudgetExceeded
}