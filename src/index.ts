import path from "path";
import fs from "fs-extra";
import JSZip from "jszip";
import { createFilter } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import { Options } from "./types";
import * as tsickle from "tsickle";
import * as ts from "typescript";
import { tsToJs, humanlizePath } from "./utils";

export default (options: Options = {}): Plugin => {
  const isIncluded = createFilter(
    options.include ?? ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    options.exclude,
  );

  const zip = new JSZip();
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
      console.log(`TSICKLE - INCLUDED (${humanlizePath(id)})`);

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
      compilerOptions.checkJs = true;

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
        zip.file(`individual/${path.basename(file)}`, source);
        const sourceRel = humanlizePath(sourceFileName);
        const resRel = path.basename(sourceFileAsJs);
        console.log(`TSICKLE - PROCESSED (${sourceRel} to ${resRel})`);
        return { code: source };
      }

      return null;
    },

    renderChunk(code, chunk) {
      zip.file(chunk.fileName, code);
      return null;
    },

    async generateBundle() {
      const source = await zip.generateAsync({ type: "uint8array" });
      this.emitFile({ type: "asset", name: "tsickle.zip", source });
    },
  };

  return plugin;
};
