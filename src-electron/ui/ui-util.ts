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
import { BrowserWindow, dialog, OpenDialogOptions, SaveDialogOptions } from 'electron'
import * as window from './window'
import browserApi from './browser-api.js'
import * as uiTypes from '../../src-shared/types/ui-types'
import { WindowCreateArgs } from 'types/window-types'
import * as util from '../util/util'
const rendApi = require('../../src-shared/rend-api.js')
import * as args from '../util/args'
const newConfiguration = 'New Configuration'

/**
 * Simple dialog to show error messages from electron renderer scope.
 *
 * @param {*} title
 * @param {*} err
 */
function showErrorMessage(title: string, err: Error | string) {
  let msg
  if (err instanceof Error) {
    msg = err.toString() + '\n\nStack trace:\n' + err.stack
  } else {
    msg = err
  }
  dialog.showErrorBox(title, msg)
}

/**
 * Process a single file, parsing it in as JSON and then possibly opening
 * a new window if all is good.
 *
 * @param {*} db
 * @param {*} filePath
 * @param {*} httpPort Server port for the URL that will be constructed.
 */
function openFileConfiguration(
  filePath: string,
  httpPort: number,
  standalone: boolean = false
) {
  window.windowCreate(httpPort, {
    filePath,
    standalone,
  })
}

/**
 * Creates a new window with a blank configuration.
 *
 * @param {*} httpPort
 * @param {*} options: uiMode, debugNavBar
 */
async function openNewConfiguration(
  httpPort: number,
  options?: WindowCreateArgs
) {
  window.windowCreate(httpPort, options)
}

/**
 * Perform a file->open operation.
 *
 * @param {*} menuItem
 * @param {*} browserWindow
 * @param {*} event
 */
 function doOpen(browserWindow : BrowserWindow, httpPort : number) {
  browserApi
    .execRendererApi(
      browserWindow,
      rendApi.id.getStorageItem,
      rendApi.storageKey.fileSave
    )
    .then((filePath) => {
      let opts : OpenDialogOptions = {
        defaultPath: '',
        title: 'Select ZAP or ISC file to load.',
        properties: ['openFile', 'multiSelections'],
      }
      if (filePath != null) {
        opts.defaultPath = filePath
      }
      return dialog.showOpenDialog(browserWindow, opts)
    })
    .then((result) => {
      if (!result.canceled) {
        fileOpen(result.filePaths, httpPort)
        browserApi.execRendererApi(
          browserWindow,
          rendApi.id.setStorageItem,
          rendApi.storageKey.fileSave,
          result.filePaths[0]
        )
      }
    })
    .catch((err) => showErrorMessage('Open file', err))
}

/**
 * Perform a save, defering to save as if file is not yet selected.
 *
 * @param {*} browserWindow
 */
 function doSave(browserWindow : BrowserWindow) {
  if (browserWindow.getTitle().includes(newConfiguration)) {
    doSaveAs(browserWindow)
  } else {
    fileSave(browserWindow, null)
  }
}

/**
 * Perform save as.
 *
 * @param {*} menuItem
 * @param {*} browserWindow
 * @param {*} event
 */
 function doSaveAs(browserWindow: BrowserWindow) {
  browserApi
    .execRendererApi(
      browserWindow,
      rendApi.id.getStorageItem,
      rendApi.storageKey.fileSave
    )
    .then((filePath) => {
      let opts: SaveDialogOptions = {
        filters: [
          { name: 'ZAP Config', extensions: ['zap'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      }
      if (filePath != null) {
        opts.defaultPath = filePath
      }
      return dialog.showSaveDialog(opts)
    })
    .then((result) => {
      if (!result.canceled) {
        fileSave(browserWindow, result.filePath)
        return result.filePath
      } else {
        return null
      }
    })
    .then((filePath) => {
      if (filePath != null) {
        browserWindow.setTitle(filePath)
        browserApi.execRendererApi(
          browserWindow,
          rendApi.id.setStorageItem,
          rendApi.storageKey.fileSave,
          filePath
        )
      }
    })
    .catch((err) => showErrorMessage('Save file', err))
}

/**
 * perform the save.
 *
 * @param {*} db
 * @param {*} browserWindow
 * @param {*} filePath
 * @returns Promise of saving.
 */
function fileSave(browserWindow: BrowserWindow, filePath: string | undefined | null) {
  browserApi.execRendererApi(browserWindow, rendApi.id.save, filePath)
}

/**
 * Perform the do open action, possibly reading in multiple files.
 *
 * @param {*} db
 * @param {*} filePaths
 */
 function fileOpen(filePaths: string[], httpPort: number) {
  filePaths.forEach((filePath) => {
    openFileConfiguration(filePath, httpPort)
  })
}


/**
 * Toggles the dirty flag.
 *
 * @param {*} browserWindow window to affect
 * @param {*} dirty true if this windows is now dirty, false if otherwise
 */
function toggleDirtyFlag(
  browserWindow: Electron.BrowserWindow,
  dirty: boolean
) {
  let title = browserWindow.getTitle()
  // @ts-ignore TODO: type 'isDirty' somehow.
  browserWindow.isDirty = dirty
  if (title.startsWith('* ') && !dirty) {
    browserWindow.setTitle(title.slice(2))
  } else if (!title.startsWith('*') && dirty) {
    browserWindow.setTitle('* ' + title)
  }
}

/**
 * This function should be invoked as a result of the fileBrowse
 * notification via the renderer API. It pops the open dialog and
 * reports result back through the API.
 *
 * @param {*} browserWindow
 * @param {*} options 'key', 'title', 'mode', 'defaultPath'
 */
function openFileDialogAndReportResult(
  browserWindow: Electron.BrowserWindow,
  options: uiTypes.UiFileBrowseOptionsType
) {
  let p: Electron.OpenDialogOptions = {
    buttonLabel: 'Generate',
  }
  if (options.mode === 'file') {
    p.properties = ['openFile']
  } else if (options.mode == 'directory') {
    p.properties = ['openDirectory']
  }
  p.defaultPath = options.defaultPath
  dialog.showOpenDialog(browserWindow, p).then((result) => {
    if (!result.canceled) {
      let output = {
        context: options.context,
        filePaths: result.filePaths,
      }
      browserApi.reportFiles(browserWindow, output)
    }
  })
}

function enableUi(
  port: number,
  zapFiles: string[],
  uiMode: string,
  standalone: boolean
) {
  window.initializeElectronUi(port)
  if (zapFiles.length == 0) {
    return openNewConfiguration(port, {
      uiMode: uiMode,
      standalone: standalone,
      filePath: null,
    })
  } else {
    return util.executePromisesSequentially(zapFiles, (f: string) =>
      openFileConfiguration(f, port)
    )
  }
}

exports.showErrorMessage = showErrorMessage
exports.doOpen = doOpen
exports.doSave = doSave
exports.doSaveAs = doSaveAs
exports.openFileConfiguration = openFileConfiguration
exports.openNewConfiguration = openNewConfiguration
exports.toggleDirtyFlag = toggleDirtyFlag
exports.openFileDialogAndReportResult = openFileDialogAndReportResult
exports.enableUi = enableUi
