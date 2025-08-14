import { StoredRange } from './range';

export interface ChartButton {
  id: string;
  name: string;
  nameLine2?: string; // New: Second line of text
  nameLine3?: string; // New: Third line of text
  showNameLine2?: boolean; // New: Flag to show second line
  showNameLine3?: boolean; // New: Flag to show third line
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fontColor?: string;
  fontSize?: number;
  isFontAdaptive?: boolean;
  type: 'button' | 'label' | 'exit';
  linkedItem?: string; // rangeId for 'button' type

  // New properties for text alignment and wrapping
  textAlign?: 'left' | 'center' | 'right';
  textWrap?: boolean;

  // Legend/Display options that are specific to the button's context
  showRandomizer?: boolean;
  showLegend?: boolean;
  legendIsMultiLine?: boolean;
  legendOverrides?: Record<string, string>;
  linkButtons?: {
    enabled: boolean;
    text: string;
    position: 'left' | 'center' | 'right';
    targetRangeId: string;
  }[];

  // Title properties have been moved to the Range/StoredRange interface
}

export interface StoredChart {
  id: string;
  name: string;
  buttons: ChartButton[];
  canvasWidth: number;
  canvasHeight: number;
}
