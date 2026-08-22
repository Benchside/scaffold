// Type shim for importing .vue Single-File Components from .ts files.
// Real SFC type-checking requires `vue-tsc` (not plain tsc) — add it as a
// devDependency once real .vue components exist, and run `vue-tsc --noEmit`
// as this package's typecheck script instead of `tsc --noEmit`.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, unknown>;
  export default component;
}
