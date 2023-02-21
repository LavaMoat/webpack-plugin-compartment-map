import CompartmentMapPlugin from '../src/plugin.js'

export default {
  entry: './fixture-0/entry.js',
  mode: 'production',
  plugins: [
    new CompartmentMapPlugin()
  ]
};
