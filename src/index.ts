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
  const isIncluded = createFilter(options.include ?? /\.tsx?$/i, options.exclude);
  const tsconfig = options.tsconfig ?? "tsconfig.json";

  const zip = new JSZip();
  const emitted = new Map<string, string>();

  let compilerOptions: ts.CompilerOptions;
  let compilerHost: ts.CompilerHost;
  let tsickleHost: tsickle.TsickleHost;

  const plugin: Plugin = {
    name: "tsickle",

    buildStart() {
      const loaded = ts.readConfigFile(tsconfig, file => fs.readFileSync(file, "utf8"));
      const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, ".", {}, tsconfig);
      compilerOptions = parsed.options;
      compilerHost = ts.createCompilerHost(compilerOptions);
      tsickleHost = {
        shouldSkipTsickleProcessing: () => false,
        shouldIgnoreWarningsForPath: () => false,
        pathToModuleName: name => name,
        fileNameToModuleId: name => name,
        options: compilerOptions,
        moduleResolutionHost: compilerHost,
        googmodule: false,
      };
    },

    transform(code, id) {
      if (!isIncluded(id)) return;
      options.debug && console.log(`TSICKLE - INCLUDED (${humanlizePath(id)})`);

      const sourceFileName = id.replace(/\\/g, "/");
      const program = ts.createProgram([sourceFileName], compilerOptions, compilerHost);

      const gsf = program.getSourceFile.bind(program);
      program.getSourceFile = name => ({ ...gsf(name.split("?")[0])!, text: code });

      tsickle.emit(program, tsickleHost, (file: string, code: string) => emitted.set(file, code));

      const sourceFileAsJs = tsToJs(sourceFileName);
      for (const [file, source] of emitted) {
        if (!sourceFileAsJs.includes(file)) continue;
        options.debug && zip.file(`individual/${path.basename(file)}`, source);
        const sourceRel = humanlizePath(sourceFileName);
        const resRel = path.basename(sourceFileAsJs);
        options.debug && console.log(`TSICKLE - PROCESSED (${sourceRel} to ${resRel})`);
        return { code: source };
      }

      options.debug &&
        console.log(`TSICKLE - MISSED (${humanlizePath(id)} in ${JSON.stringify(emitted)})`);

      return null;
    },

    renderChunk(code, chunk) {
      options.debug && zip.file(chunk.fileName, code);
      return null;
    },

    async generateBundle() {
      options.debug &&
        this.emitFile({
          type: "asset",
          name: "tsickle.zip",
          source: await zip.generateAsync({ type: "uint8array" }),
        });
    },
  };

  return plugin;
};
