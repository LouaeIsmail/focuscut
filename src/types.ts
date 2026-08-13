export type Zoom = {
  id: string;
  t: number;
  x: number;
  y: number;
  scale: number;
  hold: number;
};

export type Aspect = "16:9" | "9:16" | "1:1";

export type Look = {
  aspect: Aspect;
  padding: number;
  radius: number;
  background: string;
};

export type Transform = {
  x: number;
  y: number;
  scale: number;
};

export const ASPECTS: Record<Aspect, { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
};

export const BACKGROUNDS: { id: string; label: string; css: string }[] = [
  {
    id: "ember",
    label: "Ember",
    css: "linear-gradient(160deg, #2a120c 0%, #5a2314 45%, #c45a2a 100%)",
  },
  {
    id: "ink",
    label: "Ink",
    css: "#111110",
  },
  {
    id: "paper",
    label: "Paper",
    css: "#e8e4dc",
  },
  {
    id: "tide",
    label: "Tide",
    css: "linear-gradient(160deg, #0c1a22 0%, #163445 50%, #2d6a6a 100%)",
  },
  {
    id: "violet",
    label: "Dusk",
    css: "linear-gradient(160deg, #16101f 0%, #3a2458 55%, #8a4b6e 100%)",
  },
];
