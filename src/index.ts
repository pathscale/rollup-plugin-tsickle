import { createFilter } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import { Options } from "./types";
import * as tsickle from "tsickle";
import ts from "typescript";
import fs from "fs-extra";
import path from "path";
import { fixCode } from "./fix";
import { tsToJS, jsToTS, extractGoogRequireType } from "./utils";

export default (options: Options = {}): Plugin => {
  const emitted = new Map<string, string>();

  const isIncluded = createFilter(
    options.include ?? ["**/*.ts", "**/*.tsx", "**/*.vue"],
    options.exclude,
  );

  const tsconfig = "tsconfig.json";
  const externDir = "dist/externs";
  const externFile = path.resolve(externDir, "externs.js");
  const requireTypeDefs: string[] = [];
  fs.ensureDirSync(externDir);

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

      const output = tsickle.emitWithTsickle(
        program,
        tsickleHost,
        compilerHost,
        compilerOptions,
        undefined,
        (file: string, code: string) => emitted.set(file, code),
      );

      const sourceFileAsJs = tsToJS(sourceFileName);
      for (const [file, source] of emitted) {
        if (!sourceFileAsJs.includes(file)) continue;

        const { stripped, defs } = extractGoogRequireType(source);
        if (defs) requireTypeDefs.push(...defs);

        const extern = output.externs[jsToTS(file)];
        if (extern != null) {
          // console.log(`appending extern for ${file} to (${externFile}) ::\n${extern}\n`);
          fs.appendFileSync(externFile, extern);
        }

        const code = fixCode(stripped);
        // console.log("FIXED CODE:: \n", code);

        return { code };
      }

      return null;
    },

    generateBundle(_, bundle) {
      bundle;
      // const chunks = Object.values(bundle).filter(f => f.type === "chunk") as OutputChunk[];
      // for (const chunk of chunks)
      //   chunk.code = "var goog" + "\n" + requireTypeDefs.join("\n") + chunk.code;
    },
  };

  return plugin;
};
