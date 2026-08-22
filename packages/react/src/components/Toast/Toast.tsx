import { useMemo } from "react";
import type { ReactNode } from "react";
import { createToaster, Toast as ArkToast, Toaster as ArkToaster } from "@ark-ui/react/toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

type ToastType = "success" | "warning" | "error" | "info";

/** `alert` interrupts screen readers immediately (warning/error); `status` waits its turn (success/info) — mirrors Badge's severity vocabulary. Ark's zag-js base always emits `role="status"`, so this must be set explicitly per toast. */
const ROLE_BY_TYPE: Record<ToastType, "status" | "alert"> = {
  success: "status",
  info: "status",
  warning: "alert",
  error: "alert",
};

/**
 * A single module-level store, not a per-instance one: every `useToast()`
 * caller anywhere in the tree shares it, so a toast fired from deep in the
 * app reaches the one `Toast.Toaster` mounted near the app root without prop
 * drilling. `duration` here is the library default (zag applies its own
 * per-type defaults — success 2s, info/warning/error 5s — when omitted);
 * `useToast()` below overrides warning/error further to persist by default.
 */
const toaster = createToaster({ placement: "bottom-end", gap: 16 });

interface ToastCreateOptions {
  title?: ReactNode;
  description?: ReactNode;
  /** @default Infinity for warning/error (persists until dismissed); the type's zag default otherwise */
  duration?: number;
  /** Whether the toast renders a close button. */
  closable?: boolean;
}

interface UseToastReturn {
  success: (options: ToastCreateOptions) => string;
  info: (options: ToastCreateOptions) => string;
  /** Persists until dismissed unless `duration` is explicitly passed — a failed run or drifting sensor shouldn't self-dismiss before the user notices. */
  warning: (options: ToastCreateOptions) => string;
  /** Persists until dismissed unless `duration` is explicitly passed. */
  error: (options: ToastCreateOptions) => string;
  dismiss: (id?: string) => void;
  /** Synchronously clears every toast, skipping the exit animation — e.g. on logout/route change. */
  clear: () => void;
}

/**
 * Fires and controls toasts from anywhere in the tree, sharing the single
 * store `Toast.Toaster` renders. No Provider needed — the store lives at
 * module scope.
 *
 * @example
 * const toast = useToast();
 * toast.success({ title: "Calibration complete" });
 */
function useToast(): UseToastReturn {
  return useMemo(
    () => ({
      success: (options: ToastCreateOptions) => toaster.create({ ...options, type: "success" }),
      info: (options: ToastCreateOptions) => toaster.create({ ...options, type: "info" }),
      warning: (options: ToastCreateOptions) =>
        toaster.create({ duration: Infinity, ...options, type: "warning" }),
      error: (options: ToastCreateOptions) =>
        toaster.create({ duration: Infinity, ...options, type: "error" }),
      dismiss: (id?: string) => toaster.dismiss(id),
      clear: () => toaster.remove(),
    }),
    [],
  );
}

/**
 * Uses a CSS transition rather than a keyframe animation because zag drives
 * `opacity`/`y`/`scale` itself via `--opacity`/`--y`/`--scale` custom
 * properties, recomputed every frame on the root's inline `style` for both
 * entrance and the multi-toast stack offset. A fixed keyframe with no
 * `fill-mode` would finish before zag's `removeDelay` elapses and snap back
 * to full opacity, flickering visibly right before the node is removed; a
 * transition instead just tracks whatever these vars currently are, so it
 * always ends wherever zag left them.
 */
const rootVariants = cva(
  "pointer-events-auto flex w-80 items-start gap-inline-sm rounded-md border p-inset-sm shadow-lg opacity-(--opacity) transition-[opacity,transform] duration-200 ease-out transform-[translateY(var(--y))_scale(var(--scale,1))]",
  {
    variants: {
      variant: {
        success: "border-status-success/30 bg-status-success-bg text-status-success",
        warning: "border-status-warning/30 bg-status-warning-bg text-status-warning",
        error: "border-status-error/30 bg-status-error-bg text-status-error",
        info: "border-status-info/30 bg-status-info-bg text-status-info",
      },
    },
  },
);

interface ToastToasterProps extends VariantProps<typeof rootVariants> {
  className?: string;
}

/** Renders the toast queue. Mount once, typically near the app root — every `useToast()` call anywhere else reaches it through the shared store. */
function ToastToaster({ className }: ToastToasterProps) {
  return (
    <ArkToaster toaster={toaster} className={cn("z-50", className)}>
      {(toast) => {
        const type = (toast.type as ToastType) ?? "info";
        return (
          <ArkToast.Root
            key={toast.id}
            role={ROLE_BY_TYPE[type]}
            className={rootVariants({ variant: type })}
          >
            <div className="flex-1">
              {toast.title != null && (
                <ArkToast.Title className="text-label font-label">{toast.title}</ArkToast.Title>
              )}
              {toast.description != null && (
                <ArkToast.Description className="text-body-sm">
                  {toast.description}
                </ArkToast.Description>
              )}
            </div>
            <ArkToast.CloseTrigger
              aria-label="Close"
              className="shrink-0 cursor-pointer rounded-sm text-current/70 hover:text-current data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-border-focus"
            >
              <X className="size-4" aria-hidden="true" />
            </ArkToast.CloseTrigger>
          </ArkToast.Root>
        );
      }}
    </ArkToaster>
  );
}

const Toast = { Toaster: ToastToaster };

export { Toast, useToast };
