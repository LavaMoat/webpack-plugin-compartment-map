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
const { existsSync } = require('fs')
const { dirname, isAbsolute, join } = require('path')

class CompartmentMapPlugin {
  apply(compiler) {
    // cyclonedx-webpack-plugin used this hook
    // compilation.hooks.afterOptimizeTree.tap(
    //   pluginName,
    //   (_, modules) => {
    compiler.hooks.emit.tapAsync("CompartmentMapPlugin", (compilation, callback) => {
      // compilation.chunkGraph.getChunkModulesIterable(compilation.chunks[0]).forEach(module => {
      //   // getChunkModules

      const compartmentMapDescriptor = {
        tags: ['browser'],
        // set at end of module graph walk
        entry: null,
        compartments: {},
      }
      // @property {Array<string>} tags
      // @property {EntryDescriptor} entry
      // @property {Record<string, CompartmentDescriptor>} compartments
      // const modules = {}
      const entryModules = new Set()

      for (const chunk of compilation.chunks) {
        for (const entryModule of compilation.chunkGraph.getChunkEntryModulesIterable(chunk)) {
          entryModules.add(entryModule)
        }
        for (const module of compilation.chunkGraph.getChunkModulesIterable(chunk)) {
          // console.log(module.dependencies)
          const id = module.identifier()
          // const source = compilation.codeGenerationResults.getSource(module, chunk.runtime, module.type)
          // we dont actually want the original source
          // we may need to disable some builtin plugins to get a useable transformed source
          // const source = module.originalSource()
          // console.log(source)
          // modules[id] = {
          //   id,
          //   dependencies: Array.from(dependencies),
          //   type: module.type,
          //   // source: module.type === 'javascript/auto' && module.source(),
          //   // source: module.type === 'javascript/auto' && module._source,
          //   source: source && source.source(),
          //   // keys: [...Reflect.ownKeys(module), ...Reflect.ownKeys(module.__proto__)],
          // };
          const packageData = getUnsafePackageDataForModule(module)
          const packageName = packageData.name
          let compartmentDescriptor = compartmentMapDescriptor.compartments[packageName]
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
              label: packageData.label,
              location: packageData.filepath,
              modules: {},
              scopes: {},
              parsers: {},
              types: {},
              policy: null,
            }
            compartmentMapDescriptor.compartments[packageName] = compartmentDescriptor
          }
          // @property {string=} [compartment]
          // @property {string} [module]
          // @property {string} [location]
          // @property {Language} [parser]
          // @property {string} [sha512] in base 16, hex
          // @property {string} [exit]
          // @property {string} [deferredError]
          compartmentDescriptor.modules[id] = {
            compartment: packageName,
            module: id,
            location: module.resource,
            parser: module.type,
          }

          // need to populate scopes?
          // dependencies are not necesarily modules, its more like a list of
          // transforms that need to be applied including rewriting dependency names
          // const dependencies = new Set(
          //   module.dependencies
          //   // convert dependency to module
          //   .map(d => compilation.moduleGraph.getModule(d))
          //   // ignore self references
          //   .filter(m => m !== module)
          // )
          // for (const childModule of dependencies) {
          //   const childId = childModule.identifier()
          //   const depPackageData = getUnsafePackageDataForModule(childModule)
          //   const depPackageName = depPackageData.name
          //   // let scopeDescriptor = compartmentDescriptor.scopes[childId]
          //   // if (!scopeDescriptor) {
          //   //   scopeDescriptor = {
          //   //     compartment: depPackageName,
          //   //     module: childId,
          //   //   }
          //   //   compartmentDescriptor.scopes[childId] = scopeDescriptor
          //   // }
          // }

          // module.serialize({ write: (data) => console.log('serialize', data) })
          // console.log(Reflect.ownKeys(module.codeGeneration))
          // console.log(module.dependencies.map(d => d.constructor.name))
        }
      }

      if (entryModules.size !== 1) {
        throw new Error('compartment map plugin only supports a single entry module')
      }
      const primaryEntryModule = entryModules.values().next().value
      const primaryEntryPackageData = getUnsafePackageDataForModule(primaryEntryModule)
      compartmentMapDescriptor.entry = {
        module: primaryEntryModule.identifier(),
        compartment: primaryEntryPackageData.name,
      }

      const compartmentMapDescriptorSerialized = JSON.stringify(compartmentMapDescriptor, null, 2);
      compilation.assets["compartment-map.json"] = {
        source: () => compartmentMapDescriptorSerialized,
        size: () => compartmentMapDescriptorSerialized.length
      };

      callback();
    });
  }
}

// insecure self-name
function getUnsafePackageDataForModule(module) {
  const filePath = module.resource
  if (!filePath) {
    // this seems to primarily be webpack internal "runtimes"
    // webpack/runtime/compat get default export
    // webpack/runtime/define property getters
    // webpack/runtime/hasOwnProperty shorthand
    const id = module.identifier()
    return {
      name: `unknown:${id}`,
      label: `unknown:${id}`,
      filepath: `error://unknown:${id}`,
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
  return {
    name: packageJson.name,
    label: packageJson.name,
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
          path: packageJson,
          packageJson: require(packageJson)
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

module.exports = CompartmentMapPlugin;