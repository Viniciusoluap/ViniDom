export const DEFAULT_OPERATIONAL_DURATION_BY_COMMERCIAL = {
  90: 120,
};

export function getOperationalDuration(service) {
  const commercialDuration = Number(service?.duration || 0);
  const configuredDuration = Number(service?.operationalDuration || 0);

  if (configuredDuration > 0) return configuredDuration;
  return DEFAULT_OPERATIONAL_DURATION_BY_COMMERCIAL[commercialDuration] || commercialDuration;
}

export function getDurationTotals(services = []) {
  return services.reduce(
    (totals, service) => ({
      commercialDuration: totals.commercialDuration + Number(service?.duration || 0),
      operationalDuration: totals.operationalDuration + getOperationalDuration(service),
    }),
    { commercialDuration: 0, operationalDuration: 0 },
  );
}

export function normalizeServicesForBooking(services = []) {
  return services.map((service) => ({
    ...service,
    duration: Number(service?.duration || 0),
    operationalDuration: getOperationalDuration(service),
  }));
}
