'use strict'

const { relative, normalize } = require('path')

const { getCacheDir } = require('@netlify/cache-utils')
const mapObj = require('map-obj')

const { version } = require('../../package.json')

// Retrieve constants passed to plugins
const getConstants = function ({
  configPath,
  buildDir,
  functionsDistDir,
  cacheDir,
  netlifyConfig: {
    build: { publish = buildDir, edge_handlers: edgeHandlers },
    functionsDirectory,
  },
  siteInfo: { id: siteId },
  apiHost,
  token,
  mode,
}) {
  const isLocal = mode !== 'buildbot'
  const normalizedCacheDir = getCacheDir({ cacheDir, cwd: buildDir })

  const constants = {
    // Path to the Netlify configuration file
    CONFIG_PATH: configPath,
    // Directory that contains the deploy-ready HTML files and assets generated by the build
    PUBLISH_DIR: publish,
    // The directory where function source code lives
    FUNCTIONS_SRC: functionsDirectory,
    // The directory where built serverless functions are placed before deployment
    FUNCTIONS_DIST: functionsDistDir,
    // The directory where edge handlers source code lives
    EDGE_HANDLERS_SRC: edgeHandlers,
    // Path to the Netlify build cache folder
    CACHE_DIR: normalizedCacheDir,
    // Boolean indicating whether the build was run locally (Netlify CLI) or in the production CI
    IS_LOCAL: isLocal,
    // The version of Netlify Build
    NETLIFY_BUILD_VERSION: version,
    // The Netlify Site ID
    SITE_ID: siteId,
    // The Netlify API access token
    NETLIFY_API_TOKEN: token,
    // The Netlify API host
    NETLIFY_API_HOST: apiHost,
  }
  const constantsA = mapObj(constants, (key, path) => [key, normalizePath(path, buildDir, key)])
  return constantsA
}

// The current directory is `buildDir`. Most constants are inside this `buildDir`.
// Instead of passing absolute paths, we pass paths relative to `buildDir`, so
// that logs are less verbose.
const normalizePath = function (path, buildDir, key) {
  if (path === undefined || !CONSTANT_PATHS.has(key)) {
    return path
  }

  const pathA = normalize(path)

  if (pathA.startsWith(buildDir) && pathA !== buildDir) {
    return relative(buildDir, pathA)
  }

  return pathA
}

const CONSTANT_PATHS = new Set([
  'CONFIG_PATH',
  'PUBLISH_DIR',
  'FUNCTIONS_SRC',
  'FUNCTIONS_DIST',
  'EDGE_HANDLERS_SRC',
  'CACHE_DIR',
])

module.exports = {
  getConstants,
}
