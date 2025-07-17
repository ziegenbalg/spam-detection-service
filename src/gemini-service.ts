import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIDetectionResult, GeminiConfig, TwitterPost } from './types';

export class GeminiSpamDetector {
  private genAI: GoogleGenerativeAI | null = null;
  private config: GeminiConfig;

  constructor(apiKey?: string) {
    this.config = {
      apiKey: apiKey || process.env.GEMINI_API_KEY || '',
      model: 'gemini-1.5-flash',
      temperature: 0.1,
      maxOutputTokens: 1000
    };

    if (this.config.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    }
  }

  public isConfigured(): boolean {
    return this.genAI !== null && this.config.apiKey.length > 0;
  }

  public async analyzeSpam(post: TwitterPost): Promise<AIDetectionResult | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const model = this.genAI!.getGenerativeModel({
        model: this.config.model,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxOutputTokens,
        },
      });

      const prompt = this.buildSpamAnalysisPrompt(post.text);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseAIResponse(text);
    } catch (error) {
      console.error('Gemini API error:', error);
      return null;
    }
  }

  private buildSpamAnalysisPrompt(text: string): string {
    return `You are a content moderation expert analyzing social media posts for spam and abuse.

Analyze the following Twitter post for spam, abuse, or inappropriate content:

"${text}"

Please evaluate this post and respond with a JSON object in this exact format:
{
  "isSpam": boolean,
  "confidence": number (0.0 to 1.0),
  "reasoning": "Brief explanation of why this is or isn't spam",
  "categories": ["list of relevant categories like spam, scam, harassment, etc."],
  "severity": "low" | "medium" | "high"
}

Consider these factors:
- Promotional spam (get rich quick, MLM, fake products)
- Scams and fraudulent content
- Excessive self-promotion
- Misleading information
- Harassment or abusive language
- Inappropriate sexual content
- Violence or threats
- Repetitive or bot-like content
- Phishing attempts
- Malware/suspicious links

Respond ONLY with the JSON object, no additional text.`;
  }

  private parseAIResponse(response: string): AIDetectionResult {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and sanitize the response
      return {
        isSpam: Boolean(parsed.isSpam),
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
        reasoning: String(parsed.reasoning || 'No reasoning provided'),
        categories: Array.isArray(parsed.categories) ? parsed.categories.map(String) : [],
        severity: ['low', 'medium', 'high'].includes(parsed.severity) ? parsed.severity : 'low'
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // Return a fallback result
      return {
        isSpam: false,
        confidence: 0,
        reasoning: 'Failed to analyze content with AI',
        categories: ['analysis_error'],
        severity: 'low'
      };
    }
  }

  public updateConfig(newConfig: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    }
  }

  public getConfig(): Omit<GeminiConfig, 'apiKey'> {
    const { apiKey, ...configWithoutKey } = this.config;
    return {
      ...configWithoutKey,
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'not configured'
    } as any;
  }

  public async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const model = this.genAI!.getGenerativeModel({
        model: this.config.model,
      });

      const result = await model.generateContent('Hello, respond with "OK"');
      const response = await result.response;
      const text = response.text();
      
      return text.toLowerCase().includes('ok');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}