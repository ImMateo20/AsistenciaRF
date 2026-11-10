export function mostrarHoraLocal(fecha) {
  if (!fecha) return "—";

  // Las fechas del backend sin zona representan UTC.
  const fechaUTC = /(?:Z|[+-]\d{2}:\d{2})$/i.test(fecha) ? fecha : `${fecha}Z`;

  const instante = new Date(fechaUTC);

  if (Number.isNaN(instante.getTime())) return "—";

  return instante.toLocaleTimeString("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}
