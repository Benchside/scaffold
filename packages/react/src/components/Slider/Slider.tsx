import { useEffect, useRef, useState, type Ref } from "react";
import { Slider as ArkSlider, type SliderValueChangeDetails } from "@ark-ui/react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";
import {
  FieldFooter,
  FIELD_LABEL_TEXT_CLASSES,
  FIELD_SUB_TEXT_CLASSES,
  useFieldIds,
  type FieldSize,
} from "../../lib/field";

const TRACK_SIZE_CLASSES = {
  xs: "data-[orientation=horizontal]:h-1 data-[orientation=vertical]:w-1",
  sm: "data-[orientation=horizontal]:h-1 data-[orientation=vertical]:w-1",
  md: "data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:w-1.5",
  lg: "data-[orientation=horizontal]:h-2 data-[orientation=vertical]:w-2",
  xl: "data-[orientation=horizontal]:h-2 data-[orientation=vertical]:w-2",
} as const;

/**
 * Thumb offset/range-fill/marker placement is computed entirely by Zag and
 * injected as inline `style` (CSS custom properties) on Root/Thumb/Range.
 * This component's CSS only ever consumes those vars (via the geometry Ark
 * already sets); it
 * never sets its own `left`/`top`/`transform`, unlike `Switch`'s thumb,
 * which has to compute its own translate since Zag's switch machine has no
 * geometry primitive to delegate to.
 */
const trackVariants = cva(
  "relative rounded-full bg-bg-subtle data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-48 data-disabled:opacity-50",
  {
    variants: { size: TRACK_SIZE_CLASSES },
    defaultVariants: { size: "md" },
  },
);

const rangeVariants = cva(
  "absolute rounded-full data-[orientation=horizontal]:inset-y-0 data-[orientation=vertical]:inset-x-0",
);

const THUMB_SIZE_CLASSES = {
  xs: "size-(--font-size-xs)",
  sm: "size-(--font-size-sm)",
  md: "size-(--font-size-base)",
  lg: "size-(--font-size-lg)",
  xl: "size-(--font-size-xl)",
} as const;

const thumbVariants = cva(
  "rounded-full border-2 bg-bg-elevated shadow-sm outline-none data-disabled:cursor-not-allowed data-disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2",
  {
    variants: { size: THUMB_SIZE_CLASSES },
    defaultVariants: { size: "md" },
  },
);

const numberInputVariants = cva(
  "shrink-0 rounded-md border bg-bg-elevated text-center outline-none focus-within:outline-2 focus-within:outline-border-focus focus-within:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-bg-subtle",
  {
    variants: {
      size: {
        xs: "w-12 px-inset-xs py-inset-2xs text-caption",
        sm: "w-14 px-inset-xs py-inset-2xs text-label",
        md: "w-16 px-inset-sm py-inset-xs text-label",
        lg: "w-20 px-inset-sm py-inset-sm text-label-lg",
        xl: "w-24 px-inset-md py-inset-sm text-label-lg",
      },
      error: {
        true: "border-status-error",
        false: "border-border",
      },
    },
    defaultVariants: { size: "md", error: false },
  },
);

// Same width/text-size pairing as `numberInputVariants` (so toggling
// `editable` doesn't shift layout), minus the border/background — this is
// a read-only display, not a control, and shouldn't look interactive.
const valueTextVariants = cva("shrink-0 text-center text-text", {
  variants: {
    size: {
      xs: "w-12 text-caption",
      sm: "w-14 text-label",
      md: "w-16 text-label",
      lg: "w-20 text-label-lg",
      xl: "w-24 text-label-lg",
    },
  },
  defaultVariants: { size: "md" },
});

// Reserves enough height for a tick + one line of label text below the
// track. `Slider.Marker`'s own children are `position: absolute` (per
// `getMarkerStyle`), so `MarkerGroup`'s box has no natural content height —
// it needs an explicit one, sized per size step like the rest of the scale.
const MARKER_GROUP_HEIGHT_CLASSES = {
  xs: "h-7",
  sm: "h-7",
  md: "h-8",
  lg: "h-9",
  xl: "h-9",
} as const;

const markerGroupVariants = cva("w-full", {
  variants: { size: MARKER_GROUP_HEIGHT_CLASSES },
  defaultVariants: { size: "md" },
});

