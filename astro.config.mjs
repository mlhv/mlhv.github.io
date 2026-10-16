// @ts-check
import { defineConfig, fontProviders } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://mlhv.github.io",
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Silkscreen",
      cssVariable: "--font-silkscreen",
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/Silkscreen-Regular.ttf"],
            weight: "normal",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/Silkscreen-Bold.ttf"],
            weight: "bold",
            style: "normal",
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Atkinson Hyperlegible",
      cssVariable: "--font-atkinson-hyperlegible",
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/AtkinsonHyperlegible-Regular.ttf"],
            weight: "normal",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/AtkinsonHyperlegible-Bold.ttf"],
            weight: "bold",
            style: "normal",
          },
        ],
      },
    },
  ],
});
