import { LucideIcon } from "lucide-react";

export type Color = 'red' | 'blue' | 'yellow' | 'purple' | 'green' | 'orange' | 'white';

export interface Tile {
  id: string;
  color: Color;
  value: number; // Numeric value for accessibility (2, 3, 5, 6, 10, 15, 30+)
  x: number;
  y: number;
  isNew?: boolean;
  isMerged?: boolean;
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export const COLOR_MAP: Record<Color, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
  purple: '#a855f7',
  green: '#22c55e',
  orange: '#f97316',
  white: '#ffffff',
};

// Prime number mapping for accessibility
export const NUMERIC_MAP: Record<Color, number> = {
  red: 2,
  blue: 3,
  yellow: 5,
  purple: 6,
  orange: 10,
  green: 15,
  white: 30,
};

export const MIX_RULES: Record<string, Color> = {
  'red+blue': 'purple',
  'blue+red': 'purple',
  'blue+yellow': 'green',
  'yellow+blue': 'green',
  'yellow+red': 'orange',
  'red+yellow': 'orange',
  // Secondary + Primary = White
  'purple+yellow': 'white',
  'yellow+purple': 'white',
  'green+red': 'white',
  'red+green': 'white',
  'orange+blue': 'white',
  'blue+orange': 'white',
};
