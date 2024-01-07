// renderer.js
const { ipcRenderer } = require('electron');
const { spawn } = require('child_process');

const openApps = {};

function setupButton(buttonId) {
    if (buttonId.includes('docker')){
        const appPath = buttonId.replace('button_', '');
        document.getElementById(buttonId).addEventListener('click', () => {
            ipcRenderer.send('runDockerApp', appPath);
        });
    }
    else {
        const appPath = buttonId.replace('button_', '') + '/main.js';
        document.getElementById(buttonId).addEventListener('click', () => {
            if (!openApps[appPath] || openApps[appPath].closed) {
                launchApp(appPath);
            }
        });
    }
}

function launchApp(appPath) {
    const electronPath = 'C:/imos/imos-app/node_modules/.bin/electron.cmd';
    const childProcess = spawn(electronPath, [appPath]);

    // Optional: Handle communication or synchronization between the parent and child processes if needed
    // For example, you can use ipcRenderer to send messages between the processes
    ipcRenderer.send('startAnotherApp', 'Data to send to the other app');

    // Update the open state for the launched app
    openApps[appPath] = {
        closed: false,
        process: childProcess,
    };

    // Listen for the 'close' event to update the open state when the app is closed
    childProcess.on('close', () => {
        openApps[appPath].closed = true;
    });
}

// Set up buttons
setupButton('button_marketplace-app'); 
setupButton('button_enabler-app');
setupButton('button_settings-app');
setupButton('button_docker-app');