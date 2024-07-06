import { execFileSync, execFile } from 'child_process'
import which from 'which'
import { BrowserWindow, app, ipcMain } from 'electron'
import path from 'path'
import querystring from 'querystring'
import getStaticPath from '../../utils/getStaticPath'
import ui from '../utils/ui'
import md5 from 'md5'
import { newIcalinguaWindow } from '../../utils/IcalinguaWindow'
import { getMainWindowScreen } from '../utils/windowManager'
import { toInteger } from 'lodash'
import { getConfig } from '../utils/configManager'
import { download, downloadImage2Open, getImageExt } from './downloadManager'

let viewer = ''
const VIEWERS = ['gwenview', 'eog', 'eom', 'ristretto', 'okular', 'gimp', 'xdg-open', 'open']

try {
    const xdgDefault = execFileSync('xdg-mime', ['query', 'default', 'image/jpeg']).toString()
    for (const i of VIEWERS) {
        if (xdgDefault.includes(i)) {
            viewer = i
            break
        }
    }
} catch (e) {}

if (!viewer) {
    for (const i of VIEWERS) {
        const resolved = which.sync(i, { nothrow: true })
        if (resolved) {
            viewer = i
            break
        }
    }
}

if (!viewer) {
    console.log('Cannot find an external image viewer')
}

const builtinViewers = new Map<string, BrowserWindow>()
const openImage = (url: string, external: boolean = false, urlList: Array<string> = []) => {
    if (!external) {
        const urlMd5 = md5(url)
        if (builtinViewers.get(urlMd5)) {
            const viewerWindow = builtinViewers.get(urlMd5)
            viewerWindow.focus()
        } else {
            const viewerWindow = newIcalinguaWindow({
                autoHideMenuBar: true,
                webPreferences: {
                    contextIsolation: false,
                    preload: path.join(getStaticPath(), 'imgViewPreload.js'),
                },
            })
            // get main window screen location
            const bound = viewerWindow.getBounds()
            const screen = getMainWindowScreen()
            if (screen) {
                const alignX = toInteger(screen.workArea.x + screen.workArea.width / 2 - bound.width / 2)
                const alignY = toInteger(screen.workArea.y + screen.workArea.height / 2 - bound.height / 2)
                viewerWindow.setBounds({
                    x: alignX,
                    y: alignY,
                })
            }
            viewerWindow.loadURL(
                'file://' + path.join(getStaticPath(), 'imgView.html') + '?' + querystring.stringify({ url }),
            )
            //viewerWindow.maximize()
            if (urlList.length > 1 && !getConfig().singleImageMode) {
                viewerWindow.webContents.on('did-finish-load', () => {
                    viewerWindow.webContents.executeJavaScript(`window.imgs = ${JSON.stringify(urlList)};`)
                    viewerWindow.webContents.executeJavaScript(
                        `window.disableTouchPad = ${getConfig().disableImgViewTouchPad};`,
                    )
                })
            } else {
                viewerWindow.on('closed', () => builtinViewers.delete(urlMd5))
                builtinViewers.set(urlMd5, viewerWindow)
                viewerWindow.webContents.on('did-finish-load', () => {
                    viewerWindow.webContents.executeJavaScript(
                        `window.imgs = ${JSON.stringify([url])};` +
                            `document.getElementById('BAR').style['min-width'] = '380px';` +
                            `document.getElementById('BAR_TABLE').style['min-width'] = '360px';` +
                            `document.getElementById('prev').parentElement.style['display'] = 'none';` +
                            `document.getElementById('next').parentElement.style['display'] = 'none';`,
                    )
                    viewerWindow.webContents.executeJavaScript(
                        `window.disableTouchPad = ${getConfig().disableImgViewTouchPad};`,
                    )
                })
            }
        }
    } else if (viewer) {
        execFile(viewer, [url])
    } else if (process.platform === 'win32' || process.platform === 'darwin') {
        downloadImage2Open(url)
    } else {
        ui.messageError('找不到可用的本地查看器')
    }
}
ipcMain.on('openImage', (e, url: string, external: boolean = false, urlList: Array<string> = []) =>
    openImage(url, external, urlList),
)
ipcMain.on('saveSticker', async (e, url: string) => {
    const imgExt = await getImageExt(url)
    download(url, String(new Date().getTime()) + '.' + imgExt, path.join(app.getPath('userData'), 'stickers'))
})
export default openImage
