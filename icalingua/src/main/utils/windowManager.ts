import { BrowserWindow, globalShortcut, nativeTheme, shell, screen, ipcMain } from 'electron'
import { clearCurrentRoomUnread, getCookies, sendOnlineData } from '../ipc/botAndStorage'
import { getConfig } from './configManager'
import getWinUrl from '../../utils/getWinUrl'
import { updateTrayIcon, updateTrayMenu } from './trayManager'
import path from 'path'
import ui from './ui'
import argv from './argv'
import { newIcalinguaWindow } from '../../utils/IcalinguaWindow'
import getStaticPath from '../../utils/getStaticPath'
import hashCode from './hash'

let loginWindow: BrowserWindow
let mainWindow: BrowserWindow
let requestWindow: BrowserWindow
let unlockWindow: BrowserWindow
let isLocked: boolean = false
let unlockCallback: Function

async function loadDevtools(window: BrowserWindow) {
    try {
        // require.resolve 会给出 vue-devtools/lib/index.js 的路径
        const moduleFile = path.resolve(require.resolve('vue-devtools'))
        const extensionDir = path.join(path.dirname(path.dirname(moduleFile)), 'vender')
        await window.webContents.session.loadExtension(extensionDir)
    } catch (e) {
        console.error('Failed to load vue-devtools extension.', e)
    }
}

