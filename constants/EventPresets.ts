
import { EventPreset } from '@/types';

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
