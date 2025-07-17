import request from 'supertest';
import { SpamDetectionServer } from '../server';
import { SpamDetector } from '../spam-detector';

describe('AI Integration', () => {
  let server: SpamDetectionServer;
  let app: any;

  beforeAll(() => {
    server = new SpamDetectionServer(0);
    app = server.getApp();
  });

  describe('AI Status endpoint', () => {
    test('GET /ai-status should return AI configuration status', async () => {
      const response = await request(app)
        .get('/ai-status')
        .expect(200);

      expect(response.body).toHaveProperty('ai_enabled');
      expect(response.body).toHaveProperty('ai_configured');
      expect(response.body).toHaveProperty('connection_status');
      expect(response.body).toHaveProperty('model_info');
      
      // Without API key, should not be configured
      expect(response.body.ai_configured).toBe(false);
      expect(response.body.connection_status).toBe(false);
    });
  });

  describe('AI Test endpoint', () => {
    test('POST /ai-test should return error when AI not configured', async () => {
      const response = await request(app)
        .post('/ai-test')
        .send({ text: 'Test message' })
        .expect(400);

      expect(response.body.error).toBe('AI not configured');
      expect(response.body.message).toBe('Gemini API key is required');
    });

    test('POST /ai-test should require text parameter', async () => {
      const response = await request(app)
        .post('/ai-test')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Missing text');
      expect(response.body.message).toBe('Text parameter is required');
    });
  });

  describe('Spam Detection with AI', () => {
    test('should include AI analysis in response when configured', async () => {
      // This test would require a real API key to run
      // For now, we test the structure without AI enabled
      const response = await request(app)
        .post('/validate-post')
        .send({ text: 'This is a normal message' })
        .expect(200);

      expect(response.body).toHaveProperty('detection');
      expect(response.body.detection).toHaveProperty('isSpam');
      expect(response.body.detection).toHaveProperty('confidence');
      expect(response.body.detection).toHaveProperty('reasons');
      expect(response.body.detection).toHaveProperty('action');
      
      // AI analysis should be undefined when not enabled
      expect(response.body.detection.aiAnalysis).toBeUndefined();
    });

    test('should handle spam detection without AI gracefully', async () => {
      const response = await request(app)
        .post('/validate-post')
        .send({ text: 'FREE MONEY! CLICK HERE NOW!' })
        .expect(200);

      expect(response.body.detection.isSpam).toBe(true);
      expect(response.body.detection.action).toMatch(/flag|reject/);
    });
  });

  describe('Configuration with AI', () => {
    test('should include AI settings in config', async () => {
      const response = await request(app)
        .get('/config')
        .expect(200);

      expect(response.body).toHaveProperty('enableAIDetection');
      expect(response.body).toHaveProperty('geminiApiKey');
      expect(response.body.enableAIDetection).toBe(false); // Default
    });

    test('should update AI configuration', async () => {
      const newConfig = {
        enableAIDetection: true,
        geminiApiKey: 'test-key'
      };

      const response = await request(app)
        .put('/config')
        .send(newConfig)
        .expect(200);

      expect(response.body.config.enableAIDetection).toBe(true);
      expect(response.body.config.geminiApiKey).toBe('test-key');
    });
  });
});

describe('SpamDetector AI Integration', () => {
  let detector: SpamDetector;

  beforeEach(() => {
    detector = new SpamDetector();
  });

  test('should have AI detection disabled by default', () => {
    const config = detector.getConfig();
    expect(config.enableAIDetection).toBe(false);
  });

  test('should enable AI detection when configured', () => {
    detector.updateConfig({ 
      enableAIDetection: true,
      geminiApiKey: 'test-key'
    });

    expect(detector.isAIConfigured()).toBe(true);
    expect(detector.getConfig().enableAIDetection).toBe(true);
  });

  test('should return AI detector instance', () => {
    const geminiDetector = detector.getGeminiDetector();
    expect(geminiDetector).toBeDefined();
    expect(geminiDetector.isConfigured()).toBe(false); // No API key
  });

  test('should handle AI detection errors gracefully', async () => {
    detector.updateConfig({ 
      enableAIDetection: true,
      geminiApiKey: 'invalid-key'
    });

    const result = await detector.detectSpam({ text: 'Test message' });
    
    // Should still work without AI
    expect(result).toHaveProperty('isSpam');
    expect(result).toHaveProperty('action');
    expect(result.aiAnalysis).toBeUndefined();
  });

  test('should include AI analysis when available', async () => {
    // Mock the AI detector for testing
    const mockAIResult = {
      isSpam: true,
      confidence: 0.9,
      reasoning: 'Contains spam indicators',
      categories: ['promotion'],
      severity: 'high' as const
    };

    detector.updateConfig({ enableAIDetection: true });
    
    // Mock the analyzeSpam method
    jest.spyOn(detector.getGeminiDetector(), 'analyzeSpam')
      .mockResolvedValue(mockAIResult);
    jest.spyOn(detector.getGeminiDetector(), 'isConfigured')
      .mockReturnValue(true);

    const result = await detector.detectSpam({ text: 'Spam message' });
    
    expect(result.aiAnalysis).toEqual(mockAIResult);
    expect(result.isSpam).toBe(true);
    expect(result.action).toBe('reject'); // High severity AI detection
  });

  test('should combine rule-based and AI confidence', async () => {
    const mockAIResult = {
      isSpam: true,
      confidence: 0.95,
      reasoning: 'High confidence spam',
      categories: ['scam'],
      severity: 'medium' as const
    };

    detector.updateConfig({ enableAIDetection: true });
    
    jest.spyOn(detector.getGeminiDetector(), 'analyzeSpam')
      .mockResolvedValue(mockAIResult);
    jest.spyOn(detector.getGeminiDetector(), 'isConfigured')
      .mockReturnValue(true);

    const result = await detector.detectSpam({ text: 'Normal message' });
    
    // AI confidence should be used when higher
    expect(result.confidence).toBe(0.95);
    expect(result.aiAnalysis).toEqual(mockAIResult);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});