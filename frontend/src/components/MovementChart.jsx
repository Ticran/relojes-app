import { useMemo } from "react";
import { groupMovementsByWeek } from "./summaryUtils.js";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 270;
const PLOT_LEFT = 48;
const PLOT_RIGHT = 12;
const PLOT_TOP = 18;
const PLOT_BOTTOM = 42;
const BAR_WIDTH = 24;
const GUIDE_COUNT = 3;

function MovementChart({ movements, warning }) {
  const groups = useMemo(
    () => groupMovementsByWeek(movements, new Date()),
    [movements],
  );
  const totalEntries = groups.reduce((sum, group) => sum + group.entrada, 0);
  const totalExits = groups.reduce((sum, group) => sum + group.salida, 0);
  const maxValue = Math.max(
    ...groups.map((group) => Math.max(group.entrada, group.salida)),
    1,
  );
  const tickCount = Math.min(GUIDE_COUNT, maxValue);
  const plotWidth = CHART_WIDTH - PLOT_LEFT - PLOT_RIGHT;
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const groupWidth = plotWidth / groups.length;
  const chartDescription = `Últimos 30 días: ${totalEntries} unidades de entrada y ${totalExits} unidades de salida.`;
  const hasMovements = totalEntries + totalExits > 0;

  return (
    <section
      className="dashboard__panel dashboard__chart-panel card"
      aria-labelledby="dashboard-chart-title"
    >
      <div className="dashboard__panel-heading">
        <h2 id="dashboard-chart-title" className="dashboard__panel-title">
          Entradas y salidas
        </h2>
        {hasMovements && (
          <ul
            className="dashboard__chart-legend"
            aria-label="Leyenda del gráfico"
          >
            <li>
              <span
                className="dashboard__chart-key dashboard__chart-key--entrada"
                aria-hidden="true"
              />
              Entradas
            </li>
            <li>
              <span
                className="dashboard__chart-key dashboard__chart-key--salida"
                aria-hidden="true"
              />
              Salidas
            </li>
          </ul>
        )}
      </div>

      {warning === "unavailable" ? (
        <p className="dashboard__chart-empty">
          No se puede mostrar el gráfico sin los datos de movimientos.
        </p>
      ) : hasMovements ? (
        <svg
          className="dashboard__chart"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label={chartDescription}
          preserveAspectRatio="xMidYMid meet"
        >
          <title>{chartDescription}</title>
          {Array.from({ length: tickCount + 1 }, (_, step) => {
            const value = Math.round((maxValue * step) / tickCount);
            const y = PLOT_TOP + plotHeight - (plotHeight * step) / tickCount;
            return (
              <g key={`guide-${step}`}>
                <line
                  className="dashboard__chart-grid"
                  x1={PLOT_LEFT}
                  x2={CHART_WIDTH - PLOT_RIGHT}
                  y1={y}
                  y2={y}
                />
                <text
                  className="dashboard__chart-axis-label"
                  x={PLOT_LEFT - 10}
                  y={y + 4}
                  textAnchor="end"
                >
                  {value}
                </text>
              </g>
            );
          })}
          {groups.map((group, index) => {
            const center = PLOT_LEFT + groupWidth * (index + 0.5);
            const entryHeight = (group.entrada / maxValue) * plotHeight;
            const exitHeight = (group.salida / maxValue) * plotHeight;
            const baseline = PLOT_TOP + plotHeight;
            return (
              <g key={group.id}>
                {group.entrada > 0 && (
                  <rect
                    className="dashboard__chart-bar dashboard__chart-bar--entrada"
                    x={center - BAR_WIDTH - 3}
                    y={baseline - entryHeight}
                    width={BAR_WIDTH}
                    height={entryHeight}
                    rx="3"
                  />
                )}
                {group.salida > 0 && (
                  <rect
                    className="dashboard__chart-bar dashboard__chart-bar--salida"
                    x={center + 3}
                    y={baseline - exitHeight}
                    width={BAR_WIDTH}
                    height={exitHeight}
                    rx="3"
                  />
                )}
                <text
                  className="dashboard__chart-axis-label"
                  x={center}
                  y={CHART_HEIGHT - 12}
                  textAnchor="middle"
                >
                  {group.label}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <p className="dashboard__chart-empty">
          Aún no hay movimientos para mostrar. Cuando registres entradas o
          salidas, las vas a ver acá.
        </p>
      )}
    </section>
  );
}

export default MovementChart;
