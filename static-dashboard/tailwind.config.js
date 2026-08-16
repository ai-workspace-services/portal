import portalTailwindConfig from "../tailwind.config.js"

export default {
  ...portalTailwindConfig,
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
}
