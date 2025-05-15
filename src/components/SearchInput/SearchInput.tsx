import styles from "./SearchInput.module.css";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
}

export default function SearchInput({ value, onChange, onEnter }: SearchInputProps) {
  return (
    <input
      type="text"
      className={styles.input}
      placeholder="Sök.."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
    />
  );
}
