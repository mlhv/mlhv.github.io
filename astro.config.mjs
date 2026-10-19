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
      name: "Nunito",
      cssVariable: "--font-nunito",
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/Nunito-Variable.ttf"],
            weight: "200 1000",
            style: "normal",
          },
        ],
      },
    },
  ],
});
