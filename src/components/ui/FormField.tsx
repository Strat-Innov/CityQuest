interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

/** Labelled input with accessible error and hint text. */
export function FormField({ label, name, error, hint, id, ...input }: FormFieldProps) {
  const fieldId = id ?? `field-${name}`;
  const describedBy = [error ? `${fieldId}-error` : null, hint ? `${fieldId}-hint` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div>
      <label htmlFor={fieldId} className="field-label">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        className="field"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...input}
      />
      {hint && !error ? (
        <p id={`${fieldId}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fieldId}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
