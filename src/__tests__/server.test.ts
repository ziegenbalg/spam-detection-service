import request from 'supertest';
import { SpamDetectionServer } from '../server';

describe('SpamDetectionServer', () => {
  let server: SpamDetectionServer;
  let app: any;

  beforeAll(() => {
    server = new SpamDetectionServer(0); // Use port 0 for testing
    app = server.getApp();
  });

  describe('Health endpoint', () => {
    test('GET /health should return status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Post validation endpoint', () => {
    test('POST /validate-post should validate normal posts', async () => {
      const post = {
        text: 'This is a normal tweet about my day.',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/validate-post')
        .send(post)
        .expect(200);

      expect(response.body).toHaveProperty('post');
      expect(response.body).toHaveProperty('detection');
      expect(response.body).toHaveProperty('processed_at');
      expect(response.body.detection.action).toBe('allow');
    });

    test('POST /validate-post should detect spam', async () => {
      const post = {
        text: 'FREE MONEY!!! CLICK HERE NOW!!! GUARANTEED RESULTS!!!',
        username: 'spammer'
      };

      const response = await request(app)
        .post('/validate-post')
        .send(post)
        .expect(200);

      expect(response.body.detection.isSpam).toBe(true);
      expect(response.body.detection.action).toMatch(/flag|reject/);
      expect(response.body.detection.reasons.length).toBeGreaterThan(0);
    });

    test('POST /validate-post should handle missing text', async () => {
      const post = {
        username: 'testuser'
      };

      const response = await request(app)
        .post('/validate-post')
        .send(post)
        .expect(200);

      expect(response.body.detection.isSpam).toBe(true);
      expect(response.body.detection.action).toBe('reject');
    });

    test('POST /validate-post should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/validate-post')
        .type('json')
        .send('invalid json');

      // Should return 400 or handle gracefully
      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
      } else {
        // If handled gracefully, should be a validation error
        expect(response.body.detection.action).toBe('reject');
      }
    });
  });

  describe('Configuration endpoints', () => {
    test('GET /config should return current configuration', async () => {
      const response = await request(app)
        .get('/config')
        .expect(200);

      expect(response.body).toHaveProperty('spamThreshold');
      expect(response.body).toHaveProperty('flagThreshold');
      expect(response.body).toHaveProperty('maxTextLength');
      expect(response.body).toHaveProperty('minTextLength');
    });

    test('PUT /config should update configuration', async () => {
      const newConfig = {
        spamThreshold: 15,
        flagThreshold: 8
      };

      const response = await request(app)
        .put('/config')
        .send(newConfig)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.config.spamThreshold).toBe(15);
      expect(response.body.config.flagThreshold).toBe(8);
    });
  });

  describe('Rules endpoint', () => {
    test('GET /rules should return available rules', async () => {
      const response = await request(app)
        .get('/rules')
        .expect(200);

      expect(response.body).toHaveProperty('rules');
      expect(response.body).toHaveProperty('rules_count');
      expect(Array.isArray(response.body.rules)).toBe(true);
    });
  });

  describe('404 handler', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });
  });
});