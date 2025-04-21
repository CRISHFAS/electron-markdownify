'use strict';

const { app, Menu, dialog, shell, BrowserWindow } = require('electron');

const ipcMain = require('electron').ipcMain;

const ipc = app.ipcMain;
const fs = require('fs')
const os = require('os')
const path = require('path')

const mainPage = 'file://' + __dirname + '/index.html';

const tray = require('./tray');
const appDetails = require('./package.json');

var localShortcut = require('electron-localshortcut');

let isQuitting = false;

var createWindow = () => {
    let mainWindow = new BrowserWindow({
        width: 1400,
        height: 800,
        icon: __dirname + '/app/img/markdownify.ico',
        title: appDetails.productName,
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadURL(mainPage);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.on('close', e => {
        if (!isQuitting) {
            e.preventDefault();
            if (process.platform === 'darwin') {
                app.hide();
            } else {
                mainWindow.hide();
            }
        }
    });

    mainWindow.webContents.on('will-navigate', (e, url) => {
        e.preventDefault();
        shell.openExternal(url);
    });

    var template = [{
            label: "&Archivo",
            submenu: [{
                    label: "Nuevo",
                    accelerator: "CmdOrCtrl+N",
                    click: () => {
                        var focusedWindow = BrowserWindow.getFocusedWindow();
                        focusedWindow.webContents.send('file-new');
                    }
                },
                {
                    label: "Abrir",
                    accelerator: "CmdOrCtrl+O",
                    click: () => {
                        let focusedWindow = BrowserWindow.getFocusedWindow();
                        focusedWindow.webContents.send('file-open');
                    }
                },
                {
                    label: "Guardar",
                    accelerator: "CmdOrCtrl+S",
                    click: () => {
                        let focusedWindow = BrowserWindow.getFocusedWindow();
                        focusedWindow.webContents.send('file-save');
                    }
                },
                {
                    label: "Guardar como",
                    accelerator: "CmdOrCtrl+Shift+S",
                    click: () => {
                        var focusedWindow = BrowserWindow.getFocusedWindow();
                        focusedWindow.webContents.send('file-save-as');
                    }
                },
                {
                    label: "Guardar como PDF",
                    accelerator: "CmdOrCtrl+Shift+P",
                    click: () => {
                        var focusedWindow = BrowserWindow.getFocusedWindow();
                        focusedWindow.webContents.send('file-pdf');
                    }
                },
                {
                    label: "Quitar",
                    accelerator: "Command+Q",
                    click: app.quit
                }
            ]
        },
        {
            label: "&Editar",
            submenu: [{
                    label: "Deshacer",
                    accelerator: "CmdOrCtrl+Z",
                    role: "undo"
                },
                {
                    label: "Rehacer",
                    accelerator: "Shift+CmdOrCtrl+Z",
                    role: "redo"
                },
                {
                    type: "separator"
                },
                {
                    label: "Cortar",
                    accelerator: "CmdOrCtrl+X",
                    role: "cut"
                },
                {
                    label: "Copar",
                    accelerator: "CmdOrCtrl+C",
                    role: "copy"
                },
                {
                    label: "Pegar",
                    accelerator: "CmdOrCtrl+V",
                    role: "paste"
                },
                {
                    label: "Seleccionar todo",
                    accelerator: "CmdOrCtrl+A",
                    role: 'selectall'
                },
                {
                    type: "separator"
                },
                {
                    label: "Buscar",
                    accelerator: "CmdOrCtrl+F",
                    click: () => {
                        let focusedWindow = BrowserWindow.getFocusedWindow();
                        focusedWindow.webContents.send('ctrl+f');
                    }
                },
                {
                    label: "Reemplazar",
                    accelerator: "CmdOrCtrl+Shift+F",
                    click: () => {
                        let focusedWindow = BrowserWindow.getFocusedWindow();
                        focusedWindow.webContents.send('ctrl+shift+f');
                    }
                }
            ]
        },
        {
            label: "&Ver",
            submenu: [{
                label: "Cambiar a pantalla completa",
                accelerator: "F11",
                click: () => {
                    let focusedWindow = BrowserWindow.getFocusedWindow();
                    let isFullScreen = focusedWindow.isFullScreen();
                    focusedWindow.setFullScreen(!isFullScreen);
                },
                label: "Alternar una pantalla",
                accelerator: "F11",
                click: () => {
                    let focusedWindow = mainWindow.openDevTools();
                }
            }]
        },
        {
            label: "&Temas",
            submenu: [{
                label: "Nord",
                click: () => {
                    let focusWindow = BrowserWindow.getFocusedWindow()
                    focusWindow.webContents.send("setTheme" , "nord")
                }
            } , {
                label: "Ayu Colors",
                click: () => {
                    let focusWindow = BrowserWindow.getFocusedWindow()
                    focusWindow.webContents.send("setTheme" , "ayu_colors")
                }
            } , {
                label: "Dracula",
                click: () => {
                    let focusWindow = BrowserWindow.getFocusedWindow()
                    focusWindow.webContents.send("setTheme" , "dracula")
                }
            } , {
                label: "Gruvbox",
                click: () => {
                    let focusWindow = BrowserWindow.getFocusedWindow()
                    focusWindow.webContents.send("setTheme" , "gruvbox")
                }
            } , {
                label: "Oceanic",
                click: () => {
                    let focusWindow = BrowserWindow.getFocusedWindow()
                    focusWindow.webContents.send("setTheme" , "oceanic")
                }
            }]
        },
        {
            label: "&Ayuda",
            submenu: [{
                    label: "Documentación",
                    click: () => {
                        shell.openExternal(appDetails.repository.docs);
                    }
                },
                {
                    label: "Informar un problema",
                    click: () => {
                        shell.openExternal(appDetails.bugs.url);
                    }
                },
                {
                    label: "Acerca de Markdownify",
                    click: () => {
                        dialog.showMessageBox({ title: "Acerca de Markdownify", type: "info", message: "Una aplicación de escritorio de edición Markdown minimalista. \nCopyright (c) 2020", buttons: ["Cerrar"] });
                    }
                }
            ]
        }
    ];

    ipcMain.on('print-to-pdf', (event, filePath) => {

        const win = BrowserWindow.fromWebContents(event.sender)
        win.webContents.printToPDF({ pageSize: 'A4' }, (error, data) => {
            if (error) throw error
            fs.writeFile(filePath, data, (error) => {
                if (error) {
                    throw error
                }
            })
        })

    });

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    localShortcut.register(mainWindow, 'Ctrl+B', () => {
        mainWindow.webContents.send('ctrl+b');
    });

    localShortcut.register(mainWindow, 'Ctrl+i', () => {
        mainWindow.webContents.send('ctrl+i');
    });

    localShortcut.register(mainWindow, 'Ctrl+/', () => {
        mainWindow.webContents.send('ctrl+/');
    });

    localShortcut.register(mainWindow, 'Ctrl+l', () => {
        mainWindow.webContents.send('ctrl+l');
    });

    localShortcut.register(mainWindow, 'Ctrl+h', () => {
        mainWindow.webContents.send('ctrl+h');
    });

    localShortcut.register(mainWindow, 'Ctrl+Alt+i', () => {
        mainWindow.webContents.send('ctrl+alt+i');
    });

    localShortcut.register(mainWindow, 'Ctrl+Shift+t', () => {
        mainWindow.webContents.send('ctrl+shift+t');
    });

    tray.create(mainWindow);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
});

try {
    require('electron-reloader')(module)
} catch (_) {}