import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Applied accent colour (hex) for focus/selection highlights. */
  accent: string;
  ariaLabel?: string;
  /** Extra styles for the trigger button (e.g. flex sizing). */
  style?: CSSProperties;
}

/**
 * A small themed dropdown that replaces the native <select> so it matches the
 * studio chrome in both light and dark themes. Keyboard accessible (arrows,
 * Enter/Space, Escape) and closes on outside click.
 */
export default function Select({
  value,
  options,
  onChange,
  accent,
  ariaLabel,
  style,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const i = options.findIndex((o) => o.value === value);
    setActive(i < 0 ? 0 : i);
  }, [open, value, options]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) choose(options[active].value);
      else setOpen(true);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const trigger: CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "9px 10px",
    borderRadius: 10,
    border: `1px solid ${open ? accent + "80" : "var(--border-soft)"}`,
    background: "var(--input-bg)",
    color: "var(--ink)",
    fontFamily: "inherit",
    fontSize: 13,
    cursor: "pointer",
    outline: "none",
    textAlign: "left",
    ...style,
  };

  const menu: CSSProperties = {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    zIndex: 40,
    padding: 5,
    borderRadius: 12,
    border: "1px solid var(--border-soft)",
    background: "var(--input-bg)",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
    maxHeight: 260,
    overflowY: "auto",
  };

  return (
    <div ref={rootRef} style={{ position: "relative", flex: style?.flex }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
        style={trigger}
      >
        <span
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {current?.label}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <ul role="listbox" style={menu}>
          {options.map((o, i) => {
            const selected = o.value === value;
            const isActive = i === active;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                  color: selected ? accent : "var(--ink)",
                  fontWeight: selected ? 600 : 400,
                  background: isActive ? accent + "1f" : "transparent",
                }}
              >
                {o.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      style={{
        flex: "0 0 auto",
        color: "var(--sub)",
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform 0.15s ease",
      }}
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
