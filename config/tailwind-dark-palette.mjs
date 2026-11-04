import plugin from "tailwindcss/plugin.js";

// Keep the existing utilities in light mode. These role-based overrides only
// apply inside the class controlled by the site's theme preference.
export default plugin(({ addUtilities, e, theme }) => {
  const neutralFamilies = ["slate", "gray", "zinc", "neutral", "stone"];
  const semanticFamilies = {
    blue: "primary",
    sky: "info",
    indigo: "info",
    violet: "info",
    purple: "info",
    cyan: "info",
    pink: "danger",
    fuchsia: "info",
    green: "success",
    lime: "success",
    emerald: "success",
    teal: "success",
    red: "danger",
    rose: "danger",
    orange: "warning",
    amber: "warning",
    yellow: "warning",
  };
  const neutrals = (shades) =>
    Object.fromEntries(
      neutralFamilies.flatMap((family) =>
        Object.entries(shades).map(([shade, role]) => [
          `${family}-${shade}`,
          role,
        ]),
      ),
    );
  const semantics = (shades, suffix = "") =>
    Object.fromEntries(
      Object.entries(semanticFamilies).flatMap(([family, role]) =>
        shades.map((shade) => [`${family}-${shade}`, role + suffix]),
      ),
    );
  const surfaces = {
    white: "surface",
    "brand-surface": "surface-muted",
    ...neutrals({
      50: "surface-muted",
      100: "surface-hover",
      200: "surface-border",
    }),
    ...semantics([50, 100, 200], "-muted"),
    ...Object.fromEntries(
      Object.entries(semanticFamilies).flatMap(([family, role]) =>
        [500, 600, 700].map((shade) => [
          family + "-" + shade,
          role === "primary" ? "action" : role + "-fill",
        ]),
      ),
    ),
    primary: "action",
    "primary-hover": "action-hover",
    "primary-muted": "primary-muted",
    surface: "surface",
    "surface-muted": "surface-muted",
    "surface-hover": "surface-hover",
    ...Object.fromEntries(
      ["success", "warning", "danger", "info"].flatMap((role) => [
        [role, role],
        [role + "-muted", role + "-muted"],
      ]),
    ),
  };
  const text = {
    black: "heading",
    brand: "primary",
    "brand-light": "primary-hover",
    "brand-dark": "primary",
    "brand-navy": "heading",
    "brand-heading": "text-muted",
    ...neutrals({
      400: "text-subtle",
      500: "text-subtle",
      600: "text-muted",
      700: "text-muted",
      800: "text",
      900: "heading",
      950: "heading",
    }),
    ...semantics([400, 500, 600, 700, 800, 900, 950]),
    primary: "primary",
    "primary-hover": "primary-hover",
    text: "text",
    "text-muted": "text-muted",
    "text-subtle": "text-subtle",
    ...Object.fromEntries(
      ["success", "warning", "danger", "info"].flatMap((role) => [
        [role, role],
        [role + "-foreground", role + "-foreground"],
      ]),
    ),
  };
  const borders = {
    black: "surface-border-strong",
    "brand-border": "surface-border",
    ...neutrals({
      100: "surface-border",
      200: "surface-border",
      300: "surface-border-strong",
      900: "surface-border-strong",
    }),
    ...semantics([100, 200, 300], "-muted"),
    primary: "primary",
    "surface-border": "surface-border",
    ...Object.fromEntries(
      ["success", "warning", "danger"].map((role) => [role, role]),
    ),
  };
  const opacity = {
    ...theme("opacity"),
    8: ".08",
    12: ".12",
    15: ".15",
    35: ".35",
    65: ".65",
    82: ".82",
    84: ".84",
    85: ".85",
    88: ".88",
    92: ".92",
    94: ".94",
    96: ".96",
    98: ".98",
  };
  const utilities = {};
  const color = (role, alpha) =>
    `color-mix(in srgb, var(--color-${role}) ${Number(alpha) * 100}%, transparent)`;
  const add = (prefix, roles, declaration, suffix = "") => {
    for (const [name, role] of Object.entries(roles)) {
      for (const [modifier, alpha] of [
        ["", "1"],
        ...Object.entries(opacity).map(([key, value]) => ["/" + key, value]),
      ]) {
        const selector = `:where([data-theme="dark"]) .${e(prefix + "-" + name + modifier)}${suffix}`;
        utilities[selector] = declaration(color(role, alpha));
      }
    }
  };
  add("bg", surfaces, (value) => ({ backgroundColor: value }));
  add("text", text, (value) => ({ color: value }));
  add("placeholder", text, (value) => ({ color: value }), "::placeholder");
  add("border", borders, (value) => ({ borderColor: value }));
  add(
    "divide",
    borders,
    (value) => ({ borderColor: value }),
    " > :not([hidden]) ~ :not([hidden])",
  );
  add("ring", { primary: "ring" }, (value) => ({ "--tw-ring-color": value }));
  add("from", surfaces, (value) => ({
    "--tw-gradient-from": `${value} var(--tw-gradient-from-position)`,
    "--tw-gradient-to": "transparent var(--tw-gradient-to-position)",
    "--tw-gradient-stops": "var(--tw-gradient-from), var(--tw-gradient-to)",
  }));
  add("via", surfaces, (value) => ({
    "--tw-gradient-stops": `var(--tw-gradient-from), ${value} var(--tw-gradient-via-position), var(--tw-gradient-to)`,
  }));
  add("to", surfaces, (value) => ({
    "--tw-gradient-to": `${value} var(--tw-gradient-to-position)`,
  }));
  addUtilities(utilities);
});
