
export enum Difficulty {
  SMALL = 'small',   // Hardest (lots of detail)
  MEDIUM = 'medium', // Normal
  LARGE = 'large'    // Easiest (large blocks)
}

export enum Orientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape'
}

export interface ColoringPage {
  imageUrl: string;
  prompt: string;
  difficulty: Difficulty;
  orientation: Orientation;
}
