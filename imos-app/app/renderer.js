const { ipcRenderer } = require('electron');
const { spawn } = require('child_process');
const { getInstalledApps } = require('../docker/docker');
const path = require('path');

// Dict to keep track of opened apps
const openApps = {};
// Object to store installed and default applications
let installedApps = {};
let defaultApps = {
    'imoslink': { type: 'default' },
    'imostore': { type: 'default' },
    'imoshub': { type: 'default' },
    'settings': { type: 'default' }
};

/**
 * Sets up a button with click and context menu functionality.
 * @param {string} buttonId - The ID of the button element.
 * @param {string} appPath - The path to the application.
 * @param {string} appType - The type of the application (e.g., 'default', 'docker').
 */
function setupButton(buttonId, appPath, appType) {
    const button = document.getElementById(buttonId);

    // Click event to launch app or send IPC message to run Docker app
    button.addEventListener('click', () => {
        if (appType !== 'default') {
            ipcRenderer.send('runDockerApp', appPath, appType);
        } else {
            if (!openApps[appPath] || openApps[appPath].closed) {
                launchApp(appPath);
            }
        }
    });
}

/**
 * Launches a specified app using Electron.
 * @param {string} appPath - The path to the application to be launched.
 */
function launchApp(appPath) {
    const electronPath = path.resolve(__dirname, '../node_modules/.bin/electron.cmd');
    const childProcess = spawn(electronPath, [appPath]);

    openApps[appPath] = {
        closed: false,
        process: childProcess,
    };

    childProcess.on('close', () => {
        openApps[appPath].closed = true;
    });
}

/**
 * Arranges app buttons in a circular layout.
 */
function circular() {
    const container = document.querySelector('.app-container');
    const circles = document.querySelectorAll('.button-component[type=app]');
    const radius = container.offsetWidth / 2;
    let rotation = 0;

    circles.forEach((circle, i) => {
        const value = `rotate(${rotation}deg) translate(${radius}px) rotate(calc(-${rotation}deg + 90deg))`;
        rotation += 360 / 12;
        circle.style.transform = value;
    });
}

// Fetch installed applications and setup buttons
getInstalledApps().then((builtApps) => {
    //console.log('Built Apps:', builtApps);
    installedApps = Object.assign({}, defaultApps, builtApps);
    //console.log('Installed Apps:', installedApps);

    const dynamicButtonsContainer = document.getElementById('dynamicButtonsContainer');

    // Dynamically generate buttons for installed apps
    Object.keys(installedApps).forEach((app, index) => {
        const appType = installedApps[app].type;
        let imageUrl = '';
        if (appType == 'default') {
            imageUrl = `${process.env.IMOS_ROOT}/${app}/logo.png`;
        }
        else {
            imageUrl = `${process.env.IMOS_APPS_DIR}/${app.split('-')[1]}/logo.png`;
        }
        const buttonId = `button-${app}`;
        const appPath = appType.includes('default') ? `${app}/main.js` : app;

        const newApp = document.createElement('button');
        newApp.setAttribute('class', 'button-component');
        newApp.setAttribute('title', app);
        newApp.setAttribute('type', 'app');
        newApp.setAttribute('id', buttonId);
        newApp.style.backgroundImage = `url('${imageUrl}')`;
        newApp.style.backgroundSize = 'cover';
        newApp.style.backgroundPosition = 'center';
        dynamicButtonsContainer.appendChild(newApp);

        setupButton(buttonId, appPath, appType);
    });

    circular();
});

// Logout button event listener

document.getElementById('button_logout').addEventListener('click', () => {
    ipcRenderer.send('logout');
});

// Ensure circular layout on window load

window.addEventListener('load', circular, false);
