import { GeminiSpamDetector } from '../gemini-service';

describe('GeminiSpamDetector', () => {
  let geminiDetector: GeminiSpamDetector;

  beforeEach(() => {
    geminiDetector = new GeminiSpamDetector();
  });

  describe('Configuration', () => {
    test('should not be configured without API key', () => {
      expect(geminiDetector.isConfigured()).toBe(false);
    });

    test('should be configured with API key', () => {
      const detectorWithKey = new GeminiSpamDetector('test-api-key');
      expect(detectorWithKey.isConfigured()).toBe(true);
    });

    test('should return config without exposing full API key', () => {
      const detectorWithKey = new GeminiSpamDetector('test-api-key-1234567890');
      const config = detectorWithKey.getConfig();
      
      expect(config).toHaveProperty('model');
      expect(config).toHaveProperty('temperature');
      expect(config).toHaveProperty('maxOutputTokens');
      expect(config.apiKey).toMatch(/test-api/);
      expect(config.apiKey).toContain('...');
    });

    test('should update configuration', () => {
      geminiDetector.updateConfig({
        model: 'gemini-pro',
        temperature: 0.5,
        maxOutputTokens: 500
      });

      const config = geminiDetector.getConfig();
      expect(config.model).toBe('gemini-pro');
      expect(config.temperature).toBe(0.5);
      expect(config.maxOutputTokens).toBe(500);
    });
  });

  describe('Spam Analysis', () => {
    test('should return null when not configured', async () => {
      const result = await geminiDetector.analyzeSpam({ text: 'Test message' });
      expect(result).toBeNull();
    });

    test('should handle API errors gracefully', async () => {
      const detectorWithBadKey = new GeminiSpamDetector('invalid-key');
      const result = await detectorWithBadKey.analyzeSpam({ text: 'Test message' });
      
      // Should return null or a fallback result, not throw
      expect(result).toBeNull();
    });

    test('should parse valid AI response correctly', () => {
      const mockResponse = `{
        "isSpam": true,
        "confidence": 0.9,
        "reasoning": "Contains promotional content",
        "categories": ["promotion", "spam"],
        "severity": "high"
      }`;

      // Access private method for testing
      const result = (geminiDetector as any).parseAIResponse(mockResponse);
      
      expect(result.isSpam).toBe(true);
      expect(result.confidence).toBe(0.9);
      expect(result.reasoning).toBe('Contains promotional content');
      expect(result.categories).toEqual(['promotion', 'spam']);
      expect(result.severity).toBe('high');
    });

    test('should handle malformed AI response', () => {
      const malformedResponse = 'This is not valid JSON';
      
      const result = (geminiDetector as any).parseAIResponse(malformedResponse);
      
      expect(result.isSpam).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reasoning).toBe('Failed to analyze content with AI');
      expect(result.categories).toEqual(['analysis_error']);
      expect(result.severity).toBe('low');
    });

    test('should sanitize AI response values', () => {
      const unsafeResponse = `{
        "isSpam": "true",
        "confidence": "1.5",
        "reasoning": null,
        "categories": "not-an-array",
        "severity": "invalid"
      }`;

      const result = (geminiDetector as any).parseAIResponse(unsafeResponse);
      
      expect(result.isSpam).toBe(true);
      expect(result.confidence).toBe(1); // Clamped to max 1
      expect(result.reasoning).toBe('null'); // Converted to string
      expect(result.categories).toEqual([]); // Converted to empty array
      expect(result.severity).toBe('low'); // Fallback for invalid value
    });

    test('should build proper spam analysis prompt', () => {
      const text = 'Buy now! Limited time offer!';
      const prompt = (geminiDetector as any).buildSpamAnalysisPrompt(text);
      
      expect(prompt).toContain(text);
      expect(prompt).toContain('JSON object');
      expect(prompt).toContain('isSpam');
      expect(prompt).toContain('confidence');
      expect(prompt).toContain('reasoning');
      expect(prompt).toContain('categories');
      expect(prompt).toContain('severity');
    });
  });

  describe('Connection Testing', () => {
    test('should fail connection test when not configured', async () => {
      const result = await geminiDetector.testConnection();
      expect(result).toBe(false);
    });

    test('should handle connection test errors', async () => {
      const detectorWithBadKey = new GeminiSpamDetector('invalid-key');
      const result = await detectorWithBadKey.testConnection();
      expect(result).toBe(false);
    });
  });
});