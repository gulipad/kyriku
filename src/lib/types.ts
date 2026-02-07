export type Lang = 'en' | 'es';

export interface ParallaxAmount {
  yaw: number;   // Max yaw offset in degrees when mouse at edge
  pitch: number; // Max pitch offset in degrees when mouse at edge
}

export interface SplatConfig {
  title: string;
  date: string;
  splatFile: string;
  description?: string;
  descriptionEs?: string;
  town?: string;
  coordinates?: [number, number]; // [latitude, longitude]
  fov?: number;
  cameraPosition: [number, number, number];
  focusPoint: [number, number, number];
  parallaxAmount?: ParallaxAmount;
  zoomRange?: [number, number]; // [minMultiplier, maxMultiplier] of initial distance
}

export interface Settings {
  fov: number;
  parallaxAmount?: ParallaxAmount;
}

export interface Config {
  splats: SplatConfig[];
  settings: Settings;
}
