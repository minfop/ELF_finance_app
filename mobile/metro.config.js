// Use Expo's default Metro config so TS/modern syntax (e.g., `import { type ... }`) is supported
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const config = getDefaultConfig(projectRoot)

// Keep resolution inside this app to avoid monorepo bleed-through
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
}

module.exports = config


