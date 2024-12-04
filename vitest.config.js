import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html'],
      include: [
        'index.js',
        'src/**/*.js'
      ],
      exclude: [
        'node_modules/**',
        'tests/**',
        'coverage/**',
        '**/*.test.js',
        '**/*.config.js'
      ],
      all: true,
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90
    },
    testTimeout: 10000,
    globals: true,
    deps: {
      inline: ['@hyperswarm/testnet']
    }
  }
})