const TICK_SIZE_CLASSES = {
  xs: "size-1",
  sm: "size-1",
  md: "size-1.5",
  lg: "size-2",
  xl: "size-2",
} as const;

const tickVariants = cva("shrink-0 rounded-full bg-border data-[state=at-value]:bg-accent", {
  variants: { size: TICK_SIZE_CLASSES },
  defaultVariants: { size: "md" },
});

function decimalsFromStep(step: number): number {
  const text = step.toString();
  const i = text.indexOf(".");
  return i === -1 ? 0 : text.length - i - 1;
}

/**
 * Precision derived from `step`'s own decimal places (via `toFixed`, not
 * string concatenation), so e.g. `step={0.1}` reliably formats as `"70.1"`
 * — never the raw-float artifact (`"70.09999999999999"`) that both video.js
 * and Carbon have shipped from naively rendering an unrounded float.
 */
function defaultFormatValue(value: number, step: number): string {
  return value.toFixed(decimalsFromStep(step));
}

function toArray(value: number | number[] | undefined): number[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

/**
 * Every value crosses this exact seam when moving between "real" units —
 * the public `value`/`defaultValue`/`onValueChange`/`marks` props, and
 * everything a consumer sees — and Ark's own internal domain, which
 * `min`/`max`/`step` also define directly (so it equals the real domain
 * here, by construction). Hardcoded to the identity transform in v1: a
 * pure architectural seam, not a feature. Introducing a real non-linear
 * (e.g. log) scale later becomes a one-function change at this seam,
 * verified as a behavior-preserving no-op by every prior checkpoint's test
 * suite passing unchanged with this in place — not a restructuring of the
 * rest of the component. `min`/`max`/`step` themselves are NOT routed
 * through it: a real log scale would need to transform the bounds and
 * redefine what `step` means in each domain separately, which is future
 * work for when log math actually lands, not solved here.
 */
const scale = {
  toPosition: (value: number): number => value,
  fromPosition: (position: number): number => position,
};

interface SliderProps {
  /** Rendered via Ark's `Slider.Label`, wired to the first thumb through `aria-labelledby`/`htmlFor`. */
  label?: string;
  /** A longer explanatory line between the label and the control. */
  description?: string;
  /** Helper text below the control. Hidden automatically when `error` is set. */
  hint?: string;
  /** Error message below the control, replacing `hint`. Sets `invalid` and the thumb/range/input error color. */
  error?: string;
  size?: FieldSize;
  min?: number;
  max?: number;
  step?: number;
  /** Step used with `Shift`+Arrow or `PageUp`/`PageDown`. @default 10 * step */
  largeStep?: number;
  orientation?: "horizontal" | "vertical";
  /**
   * Renders a second thumb. Explicit rather than inferred from whether
   * `value`/`defaultValue` is an array: an uncontrolled range slider with
   * neither prop set has nothing to infer a second value from, so it
   * defaults to spanning the full `[min, max]`.
   */
  range?: boolean;
  /** A single number normally, or `[min, max]` when `range`. */
  value?: number | number[];
  defaultValue?: number | number[];
  /** Receives a `number` normally, or `number[]` when `range`. */
  onValueChange?: (value: number | number[]) => void;
  /** Fires once, when a drag/keyboard interaction settles, unlike `onValueChange`. */
  onValueChangeEnd?: (value: number | number[]) => void;
  /** Minimum gap between thumbs, in units of `step` — e.g. `step={1}` and
   *  `minStepsBetweenThumbs={10}` keeps the thumbs at least 10 apart. */
  minStepsBetweenThumbs?: number;
  /** How thumbs behave when dragged into each other. @default "none" */
  thumbCollisionBehavior?: "none" | "push" | "swap";
  /** Per-thumb accessible name qualifiers in `range` mode, e.g.
   *  `["Minimum", "Maximum"]` — the default when unset. Combined with
   *  `label` (e.g. `"Concentration Minimum"`) for each thumb's `aria-label`,
   *  since a single shared `Slider.Label` can't distinguish two thumbs. */
  thumbLabels?: string[];
  /** Tick marks along the track, each with an optional label below it.
   *  Purely visual — Ark renders them `aria-hidden`/`role="presentation"`,
   *  since the slider's own `aria-valuenow`/`aria-valuetext` already
   *  communicate the value. */
  marks?: { value: number; label?: string }[];
  /** Unit suffix, e.g. `"µM"`. Appended after the formatted value in
   *  `aria-valuetext` and the `editable={false}` display — not shown inside
   *  the editable numeric input itself, so typing stays plain-number only. */
  unit?: string;
  /** Overrides the step-derived-precision default (see `defaultFormatValue`)
   *  used for the numeric input's displayed text and as the base for
   *  `aria-valuetext`/the `editable={false}` display. */
  formatValue?: (value: number) => string;
  /** Overrides the full `aria-valuetext` string. Receives the already
   *  `formatValue` + `unit` composed text as `formatted`. */
  getAriaValueText?: (details: { value: number; index: number; formatted: string }) => string;
  /** Hides the editable numeric input, falling back to a read-only
   *  `Slider.ValueText` display — the value is never removed from the DOM,
   *  only its editability. @default true */
  editable?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  form?: string;
  id?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

interface SliderNumberInputProps {
  index: number;
  /** Already formatted via `formatValue` — this component never formats. */
  value: string;
  getThumbValue: (index: number) => number;
  setThumbValue: (index: number, value: number) => void;
  formatValue: (value: number) => string;
  size: FieldSize;
  error: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  ariaLabel: string;
  describedBy?: string;
}

/**
 * Local text state, resynced from the committed thumb value whenever this
 * input isn't the one currently being typed into — same shape as
 * `Combobox`'s `isEditing`-ref guard against a drag/prop update clobbering
 * an in-progress keystroke. Commits only on blur/Enter (not per keystroke,
 * which would fight `step` mid-type, e.g. typing "10" would briefly commit
 * "1"). `setThumbValue` already snaps to `step` and clamps to
 * min/max/`minStepsBetweenThumbs` internally — the resync after commit
 * picks up whatever value actually got committed, so a typed value can
 * never silently diverge from what's shown, unlike Carbon's historical bug.
 */
function SliderNumberInput({
  index,
  value,
  getThumbValue,
  setThumbValue,
  formatValue,
  size,
  error,
  disabled,
  readOnly,
  ariaLabel,
  describedBy,
}: SliderNumberInputProps) {
  const isEditingRef = useRef(false);
  const [text, setText] = useState(value);

  useEffect(() => {
    if (isEditingRef.current) return;
    setText(value);
  }, [value]);

  function commit() {
    isEditingRef.current = false;
    const parsed = Number(text);
    if (text.trim() === "" || Number.isNaN(parsed)) {
      setText(formatValue(getThumbValue(index)));
      return;
    }
    setThumbValue(index, parsed);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      disabled={disabled}
      readOnly={readOnly}
      value={text}
      onChange={(event) => {
        isEditingRef.current = true;
        setText(event.target.value);
      }}
      onFocus={() => {
        isEditingRef.current = true;
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      }}
      className={cn(numberInputVariants({ size, error }))}
    />
  );
}

/**
 * A numeric slider — single-thumb by default, or a two-thumb range with
 * `range`: label, track with draggable thumb(s), paired editable numeric
 * input(s), and hint or error text below — built on Ark UI's slider state
 * machine for keyboard control (Arrow/Home/End/Page/Shift out of the box),
 * drag, thumb-collision handling, focus management, and ARIA.
 *
 * @param size - `xs` through `xl` (default `md`) — matches `Input`'s scale.
 * @param error - Replaces `hint`, sets `invalid`, and colors the thumb/range/input.
 * @param range - Renders two thumbs; `value`/`onValueChange` become `[min, max]`.
 *
 * @example
 * <Slider label="Concentration" min={0} max={100} value={volume} onValueChange={setVolume} />
 */
function Slider({
  label,
  description,
  hint,
  error,
  size = "md",
  min,
  max,
  step,
  largeStep,
  orientation = "horizontal",
  range = false,
  value,
  defaultValue,
  onValueChange,
  onValueChangeEnd,
  minStepsBetweenThumbs,
  thumbCollisionBehavior,
  thumbLabels,
  marks,
  unit,
  formatValue,
  getAriaValueText,
  editable = true,
  disabled = false,
  readOnly,
  name,
  form,
  id,
  className,
  ref,
}: SliderProps) {
  const { descriptionId, hintId, errorId, describedBy } = useFieldIds({
    hasDescription: Boolean(description),
    hasError: Boolean(error),
    hasHint: Boolean(hint),
  });

  const resolvedMin = min ?? 0;
  const resolvedMax = max ?? 100;
  const resolvedStep = step ?? 1;
  const resolveFormatValue = formatValue ?? ((v: number) => defaultFormatValue(v, resolvedStep));
  const thumbIndexes = range ? [0, 1] : [0];

  function composeValueText(v: number): string {
    const formatted = resolveFormatValue(v);
    return unit ? `${formatted} ${unit}` : formatted;
  }

  function composeRangeValueText(lo: number, hi: number): string {
    const text = `${resolveFormatValue(lo)} – ${resolveFormatValue(hi)}`;
    return unit ? `${text} ${unit}` : text;
  }

  function resolveThumbQualifier(index: number): string {
    return thumbLabels?.[index] ?? (index === 0 ? "Minimum" : "Maximum");
  }

  /**
   * A shared `Slider.Label` can't distinguish which of two thumbs is
   * focused, so in `range` mode each thumb gets its own composed
   * `aria-label` (e.g. "Concentration Minimum") instead. Overriding just
   * `aria-label` isn't enough on its own — Zag's `getThumbProps` always
   * also sets `aria-labelledby` (falling back to the shared Label's id per
   * `mergeProps`'s merge semantics: a `props[key] !== undefined` check
   * means passing `undefined` here can't suppress it), and `aria-labelledby`
   * wins over `aria-label` in accname
   * resolution when present. Passing `""` here is a real, non-undefined
   * override that neutralizes it, letting `aria-label` take over.
   */
  function resolveThumbAriaProps(index: number): {
    "aria-label"?: string;
    "aria-labelledby"?: string;
  } {
    if (!range) return {};
    const qualifier = resolveThumbQualifier(index);
    return {
      "aria-label": label ? `${label} ${qualifier}` : qualifier,
      "aria-labelledby": "",
    };
  }

  function resolveAriaValueText(details: { value: number; index: number }): string {
    const realValue = scale.fromPosition(details.value);
    const formatted = composeValueText(realValue);
    const defaultText = range ? `${resolveThumbQualifier(details.index)}: ${formatted}` : formatted;
    return getAriaValueText?.({ value: realValue, index: details.index, formatted }) ?? defaultText;
  }

  /**
   * Zag's `invokeOnChangeEnd` action queues its callback via
   * `queueMicrotask` from inside the same synchronous action chain that
   * commits the new value: for a keyboard-triggered change (Arrow/Home/
   * End/Page), the value that microtask reads back via its own
   * `context.get("value")` is still the pre-transition value, so
   * `onValueChangeEnd`'s own `details.value` can't be trusted for these
   * interactions. `onValueChange`, by contrast, always fires with the fresh
   * value — so this ref tracks the latest value `onValueChange` reported,
   * and `onValueChangeEnd` reports that instead of its own (unreliable)
   * payload.
   */
  const latestValueRef = useRef<number[]>(
    toArray(defaultValue) ?? toArray(value) ?? (range ? [resolvedMin, resolvedMax] : [resolvedMin]),
  );

  function handleValueChange(details: SliderValueChangeDetails) {
    const realValues = details.value.map(scale.fromPosition);
    latestValueRef.current = realValues;
    onValueChange?.(range ? realValues : (realValues[0] ?? resolvedMin));
  }

  function handleValueChangeEnd() {
    const current = latestValueRef.current;
    onValueChangeEnd?.(range ? current : (current[0] ?? resolvedMin));
  }

  return (
    <ArkSlider.Root
      ref={ref}
      id={id}
      min={min}
      max={max}
      step={step}
      largeStep={largeStep}
      orientation={orientation}
      value={toArray(value)?.map(scale.toPosition)}
      defaultValue={
        toArray(defaultValue)?.map(scale.toPosition) ??
        (range ? [scale.toPosition(resolvedMin), scale.toPosition(resolvedMax)] : undefined)
      }
      onValueChange={handleValueChange}
      onValueChangeEnd={handleValueChangeEnd}
      getAriaValueText={resolveAriaValueText}
      minStepsBetweenThumbs={minStepsBetweenThumbs}
      thumbCollisionBehavior={thumbCollisionBehavior}
      disabled={disabled}
      readOnly={readOnly}
      invalid={Boolean(error)}
      name={name}
      form={form}
      className={cn("flex flex-col gap-stack-xs", className)}
    >
      {label && (
        <ArkSlider.Label className={FIELD_LABEL_TEXT_CLASSES[size]}>{label}</ArkSlider.Label>
      )}
      {description && (
        <p id={descriptionId} className={cn(FIELD_SUB_TEXT_CLASSES[size], "text-text-secondary")}>
          {description}
        </p>
      )}
      <ArkSlider.Context>
        {(api) => {
          // Every read/write of a thumb's value goes through these two
          // wrappers, not `api.getThumbValue`/`setThumbValue` directly —
          // the seam point between Ark's own domain and real units.
          const getThumbRealValue = (index: number) => scale.fromPosition(api.getThumbValue(index));
          const setThumbRealValue = (index: number, v: number) =>
            api.setThumbValue(index, scale.toPosition(v));

          const numberInput = (index: number) => (
            <SliderNumberInput
              key={index}
              index={index}
              value={resolveFormatValue(getThumbRealValue(index))}
              getThumbValue={getThumbRealValue}
              setThumbValue={setThumbRealValue}
              formatValue={resolveFormatValue}
              size={size}
              error={Boolean(error)}
              disabled={disabled}
              readOnly={readOnly}
              ariaLabel={
                range ? (resolveThumbAriaProps(index)["aria-label"] ?? "Value") : (label ?? "Value")
              }
              describedBy={describedBy}
            />
          );

          return (
            <div className="flex items-center gap-inline-sm">
              {/* In range mode, bracketing the track (min on the left, max on
                  the right) spatially mirrors where each thumb actually sits
                  — unlike grouping both inputs on one side, there's no need
                  to infer "which number is which" from left-to-right order. */}
              {editable && range && numberInput(0)}
              {/* Control and MarkerGroup share this column so MarkerGroup's
                  width matches the track exactly — a flex sibling of Control
                  within the outer row would span this row's own width
                  instead (which also includes the numeric input(s)). */}
              <div className="flex flex-1 flex-col">
                <ArkSlider.Control className="relative flex items-center py-inset-sm">
                  <ArkSlider.Track className={trackVariants({ size })}>
                    <ArkSlider.Range
                      className={cn(rangeVariants(), error ? "bg-status-error" : "bg-accent")}
                    />
                  </ArkSlider.Track>
                  {thumbIndexes.map((index) => (
                    <ArkSlider.Thumb
                      key={index}
                      index={index}
                      aria-describedby={describedBy}
                      aria-invalid={error ? "true" : undefined}
                      {...resolveThumbAriaProps(index)}
                      className={cn(
                        thumbVariants({ size }),
                        error ? "border-status-error" : "border-border",
                      )}
                    >
                      <ArkSlider.HiddenInput />
                    </ArkSlider.Thumb>
                  ))}
                </ArkSlider.Control>
                {marks && marks.length > 0 && (
                  <ArkSlider.MarkerGroup className={markerGroupVariants({ size })}>
                    {marks.map((mark) => (
                      <ArkSlider.Marker
                        key={mark.value}
                        value={scale.toPosition(mark.value)}
                        className="flex flex-col items-center gap-stack-2xs"
                      >
                        <span className={tickVariants({ size })} />
                        {mark.label && (
                          <span
                            className={cn(
                              FIELD_SUB_TEXT_CLASSES[size],
                              "whitespace-nowrap text-text-secondary",
                            )}
                          >
                            {mark.label}
                          </span>
                        )}
                      </ArkSlider.Marker>
                    ))}
                  </ArkSlider.MarkerGroup>
                )}
              </div>
              {editable ? (
                numberInput(range ? 1 : 0)
              ) : (
                <ArkSlider.ValueText
                  className={cn(valueTextVariants({ size }), range && "w-auto whitespace-nowrap")}
                >
                  {range
                    ? composeRangeValueText(getThumbRealValue(0), getThumbRealValue(1))
                    : composeValueText(getThumbRealValue(0))}
                </ArkSlider.ValueText>
              )}
            </div>
          );
        }}
      </ArkSlider.Context>
      <FieldFooter size={size} error={error} errorId={errorId} hint={hint} hintId={hintId} />
    </ArkSlider.Root>
  );
}

export { Slider };
