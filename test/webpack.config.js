import BundleJsonPlugin from '../src/plugin.js'

export default {
  entry: './fixture-0/entry.js',
  plugins: [
    new BundleJsonPlugin()
  ]
};
