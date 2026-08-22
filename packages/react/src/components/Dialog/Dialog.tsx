import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { Dialog as ArkDialog, Portal } from "@ark-ui/react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

type DialogSize = "sm" | "md" | "lg" | "xl";

const CLOSE_ICON_SIZE_CLASSES: Record<DialogSize, string> = {
  sm: "size-4",
  md: "size-4",
  lg: "size-5",
  xl: "size-6",
};

/** Lets `Dialog.CloseTrigger` scale its icon to the `size` set on `Dialog.Content`, without every consumer having to pass it twice. */
const DialogSizeContext = createContext<DialogSize>("md");

const contentVariants = cva(
  "flex max-h-[85vh] w-full flex-col overflow-hidden rounded-lg border border-border bg-bg-elevated shadow-lg outline-none data-[state=open]:animate-panel-in data-[state=closed]:animate-panel-out",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

interface DialogProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Whether to close the dialog when the backdrop is clicked. Left
   * undefined by default so Ark's own per-role default applies: `true` for
   * a regular `"dialog"`, `false` for `"alertdialog"` — a confirmation the
   * user must explicitly act on shouldn't dismiss on a stray outside click.
   */
  closeOnOutsideClick?: boolean;
  /** `"alertdialog"` interrupts for a confirmation the user must act on; `"dialog"` (default) is a regular panel. */
  role?: "dialog" | "alertdialog";
}

/**
 * A modal panel that traps focus, closes on Escape or backdrop click, and
 * returns focus to its trigger — built on Ark UI's dialog state machine for
 * focus management and ARIA. No popper positioning: the panel is centered
 * on screen, not anchored to the trigger (unlike Menu/Select).
 *
 * @example
 * <Dialog>
 *   <Dialog.Trigger>Delete run</Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Header>
 *       <Dialog.Title>Delete run?</Dialog.Title>
 *       <Dialog.CloseTrigger />
 *     </Dialog.Header>
 *     <Dialog.Description>This cannot be undone.</Dialog.Description>
 *     <Dialog.Footer>
 *       <Button variant="destructive">Delete</Button>
 *     </Dialog.Footer>
 *   </Dialog.Content>
 * </Dialog>
 */
function Dialog({
  children,
  open,
  defaultOpen,
  onOpenChange,
  closeOnOutsideClick,
  role = "dialog",
}: DialogProps) {
  return (
    <ArkDialog.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(details) => onOpenChange?.(details.open)}
      closeOnInteractOutside={closeOnOutsideClick}
      role={role}
    >
      {children}
    </ArkDialog.Root>
  );
}

interface DialogTriggerProps extends Omit<ComponentPropsWithoutRef<"button">, "value"> {
  ref?: Ref<HTMLButtonElement>;
}

/** Opens the dialog on click. */
function DialogTrigger({ className, ref, ...props }: DialogTriggerProps) {
  return (
    <ArkDialog.Trigger
      ref={ref}
      className={cn(
        "cursor-pointer data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-border-focus",
        className,
      )}
      {...props}
    />
  );
}

interface DialogContentProps extends Omit<ComponentPropsWithoutRef<"div">, "role"> {
  /** Controls the panel's max-width and the `CloseTrigger` icon's scale. @default "md" */
  size?: DialogSize;
  ref?: Ref<HTMLDivElement>;
}

/** The portaled, centered panel holding the dialog's header/body/footer. Assembles the backdrop and positioner internally. */
function DialogContent({ size = "md", className, children, ref, ...props }: DialogContentProps) {
  return (
    <Portal>
      {/*
        `pointer-events-auto` is set on Backdrop and Content, not Positioner.
        While the dialog is open, @zag-js/dismissable sets
        `body.style.pointerEvents = "none"` and re-enables it only on the
        dialog's *content* element; Backdrop lives outside that subtree, so
        without this override it would inherit `none` and become
        unclickable. Positioner must stay `pointer-events-none`: it's a
        `fixed inset-0` flex container that exists only to center Content,
        and since it paints after Backdrop, an interactive Positioner would
        swallow clicks meant for the Backdrop across its full box.
      */}
      <ArkDialog.Backdrop className="inset-0 pointer-events-auto fixed z-50 bg-bg-overlay/60 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
      <ArkDialog.Positioner className="inset-0 pointer-events-none fixed z-50 flex items-center justify-center p-inset-md">
        <ArkDialog.Content
          ref={ref}
          className={cn(contentVariants({ size }), "pointer-events-auto", className)}
          {...props}
        >
          <DialogSizeContext.Provider value={size}>{children}</DialogSizeContext.Provider>
        </ArkDialog.Content>
      </ArkDialog.Positioner>
    </Portal>
  );
}

