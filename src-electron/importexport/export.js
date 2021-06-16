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

/*
 * This file provides the functionality that reads the ZAP data from a database
 * and exports it into a file.
 */
const os = require('os')
const fs = require('fs')
const path = require('path')
const env = require('../util/env.js')
const querySession = require('../db/query-session.js')
const queryConfig = require('../db/query-config.js')
const queryImpExp = require('../db/query-impexp.js')
const dbEnum = require('../../src-shared/db-enum.js')
const util = require('../util/util.js')

async function exportEndpointType(db, endpointType) {
  let data = await queryImpExp.exportClustersFromEndpointType(
    db,
    endpointType.endpointTypeId
  )

  endpointType.clusters = data

  let ps = data.map(async (endpointCluster) => {
    let endpointClusterId = endpointCluster.endpointClusterId
    delete endpointCluster.endpointClusterId
    endpointCluster.commands = await queryImpExp.exportCommandsFromEndpointTypeCluster(
      db,
      endpointType.endpointTypeId,
      endpointClusterId
    )

    endpointCluster.attributes = await queryImpExp.exportAttributesFromEndpointTypeCluster(
      db,
      endpointType.endpointTypeId,
      endpointClusterId
    )
  })
  return Promise.all(ps)
}

/**
 * Resolves to an array of endpoint types.
 *
 * @export
 * @param {*} db
 * @param {*} sessionId
 * @returns Promise to retrieve all endpoint types.
 */
async function exportEndpointTypes(db, sessionId) {
  return queryImpExp
    .exportEndpointTypes(db, sessionId)
    .then((endpointTypes) => {
      let promises = endpointTypes.map((endpointType) =>
        exportEndpointType(db, endpointType)
      )

      return Promise.all(promises)
        .then(() => queryImpExp.exportEndpoints(db, sessionId, endpointTypes))
        .then((endpoints) => {
          endpointTypes.forEach((ept) => {
            delete ept.endpointTypeId
          })
          endpoints.forEach((ep) => {
            delete ep.endpointTypeRef
          })
          return { endpointTypes: endpointTypes, endpoints: endpoints }
        })
    })
}

/**
 * Resolves with data for packages.
 *
 * @param {*} db
 * @param {*} sessionId
 */
async function exportSessionPackages(db, sessionId, zapProjectFileLocation) {
  return queryImpExp.exportPackagesFromSession(db, sessionId).then((packages) =>
    packages.map((p) => {
      let pathRelativity = dbEnum.pathRelativity.relativeToUserHome
      let relativePath = path.relative(os.homedir(), p.path)
      if (zapProjectFileLocation != null) {
        let rel = path.relative(path.dirname(zapProjectFileLocation), p.path)
        if (rel.length > 0) {
          relativePath = rel
          pathRelativity = dbEnum.pathRelativity.relativeToZap
        }
      }
      return {
        pathRelativity: pathRelativity,
        path: relativePath,
        version: p.version,
        type: p.type,
      }
    })
  )
}

/**
 * Toplevel file that takes a given session ID and exports the data into the file
 *
 * @export
 * @param {*} db
 * @param {*} sessionId
 * @param {*} filePath
 * @returns A promise that resolves with the path of the file written.
 */
async function exportDataIntoFile(
  db,
  sessionId,
  filePath,
  options = {
    removeLog: false,
  }
) {
  env.logDebug(`Writing state from session ${sessionId} into file ${filePath}`)
  let state = await createStateFromDatabase(db, sessionId)
  await new Promise((resolve, reject) => {
    if (options.removeLog) delete state.log
    fs.writeFile(filePath, JSON.stringify(state, null, 2), (err) => {
      if (err) reject(err)
      resolve()
    })
  })
  await querySession.setSessionClean(db, sessionId)
  return filePath
}

/**
 * Given a database and a session id, this method returns a promise that
 * resolves with a state object that needs to be saved into a file.
 *
 * @export
 * @param {*} db
 * @param {*} sessionId
 * @returns state object that needs to be saved into a file.
 */
async function createStateFromDatabase(db, sessionId) {
  let state = {
    featureLevel: env.zapVersion().featureLevel,
    creator: 'zap',
  }
  let promises = []
  let excludedKeys = [dbEnum.sessionKey.filePath]

  env.logInfo(`Exporting data for session: ${sessionId}`)
  // Deal with the key/value table
  let getKeyValuesPromise = querySession
    .getAllSessionKeyValues(db, sessionId)
    .then((data) => {
      env.logDebug(`Retrieved session keys: ${data.length}`)
      let zapFilePath = null
      let storedKeyValuePairs = data.filter(
        (datum) => !excludedKeys.includes(datum.key)
      )
      let x = data.filter((datum) => datum.key == dbEnum.sessionKey.filePath)
      if (x.length > 0) zapFilePath = x[0].value
      return {
        key: 'keyValuePairs',
        data: storedKeyValuePairs,
        zapFilePath: zapFilePath,
      }
    })
    .then((data) => {
      return exportSessionPackages(db, sessionId, data.zapFilePath).then(
        (d) => {
          return [data, { key: 'package', data: d }]
        }
      )
    })
  promises.push(getKeyValuesPromise)

  let allEndpointTypes = await exportEndpointTypes(db, sessionId)

  let parseEndpointTypes = Promise.resolve({
    key: 'endpointTypes',
    data: allEndpointTypes.endpointTypes,
  })

  let parseEndpoints = Promise.resolve({
    key: 'endpoints',
    data: allEndpointTypes.endpoints,
  })

  let appendLogPromise = querySession.readLog(db, sessionId).then((log) => {
    return { key: 'log', data: log }
  })

  promises.push(parseEndpointTypes)
  promises.push(parseEndpoints)
  promises.push(appendLogPromise)

  let data = await Promise.all(promises)
  data.flat().forEach((keyDataPair) => {
    state[keyDataPair.key] = keyDataPair.data
  })
  return state
}
// exports
exports.exportDataIntoFile = exportDataIntoFile
exports.createStateFromDatabase = createStateFromDatabase
