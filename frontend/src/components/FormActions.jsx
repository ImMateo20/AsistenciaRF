import Button from "./Button";

export default function FormActions({
  onCancel,
  submitLabel = "Guardar",
  loading = false,
}) {
  return (
    <div className="page__actions">
      <Button variant="secondary" onClick={onCancel} disabled={loading}>
        Cancelar
      </Button>

      <Button type="submit" disabled={loading}>
        {loading ? "Guardando..." : submitLabel}
      </Button>
    </div>
  );
}
