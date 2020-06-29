import path from "path";

export const tsToJs = (path: string): string => path.replace(/\.tsx?$/, ".js");

export const humanlizePath = (filepath: string): string => path.relative(process.cwd(), filepath);
