/** Formatea pesos argentinos: 12500 -> "$ 12.500" */
export const fmt = (n: number): string =>
  "$ " + Math.round(n).toLocaleString("es-AR");
