const { spawn } = require('child_process');
const path = require('path');

const processesMap = new Map();

function startSubsystem(name, command, args, cwd, port) {
    console.log(`[Suite] Starting ${name} on port ${port}...`);
    const defaultPath = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin';
    const env = { 
        ...process.env, 
        PATH: process.env.PATH ? `${process.env.PATH}:${defaultPath}` : defaultPath,
        PORT: port, 
        FLASK_PORT: port 
    };
    const proc = spawn(command, args, { 
        cwd, 
        shell: false,
        env
    });

    proc.stdout.on('data', (data) => {
        console.log(`[${name}] ${data.toString().trim()}`);
    });

    proc.stderr.on('data', (data) => {
        console.error(`[${name} STDERR] ${data.toString().trim()}`);
    });

    proc.on('error', (err) => {
        console.error(`[Suite Error] Failed to start subsystem ${name}: ${err.message}`);
    });

    proc.on('close', (code) => {
        console.log(`[${name}] Process exited with code ${code}`);
    });

    return proc;
}

function launchAndRegister(subsystemKey, name, command, args, cwd, port) {
    const proc = startSubsystem(name, command, args, cwd, port);
    processesMap.set(subsystemKey, { name, command, args, cwd, port, proc });
    return proc;
}

function getProcess(subsystemKey) {
    return processesMap.get(subsystemKey);
}

function getAllProcesses() {
    return Array.from(processesMap.entries()).map(([key, data]) => ({
        key,
        name: data.name,
        port: data.port,
        pid: data.proc ? data.proc.pid : null
    }));
}

module.exports = {
    startSubsystem,
    launchAndRegister,
    getProcess,
    getAllProcesses,
    processesMap
};
