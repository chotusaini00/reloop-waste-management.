export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      bg: "#F7F9F6", brand: "#176B4D", dark: "#104B38", mint: "#DDF4E7",
      ink: "#172B23", muted: "#69776F", line: "#E3EAE5", ok: "#198754", warn: "#D99A25", err: "#D64545",
      kraft: "#EDE6D6", kraftdark: "#DCD2BA", charcoal: "#14201A",
      mat: { plastic: "#2E6FAD", paper: "#A9824C", metal: "#5B6670", glass: "#1E8E82", ewaste: "#5B4E9E", organic: "#7A8F3A" },
    },
    fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], display: ["Archivo", "Inter", "system-ui", "sans-serif"] },
  } },
};
