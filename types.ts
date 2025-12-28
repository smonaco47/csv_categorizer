
export interface CSVRow {
  [key: string]: string;
}

export interface CategorizedItem {
  originalText: string;
  category: string;
  confidence: number;
  reason: string;
}

export interface CategorizationOptions {
  maxCategories?: number;
  predefinedCategories?: string[];
}

export interface CategoryStats {
  name: string;
  count: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING_FILE = 'LOADING_FILE',
  FILE_LOADED = 'FILE_LOADED',
  CATEGORIZING = 'CATEGORIZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
