interface RadioCardOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

interface RadioCardGroupProps<T extends string> {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: RadioCardOption<T>[];
}

export default function RadioCardGroup<T extends string>({
  name,
  value,
  onChange,
  options,
}: RadioCardGroupProps<T>) {
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{name}</legend>
      {options.map((opt) => (
        <label
          key={opt.value}
          htmlFor={`${name}-${opt.value}`}
          className={`flex cursor-pointer items-start gap-3 rounded border p-3 transition-colors ${
            value === opt.value
              ? "border-amber-600 bg-amber-50"
              : "border-stone-200 hover:border-stone-300"
          }`}
        >
          <input
            id={`${name}-${opt.value}`}
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => {
              onChange(opt.value);
            }}
            className="mt-0.5 accent-amber-600"
          />
          <div>
            <span className="text-sm font-medium text-stone-800">
              {opt.label}
            </span>
            <p className="mt-0.5 text-xs text-stone-500">{opt.description}</p>
          </div>
        </label>
      ))}
    </fieldset>
  );
}
