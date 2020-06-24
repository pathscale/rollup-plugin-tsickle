/** `@pathscale/rollup-plugin-tsickle`'s full option list */
export interface Options {
  /**
   * Files to include for processing
   * @default /\.vue$/
   */
  include?: ReadonlyArray<string | RegExp> | string | RegExp | null;
  /**
   * Files to exclude from processing
   * @default ["**\\node_modules\\**"]
   */
  exclude?: ReadonlyArray<string | RegExp> | string | RegExp | null;
}
