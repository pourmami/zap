/**
 *
 *    Copyright (c) 2020 Silicon Labs
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

const { dialog, Menu, shell } = require('electron')
const uiJs = require('./ui-util')
const about = require('./about')
const commonUrl = require('../../src-shared/common-url.js')
const browserApi = require('./browser-api.js')
const rendApi = require('../../src-shared/rend-api.js')

const newConfiguration = 'New Configuration'
let menuIsShown = true

const template = (httpPort) => [
  {
    role: 'fileMenu',
    submenu: [
      {
        label: newConfiguration + '...',
        accelerator: 'CmdOrCtrl+N',
        httpPort: httpPort,
        click(menuItem, browserWindow, event) {
          uiJs.openNewConfiguration(menuItem.httpPort)
        },
      },
      {
        label: 'Open File...',
        accelerator: 'CmdOrCtrl+O',
        httpPort: httpPort,
        click(menuItem, browserWindow, event) {
          uiJs.doOpen(browserWindow, menuItem.httpPort)
        },
      },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click(menuItem, browserWindow, event) {
          uiJs.doSave(browserWindow)
        },
      },
      {
        label: 'Save As...',
        click(menuItem, browserWindow, event) {
          uiJs.doSaveAs(browserWindow)
        },
      },
      {
        type: 'separator',
      },
      {
        role: 'close',
      },
      {
        type: 'separator',
      },
      {
        role: 'quit',
      },
    ],
  },
  {
    role: 'editMenu',
  },
  {
    role: 'viewMenu',
    submenu: [
      {
        label: 'Dark theme',
        click(menuItem, browserWindow, event) {
          browserApi.execRendererApi(
            browserWindow,
            rendApi.id.setDarkTheme,
            true
          )
        },
      },
      {
        label: 'Light theme',
        click(menuItem, browserWindow, event) {
          browserApi.execRendererApi(
            browserWindow,
            rendApi.id.setDarkTheme,
            false
          )
        },
      },
      { type: 'separator' },
      {
        label: 'Navigate back ...',
        click(menuItem, browserWindow, event) {
          browserWindow.webContents.goBack()
        },
      },
      {
        label: 'Navigate forward ...',
        click(menuItem, browserWindow, event) {
          browserWindow.webContents.goForward()
        },
      },
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
  {
    role: 'windowMenu',
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'Documentation',
        click(menuItem, browserWindow, event) {
          shell.openExternal(commonUrl.documentationUrl)
        },
      },
      {
        label: 'User and session information',
        click(menuItem, browserWindow, event) {
          getUserSessionInfoMessage(browserWindow)
            .then((msg) => {
              dialog.showMessageBox(browserWindow, {
                title: 'User and session information',
                message: msg,
                buttons: ['Dismiss'],
              })
            })
            .catch((err) => uiJs.showErrorMessage('Session info', err))
        },
      },
      {
        label: 'Renderer API information',
        click(menuItem, browserWindow, event) {
          browserApi.getRendererApiInformation(browserWindow).then((msg) => {
            dialog.showMessageBox(browserWindow, {
              title: 'Renderer API information',
              message: msg,
              buttons: ['Dismiss'],
            })
          })
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Start progress',
        click(menuItem, browserWindow) {
          browserApi.execRendererApi(
            browserWindow,
            rendApi.id.progressStart,
            'Test progress indication.'
          )
        },
      },
      {
        label: 'End progress',
        click(menuItem, browserWindow) {
          browserApi.execRendererApi(browserWindow, rendApi.id.progressEnd)
        },
      },
      {
        label: 'Show debug navigation bar',
        click(menuItem, browserWindow) {
          browserApi.execRendererApi(browserWindow, rendApi.id.debugNavBarOn)
        },
      },
      {
        label: 'Hide debug navigation bar',
        click(menuItem, browserWindow) {
          browserApi.execRendererApi(browserWindow, rendApi.id.debugNavBarOff)
        },
      },
      {
        label: 'About',
        httpPort: httpPort,
        click(menuItem, browserWindow, event) {
          about.createOrShowAboutWindow(browserWindow, menuItem.httpPort)
        },
      },
    ],
  },
]

async function getUserSessionInfoMessage(browserWindow) {
  let userKey = await browserApi.getUserKeyFromBrowserWindow(browserWindow)
  let sessionUuid = await browserApi.getSessionUuidFromBrowserWindow(
    browserWindow
  )
  return `
  Browser session UUID: ${sessionUuid}
  Browser user key: ${userKey}
  `
}

function showMenu(httpPort) {
  const menu = Menu.buildFromTemplate(template(httpPort))
  Menu.setApplicationMenu(menu)
}

function hideMenu(httpPort) {
  Menu.setApplicationMenu(null)
}
/**
 * Toggling of menu
 *
 * @param {*} port
 */
function toggleMenu(httpPort) {
  menuIsShown = !menuIsShown
  if (!menuIsShown) {
    hideMenu(httpPort)
  } else {
    showMenu(httpPort)
  }
}

/**
 * Initial menu show.
 *
 * @param {*} httpPort
 */
function initMenu(httpPort) {
  menuIsShown = true
  showMenu(httpPort)
}

exports.toggleMenu = toggleMenu
exports.initMenu = initMenu
exports.newConfiguration = newConfiguration
