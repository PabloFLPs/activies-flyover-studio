import {
  useEffect,
  useState,
  type CSSProperties,
  type FocusEvent,
} from "react";

interface Props {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  ariaLabel?: string;
  style?: CSSProperties;
  min?: number;
  max?: number;
}

/**
 * A numeric text field that keeps its own editable string so it can be cleared
 * and retyped. A raw controlled `<input type="number" value={aNumber}>` can
 * never be empty, which traps a leading "0" (typing 30 shows "030"). Here the
 * field holds text while focused and only commits finite numbers upward;
 * it re-syncs from `value` and normalises on blur.
 */
export default function NumberInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  style,
  min,
  max,
}: Props) {
  const [text, setText] = useState(String(value));

  // Adopt an external change (e.g. auto-filled temperature) unless the current
  // text already represents that number (so mid-edit strings aren't clobbered).
  useEffect(() => {
    if (parseFloat(text) !== value) {
      setText(Number.isFinite(value) ? String(value) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (n: number): number => {
    let out = n;
    if (min != null) out = Math.max(min, out);
    if (max != null) out = Math.min(max, out);
    return out;
  };

  const handle = (raw: string) => {
    setText(raw);
    const n = parseFloat(raw);
    if (Number.isFinite(n)) onChange(clamp(n));
  };

  const onBlur = (e: FocusEvent<HTMLInputElement>) => {
    const n = parseFloat(e.target.value);
    // Empty or junk on blur → fall back to the last committed value.
    setText(Number.isFinite(n) ? String(clamp(n)) : String(value));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => handle(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      aria-label={ariaLabel}
      style={style}
    />
  );
}
