export interface TwitterPost {
  text: string;
  username?: string;
  timestamp?: Date;
  clientIP?: string;
}

export interface SpamDetectionResult {
  isSpam: boolean;
  confidence: number;
  reasons: string[];
  action: 'allow' | 'flag' | 'reject';
  aiAnalysis?: AIDetectionResult;
}

export interface SpamRule {
  name: string;
  check: (post: TwitterPost) => boolean;
  severity: number;
  description: string;
}

export interface DetectionConfig {
  spamThreshold: number;
  flagThreshold: number;
  maxTextLength: number;
  minTextLength: number;
  enableIPBlocking: boolean;
  enableAIDetection: boolean;
  geminiApiKey?: string;
}

export interface IPBlocklist {
  blockedIPs: Set<string>;
  blockedRanges: string[];
}

export interface IPValidationResult {
  isBlocked: boolean;
  reason?: string;
  blockedIP?: string;
}

export interface AIDetectionResult {
  isSpam: boolean;
  confidence: number;
  reasoning: string;
  categories: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
}