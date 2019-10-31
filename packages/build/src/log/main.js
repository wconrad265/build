const { basename } = require('path')

const { tick, pointer, arrowDown } = require('figures')
const omit = require('omit.js')

const telemetry = require('../utils/telemetry')
const { version } = require('../../package.json')

const { log } = require('./logger')
const { cleanStacks } = require('./stack.js')

// eslint-disable-next-line import/order
const { greenBright, cyanBright, redBright, yellowBright, bold, white } = require('chalk')

const HEADING_PREFIX = pointer
const SUBTEXT_PADDING = '  '

const logBuildStart = function() {
  log(`${greenBright.bold(`${HEADING_PREFIX} Starting Netlify Build v${version}`)}
${SUBTEXT_PADDING}https://github.com/netlify/build
`)
}

const logOptions = function(options) {
  const opts = omit(options, ['token', 'dry', 'cwd'])
  if (Object.keys(opts).length) {
    log(`${cyanBright.bold('Options')}\n`, opts, '\n')
  }
}

const logConfigPath = function(configPath) {
  log(`${cyanBright.bold(`${HEADING_PREFIX} Using config file:`)}
${SUBTEXT_PADDING}${configPath}
`)
}

const logInstallPlugins = function() {
  log(cyanBright.bold(`${HEADING_PREFIX} Installing plugins dependencies`))
}

const logLoadPlugins = function() {
  log(cyanBright.bold(`\n${HEADING_PREFIX} Loading plugins`))
}

const logLoadPlugin = function(id, type, core) {
  const idA = id === undefined ? '' : `"${id}" `
  const location = core ? 'build core' : type
  log(yellowBright(`${SUBTEXT_PADDING}Loading plugin ${idA}from ${location}`))
}

const logLifeCycleStart = function(instructions) {
  const stepsWord = instructions.length === 1 ? 'step' : `steps`
  log(`\n${greenBright.bold(`${HEADING_PREFIX} Running Netlify Build Lifecycle`)}
${SUBTEXT_PADDING}Found ${instructions.length} ${stepsWord}. Lets do this!`)
}

const logDryRunStart = function(hookWidth, length) {
  const columnWidth = getDryColumnWidth(hookWidth, length)
  const line = '─'.repeat(columnWidth)
  const secondLine = '─'.repeat(columnWidth)

  log(`
${cyanBright.bold(`${HEADING_PREFIX} Netlify Build Steps`)}
${SUBTEXT_PADDING}For more information on build lifecycles see the docs https://github.com/netlify/build

${SUBTEXT_PADDING}Running \`netlify build\` will execute this build flow

${bold(`${SUBTEXT_PADDING}┌─${line}─┬─${secondLine}─┐
${SUBTEXT_PADDING}│ ${DRY_HEADER_NAMES[0].padEnd(columnWidth)} │ ${DRY_HEADER_NAMES[1].padEnd(columnWidth)} │
${SUBTEXT_PADDING}└─${line}─┴─${secondLine}─┘`)}`)
}

const logDryRunInstruction = function({ instruction: { id, hook, type, core }, index, configPath, hookWidth, length }) {
  const columnWidth = getDryColumnWidth(hookWidth, length)
  const line = '─'.repeat(columnWidth)
  const countText = `${index + 1}. `
  const downArrow = length === index + 1 ? '  ' : ` ${arrowDown}`
  const hookNameWidth = columnWidth - countText.length - downArrow.length
  const location = getPluginLocation({ id, type, core, configPath })

  log(
    cyanBright.bold(`${SUBTEXT_PADDING}┌─${line}─┐
${SUBTEXT_PADDING}│ ${cyanBright(countText)}${hook.padEnd(hookNameWidth)}${downArrow} │ ${location}
${SUBTEXT_PADDING}└─${line}─┘ `),
  )
}

const getPluginLocation = function({ id, type, core, configPath }) {
  if (id.startsWith('config.')) {
    return `${white('Config')} ${cyanBright(basename(configPath))} ${yellowBright(id.replace('config.', ''))}`
  }

  if (core) {
    return `${white('Plugin')} ${yellowBright(id)} in build core`
  }

  return `${white('Plugin')} ${id} ${yellowBright(type)}`
}

