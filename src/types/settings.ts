
export interface BrandingColors {
  primary: string;
  secondary: string;
  [key: string]: string; // Add index signature for Json compatibility
}

export interface AIInstruction {
  title: string;
  description: string;
  instructions: string;
}

export type EstimateTemplateStyle = 'modern' | 'classic' | 'minimal' | 'bold' | 'excel';
