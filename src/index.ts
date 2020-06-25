import { createFilter } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import { Options } from "./types";
import * as tsickle from "tsickle";
import ts from "typescript";
import fs from "fs-extra";
import path from "path";

export default (options: Options = {}): Plugin => {
  const emitted = new Map<string, string>();

  const isIncluded = createFilter(
    options.include ?? ["**/*.ts", "**/*.tsx", "**/*.vue"],
    options.exclude,
  );

  const plugin: Plugin = {
    name: "tsickle",

    transform(_, id) {
      if (!isIncluded(id)) return;

      const sourceFileName = id.replace(/\\/g, "/");

      // TODO: Proper config search
      const loaded = ts.readConfigFile(path.join(process.cwd(), "tsconfig.json"), path =>
        fs.readFileSync(path, "utf8"),
      );

      const { compilerOptions } = loaded.config as { compilerOptions: ts.CompilerOptions };
      compilerOptions.moduleResolution = ts.ModuleResolutionKind.NodeJs;

      const compilerHost = ts.createCompilerHost(compilerOptions);
      const program = ts.createProgram([sourceFileName], compilerOptions, compilerHost);

      const tsickleHost: tsickle.TsickleHost = {
        shouldSkipTsickleProcessing: id => !isIncluded(id),
        shouldIgnoreWarningsForPath: () => false,
        pathToModuleName: name => name,
        fileNameToModuleId: name => name,
        options: compilerOptions,
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
        compilerOptions,
        undefined,
        (path: string, contents: string) => emitted.set(path, contents),
      );

      const file = emitted.values().next();

      return { code: file.value as string };
    },
  };

  return plugin;
};
