import { Nunito_Sans, Kantumruy_Pro, Taprom, Roboto } from "next/font/google";

export const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const kantumruyPro = Kantumruy_Pro({
  subsets: ["khmer"],
  display: "swap",
  weight: ["200", "300", "400", "500", "600", "700"],
});

export const taprom = Taprom({
  subsets: ["khmer"],
  display: "swap",
  weight: ["400"],
});

export const roboto = Roboto({
  subsets: ["latin"],
  display: "swap",
  weight: ["100", "300", "400", "500", "700", "900"],
});

// Add any other fonts you need here
