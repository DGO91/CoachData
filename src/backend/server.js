require('dotenv').config();
const { startGlobalScheduler } = require('./infrastructure/jobs/globalScheduler');
const { bootAIOrchestrator } = require('./application/orchestrator');
const { SUBSYSTEMS, bootAllAgents } = require('./application/orchestrator/agentOrchestrator');
const { getProcess, processesMap } = require('./infrastructure/agents/childProcessManager');
const { createApp } = require('./infrastructure/web/app');

const PORT = process.env.PORT || 4000;

// Boot AI Orchestrator V2 Engine
bootAIOrchestrator();

// Boot all background processes/agents automatically
bootAllAgents(__dirname);

// Start Global Scheduler
startGlobalScheduler();

// Initialize Express App with Multi-Tenant Support
const app = createApp(SUBSYSTEMS);

app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 CoachData SaaS Suite running on http://localhost:${PORT}`);
    console.log(`🔒 Multi-Tenant Context Middleware & Security Active`);
    console.log(`==================================================\n`);
});

// Handle termination
process.on('SIGINT', () => {
    console.log('\n[Suite] Shutting down subsystems...');
    for (let config of processesMap.values()) {
        if (config.proc) config.proc.kill();
    }
    process.exit();
});
