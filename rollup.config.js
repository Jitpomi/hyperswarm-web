export default {
  input: 'index.js',
  output: {
    file: 'dist/hyperswarm-web.js',
    format: 'es',
    sourcemap: true
  },
  external: ['events', '@hyperswarm/dht', 'b4a']
}
