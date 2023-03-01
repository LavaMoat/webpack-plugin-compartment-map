import CompartmentMapPlugin from '../../../src/plugin.mjs'

export default {
  entry: './entry.js',
  mode: 'development',
  optimization: {
    concatenateModules: false,
    providedExports: true,
    sideEffects: true,
    splitChunks: {
    },
    // Figure out which exports are used by modules to mangle export names, omit unused exports and generate more efficient code. When it is true: analyse used exports for each runtime, when it is "global": analyse exports globally for all runtimes combined).
    usedExports: true
  },
  output: {
    asyncChunks: false,
    environment: {
      arrowFunction: true,
      bigIntLiteral: true,
      const: true,
      destructuring: true,
      dynamicImport: false,
      forOf: true,
      module: false,
      optionalChaining: true,
      templateLiteral: true,
    },
    globalObject: 'globalThis',
    iife: false,
  },
  plugins: [
    new CompartmentMapPlugin()
  ]
};
