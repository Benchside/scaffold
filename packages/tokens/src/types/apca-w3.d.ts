// apca-w3 ships no TypeScript types (and there's no @types/apca-w3).
// Minimal ambient shim covering only the exports apca.ts actually uses.
declare module "apca-w3" {
  export function APCAcontrast(txtY: number, bgY: number, places?: number): number;
  export function sRGBtoY(rgb: [number, number, number] | number[]): number;
}
