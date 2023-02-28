import CompartmentMapPlugin from '../../../src/plugin.mjs'

export default {
  entry: './entry.js',
  mode: 'development',
  optimization: {
    concatenateModules: false,
    providedExports: true,
    sideEffects: true,
  },
  plugins: [
    new CompartmentMapPlugin()
  ]
};
