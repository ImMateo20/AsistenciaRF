import { Pencil } from "lucide-react";

export default function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}) {
  return (
    <button
      type={type}
      className={`button button--${variant} ${className}`}
      {...props}
    >
      {variant === "edit" && <Pencil size={16} aria-hidden="true" />}

      {children}
    </button>
  );
}
