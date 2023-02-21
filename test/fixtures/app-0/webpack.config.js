import CompartmentMapPlugin from '../../../src/plugin.js'

export default {
  entry: './entry.js',
  mode: 'production',
  plugins: [
    new CompartmentMapPlugin()
  ]
};
