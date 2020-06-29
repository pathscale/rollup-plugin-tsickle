export const tsToJs = (path: string | undefined): string =>
  path ? path.replace(/\.tsx?$/, ".js") : "";