const getDryColumnWidth = function(hookWidth, length) {
  const symbolsWidth = `${length}`.length + 4
  return Math.max(hookWidth + symbolsWidth, DRY_HEADER_NAMES[0].length)
}

const DRY_HEADER_NAMES = ['Lifecycle Hook', 'Location']

const logDryRunEnd = function() {
  log(`
${SUBTEXT_PADDING}If this looks good to you, run \`netlify build\` to execute the build
`)
}

const logInstruction = function({ hook, id, override }, { index, configPath, error }) {
  const overrideWarning =
    override.hook === undefined
      ? ''
      : redBright(`
${HEADING_PREFIX} OVERRIDE: "${override.hook}" method in "${override.name}" has been overriden by "${id}"`)
  const lifecycleName = error ? '' : 'lifecycle '
  const source = id.startsWith('config.build') ? ` in ${basename(configPath)} config file` : ''
  const niceName = id.startsWith('config.build') ? id.replace(/^config\./, '') : id
  const logColor = error ? redBright.bold : cyanBright.bold
  const outputNoChalk = `${index + 1}. Running ${hook} ${lifecycleName}from ${niceName}${source}`
  const output = `${index + 1}. Running ${bold(hook)} ${lifecycleName}from ${bold(niceName)}${source}`
  const line = '─'.repeat(outputNoChalk.length + 2)
  log(
    logColor(`${overrideWarning}
┌─${line}─┐
│ ${output}   │
└─${line}─┘
`),
  )
}

const logCommandStart = function(cmd) {
  log(yellowBright(`Running command "${cmd}"`))
}

const logInstructionSuccess = function() {
  log('')
}

const logTimer = function(durationMs, hook, id) {
  const hookA = hook ? `.${bold(hook)}` : ''
  const idA = id.replace('config.', '')
  const idB = idA.startsWith('build.lifecycle') ? 'build.lifecycle' : idA

  log(` ${greenBright(tick)}  ${greenBright.bold(idB)}${hookA} completed in ${durationMs}ms`)
}

const logTomlWrite = function(tomlPath, toml) {
  log(`
TOML output:

${toml}
TOML file written to ${tomlPath}`)
}

const logErrorInstructions = function() {
  log(`${redBright.bold(`
┌─────────────────────┐
│  Lifecycle Error!   │
└─────────────────────┘`)}

${cyanBright('Running onError methods')}`)
}

const logBuildError = function(error) {
  log(
    redBright.bold(`
┌─────────────────────────────┐
│    Netlify Build Error!     │
└─────────────────────────────┘`),
  )

  if (error.cleanStack) {
    log(cleanStacks(error.message))
  } else {
    log(`\n${error.stack}`)
  }
  log()
}

const logBuildSuccess = function() {
  log(
    greenBright.bold(`
┌─────────────────────────────┐
│   Netlify Build Complete!   │
└─────────────────────────────┘
`),
  )
}

const logBuildEnd = function({ buildInstructions, config, duration }) {
  const sparkles = cyanBright('(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧')
  log(`\n${sparkles} Have a nice day!\n`)
  const plugins = Object.values(config.plugins).map(({ type }) => type)
  // telemetry noOps if BUILD_TELEMETRY_DISBALED set
  telemetry.track('buildComplete', {
    steps: buildInstructions.length,
    duration,
    pluginCount: plugins.length,
    plugins,
  })
}

module.exports = {
  logBuildStart,
  logOptions,
  logConfigPath,
  logInstallPlugins,
  logLoadPlugins,
  logLoadPlugin,
  logLifeCycleStart,
  logDryRunStart,
  logDryRunInstruction,
  logDryRunEnd,
  logInstruction,
  logCommandStart,
  logInstructionSuccess,
  logTimer,
  logTomlWrite,
  logErrorInstructions,
  logBuildError,
  logBuildSuccess,
  logBuildEnd,
}
