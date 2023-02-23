const path = require('path');

module.exports = () => import(path.resolve('../../../src/plugin.mjs'))
  .then(({default: CompartmentMapPlugin}) => ({
      entry: './entry.js',
      mode: 'production',
      plugins: [
        new CompartmentMapPlugin()
      ]
    }));
