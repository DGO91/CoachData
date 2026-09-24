const path = require('path');
const { spawn } = require('child_process');
const jwt = require('jsonwebtoken');
const { launchAndRegister, getProcess, getAllProcesses } = require('../../infrastructure/agents/childProcessManager');
const { INTERNAL_SECRET } = require('../../config/env');

const IS_DOCKER = process.env.DOCKER_ENV === 'true';

// Catalog of subsystems for the status aggregator and UI
const SUBSYSTEMS = [
    { key: 'prospect', name: 'Prospect Analyzer', port: 4002 },
    { key: 'email', name: 'Email Organizer', port: 4004 },
    { key: 'mail-responder', name: 'Mail Responder', port: 4008 },
    { key: 'pre-call-agent', name: 'Pre-Call Agent', port: 4011 },
    { key: 'auditor', name: 'System Auditor Agent', port: 4012 },
    { key: 'auto-plan', name: 'Auto Plan Creator', port: 4010 },
    { key: 'evening-summary', name: 'Evening Summary Agent', port: 4013, headless: true },
    { key: 'weekly-digest', name: 'Weekly Digest Agent', port: 4014 },
    { key: 'personal-agent', name: 'Morning Briefing', port: 4015, headless: true },
    { key: 'knowledge-agent', name: 'Knowledge Agent (RAG)', port: 4020 },
];

function bootAllAgents(rootDir) {
    if (IS_DOCKER) {
        console.log('[Suite] Running in Docker mode. Subsystems will not be spawned manually.');
        return;
    }

    const agentsRoot = path.join(process.cwd(), 'src/agents');
    const nodeBinary = process.execPath;

    const prospectDir = path.join(agentsRoot, 'prospect_analyzer');
    const emailDir = path.join(agentsRoot, 'email_organizer');
    const emailResponderDir = path.join(agentsRoot, 'email_responder');
    const preCallDir = path.join(agentsRoot, 'pre_call_agent');
    const auditorDir = path.join(agentsRoot, 'auditor_agent');
    const autoPlanDir = path.join(agentsRoot, 'auto_plan_creator');
    const weeklyDigestDir = path.join(agentsRoot, 'weekly_digest');
    const knowledgeDir = path.join(agentsRoot, 'knowledge_agent');

    const prospectPython = path.join(prospectDir, 'frontend', 'venv', 'bin', 'python');
    launchAndRegister('prospect', 'Prospect', prospectPython, ['app.py'], path.join(prospectDir, 'frontend'), 4002);
    launchAndRegister('email', 'EmailOrganizer', nodeBinary, ['server.js'], emailDir, 4004);
    launchAndRegister('mail-responder', 'MailResponder', nodeBinary, ['server.js'], emailResponderDir, 4008);
    launchAndRegister('pre-call-agent', 'PreCall', nodeBinary, ['server.js'], preCallDir, 4011);
    launchAndRegister('auditor', 'Auditor', nodeBinary, ['server.js'], auditorDir, 4012);

    const autoPlanPython = path.join(autoPlanDir, 'venv', 'bin', 'python');
    launchAndRegister('auto-plan', 'AutoPlan', autoPlanPython, ['app.py'], autoPlanDir, 4010);
    launchAndRegister('weekly-digest', 'WeeklyDigest', nodeBinary, ['server.js'], weeklyDigestDir, 4014);
    launchAndRegister('knowledge-agent', 'KnowledgeAgent', nodeBinary, ['server.js'], knowledgeDir, 4020);
}

// Personal Agent Status
let isPersonalAgentRunning = false;
let lastAgentRunSuccess = null;
let currentPersonalAgentProcess = null;

function runPersonalAgentUseCase(tenantId = 'default_tenant', _, callback = null) {
    const agentDir = path.join(__dirname, '../../../agents/personal_agent', 'AGENTES', 'PersonalAgent');
    console.log(`[Suite] Running Morning Briefing for tenant: ${tenantId}...`);
    isPersonalAgentRunning = true;
    
    const internalToken = jwt.sign({ role: 'internal-agent' }, INTERNAL_SECRET, { expiresIn: '5m' });
    
    const pythonPath = IS_DOCKER ? 'python3' : path.join(agentDir, 'venv', 'bin', 'python');
    const proc = spawn(pythonPath, ['briefing.py', '--tenant', tenantId, '--token', internalToken], { cwd: agentDir });
    currentPersonalAgentProcess = proc;

    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { errorOutput += data.toString(); });

    proc.on('close', (code) => {
        isPersonalAgentRunning = false;
        lastAgentRunSuccess = (code === 0);
        console.log(`[Suite] Personal Agent finished with code ${code}`);
        if (callback) {
            callback({ success: code === 0, output, error: errorOutput, code });
        }
    });
}

function stopPersonalAgentUseCase() {
    if (isPersonalAgentRunning && currentPersonalAgentProcess) {
        currentPersonalAgentProcess.kill();
        isPersonalAgentRunning = false;
        return true;
    }
    return false;
}

function getPersonalAgentStatus() {
    return {
        isRunning: isPersonalAgentRunning,
        lastRunSuccess: lastAgentRunSuccess
    };
}

module.exports = {
    SUBSYSTEMS,
    bootAllAgents,
    runPersonalAgentUseCase,
    stopPersonalAgentUseCase,
    getPersonalAgentStatus
};
