// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const { createDockerProcess, createMultiDockerProcess, doesContainerExist, doesMultiContainerExist, 
         startDockerProcess, getImageMetadata, getMultiImageMetadata } = require('../docker/docker');
const request = require('request');
const fs = require('fs');
const { log } = require('console');

require('dotenv').config();

let mainWindow;
let authWindow;
let regWindow;
let logWindow;
let setWindow;
var remcheck = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        icon: 'assets/imoslogo.ico',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            worldSafeExecuteJavaScript: true,
        },
    });

    mainWindow.loadFile('views/index.html');

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
}

function createAuthWindow() {
  return new Promise((resolve, reject) => {
    authWindow = new BrowserWindow({
      width: 400,
      height: 400,
      autoHideMenuBar: true,
      icon: 'assets/imoslogo.ico',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        worldSafeExecuteJavaScript: true,
      },
    });

    authWindow.loadFile('views/auth.html');

    authWindow.on('closed', () => {
      authWindow = null;
    });

  });
}

function createLoginWindow() {
  return new Promise((resolve, reject) => {
    logWindow = new BrowserWindow({
      width: 400,
      height: 400,
      autoHideMenuBar: true,
      icon: 'assets/imoslogo.ico',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        worldSafeExecuteJavaScript: true,
      },
    });
  
    // Handle window closed
    logWindow.on('closed', () => {
        logWindow = null;
    });

    logWindow.loadFile('views/login.html');
  });
}

function createRegisterWindow() {
  return new Promise((resolve, reject) => {
    regWindow = new BrowserWindow({
      width: 400,
      height: 400,
      autoHideMenuBar: true,
      icon: 'assets/imoslogo.ico',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        worldSafeExecuteJavaScript: true,
      },
    });
  
    // Handle window closed
    regWindow.on('closed', () => {
        regWindow = null;
    });

    regWindow.loadFile('views/register.html');
  });
}

function createSetupWindow(appName, labels, type) {
  return new Promise((resolve, reject) => {
    setWindow = new BrowserWindow({
      width: 400,
      height: 400,
      autoHideMenuBar: true,
      icon: 'assets/imoslogo.ico',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        worldSafeExecuteJavaScript: true,
        additionalArguments: [appName]
      },
    });
  
    // Handle window closed
    setWindow.on('closed', () => {
      setWindow = null;
    });
    console.log(labels);
    setWindow.loadFile('views/setup.html', { query: { appName, type, labels} });
  });
}

app.whenReady().then(() => {
  const data = fs.readFileSync('userData/session.json', 'utf8');
  var { username, password, save } = JSON.parse(data);
  if(process.argv[2] == 'local'){
    createWindow();
  }
  else if(save == "false"){
    createAuthWindow()
    .catch(error => {
      console.error('Error creating Auth window:', error);
    });
  }
  else{
    var options = {
      'method': 'POST',
      'url': 'http://localhost:8000/login',
      form: {
          'password': password,
          'username': username
      }
    };
  
    request(options, function (error, response) {
        if (error) throw new Error(error);
        if(response.body.includes("/login-success")){
          if (!mainWindow) {
            createWindow();
          }

          fetch(`http://localhost:8000/user/${username}`)
            .then((response) => response.json())
            
            .then((data) => {
              const type = data.user.type;
              fs.writeFileSync('userData/session.json', JSON.stringify({ username, type , password, save}));
            })
            .catch((error) => {
              console.error('Error fetching app information:', error);
            });
        }
    });
  }
    
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('runDockerApp', (event, app, type) => {
  if(type == 'multicontainer'){
    if(!setWindow && !doesMultiContainerExist(app)){
      //console.log("nao existe");
      getMultiImageMetadata(app)
        .then((labels) => {
          createSetupWindow(app, JSON.stringify(labels), type);
        }).catch((error) => {
          console.error('Error fetching multi-container configs:', error);
        });
    }
    else
      startDockerProcess(app, type);
  }
  else if(type == 'image'){
    if(!setWindow && !doesContainerExist(app)){
      const labels = JSON.stringify(getImageMetadata(app));
      createSetupWindow(app, labels, type);
    }
    else
      startDockerProcess(app, type);
  }
});

ipcMain.on('openLoginWindow', (event) => {
  createLoginWindow();
  if (authWindow) {
    authWindow.close();
  }
});

ipcMain.on('openRegisterWindow', (event) => {
  createRegisterWindow();
  if (authWindow) {
      authWindow.close();
  }
});

ipcMain.on('register', (event, userData) => {
  if (authWindow) {
    authWindow.close();
  }
  
  var options = {
      'method': 'POST',
      'url': 'http://localhost:8000/register',
      form: {
          'type': userData.type,
          'password': userData.password,
          'username': userData.username,
          'email': userData.email
      }
  };
  
  request(options, function (error, response) {
      if (error) throw new Error(error);
      //console.log(response.body);
      if(response.body.includes("Successful")){
        if (regWindow) {
          regWindow.close();
        }

        if (!authWindow) {
            createAuthWindow();
        }
      }
  });
});

ipcMain.on('login', (event, userData) => {
  if (authWindow) {
    authWindow.close();
  }
  
  var options = {
      'method': 'POST',
      'url': 'http://localhost:8000/login',
      form: {
          'password': userData.password,
          'username': userData.username
      }
  };
  
  var username = userData.username;
  var password = userData.password;
  var type = "";
  var save = "false";

  request(options, function (error, response) {
      if (error) throw new Error(error);
      if(response.body.includes("/login-success")){

        fetch(`http://localhost:8000/user/${username}`)
          .then((response) => response.json())
          .then((data) => {
            type = data.user.type;
            fs.writeFileSync('userData/session.json', JSON.stringify({ username, type , password, save}));
          })
          .catch((error) => {
            console.error('Error fetching app information:', error);
          });

        if(remcheck){
          save = "true";
          fs.writeFileSync('userData/session.json', JSON.stringify({ username, type, password, save}));
        }
        else {
          save = "false"
          fs.writeFileSync('userData/session.json', JSON.stringify({ username:'', type:'', password:'', save}));
        }
        if (logWindow) {
          logWindow.close();
        }
        
        if (!mainWindow) {
          createWindow();
        }
      }
  });

});

ipcMain.on('saveSession', (event) => {
  if(!remcheck)
    remcheck = true;
  else
    remcheck = false;
});

ipcMain.on('logout', (event) => {
  mainWindow.close();
  createAuthWindow();
  fs.writeFileSync('userData/session.json', JSON.stringify({ username:'', type:'', password:'', save:'false' }));
});

ipcMain.on('back', (event) => {
  if(logWindow)
    logWindow.close();
  if(regWindow)
    regWindow.close();
  createAuthWindow();
});

ipcMain.on('set', (event, appConfig) => {
  console.log(appConfig);
  setWindow.close();
  if(appConfig.type == 'image')
    createDockerProcess(appConfig);
  else if(appConfig.type == 'multicontainer')
    createMultiDockerProcess(appConfig);
});