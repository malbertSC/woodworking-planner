interface SelectOption {
  value: string;
  label: string;
  badge?: string | undefined;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
}

export default function Select({
  label,
  value,
  onChange,
  options,
  id,
}: SelectProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-xs font-medium text-stone-600">
        {label}
      </label>
      <select
        id={inputId}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="rounded border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
            {opt.badge ? ` (${opt.badge})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
