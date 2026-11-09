import type { DashboardChart } from "@/lib/dashboard-data";

/** True when a dashboard chart has at least one non-zero point. Shared by server and client components. */
export function hasChartData(chart: DashboardChart): boolean {
  if (chart.kind === "line") {
    return chart.data.some((point) =>
      chart.series.some((series) => Number(point[series.key] ?? 0) > 0),
    );
  }
  return chart.data.some((point) => point.value > 0);
}
