/* global process */

import createConfig from './rollup-tools/base-config';
import { serve } from './rollup-tools/config-tools';

var vats = [];

// Inspired by https://github.com/Tom-Siegel/multi-page-svelte/blob/5dd47f9ffe3cbddbaa5e29be5056ce1ed56060b2/rollup-pages.config.js#L45
var configs = [
  {
    input: 'app.js',
    outputFile: 'index.js',
    reloadPath: '.',
    serve: !process.env.APP && serve,
    serveOpts: { port: 7000 },
  },
]
  .concat(
    vats.map((v) => ({
      input: `graphbacks/${v}/${v}-graphback.js`,
      outputFile: `graphbacks/${v}/${v}-graphback-bundle.js`,
      reloadPath: `graphbacks/${v}`,
      serve: process.env.APP === v && serve,
      serveOpts: { rootDir: '.', serveDir: `graphbacks/${v}`, port: 6001 },
    }))
  )
  .map(createConfig);

export default configs;
