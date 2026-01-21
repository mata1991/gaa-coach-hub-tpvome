
import { EventPreset } from '@/types';

// Sports constants
export const SPORTS = {
  HURLING: 'Hurling',
  CAMOGIE: 'Camogie',
  GAELIC_FOOTBALL: 'Gaelic Football',
  LADIES_GAELIC_FOOTBALL: 'Ladies Gaelic Football',
} as const;

export const SPORT_DISPLAY_NAMES: Record<string, string> = {
  HURLING: 'Hurling',
  CAMOGIE: 'Camogie',
  GAELIC_FOOTBALL: 'Gaelic Football',
  LADIES_GAELIC_FOOTBALL: 'Ladies Gaelic Football',
  // Also handle display names as input
  'Hurling': 'Hurling',
  'Camogie': 'Camogie',
  'Gaelic Football': 'Gaelic Football',
  'Ladies Gaelic Football': 'Ladies Gaelic Football',
};

export function getSportDisplayName(sport: string | undefined): string {
  if (!sport) return '';
  return SPORT_DISPLAY_NAMES[sport] || sport;
}

export const EVENT_PRESETS: EventPreset[] = [
  {
    category: 'Scoring',
    types: [
      { name: 'Goal', requiresOutcome: false },
      { name: 'Point', requiresOutcome: false },
      { name: 'Wide', requiresOutcome: false },
      { name: 'Saved', requiresOutcome: false },
      { name: 'Dropped Short', requiresOutcome: false },
      { name: 'Blocked', requiresOutcome: false },
      { name: 'Free Converted', requiresOutcome: false },
      { name: 'Free Missed', requiresOutcome: false },
    ],
  },
  {
    category: 'Puckouts',
    types: [
      { name: 'Won Clean', requiresOutcome: false },
      { name: 'Broken Won', requiresOutcome: false },
      { name: 'Lost', requiresOutcome: false },
      { 
        name: 'Direction', 
        requiresOutcome: true, 
        outcomes: ['Short', 'Long', 'Left', 'Centre', 'Right'] 
      },
    ],
  },
  {
    category: 'Possession',
    types: [
      { name: 'Turnover Won', requiresOutcome: false },
      { name: 'Turnover Lost', requiresOutcome: false },
      { name: 'Hook', requiresOutcome: false },
      { name: 'Block', requiresOutcome: false },
      { name: 'Tackle', requiresOutcome: false },
      { name: 'Ruck Won', requiresOutcome: false },
      { name: 'Ruck Lost', requiresOutcome: false },
    ],
  },
  {
    category: 'Discipline',
    types: [
      { name: 'Yellow Card', requiresOutcome: false },
      { name: 'Red Card', requiresOutcome: false },
    ],
  },
  {
    category: 'Substitutions',
    types: [
      { name: 'Sub On', requiresOutcome: false },
      { name: 'Sub Off', requiresOutcome: false },
    ],
  },
];

export const PITCH_ZONES = [
  'Defence Left',
  'Defence Centre',
  'Defence Right',
  'Midfield Left',
  'Midfield Centre',
  'Midfield Right',
  'Attack Left',
  'Attack Centre',
  'Attack Right',
];

// GAA Starting 15 Positions (fixed numbering)
export const GAA_POSITIONS = [
  { positionNo: 1, positionName: 'GK' },
  { positionNo: 2, positionName: 'R Corner Back' },
  { positionNo: 3, positionName: 'Full Back' },
  { positionNo: 4, positionName: 'L Corner Back' },
  { positionNo: 5, positionName: 'R Half Back' },
  { positionNo: 6, positionName: 'Centre Back' },
  { positionNo: 7, positionName: 'L Half Back' },
  { positionNo: 8, positionName: 'Midfield' },
  { positionNo: 9, positionName: 'Midfield' },
  { positionNo: 10, positionName: 'R Half Forward' },
  { positionNo: 11, positionName: 'Centre Forward' },
  { positionNo: 12, positionName: 'L Half Forward' },
  { positionNo: 13, positionName: 'R Corner Forward' },
  { positionNo: 14, positionName: 'Full Forward' },
  { positionNo: 15, positionName: 'L Corner Forward' },
];
