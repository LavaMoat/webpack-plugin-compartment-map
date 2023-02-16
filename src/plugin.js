class CompartmentMapPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync("CompartmentMapPlugin", (compilation, callback) => {
      // compilation.chunkGraph.getChunkModulesIterable(compilation.chunks[0]).forEach(module => {
      //   // getChunkModules

      const modules = {}

      compilation.chunks.forEach(chunk => {
        chunk.getModules().forEach(module => {
          // console.log(module.dependencies)
          const id = module.identifier()
          const dependencies = new Set(
            module.dependencies
            .map(d => compilation.moduleGraph.getModule(d))
            .filter(m => m !== module)
            .map(m => m.identifier())
          )
          // const source = compilation.codeGenerationResults.getSource(module, chunk.runtime, module.type)
          const source = module.originalSource()
          // console.log(source)
          modules[id] = {
            id,
            // size: module.size(),
            dependencies: Array.from(dependencies),
            type: module.type,
            // source: module.type === 'javascript/auto' && module.source(),
            // source: module.type === 'javascript/auto' && module._source,
            source: source && source.source(),
            keys: [...Reflect.ownKeys(module), ...Reflect.ownKeys(module.__proto__)],
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