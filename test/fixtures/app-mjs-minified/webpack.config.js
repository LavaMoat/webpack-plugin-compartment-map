import CompartmentMapPlugin from '../../../src/plugin.mjs'
import TerserPlugin from 'terser-webpack-plugin';

export default {
  entry: './entry.js',
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  plugins: [
    new CompartmentMapPlugin()
  ]
};
