import 'ses';
import fs from 'fs';
import url from 'url';
import { mapLocation } from '@endo/compartment-mapper';
import { makeReadPowers } from '@endo/compartment-mapper/node-powers.js';
import { default as jsonpatch } from 'fast-json-patch';

lockdown()

const textDecoder = new TextDecoder();

main().catch(err => {
  console.error(err);
  debugger
  process.exit(1);
})

async function main () {
  const entryFixture = new URL('fixture-0/entry.js', import.meta.url).toString();
  const endoCMPath = new URL('dist/endo-compartment-map.json', import.meta.url);
  const webpackCMPath = new URL('dist/compartment-map.json', import.meta.url);
  const readPowers = makeReadPowers({ fs, url });
  const compartmentMapBytes = await mapLocation(
    readPowers,
    entryFixture,
    {},
  );
  await fs.promises.writeFile(endoCMPath, compartmentMapBytes);
  const endoCompartmentMap = JSON.parse(textDecoder.decode(compartmentMapBytes));
  const webpackCompartmentMap = JSON.parse(await fs.promises.readFile(webpackCMPath, 'utf-8'));
  // we diff from webpack to endo, so the patch reads like a todo list ("remove this, add this")
  const diff = jsonpatch.compare(webpackCompartmentMap, endoCompartmentMap);
  for (const entry of diff) {
    console.log(entry)
  }
}
