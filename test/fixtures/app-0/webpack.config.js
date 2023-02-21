import CompartmentMapPlugin from '../../../src/plugin.mjs'

export default {
  entry: './entry.js',
  mode: 'production',
  plugins: [
    new CompartmentMapPlugin()
  ]
};
