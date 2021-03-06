/** `@pathscale/rollup-plugin-tsickle`'s full option list */
export interface Options {
  /** Files to include for processing */
  include?: ReadonlyArray<string | RegExp> | string | RegExp | null;
  /** Files to exclude from processing */
  exclude?: ReadonlyArray<string | RegExp> | string | RegExp | null;
  /** Path to tsconfig */
  tsconfig?: string;
  /** Enable debug output */
  debug?: boolean;
}
