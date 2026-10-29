// Material -> color coding used consistently across listing cards, badges and filters.
export const MAT_COLOR: Record<string, string> = {
  Plastic: "#2E6FAD", Paper: "#A9824C", Metal: "#5B6670", Glass: "#1E8E82", "Electronic waste": "#5B4E9E", "Organic waste": "#7A8F3A",
};
export const matColor = (m: string) => MAT_COLOR[m] ?? "#69776F";
