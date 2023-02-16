TODO:
- [ ] interactive debugger
- [ ] module original source vs transformed source?
  - codeGeneration
    - generator for type
    - templates?
      - what dep types / templates are we using
        'HarmonyImportSideEffectDependency',
        'HarmonyImportSpecifierDependency'
        'CommonJsRequireDependency',
          lib/dependencies/ModuleDependencyTemplateAsId.js
            this thing gets called many times per module to replace the specifier with the id
            seems crazy but true
        'CommonJsSelfReferenceDependency'
          lib/dependencies/CommonJsSelfReferenceDependency.js
          handles weird setting of cjs exports

    - module.blocks?
      - just collections of "sourceDeps"?
    - module "sourceDeps" -> template.apply
    - 
  - [x] serialize
  - [ ] eg: refs to "runtimes"
  - [ ] how to determine module type?
    - [ ] is javascript/auto type both?
- [ ] add modules to compartment map
- [ ] why multiple dependencies?
- [ ] try treeshaking?