interface DialogSectionProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>;
}

/** Top section of `Dialog.Content` — typically `Dialog.Title` and `Dialog.CloseTrigger`. */
function DialogHeader({ className, ref, ...props }: DialogSectionProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex shrink-0 items-center justify-between gap-inline-sm px-inset-lg pt-inset-lg pb-inset-sm",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Middle, scrollable section of `Dialog.Content`. `tabIndex={0}` — WCAG
 * 2.1.1: a scrollable region needs to be keyboard-focusable so its content
 * is reachable without a pointer (axe's `scrollable-region-focusable`),
 * regardless of whether it happens to overflow for any given consumer's
 * content.
 */
function DialogBody({ className, ref, ...props }: DialogSectionProps) {
  return (
    <div
      ref={ref}
      tabIndex={0}
      className={cn(
        "flex-1 overflow-auto px-inset-lg py-inset-sm outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus",
        className,
      )}
      {...props}
    />
  );
}

/** Bottom section of `Dialog.Content` — typically action buttons. */
function DialogFooter({ className, ref, ...props }: DialogSectionProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex shrink-0 items-center justify-end gap-inline-sm px-inset-lg pt-inset-sm pb-inset-lg",
        className,
      )}
      {...props}
    />
  );
}

interface DialogTitleProps extends ComponentPropsWithoutRef<"h2"> {
  ref?: Ref<HTMLHeadingElement>;
}

/** The dialog's accessible name, wired to `Dialog.Content` via `aria-labelledby`. */
function DialogTitle({ className, ref, ...props }: DialogTitleProps) {
  return <ArkDialog.Title ref={ref} className={cn("text-heading-4", className)} {...props} />;
}

interface DialogDescriptionProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>;
}

/** A supporting line under the title, wired to `Dialog.Content` via `aria-describedby`. */
function DialogDescription({ className, ref, ...props }: DialogDescriptionProps) {
  return (
    <ArkDialog.Description
      ref={ref}
      className={cn("px-inset-lg text-body-sm text-text-secondary", className)}
      {...props}
    />
  );
}

interface DialogCloseTriggerProps extends ComponentPropsWithoutRef<"button"> {
  ref?: Ref<HTMLButtonElement>;
}

/** Closes the dialog on click — place inside `Dialog.Header` for the conventional top-right `X`. Its icon scales with `Dialog.Content`'s `size`. */
function DialogCloseTrigger({ className, children, ref, ...props }: DialogCloseTriggerProps) {
  const size = useContext(DialogSizeContext);
  return (
    <ArkDialog.CloseTrigger
      ref={ref}
      aria-label="Close"
      className={cn(
        "shrink-0 cursor-pointer rounded-sm text-text-secondary hover:text-text data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-border-focus",
        className,
      )}
      {...props}
    >
      {children ?? <X className={CLOSE_ICON_SIZE_CLASSES[size]} aria-hidden="true" />}
    </ArkDialog.CloseTrigger>
  );
}

const DialogWithParts = Object.assign(Dialog, {
  Trigger: DialogTrigger,
  Content: DialogContent,
  Header: DialogHeader,
  Body: DialogBody,
  Footer: DialogFooter,
  Title: DialogTitle,
  Description: DialogDescription,
  CloseTrigger: DialogCloseTrigger,
});

export { DialogWithParts as Dialog };
