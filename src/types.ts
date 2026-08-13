export type Zoom = {
  id: string;
  t: number;
  x: number;
  y: number;
  scale: number;
  hold: number;
};

export type Click = {
  t: number;
  x: number;
  y: number;
};

export type Aspect = "16:9" | "9:16" | "1:1" | "source";
export type FitMode = "contain" | "cover";
export type Quality = "1080" | "1440" | "2160";

export type BgPreset = {
  id: string;
  label: string;
  colors: string[];
};

export type Look = {
  aspect: Aspect;
  padding: number;
  radius: number;
  backgroundId: string;
  customColor: string;
  bgImage: string | null;
  shadow: boolean;
  fit: FitMode;
  border: number;
  ease: number;
  quality: Quality;
};

export type Transform = {
  x: number;
  y: number;
  scale: number;
};

export const BACKGROUNDS: BgPreset[] = [
  { id: "ember", label: "Ember", colors: ["#2a120c", "#5a2314", "#c45a2a"] },
  { id: "ink", label: "Ink", colors: ["#111110"] },
  { id: "paper", label: "Paper", colors: ["#e8e4dc"] },
  { id: "tide", label: "Tide", colors: ["#0c1a22", "#163445", "#2d6a6a"] },
  { id: "dusk", label: "Dusk", colors: ["#16101f", "#3a2458", "#8a4b6e"] },
  { id: "mint", label: "Mint", colors: ["#0d1f1a", "#1b4d3e", "#5ec4a8"] },
  { id: "gold", label: "Gold", colors: ["#1a1408", "#5a4218", "#e0b44a"] },
  { id: "ice", label: "Ice", colors: ["#0e141c", "#2a3f55", "#8fb4d4"] },
  { id: "rose", label: "Rose", colors: ["#1c1014", "#6a3044", "#e89aaa"] },
  { id: "forest", label: "Forest", colors: ["#0c140e", "#1e3a24", "#6a9a52"] },
  { id: "carbon", label: "Carbon", colors: ["#1a1a1a"] },
  { id: "white", label: "White", colors: ["#f6f6f4"] },
  { id: "blue", label: "Blue", colors: ["#0a1628", "#123a6b", "#3d8bfd"] },
  { id: "sunset", label: "Sunset", colors: ["#1a0a08", "#8a2c18", "#f0a050"] },
];

export const DEFAULT_LOOK: Look = {
  aspect: "16:9",
  padding: 0,
  radius: 0,
  backgroundId: "ink",
  customColor: "#111110",
  bgImage: null,
  shadow: false,
  fit: "contain",
  border: 0,
  ease: 0.45,
  quality: "1080",
};
