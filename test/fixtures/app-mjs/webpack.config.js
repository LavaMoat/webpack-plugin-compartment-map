import CompartmentMapPlugin from '../../../src/plugin.mjs'

export default {
  entry: './entry.js',
  mode: 'production',
  externalsType: 'node-commonjs',
  target: 'node12',
  output: {
    asyncChunks: false,
    chunkFormat: 'module',
    enabledChunkLoadingTypes: ['jsonp'],
    clean: {
      //keep: /\/xx\//
    }
  },
  optimization: {
    //moduleIds: false,
    //moduleIds: 'named',
    runtimeChunk: true,
  },
  module: {
    parser: {
      javascript: {
        dynamicImportMode: 'eager'
      }
    },
//    exprContextCritical: true,
//    exprContextRecursive: true,
//    exprContextRegExp: true,
//    exprContextRequest: '.',
//    unknownContextCritical: true,
//    unknownContextRecursive: true,
//    unknownContextRegExp: true,
//    unknownContextRequest: '.',
//    wrappedContextCritical: true,
//    wrappedContextRecursive: true,
//    wrappedContextRegExp: /.*/,
//    strictExportPresence: true,
  },
  plugins: [
    new CompartmentMapPlugin()
  ]
};
