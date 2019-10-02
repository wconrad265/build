const stream = require('stream')

const redactEnv = require('redact-env')
const mapObj = require('map-obj')

function getSecrets(secretKeys) {
  return redactEnv.build(secretKeys)
}

function redactValues(target, secrets) {
  const type = typeof target
  if (type === 'number' || type === 'boolean') {
    return target
  }
  if (type === 'function') {
    return redactEnv.redact(target.toString(), secrets)
  }
  if (type !== 'object' || target === null) {
    return redactEnv.redact(target, secrets)
  }

  if (target instanceof Error) {
    return redactEnv.redact(target.stack, secrets)
  }

  return mapObj(
    target,
    (key, value) => [
      redactEnv.redact(key, secrets),
      typeof value === 'string' ? redactEnv.redact(value, secrets) : value
    ],
    { deep: true }
  )
}

function redactStream(secrets) {
  return new RedactTransform(secrets)
}

class RedactTransform extends stream.Transform {
  constructor(o) {
    super({ objectMode: true })
    this.lastLineData = ''
    this.secrets = o
  }
  _transform(chunk, encoding, cb) {
    let data = String(chunk)
    if (this.lastLineData) {
      data = this.lastLineData + data
    }
    const lines = data.split('\n')
    this.lastLineData = lines.splice(lines.length - 1, 1)[0]
    for (let l of lines) {
      const newLine = redactEnv.redact(l, this.secrets)
      this.push(newLine + '\n')
    }
    cb()
  }
  _flush(cb) {
    if (!this.lastLineData) {
      return cb()
    }
    this.push(this.lastLineData + '\n')
    this.lastLineData = ''
    cb()
  }
}

module.exports = {
  getSecrets,
  redactValues,
  redactStream
}
