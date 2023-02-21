// some notes
// - secure webpack builds
// - webpack plugin for compartment map descriptors
// - how to name a package
//   - name: self name from package.json
//   - label: https://github.com/endojs/endo/blob/89e71043c104e701d361bde14f9a5669492228e1/packages/compartment-mapper/src/node-modules.js#L358
//   - path: https://github.com/endojs/endo/blob/89e71043c104e701d361bde14f9a5669492228e1/packages/compartment-mapper/src/node-modules.js#L311
// webpack
//   - identify entry module `chunk.entryModule`
//   - maybe ignore chunks and use moduleGraph
//   - use transformed source
import { existsSync } from 'fs';
import { dirname, isAbsolute, join, relative } from 'path';
import { createRequire } from 'module';
import { evadeHtmlCommentTest, evadeImportExpressionTest } from 'ses/src/transforms';
import WebpackSources from "webpack-sources";
import { writeZip } from '@endo/zip';
import parserJson from '../lib/compartment-mapper/parse-json.js';
import parserText from '../lib/compartment-mapper/parse-text.js';
import parserBytes from '../lib/compartment-mapper/parse-bytes.js';
import parserArchiveCjs from '../lib/compartment-mapper/parse-archive-cjs.js';
import parserArchiveMjs from '../lib/compartment-mapper/parse-archive-mjs.js';
  const parserForLanguage = {
    mjs: parserArchiveMjs,
    'pre-mjs-json': parserArchiveMjs,
    cjs: parserArchiveCjs,
    'pre-cjs-json': parserArchiveCjs,
    json: parserJson,
    text: parserText,
    bytes: parserBytes,
  };

const _require = createRequire(import.meta.url);
const { RawSource } = WebpackSources;

