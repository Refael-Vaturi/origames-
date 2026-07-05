// Visual "skin" resolution for Iron Dome World Mode: maps a capital's country
// to a recognizable landmark silhouette (major capitals) or a continent-themed
// generic building palette (everyone else). All shapes are drawn procedurally
// in renderer.ts — no image assets.
import type { Capital, Continent } from './worldCapitals';
import type { City } from './types';

export type LandmarkShape =
  | 'eiffel' | 'bigben' | 'pyramid' | 'colosseum' | 'kremlin'
  | 'tokyoTower' | 'capitol' | 'brandenburg' | 'operahouse'
  | 'forbiddencity' | 'acropolis' | 'redfort' | 'christredeemer'
  | 'burjkhalifa' | 'domeofrock';

export const MAJOR_LANDMARKS: Record<string, LandmarkShape> = {
  France: 'eiffel',
  'United Kingdom': 'bigben',
  Egypt: 'pyramid',
  Italy: 'colosseum',
  Russia: 'kremlin',
  Japan: 'tokyoTower',
  'United States': 'capitol',
  Germany: 'brandenburg',
  Australia: 'operahouse',
  China: 'forbiddencity',
  Greece: 'acropolis',
  India: 'redfort',
  Brazil: 'christredeemer',
  'United Arab Emirates': 'burjkhalifa',
  Israel: 'domeofrock',
};

interface ContinentTheme {
  buildingColors: string[];
  glow: string;
}

export const CONTINENT_THEME: Record<Continent, ContinentTheme> = {
  Africa: { buildingColors: ['#5a3a1a', '#7a5228', '#8a6234', '#6a4420'], glow: '#FFC169' },
  Asia: { buildingColors: ['#5a1a2a', '#7a2438', '#8a2e44', '#6a1e33'], glow: '#FF7F9E' },
  Europe: { buildingColors: ['#1a2a4a', '#243a5e', '#2e4570', '#1e3050'], glow: '#7FB8FF' },
  'North America': { buildingColors: ['#123a3a', '#1a4d4d', '#225858', '#153f3f'], glow: '#6EF0DC' },
  'South America': { buildingColors: ['#3a2410', '#5a3818', '#6a4420', '#4a2c14'], glow: '#FFA35C' },
  Oceania: { buildingColors: ['#0f2f42', '#164256', '#1d4f63', '#123647'], glow: '#6ED4FF' },
};

export interface WorldSkin {
  landmarkShape: LandmarkShape | null;
  buildingColors: string[];
  glow: string;
}

export function getWorldSkin(capital: Capital): WorldSkin {
  const theme = CONTINENT_THEME[capital.continent];
  return {
    landmarkShape: MAJOR_LANDMARKS[capital.country] ?? null,
    buildingColors: theme.buildingColors,
    glow: theme.glow,
  };
}

/** Re-skins freshly generated cities for a World Mode defense: recolors all
 * buildings to the capital's continent palette, and tags the middle city with
 * a landmark silhouette if this country has one. */
export function applyWorldSkin(cities: City[], capital: Capital): City[] {
  const skin = getWorldSkin(capital);
  const heroIndex = Math.floor(cities.length / 2);
  return cities.map((city, i) => {
    const recolored: City = {
      ...city,
      buildings: city.buildings.map((b, j) => ({
        ...b,
        color: skin.buildingColors[j % skin.buildingColors.length],
      })),
    };
    if (i === heroIndex && skin.landmarkShape) {
      recolored.landmarkShape = skin.landmarkShape;
      recolored.landmarkGlow = skin.glow;
    }
    return recolored;
  });
}
