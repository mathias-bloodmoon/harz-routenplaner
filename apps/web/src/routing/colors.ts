/** Line colours of the alternatives (contrast ≥ 3:1 against the topo map and white). */
export const ROUTE_COLORS = ["#c2185b", "#1565c0", "#6a1b9a"] as const;

export function routeColor(index: number): string {
  return ROUTE_COLORS[index % ROUTE_COLORS.length]!;
}
