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


class CompartmentMapPlugin {
  apply(compiler) {
    // cyclonedx-webpack-plugin used this hook
    // compilation.hooks.afterOptimizeTree.tap(
    //   pluginName,
    //   (_, modules) => {
    compiler.hooks.emit.tapAsync("CompartmentMapPlugin", (compilation, callback) => {
      // compilation.chunkGraph.getChunkModulesIterable(compilation.chunks[0]).forEach(module => {
      //   // getChunkModules

      const modules = {}

      compilation.chunks.forEach(chunk => {
        chunk.getModules().forEach(module => {
          // console.log(module.dependencies)
          const id = module.identifier()
          // dependencies are not necesarily modules, its more like a list of
          // transforms that need to be applied including rewriting dependency names
          const dependencies = new Set(
            module.dependencies
            .map(d => compilation.moduleGraph.getModule(d))
            .filter(m => m !== module)
            .map(m => m.identifier())
          )
          // const source = compilation.codeGenerationResults.getSource(module, chunk.runtime, module.type)
          // we dont actually want the original source
          // we may need to disable some builtin plugins to get a useable transformed source
          const source = module.originalSource()
          // console.log(source)
          modules[id] = {
            id,
            dependencies: Array.from(dependencies),
            type: module.type,
            // source: module.type === 'javascript/auto' && module.source(),
            // source: module.type === 'javascript/auto' && module._source,
            source: source && source.source(),
            // keys: [...Reflect.ownKeys(module), ...Reflect.ownKeys(module.__proto__)],
          };
          // module.serialize({ write: (data) => console.log('serialize', data) })
          // console.log(Reflect.ownKeys(module.codeGeneration))
          // console.log(module.dependencies.map(d => d.constructor.name))
        });
      });

      const compartmentMapDescriptor = JSON.stringify(modules, null, 2);
      compilation.assets["compartment-map.json"] = {
        source: () => compartmentMapDescriptor,
        size: () => compartmentMapDescriptor.length
      };

      callback();
    });
  }
}

module.exports = CompartmentMapPlugin;