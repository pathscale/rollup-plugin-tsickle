const JS_RXP = /\.jsx?$/;
const TS_RXP = /\.tsx?$/;
const GOOG_RXP = /(?:const|var|let)\s+(tsickle_\S+)\s*=\s*goog\.requireType\(.+\).*/m;

export const jsToTs = (path: string | undefined): string =>
  path ? path.replace(JS_RXP, ".ts") : "";

export const tsToJs = (path: string | undefined): string =>
  path ? path.replace(TS_RXP, ".js") : "";

export const extractGoogRequireType = (code: string): { stripped: string; defs: string[] } => {
  const defs: string[] = [];

  for (;;) {
    const extracted = GOOG_RXP.exec(code);
    code = code.replace(GOOG_RXP, "");
    if (!extracted) break;
    defs.push(extracted[0]);
  }

  return { stripped: code, defs };
};