class CompartmentMapPlugin {
  apply(compiler) {
    // cyclonedx-webpack-plugin used this hook
    //  compiler.hooks.thisCompilation.tap(...)
    // followed by this hook
    //  compilation.hooks.afterOptimizeTree.tap(...)
    // thisCompilation: Executed while initializing the compilation, right before emitting the compilation event. This hook is not copied to child compilers.
    compiler.hooks.emit.tapAsync("CompartmentMapPlugin", async (compilation, callback) => {
      // compilation.chunkGraph.getChunkModulesIterable(compilation.chunks[0]).forEach(module => {
      //   // getChunkModules

      const compartmentMapDescriptor = {
        // tags: ['browser'],
        // set at end of module graph walk
        entry: null,
        compartments: {},
      }
      // @property {Array<string>} tags
      // @property {EntryDescriptor} entry
      // @property {Record<string, CompartmentDescriptor>} compartments
      // const modules = {}
      const entryModules = new Set()
      const sources = {}

      for (const chunk of compilation.chunks) {
        for (const entryModule of compilation.chunkGraph.getChunkEntryModulesIterable(chunk)) {
          entryModules.add(entryModule)
        }
        for (const module of compilation.chunkGraph.getChunkModulesIterable(chunk)) {
          // console.log(module.dependencies)
          // const id = module.identifier()
          // const source = compilation.codeGenerationResults.getSource(module, chunk.runtime, module.type)
          // we dont actually want the original source
          // we may need to disable some builtin plugins to get a useable transformed source
          const source = module.originalSource()
          const packageData = getUnsafePackageDataForModule(module)
          const packageName = packageData.name
          const packageLabel = packageData.label
          const packageLocation = packageData.filepath
          let compartmentDescriptor = compartmentMapDescriptor.compartments[packageLabel]
          let packageSources = sources[packageLabel]
          if (!compartmentDescriptor) {
            //   @property {string} label
            //   @property {Array<string>} [path] - shortest path of dependency names to this
            //   @property {string} name - the name of the originating package suitable for
            //   @property {string} location
            //   @property {boolean} [retained] - whether this compartment was retained by
            //   @property {Record<string, ModuleDescriptor>} modules
            //   @property {Record<string, ScopeDescriptor>} scopes
            //   @property {Record<string, Language>} parsers - language for extension
            //   @property {Record<string, Language>} types - language for module specifier
            //   @property {object} policy - policy specific to compartment
            compartmentDescriptor = {
              name: packageName,
              label: packageLabel,
              // mapCompartment/archives (?) use the label for the location
              // location: packageLocation,
              location: packageLabel,
              modules: {},
              // scopes: {},
              // parsers: {},
              // types: {},
              // policy: null,
            }
            compartmentMapDescriptor.compartments[packageLabel] = compartmentDescriptor
            packageSources = sources[packageLabel] = {}
          }

          const { plain: moduleLocation, relative: moduleLabel } = getModuleLocationRelativeToPackage(module, packageLocation)
          let parser
          if (module.type === 'javascript/auto') {
            parser = 'pre-cjs-json'
            // parser = 'cjs'
          } else if (module.type === 'javascript/esm') {
            parser = 'pre-mjs-json'
            // parser = 'mjs'
          } else {
            parser = module.type
          }

          const moduleDescriptor = {
            location: moduleLocation,
            parser,
          }
          compartmentDescriptor.modules[moduleLabel] = moduleDescriptor

          let moduleSource = source ? source.source() : 'source missing'
          moduleSource = evadeHtmlCommentTest(moduleSource)
          moduleSource = evadeImportExpressionTest(moduleSource)
          const moduleSourceBytes = Buffer.from(moduleSource, 'utf8')

          const { parser: finalParser, transformedBytes, concreteRecord } = await processModuleSource(
            parser,
            moduleSourceBytes,
            moduleLabel,
            moduleLocation,
            packageLocation,
          )

          packageSources[moduleLabel] = {
            location: moduleLocation,
            sourceLocation: moduleLocation,
            parser: finalParser,
            bytes: transformedBytes,
            record: concreteRecord,
            // sha512,
          };

          for (const dependency of module.dependencies) {
            const depModule = compilation.moduleGraph.getModule(dependency)
            // ignore self-references
            if (depModule === module) continue
            const depPackageData = getUnsafePackageDataForModule(depModule)
            const depPackageLocation = depPackageData.filepath
            const depSpecifier = dependency.request
            // check if foreign package
            if (depPackageLocation !== packageLocation) {
              // check if recorded yet
              if (compartmentDescriptor.modules[depSpecifier] === undefined) {
                const depPackageLabel = depPackageData.label
                const { relative: depLabel } = getModuleLocationRelativeToPackage(depModule, depPackageLocation)
                compartmentDescriptor.modules[depSpecifier] = {
                  compartment: depPackageLabel,
                  module: depLabel,
                }
              }
            } else {
              // domestic package
              const resolvedLabel = join(dirname(moduleLocation), depSpecifier)
              const relativeLabel = resolvedLabel.startsWith('.') ? resolvedLabel : `./${resolvedLabel}`
              // check if raw specifier recorded yet
              if (compartmentDescriptor.modules[relativeLabel] === undefined) {
                const { relative: depLabel } = getModuleLocationRelativeToPackage(depModule, depPackageLocation)
                compartmentDescriptor.modules[relativeLabel] = {
                  compartment: packageLabel,
                  module: depLabel,
                }
              }
            }
          }

        }
      }

      if (entryModules.size !== 1) {
        throw new Error('compartment map plugin only supports a single entry module')
      }
      const primaryEntryModule = entryModules.values().next().value
      const primaryEntryPackageData = getUnsafePackageDataForModule(primaryEntryModule)
      const { relative: entrySpecifier } = getModuleLocationRelativeToPackage(primaryEntryModule, primaryEntryPackageData.filepath)
      compartmentMapDescriptor.entry = {
        module: entrySpecifier,
        compartment: primaryEntryPackageData.label,
      }

      const compartmentMapDescriptorSerialized = JSON.stringify(compartmentMapDescriptor, null, 2);
      const compartmentMapBytes = Buffer.from(compartmentMapDescriptorSerialized, 'utf8');
      compilation.assets["compartment-map.json"] = {
        source: () => compartmentMapDescriptorSerialized,
        size: () => compartmentMapDescriptorSerialized.length
      };

      const archive = writeZip();
      await archive.write('compartment-map.json', compartmentMapBytes);
      await addSourcesToArchive(archive, sources);
      const bytes = await archive.snapshot();

      compilation.assets["app.agar"] = new RawSource(Buffer.from(bytes));

      callback();
    });
  }
}

