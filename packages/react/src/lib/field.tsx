import { useId, type ReactNode, type Ref } from "react";
import { cn } from "./cn";

/**
 * Merges multiple refs (object or callback) into one callback ref. Used
 * where a component needs its own internal ref (e.g. to read a DOM value
 * for a copy button) alongside the ref a consumer passes in.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | null | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as { current: T | null }).current = node;
    }
  };
}

export const FIELD_LABEL_TEXT_CLASSES = {
  xs: "text-caption",
  sm: "text-caption",
  md: "text-label",
  lg: "text-label",
  xl: "text-label-lg",
} as const;

export const FIELD_SUB_TEXT_CLASSES = {
  xs: "text-caption",
  sm: "text-caption",
  md: "text-caption",
  lg: "text-caption",
  xl: "text-label",
} as const;

export type FieldSize = keyof typeof FIELD_LABEL_TEXT_CLASSES;

interface UseFieldIdsArgs {
  id?: string;
  hasDescription: boolean;
  hasError: boolean;
  hasHint: boolean;
}

/** Computes stable ids and the composed `aria-describedby` value for a field. */
export function useFieldIds({ id, hasDescription, hasError, hasHint }: UseFieldIdsArgs) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const descriptionId = hasDescription ? `${fieldId}-description` : undefined;
  const hintId = !hasError && hasHint ? `${fieldId}-hint` : undefined;
  const errorId = hasError ? `${fieldId}-error` : undefined;
  const describedBy = [descriptionId, errorId ?? hintId].filter(Boolean).join(" ") || undefined;
  return { fieldId, descriptionId, hintId, errorId, describedBy };
}

interface FieldHeaderProps {
  fieldId: string;
  label?: string;
  description?: string;
  descriptionId?: string;
  required?: boolean;
  size: FieldSize;
}

/** Label + optional description, kept visually tight as one block. */
export function FieldHeader({
  fieldId,
  label,
  description,
  descriptionId,
  required,
  size,
}: FieldHeaderProps) {
  if (!label && !description) return null;
  return (
    <div className="flex flex-col gap-stack-2xs">
      {label && (
        <label htmlFor={fieldId} className={FIELD_LABEL_TEXT_CLASSES[size]}>
          {label}
          {required && (
            <span aria-hidden="true" className="text-status-error">
              *
            </span>
          )}
        </label>
      )}
      {description && (
        <p id={descriptionId} className={cn(FIELD_SUB_TEXT_CLASSES[size], "text-text-secondary")}>
          {description}
        </p>
      )}
    </div>
  );
}

interface FieldFooterProps {
  size: FieldSize;
  error?: string;
  errorId?: string;
  hint?: string;
  hintId?: string;
  count?: ReactNode;
}

/** Hint or error text on the left, character count on the right. */
export function FieldFooter({ size, error, errorId, hint, hintId, count }: FieldFooterProps) {
  const message = error ? (
    <p id={errorId} className={cn(FIELD_SUB_TEXT_CLASSES[size], "text-status-error")}>
      {error}
    </p>
  ) : hint ? (
    <p id={hintId} className={cn(FIELD_SUB_TEXT_CLASSES[size], "text-text-secondary")}>
      {hint}
    </p>
  ) : null;

  if (!message && !count) return null;

  return (
    <div className="flex items-start justify-between gap-inline-sm">
      {message ?? <span />}
      {count !== undefined && count !== null && (
        <span className={cn(FIELD_SUB_TEXT_CLASSES[size], "text-text-secondary")}>{count}</span>
      )}
    </div>
  );
}

/** `"12"` with no max, `"12/500"` with one. */
export function formatFieldCount(length: number, maxLength?: number): string {
  return maxLength === undefined ? String(length) : `${length}/${maxLength}`;
}
