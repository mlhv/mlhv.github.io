// @ts-check
import { defineConfig, fontProviders } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://mlhv.github.io",
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Fredoka",
      cssVariable: "--font-fredoka",
      options: {
        variants: [
          {
            // Variable font: one file covers every weight in the range.
            src: ["./src/assets/fonts/Fredoka-Variable.ttf"],
            weight: "300 700",
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
