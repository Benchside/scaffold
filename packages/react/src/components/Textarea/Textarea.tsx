import {
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type Ref,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Copy } from "lucide-react";
import { cn } from "../../lib/cn";
import {
  FieldFooter,
  FieldHeader,
  formatFieldCount,
  mergeRefs,
  useFieldIds,
  type FieldSize,
} from "../../lib/field";

const boxVariants = cva(
  "relative flex rounded-md border bg-bg-elevated focus-within:outline-2 focus-within:outline-border-focus focus-within:outline-offset-2 has-disabled:cursor-not-allowed has-disabled:opacity-50 has-read-only:bg-bg-subtle",
  {
    variants: {
      // Same narrow-horizontal-padding reasoning as Input — see Input.tsx.
      size: {
        xs: "px-inset-sm py-inset-2xs text-caption font-caption tracking-caption",
        sm: "px-inset-sm py-inset-xs text-label font-label tracking-label",
        md: "px-inset-md py-inset-sm text-label font-label tracking-label",
        lg: "px-inset-md py-inset-md text-label-lg font-label-lg tracking-label-lg",
        xl: "px-inset-lg py-inset-lg text-label-lg font-label-lg tracking-label-lg",
      },
      // `code` overrides the size-based text role with the monospace data
      // role regardless of size, since structured/sequence data reads
      // better at one consistent code size.
      variant: {
        prose: "",
        code: "text-code font-code tracking-code",
      },
      error: {
        true: "border-status-error",
        false: "border-border",
      },
    },
    defaultVariants: { size: "md", variant: "prose", error: false },
  },
);

interface TextareaProps
  extends
    Omit<ComponentPropsWithoutRef<"textarea">, "size">,
    Omit<VariantProps<typeof boxVariants>, "error"> {
  /** Associated via `htmlFor`/`id` — always pass this instead of relying on placeholder text. */
  label?: string;
  /** A longer explanatory line between the label and the textarea. */
  description?: string;
  /** Helper text below the textarea. Hidden automatically when `error` is set. */
  hint?: string;
  /** Error message below the textarea, replacing `hint`. Sets `aria-invalid`. */
  error?: string;
  size?: FieldSize;
  /** Shows a live character count below the textarea — `"12"`, or `"12/500"` with `maxLength`. */
  showCount?: boolean;
  /** Adds a copy-to-clipboard button in the top-right corner. */
  copyable?: boolean;
  /**
   * Grows the height to fit content as the user types, up to `maxRows`.
   * Disables the native drag-to-resize handle — the two would fight each
   * other otherwise.
   */
  autoResize?: boolean;
  /** Caps growth when `autoResize` is set. Ignored otherwise. */
  maxRows?: number;
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * A complete multi-line form field: label, optional description, the
 * textarea itself, and hint or error text — same shape as `Input`, sharing
 * its internal label/description/hint/error chrome.
 *
 * @param variant - `prose` (default) for free text; `code` for pasted/edited
 * structured data (sequences, config, IDs) — switches to the monospace code
 * role and makes Tab insert a tab character instead of moving focus, like a
 * code editor.
 * @param autoResize - Grows with content instead of scrolling internally;
 * pair with `maxRows` to cap it.
 *
 * @example
 * <Textarea label="Notes" variant="code" autoResize maxRows={20} />
 */
function Textarea({
  label,
  description,
  hint,
  error,
  size = "md",
  variant,
  showCount,
  copyable,
  autoResize,
  maxRows,
  id,
  className,
  value,
  defaultValue,
  maxLength,
  onChange,
  onKeyDown,
  ref,
  ...props
}: TextareaProps) {
  const { fieldId, descriptionId, hintId, errorId, describedBy } = useFieldIds({
    id,
    hasDescription: Boolean(description),
    hasError: Boolean(error),
    hasHint: Boolean(hint),
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [uncontrolledLength, setUncontrolledLength] = useState(
    () => String(defaultValue ?? "").length,
  );
  const currentLength = value !== undefined ? String(value).length : uncontrolledLength;

  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(textareaRef.current?.value ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function resize(el: HTMLTextAreaElement) {
    if (!autoResize) return;
    el.style.height = "auto";
    let next = el.scrollHeight;
    if (maxRows) {
      const cs = getComputedStyle(el);
      const lineHeight = parseFloat(cs.lineHeight || "0");
      const vPadding = parseFloat(cs.paddingTop || "0") + parseFloat(cs.paddingBottom || "0");
      next = Math.min(next, lineHeight * maxRows + vPadding);
    }
    el.style.height = `${next}px`;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (variant === "code" && event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      const el = event.currentTarget;
      const { selectionStart, selectionEnd, value: current } = el;
      const next = `${current.slice(0, selectionStart)}\t${current.slice(selectionEnd)}`;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(el, next);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + 1;
      });
    }
    onKeyDown?.(event);
  }

  return (
    <div className="flex flex-col gap-stack-xs">
      <FieldHeader
        fieldId={fieldId}
        label={label}
        description={description}
        descriptionId={descriptionId}
        required={props.required}
        size={size}
      />
      <div className={cn(boxVariants({ size, variant, error: Boolean(error) }), className)}>
        <textarea
          ref={mergeRefs(ref, textareaRef)}
          id={fieldId}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={cn(
            "min-h-0 w-full flex-1 bg-transparent outline-none",
            autoResize ? "resize-none" : "resize-y",
          )}
          onChange={(event) => {
            setUncontrolledLength(event.target.value.length);
            resize(event.target);
            onChange?.(event);
          }}
          onKeyDown={handleKeyDown}
          {...props}
        />
        {copyable && (
          <button
            type="button"
            aria-label="Copy"
            className="absolute top-inset-xs right-inset-xs"
            onClick={handleCopy}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </button>
        )}
      </div>
      <FieldFooter
        size={size}
        error={error}
        errorId={errorId}
        hint={hint}
        hintId={hintId}
        count={showCount ? formatFieldCount(currentLength, maxLength) : undefined}
      />
    </div>
  );
}

export { Textarea };
