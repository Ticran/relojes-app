import { getStockStatus, LOW_STOCK_LIMIT } from "../data/products.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export function getDashboardSubtitle(username, date) {
  const hour = date.getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const dateParts = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(date);
  const getPart = (type) =>
    dateParts.find((part) => part.type === type)?.value ?? "";
  const formattedDate = `${getPart("weekday")} ${getPart("day")} de ${getPart("month")}`;

  return `${greeting}${username ? `, ${username}` : ""} · ${formattedDate}`;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\u00a0/g, " ");
}

export function formatShortMovementDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";

  const parts = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const getPart = (type) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("day")}/${getPart("month")} ${getPart("hour")}:${getPart("minute")}`;
}

export function getInventoryMetrics(items) {
  return {
    totalProducts: items.length,
    inventoryValue: items.reduce(
      (total, product) => total + product.price * product.stock,
      0,
    ),
    totalUnits: items.reduce((total, product) => total + product.stock, 0),
    lowStock: items.filter(
      (product) => getStockStatus(product.stock).id === "bajo",
    ).length,
    outOfStock: items.filter((product) => product.stock === 0).length,
    lowStockLimit: LOW_STOCK_LIMIT,
  };
}

export function getStockAlerts(items) {
  return items
    .filter((product) => getStockStatus(product.stock).id !== "normal")
    .sort((a, b) => {
      const statusOrder = Number(a.stock > 0) - Number(b.stock > 0);
      return statusOrder || a.name.localeCompare(b.name, "es-AR");
    });
}

export function getRecentMovements(movements, limit = 5) {
  return [...movements]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

export function groupMovementsByWeek(movements, today) {
  const dayEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const dayStart = new Date(dayEnd);
  dayStart.setDate(dayStart.getDate() - 29);
  const startDay = Date.UTC(
    dayStart.getFullYear(),
    dayStart.getMonth(),
    dayStart.getDate(),
  );
  const groups = Array.from({ length: 4 }, (_, index) => ({
    id: `week-${index + 1}`,
    label: `Semana ${index + 1}`,
    entrada: 0,
    salida: 0,
  }));

  for (const movement of movements) {
    if (movement.type !== "entrada" && movement.type !== "salida") continue;
    const date = new Date(movement.createdAt);
    if (Number.isNaN(date.getTime()) || date > today) continue;
    const movementDay = Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const dayOffset = Math.floor((movementDay - startDay) / DAY_MS);
    if (dayOffset < 0 || dayOffset >= 30) continue;

    const weekIndex = Math.min(3, Math.floor((dayOffset * 4) / 30));
    groups[weekIndex][movement.type] += movement.quantity;
  }

  return groups;
}
