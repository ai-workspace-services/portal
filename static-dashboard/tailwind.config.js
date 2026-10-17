import portalTailwindConfig from "../tailwind.config.js";

const staticDashboardTailwindConfig = {
  ...portalTailwindConfig,
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default staticDashboardTailwindConfig;
