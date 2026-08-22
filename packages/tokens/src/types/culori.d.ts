// culori doesn't expose a "types" condition in its package.json
// `exports` map in the installed version, so TS can't resolve its
// declaration files through normal module resolution even though they
// exist in the package. Minimal ambient shim covering only what
// gamut.ts actually uses.
declare module "culori" {
  export interface Oklch {
    mode: "oklch";
    l: number;
    c: number;
    h?: number;
    alpha?: number;
  }

  export function inGamut(mode: "rgb" | "p3" | string): (color: Oklch) => boolean;
}