export const isAppLocked = () => isLocked
export const loadMainWindow = () => {
    //start main window
    const winSize = getConfig().winSize
    const theme = getConfig().theme
    const themeColor =
        theme === 'auto'
            ? nativeTheme.shouldUseDarkColors
                ? '#131415'
                : '#FFFFFF'
            : theme === 'dark'
            ? '#131415'
            : '#FFFFFF'
    mainWindow = newIcalinguaWindow({
        height: winSize.height,
        width: winSize.width,
        show: process.env.NODE_ENV !== 'development' && !argv.hide,
        backgroundColor: themeColor,
        autoHideMenuBar: !getConfig().showAppMenu,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: false,
            contextIsolation: false,
        },
    })

    if (loginWindow) loginWindow.destroy()

    mainWindow.on('close', (e) => {
        e.preventDefault()
        ui.chroom(0)
        mainWindow.hide()
        if (process.platform === 'darwin') {
            globalShortcut.unregisterAll()
        }
    })

    if (process.env.NODE_ENV === 'development') {
        loadDevtools(mainWindow)
    }

    setTimeout(
        () =>
            mainWindow.on('focus', async () => {
                clearCurrentRoomUnread()
                await updateTrayIcon()
            }),
        5000,
    )

    mainWindow.webContents.setWindowOpenHandler((details) => {
        if (new URL(details.url).hostname == 'qun.qq.com') {
            ;(async () => {
                const size = screen.getPrimaryDisplay().size
                const win = newIcalinguaWindow({
                    height: size.height - 200,
                    width: 500,
                    autoHideMenuBar: true,
                    webPreferences: {
                        contextIsolation: false,
                        preload: path.join(getStaticPath(), 'homeworkPreload.js'),
                    },
                })
                const cookies = await getCookies('qun.qq.com')
                for (const i in cookies) {
                    await win.webContents.session.cookies.set({
                        url: 'https://qun.qq.com',
                        name: i,
                        value: cookies[i],
                    })
                }

                await win.loadURL(details.url, { userAgent: 'QQ/8.9.13.9280' })
            })()
        } else if (new URL(details.url).hostname == 'docs.qq.com') {
            ;(async () => {
                const win1 = newIcalinguaWindow({
                    autoHideMenuBar: true,
                })
                const cookies = await getCookies('docs.qq.com')
                for (const i in cookies) {
                    await win1.webContents.session.cookies.set({
                        url: 'https://docs.qq.com',
                        name: i,
                        value: cookies[i],
                    })
                }
                win1.webContents.setWindowOpenHandler((details) => {
                    return { action: 'deny' }
                })
                win1.webContents.on('will-navigate', (event, url) => {
                    const parsedUrl = new URL(url)
                    parsedUrl.hostname !== 'docs.qq.com' && event.preventDefault()
                })
                await win1.loadURL(details.url, { userAgent: 'QQ/8.9.13.9280' })
            })()
        } else {
            shell.openExternal(details.url)
        }
        return {
            action: 'deny',
        }
    })

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.setZoomFactor(getConfig().zoomFactor / 100)
        sendOnlineData()
    })

    return mainWindow.loadURL(getWinUrl() + '#/main')
}
export const showMainWindow = () => {
    if (mainWindow && process.env.NODE_ENV !== 'development' && !argv.hide) {
        mainWindow.show()
        mainWindow.focus()
    }
}
export const refreshMainWindowColor = () => {
    const color =
        getConfig().theme === 'auto'
            ? nativeTheme.shouldUseDarkColors
                ? '#131415'
                : '#FFFFFF'
            : getConfig().theme === 'dark'
            ? '#131415'
            : '#FFFFFF'
    if (mainWindow.getBackgroundColor() === color) return
    mainWindow.setBackgroundColor(color)
    updateTrayIcon()
}
export const showLoginWindow = (isConfiguringBridge = false, disableIdLogin = false) => {
    if (loginWindow) {
        loginWindow.show()
        loginWindow.focus()
    } else {
        loginWindow = newIcalinguaWindow({
            height: 720,
            width: 550,
            maximizable: false,
            webPreferences: {
                webSecurity: false,
                nodeIntegration: true,
                contextIsolation: false,
            },
        })

        loginWindow.on('closed', () => {
            loginWindow = null
        })

        if (process.env.NODE_ENV === 'development') {
            loadDevtools(loginWindow)
            loginWindow.minimize()
        }

        return loginWindow.loadURL(
            getWinUrl() + `#/login?bridge=${isConfiguringBridge}&disableIdLogin=${disableIdLogin}`,
        )
    }
}
export const showRequestWindow = () => {
    if (requestWindow && !requestWindow.isDestroyed()) {
        requestWindow.show()
        requestWindow.focus()
    } else {
        requestWindow = newIcalinguaWindow({
            width: 750,
            height: 600,
            webPreferences: {
                nodeIntegration: true,
                webSecurity: false,
                contextIsolation: false,
            },
            autoHideMenuBar: true,
        })

        if (process.env.NODE_ENV === 'development') {
            loadDevtools(requestWindow)
        }

        requestWindow.loadURL(getWinUrl() + '#/friendRequest')
    }
}
export const sendToLoginWindow = (channel: string, payload?: any) => {
    if (loginWindow) loginWindow.webContents.send(channel, payload)
    else showLoginWindow().then(() => loginWindow.webContents.send(channel, payload))
}
export const sendToMainWindow = (channel: string, payload?: any) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload)
}
export const sendToRequestWindow = (channel: string, payload?: any) => {
    if (requestWindow && !requestWindow.isDestroyed()) requestWindow.webContents.send(channel, payload)
}
export const getMainWindow = () => mainWindow
export const showSetLockPasswordWindow = () => {
    const setLockPasswordWindow = newIcalinguaWindow({
        height: 160,
        width: 500,
        autoHideMenuBar: true,
        maximizable: false,
        modal: true,
        parent: mainWindow,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
        },
    })
    setLockPasswordWindow.loadURL(getWinUrl() + '#/setLockPassword')
}
export const lockMainWindow = () => {
    const { lockPassword } = getConfig()
    if (!lockPassword) {
        showSetLockPasswordWindow()
    } else {
        mainWindow.hide()
        isLocked = true
        updateTrayMenu()
    }
}
export const judgeLocked = (callback: () => void) => {
    if (isLocked) {
        unlockCallback = () => {
            isLocked = false
            updateTrayMenu()
            callback()
        }
        if (!unlockWindow) {
            unlockWindow = newIcalinguaWindow({
                height: 160,
                width: 500,
                autoHideMenuBar: true,
                maximizable: false,
                modal: true,
                parent: mainWindow,
                webPreferences: {
                    contextIsolation: false,
                    nodeIntegration: true,
                },
            })
            unlockWindow.on('closed', () => {
                unlockWindow = null
            })
            unlockWindow.loadURL(getWinUrl() + '#/unlock')
        } else {
            unlockWindow.show()
        }
    } else {
        callback()
    }
}
export const tryToShowMainWindow = (callback?: () => void) => {
    judgeLocked(() => {
        mainWindow.show()
        mainWindow.focus()
        callback?.()
    })
}
export const tryToShowAllWindows = () => {
    judgeLocked(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show()
            mainWindow.focus()
        } else if (loginWindow && !loginWindow.isDestroyed()) {
            loginWindow.show()
            loginWindow.focus()
        } else if (requestWindow && !requestWindow.isDestroyed()) {
            requestWindow.show()
            requestWindow.focus()
        }
    })
}
export const destroyWindow = () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy()
    if (loginWindow && !loginWindow.isDestroyed()) loginWindow.destroy()
    if (requestWindow && !requestWindow.isDestroyed()) requestWindow.destroy()
}
export const getLoginWindow = () => loginWindow
export const getMainWindowScreen = () => {
    if (mainWindow) {
        const bounds = mainWindow.getBounds()
        return screen.getDisplayNearestPoint({
            x: bounds.x,
            y: bounds.y,
        })
    }
    return null
}

ipcMain.on('lock', () => {
    lockMainWindow()
})
ipcMain.on('unlock', (_, password: string) => {
    if (!unlockWindow) return

    if (getConfig().hashLockPassword) {
        password = hashCode(password);
    }

    if (password === getConfig().lockPassword) {
        unlockWindow.webContents.send('unlock-succeed')

        setTimeout(() => {
            unlockWindow.destroy()
            unlockCallback()
        }, 500)
    } else {
        unlockWindow.webContents.send('unlock-fail')
    }
})
