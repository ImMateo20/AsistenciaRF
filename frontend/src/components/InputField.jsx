import { useId } from "react";

export default function InputField({
  label,
  error,
  id,
  className = "",
  ...props
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={`field ${className}`}>
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>

      <input
        {...props}
        id={inputId}
        className="field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />

      {error && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
