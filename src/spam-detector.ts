import { TwitterPost, SpamDetectionResult, DetectionConfig, IPValidationResult, AIDetectionResult } from './types';
import { spamRules } from './spam-rules';
import { IPBlocker } from './ip-blocker';
import { GeminiSpamDetector } from './gemini-service';

export class SpamDetector {
  private config: DetectionConfig;
  private ipBlocker: IPBlocker;
  private geminiDetector: GeminiSpamDetector;

  constructor(config?: Partial<DetectionConfig>) {
    this.config = {
      spamThreshold: 6,
      flagThreshold: 3,
      maxTextLength: 280,
      minTextLength: 1,
      enableIPBlocking: true,
      enableAIDetection: false,
      geminiApiKey: process.env.GEMINI_API_KEY,
      ...config
    };
    this.ipBlocker = new IPBlocker();
    this.geminiDetector = new GeminiSpamDetector(this.config.geminiApiKey);
  }

  public async detectSpam(post: TwitterPost): Promise<SpamDetectionResult> {
    // Check IP blocking first if enabled
    if (this.config.enableIPBlocking && post.clientIP) {
      const ipValidation = this.ipBlocker.validateIP(post.clientIP);
      if (ipValidation.isBlocked) {
        return {
          isSpam: true,
          confidence: 1.0,
          reasons: [ipValidation.reason || 'IP address is blocked'],
          action: 'reject'
        };
      }
    }

    const validationResult = this.validatePost(post);
    if (!validationResult.isValid) {
      return {
        isSpam: true,
        confidence: 1.0,
        reasons: validationResult.reasons,
        action: 'reject'
      };
    }

    const triggeredRules = spamRules.filter(rule => rule.check(post));
    const totalSeverity = triggeredRules.reduce((sum, rule) => sum + rule.severity, 0);
    const reasons = triggeredRules.map(rule => rule.description);
    
    // Perform AI analysis if enabled
    let aiAnalysis: AIDetectionResult | undefined;
    if (this.config.enableAIDetection && this.geminiDetector.isConfigured()) {
      try {
        const aiResult = await this.geminiDetector.analyzeSpam(post);
        if (aiResult) {
          aiAnalysis = aiResult;
          
          // If AI detects high-confidence spam, add to severity
          if (aiResult.isSpam && aiResult.confidence > 0.7) {
            const aiSeverity = aiResult.severity === 'high' ? 6 : 
                              aiResult.severity === 'medium' ? 4 : 2;
            reasons.push(`AI detected spam: ${aiResult.reasoning}`);
            // Note: We don't add to totalSeverity to keep rule-based scoring separate
          }
        }
      } catch (error) {
        console.error('AI analysis failed:', error);
      }
    }
    
    const maxPossibleSeverity = Math.max(...spamRules.map(rule => rule.severity)) * spamRules.length;
    let confidence = Math.min(totalSeverity / this.config.spamThreshold, 1.0);
    
    // Combine AI confidence with rule-based confidence
    if (aiAnalysis && aiAnalysis.isSpam) {
      confidence = Math.max(confidence, aiAnalysis.confidence);
    }

    let action: 'allow' | 'flag' | 'reject';
    let isSpam = totalSeverity >= this.config.flagThreshold;
    
    // AI can override for high-confidence detections
    if (aiAnalysis && aiAnalysis.isSpam && aiAnalysis.confidence > 0.8) {
      isSpam = true;
      if (aiAnalysis.severity === 'high') {
        action = 'reject';
      } else {
        action = totalSeverity >= this.config.spamThreshold ? 'reject' : 'flag';
      }
    } else {
      if (totalSeverity >= this.config.spamThreshold) {
        action = 'reject';
      } else if (totalSeverity >= this.config.flagThreshold) {
        action = 'flag';
      } else {
        action = 'allow';
      }
    }

    return {
      isSpam,
      confidence,
      reasons,
      action,
      aiAnalysis
    };
  }

  private validatePost(post: TwitterPost): { isValid: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (!post.text || typeof post.text !== 'string') {
      reasons.push('Post text is required and must be a string');
    } else {
      if (post.text.length > this.config.maxTextLength) {
        reasons.push(`Post exceeds maximum length of ${this.config.maxTextLength} characters`);
      }
      if (post.text.trim().length < this.config.minTextLength) {
        reasons.push(`Post is below minimum length of ${this.config.minTextLength} characters`);
      }
    }

    return {
      isValid: reasons.length === 0,
      reasons
    };
  }

  public updateConfig(newConfig: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update Gemini API key if provided
    if (newConfig.geminiApiKey) {
      this.geminiDetector = new GeminiSpamDetector(newConfig.geminiApiKey);
    }
  }

  public getConfig(): DetectionConfig {
    return { ...this.config };
  }

  public getIPBlocker(): IPBlocker {
    return this.ipBlocker;
  }

  public blockIP(ip: string): boolean {
    return this.ipBlocker.addIP(ip);
  }

  public unblockIP(ip: string): boolean {
    return this.ipBlocker.removeIP(ip);
  }

  public blockIPRange(cidr: string): boolean {
    return this.ipBlocker.addRange(cidr);
  }

  public unblockIPRange(cidr: string): boolean {
    return this.ipBlocker.removeRange(cidr);
  }

  public getBlockedIPs(): string[] {
    return this.ipBlocker.getBlockedIPs();
  }

  public getBlockedRanges(): string[] {
    return this.ipBlocker.getBlockedRanges();
  }

  public getGeminiDetector(): GeminiSpamDetector {
    return this.geminiDetector;
  }

  public async testAIConnection(): Promise<boolean> {
    return this.geminiDetector.testConnection();
  }

  public isAIConfigured(): boolean {
    return this.geminiDetector.isConfigured();
  }
}