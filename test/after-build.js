import 'ses';
import fs from 'fs';
import url from 'url';
import { importArchive } from '@endo/compartment-mapper';
import { makeReadPowers } from '@endo/compartment-mapper/node-powers.js';

lockdown()

main().catch(err => {
  console.error(err);
  debugger
  process.exit(1);
})

async function main () {
  const archiveFixture = new URL('dist/app.agar', import.meta.url).toString();
  // const archiveFixture = new URL('dist/endo-archive.agar', import.meta.url).toString();

  const readPowers = makeReadPowers({ fs, url });
  const { namespace } = await importArchive(readPowers.read, archiveFixture, {
    globals: { console },
    // modules,
    // Compartment,
  });
}

// const fixture = new URL(
//   'fixtures-0/node_modules/app/main.js',
//   import.meta.url,
// ).toString();
