import { useRef, useState, type ComponentPropsWithoutRef, type ReactNode, type Ref } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
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
  "inline-flex items-center gap-inline-xs rounded-md border bg-bg-elevated focus-within:outline-2 focus-within:outline-border-focus focus-within:outline-offset-2 has-disabled:cursor-not-allowed has-disabled:opacity-50 has-read-only:bg-bg-subtle",
  {
    variants: {
      // Horizontal padding stays in a narrow band across sizes — an Input
      // is usually stretched (w-full), not content-hugging like Button, so
      // scaling px the same way Button does reads as "empty space" rather
      // than "bigger control". Height (py) and text size carry the scale.
      size: {
        xs: "px-inset-sm py-inset-2xs text-caption font-caption tracking-caption",
        sm: "px-inset-sm py-inset-xs text-label font-label tracking-label",
        md: "px-inset-md py-inset-sm text-label font-label tracking-label",
        lg: "px-inset-md py-inset-md text-label-lg font-label-lg tracking-label-lg",
        xl: "px-inset-lg py-inset-lg text-label-lg font-label-lg tracking-label-lg",
      },
      error: {
        true: "border-status-error",
        false: "border-border",
      },
    },
    defaultVariants: { size: "md", error: false },
  },
);

interface InputProps
  extends
    Omit<ComponentPropsWithoutRef<"input">, "size" | "prefix">,
    Omit<VariantProps<typeof boxVariants>, "error"> {
  /** Associated via `htmlFor`/`id` — always pass this instead of relying on placeholder text. */
  label?: string;
  /** A longer explanatory line between the label and the input. */
  description?: string;
  /** Helper text below the input. Hidden automatically when `error` is set. */
  hint?: string;
  /**
   * Error message below the input, replacing `hint`. Sets `aria-invalid` and
   * the box's error border. Matches the shape of most form libraries'
   * `fieldState.error?.message` (e.g. react-hook-form's `Controller`), so
   * it drops in directly.
   */
  error?: string;
  size?: FieldSize;
  /** Content floating inside the box before the input — icon, unit, etc. */
  prefix?: ReactNode;
  /**
   * Content floating inside the box after the input. For `type="password"`
   * or `copyable`, an explicit `suffix` overrides the automatic button(s).
   */
  suffix?: ReactNode;
  /** Shows a live character count below the input — `"12"`, or `"12/500"` with `maxLength`. */
  showCount?: boolean;
  /** Adds a copy-to-clipboard button in the suffix position. */
  copyable?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * A complete form field: label, optional description, the input itself
 * (with optional prefix/suffix), and hint or error text — self-contained
 * since this design system has no separate FormField/Label component.
 * `ref` always points at the real `<input>` and every native prop (`name`,
 * `onChange`, `onBlur`, `value`, `required`, ...) passes through untouched,
 * so `{...register("email")}` or a react-hook-form `Controller`'s `field`
 * spread directly onto it.
 *
 * @param size - `xs` through `xl` (default `md`) — matches `Button`'s scale so a
 * same-size Input and Button align visually.
 * @param error - Replaces `hint` and sets `aria-invalid` when present.
 *
 * @example
 * <Input label="Email" required error={fieldState.error?.message} {...field} />
 */
function Input({
  label,
  description,
  hint,
  error,
  size = "md",
  prefix,
  suffix,
  showCount,
  copyable,
  id,
  type,
  required,
  className,
  value,
  defaultValue,
  maxLength,
  onChange,
  ref,
  ...props
}: InputProps) {
  const { fieldId, descriptionId, hintId, errorId, describedBy } = useFieldIds({
    id,
    hasDescription: Boolean(description),
    hasError: Boolean(error),
    hasHint: Boolean(hint),
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const [uncontrolledLength, setUncontrolledLength] = useState(
    () => String(defaultValue ?? "").length,
  );
  const currentLength = value !== undefined ? String(value).length : uncontrolledLength;

  const isPassword = type === "password";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const resolvedType = isPassword && passwordVisible ? "text" : type;

  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(inputRef.current?.value ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const autoSlotButtons = [
    isPassword && (
      <button
        key="password-toggle"
        type="button"
        aria-label={passwordVisible ? "Hide password" : "Show password"}
        onClick={() => setPasswordVisible((visible) => !visible)}
      >
        {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    ),
    copyable && (
      <button key="copy" type="button" aria-label="Copy" onClick={handleCopy}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
    ),
  ].filter(Boolean);
  const resolvedSuffix =
    suffix ?? (autoSlotButtons.length > 0 ? <>{autoSlotButtons}</> : undefined);

  return (
    <div className="flex flex-col gap-stack-xs">
      <FieldHeader
        fieldId={fieldId}
        label={label}
        description={description}
        descriptionId={descriptionId}
        required={required}
        size={size}
      />
      <div
        className={cn(boxVariants({ size, error: Boolean(error) }), className)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.querySelector("input")?.focus();
          }
        }}
      >
        {prefix}
        <input
          ref={mergeRefs(ref, inputRef)}
          id={fieldId}
          type={resolvedType}
          required={required}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className="flex-1 bg-transparent outline-none"
          onChange={(event) => {
            setUncontrolledLength(event.target.value.length);
            onChange?.(event);
          }}
          {...props}
        />
        {resolvedSuffix}
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

export { Input };