async function processModuleSource (
  language,
  moduleBytes,
  candidateSpecifier,
  moduleLocation,
  packageLocation,
  // readPowers,
) {
  const parse = async (bytes, specifier, location, packageLocation, options) => {
    const { parse } = parserForLanguage[language];
    return parse(bytes, specifier, location, packageLocation, options);
  }
  const envelope = await parse(
    moduleBytes,
    candidateSpecifier,
    moduleLocation,
    packageLocation,
    // {
    //   readPowers,
    // },
  );
  const {
    parser,
    bytes: transformedBytes,
    record: concreteRecord,
  } = envelope;
  return { parser, transformedBytes, concreteRecord };
}

function getModuleLocationRelativeToPackage (module, packageLocation) {
  if (module.resource === undefined) {
    const id = module.identifier()
    return { plain: id, relative: id }
  }
  const locPlain = relative(packageLocation, module.resource)
  const locRelative = locPlain.startsWith('.') ? locPlain : `./${locPlain}`
  return { plain: locPlain, relative: locRelative }
}

// borrowed from @endo/compartment-mapper/src/archive.js
const resolveLocation = (rel, abs) => new URL(rel, abs).toString();
async function addSourcesToArchive (archive, sources) {
  for (const compartment of Object.keys(sources).sort()) {
    const modules = sources[compartment];
    const compartmentLocation = resolveLocation(`${compartment}/`, 'file:///');
    for (const specifier of Object.keys(modules).sort()) {
      const { bytes, location } = modules[specifier];
      if (location !== undefined) {
        const moduleLocation = resolveLocation(location, compartmentLocation);
        const path = new URL(moduleLocation).pathname.slice(1); // elide initial "/"
        if (bytes !== undefined) {
          // eslint-disable-next-line no-await-in-loop
          await archive.write(path, bytes);
        }
      }
    }
  }
};

// insecure self-name
function getUnsafePackageDataForModule(module) {
  const filePath = module.resource
  if (!filePath) {
    // this seems to primarily be webpack internal "runtimes"
    // webpack/runtime/compat get default export
    // webpack/runtime/define property getters
    // webpack/runtime/hasOwnProperty shorthand
    const id = module.identifier()
    if (id.startsWith('webpack/')) {
      return {
        name: `webpack:${id}`,
        label: `webpack:${id}`,
        filepath: `webpack://${id}`,
      }
    }
    throw new Error(`could not find file path for module ${id}`)
  }
  const packageDescription = getUnsafePackageInfo(module.resource)
  if (!packageDescription) {
    throw new Error(`could not find package.json for module ${module.identifier()}`)
  }
  const { packageJson } = packageDescription
  if (!packageJson.name) {
    throw new Error(`package.json for module ${module.identifier()} is missing a name`)
  }
  const label = `${packageJson.name}-v${packageJson.version}`
  return {
    name: packageJson.name,
    label: label,
    filepath: packageDescription.path,
  }
}

// insecure package lookup
function getUnsafePackageInfo (path) {
  while (isAbsolute(path)) {
    const packageJson = join(path, 'package.json')
    if (existsSync(packageJson)) {
      try {
        return {
          path,
          packageJson: _require(packageJson)
        }
      } catch {
        return undefined
      }
    }

    const nextPath = dirname(path)
    if (nextPath === path) {
      return undefined
    }
    path = nextPath
  }
  return undefined
}

export default CompartmentMapPlugin;