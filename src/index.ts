import { createFilter } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import { Options } from "./types";
import * as tsickle from "tsickle";
import ts from "typescript";
import fs from "fs-extra";
import path from "path";
import { tsToJs } from "./utils";

export default (options: Options = {}): Plugin => {
  const isIncluded = createFilter(
    options.include ?? ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    options.exclude,
  );

  const emitted = new Map<string, string>();
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

      compilerOptions.allowJs = true;
      compilerOptions.checkJs = false;

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
        untyped: true,
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

        console.log(
          `TSICKLE - PROCESSED (${path.relative(process.cwd(), file)}):\n`,
          `${source  }\n\n`,
        );

        return { code: source };
      }

      return null;
    },
  };

  return plugin;
};
