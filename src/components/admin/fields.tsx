/** Small form primitives for the admin console, styled with the prototype tokens. */

export function TextArea({
  label,
  name,
  error,
  hint,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string; error?: string; hint?: string }) {
  const id = `field-${name}`;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={3}
        className="field resize-y"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  label,
  name,
  defaultChecked,
  error,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  error?: string;
  hint?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          className="h-5 w-5 accent-blue"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
      </div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function StatusPill({ active }: { active: boolean }) {
  return <span className={`pill ${active ? "pill-ready" : "pill-used"}`}>{active ? "Active" : "Inactive"}</span>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="h1 !text-[26px]">{title}</h1>
        {description ? <p className="lead !mt-1">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
