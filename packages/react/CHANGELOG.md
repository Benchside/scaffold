# @benchside/scaffold-react

## 0.1.0-beta.1

### Patch Changes

- [#2](https://github.com/Benchside/scaffold/pull/2) [`eeee151`](https://github.com/Benchside/scaffold/commit/eeee151aa32e633f02d106d52e9023b3f151327a) Thanks [@jaypark94](https://github.com/jaypark94)! - Fix GitHub repository URL casing (benchside -> Benchside) in package metadata

## 0.1.0-beta.0

### Minor Changes

- [`d91c744`](https://github.com/Benchside/scaffold/commit/d91c744eeb74ebfc7c65ed459eab6ecbfbd64231) Thanks [@jaypark94](https://github.com/jaypark94)! - Add a self-contained `style.css` build, importable as `@benchside/scaffold-react/style.css`.

  It bundles the resolved token/theme values and every utility class the component set uses, so rendering styled components no longer requires installing or configuring `@benchside/scaffold-tokens`, `@benchside/scaffold-theme-default`, or `@benchside/scaffold-tailwind` separately — one import is enough. Consumers who also want the same semantic token vocabulary (`bg-accent`, `p-inset-md`, ...) available in their own custom markup can still add `@benchside/scaffold-tailwind` to their own Tailwind build; this is unaffected and works alongside the new import.
