import { useState, useRef, useEffect } from "react";
import styles from "./SearchTypeSelect.module.css";

const options = [
  { value: "name", label: "Namn" },
  { value: "email", label: "E-post" },
  { value: "phone", label: "Telefonnummer" },
  { value: "address", label: "Adress" },
  { value: "memberId", label: "Medlemsnummer" },
  { value: "personalIdentityNumber", label: "Personnummer" },
  { value: "orderNumber", label: "Ordernummer" },
];

type Props = {
  value: string;
  onChange: (value: string) => void;
  selectedTypes?: Set<string>;
  onToggle?: (type: string) => void;
};

export default function SearchTypeSelect({
  value,
  onChange,
  selectedTypes,
  onToggle,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentLabel =
    options.find((o) => o.value === value)?.label || "Välj vad du vill söka på";

  const handleCheck = (optionValue: string) => {
    if (optionValue === value) return;

    if (selectedTypes?.has(optionValue)) {
      onToggle?.(optionValue);
    } else if (!value && onToggle) {
      onChange(optionValue);
    } else {
      onToggle?.(optionValue);
    }
  };

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        type="button"
        className={styles.select}
        onClick={() => setOpen((prev) => !prev)}
      >
        {currentLabel}
      </button>
      {open && (
        <div className={styles.menu}>
          {options.map((opt) => {
            const isThis = opt.value === value;
            const isUsed = selectedTypes?.has(opt.value) ?? false;
            return (
              <label key={opt.value} className={styles.menuItem}>
                <input
                  type="checkbox"
                  checked={isThis || isUsed}
                  onChange={() => handleCheck(opt.value)}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
