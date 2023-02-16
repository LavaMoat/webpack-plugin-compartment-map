const BundleJsonPlugin = require('../src/plugin.js');

module.exports = {
  entry: './fixture-0/entry.js',
  plugins: [
    new BundleJsonPlugin()
  ]
};
