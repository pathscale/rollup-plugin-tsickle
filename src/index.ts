import { createFilter } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import { Options } from "./types";
import * as tsickle from "tsickle";
import ts from "typescript";
import fs from "fs-extra";
// import path from "path";
import { tsToJs, extractGoogRequireType } from "./utils";

export default (options: Options = {}): Plugin => {
  const emitted = new Map<string, string>();

  const isIncluded = createFilter(
    options.include ?? ["**/*.ts", "**/*.tsx", "**/*.vue"],
    options.exclude,
  );

  const tsconfig = "tsconfig.json";
  // TODO: Externs are broken
  // const externDir = "dist/externs";
  // const externFile = path.resolve(externDir, "externs.js");
  // fs.ensureDirSync(externDir);

  const plugin: Plugin = {
    name: "tsickle",

    transform(_, id) {
      if (!isIncluded(id)) return;

      const sourceFileName = id.replace(/\\/g, "/");

      const loaded = ts.readConfigFile(tsconfig, file => fs.readFileSync(file, "utf8"));

      const { options: compilerOptions } = ts.parseJsonConfigFileContent(
        loaded.config,
        ts.sys,
        ".",
        {},
        tsconfig,
      );

      const compilerHost = ts.createCompilerHost(compilerOptions);
      const program = ts.createProgram([sourceFileName], compilerOptions, compilerHost);

      const tsickleHost: tsickle.TsickleHost = {
        shouldSkipTsickleProcessing: () => false,
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
        (file: string, code: string) => emitted.set(file, code),
      );

      const sourceFileAsJs = tsToJs(sourceFileName);
      for (const [file, source] of emitted) {
        if (!sourceFileAsJs.includes(file)) continue;
        const { stripped } = extractGoogRequireType(source);
        return { code: stripped };
      }

      return null;
    },
  };

  return plugin;
};
