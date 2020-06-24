import { createFilter } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import { Options } from "./types";
import * as tsickle from "tsickle";
import ts from "typescript";

// import path from "path";

export default (options: Options = {}): Plugin => {
  const emitted = new Map<string, string>();
  const isIncluded = createFilter(options.include ?? ["**/*.ts"], options.exclude);

  const plugin: Plugin = {
    name: "tsickle",

    transform(_, id) {
      if (!isIncluded(id)) return;

      const sourceFileName = id.replace(/\\/g, "/");
      const compilerHost = ts.createCompilerHost({});
      const program = ts.createProgram([sourceFileName], {}, compilerHost);

      const tsickleHost: tsickle.TsickleHost = {
        shouldSkipTsickleProcessing: id => !isIncluded(id),
        shouldIgnoreWarningsForPath: () => false,
        pathToModuleName: name => name,
        fileNameToModuleId: name => name,
        options: {},
        es5Mode: false,
        moduleResolutionHost: compilerHost,
        googmodule: false,
        transformDecorators: true,
        transformTypesToClosure: true,
        typeBlackListPaths: new Set(),
        untyped: false,
      };

      tsickle.emitWithTsickle(
        program,
        tsickleHost,
        compilerHost,
        {},
        undefined,
        (path: string, contents: string) => emitted.set(path, contents),
      );

      const file = emitted.values().next();

      return { code: file.value as string };
    },
  };

  return plugin;
};
