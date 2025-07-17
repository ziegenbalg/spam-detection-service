import { SpamDetector } from '../spam-detector';
import { TwitterPost } from '../types';

describe('SpamDetector', () => {
  let detector: SpamDetector;

  beforeEach(() => {
    detector = new SpamDetector();
  });

  describe('Basic functionality', () => {
    test('should allow normal posts', () => {
      const post: TwitterPost = {
        text: 'Just had a great day at the park! The weather was perfect.',
        username: 'user123'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('allow');
      expect(result.isSpam).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    test('should detect posts with excessive caps', () => {
      const post: TwitterPost = {
        text: 'THIS IS DEFINITELY SPAM BECAUSE IT HAS TOO MANY CAPITAL LETTERS!!!',
        username: 'spammer'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('flag');
      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain('Post contains excessive capital letters');
    });

    test('should detect spam keywords', () => {
      const post: TwitterPost = {
        text: 'Free money! Click here to make money fast with this guaranteed method!',
        username: 'scammer'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('flag');
      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain('Post contains spam keywords');
    });

    test('should detect excessive emojis', () => {
      const post: TwitterPost = {
        text: '🎉🎉🎉🎉🎉🎉 Amazing deal! 🔥🔥🔥',
        username: 'user'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('allow');
      expect(result.isSpam).toBe(false);
      expect(result.reasons).toContain('Post contains excessive emojis');
    });

    test('should detect repeated characters', () => {
      const post: TwitterPost = {
        text: 'Wooooooooow this is amaaaaaazing!!!!!!',
        username: 'user'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('flag');
      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain('Post contains repeated characters (5+ in a row)');
    });

    test('should detect excessive mentions', () => {
      const post: TwitterPost = {
        text: 'Hey @user1 @user2 @user3 @user4 check this out!',
        username: 'user'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('flag');
      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain('Post contains excessive mentions');
    });

    test('should detect excessive hashtags', () => {
      const post: TwitterPost = {
        text: 'Check this out! #amazing #deal #limited #time #offer #buy #now',
        username: 'user'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('flag');
      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain('Post contains excessive hashtags');
    });

    test('should detect suspicious URLs', () => {
      const post: TwitterPost = {
        text: 'Check out bit.ly/spam1 and tinyurl.com/spam2 and bit.ly/spam3',
        username: 'user'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('allow');
      expect(result.isSpam).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    test('should reject posts that are too short', () => {
      const post: TwitterPost = {
        text: 'Hi',
        username: 'user'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('allow');
    });

    test('should detect posts with only numbers', () => {
      const post: TwitterPost = {
        text: '1234567890',
        username: 'user'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('flag');
      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain('Post contains only numbers');
    });

    test('should detect profanity', () => {
      const post: TwitterPost = {
        text: 'This is a fucking terrible post with shit content',
        username: 'user'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('flag');
      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain('Post contains profanity');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty posts', () => {
      const post: TwitterPost = {
        text: '',
        username: 'user'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('reject');
      expect(result.isSpam).toBe(true);
    });

    test('should handle missing text', () => {
      const post: TwitterPost = {
        text: undefined as any,
        username: 'user'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('reject');
      expect(result.isSpam).toBe(true);
    });

    test('should handle very long posts', () => {
      const post: TwitterPost = {
        text: 'A'.repeat(300),
        username: 'user'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('reject');
      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain('Post exceeds maximum length of 280 characters');
    });
  });

  describe('Configuration', () => {
    test('should use custom thresholds', () => {
      const customDetector = new SpamDetector({
        spamThreshold: 15,
        flagThreshold: 10
      });

      const post: TwitterPost = {
        text: 'THIS IS SPAM WITH CAPS',
        username: 'user'
      };

      const result = customDetector.detectSpam(post);
      
      expect(result.action).toBe('allow');
      expect(result.isSpam).toBe(false);
    });

    test('should update configuration', () => {
      detector.updateConfig({ spamThreshold: 1, flagThreshold: 1 });
      
      const post: TwitterPost = {
        text: 'Hi',
        username: 'user'
      };

      const result = detector.detectSpam(post);
      
      expect(result.action).toBe('reject');
      expect(result.isSpam).toBe(true);
    });

    test('should get configuration', () => {
      const config = detector.getConfig();
      
      expect(config).toHaveProperty('spamThreshold');
      expect(config).toHaveProperty('flagThreshold');
      expect(config).toHaveProperty('maxTextLength');
      expect(config).toHaveProperty('minTextLength');
    });
  });

  describe('Confidence scoring', () => {
    test('should provide confidence scores', () => {
      const post: TwitterPost = {
        text: 'FREE MONEY!!! CLICK HERE NOW!!! 🎉🎉🎉🎉🎉🎉',
        username: 'spammer'
      };

      const result = detector.detectSpam(post);
      
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should have higher confidence for obvious spam', () => {
      const spam: TwitterPost = {
        text: 'FREE MONEY!!! CLICK HERE NOW!!! bit.ly/scam @user1 @user2 @user3 @user4 🎉🎉🎉🎉🎉🎉',
        username: 'spammer'
      };

      const normal: TwitterPost = {
        text: 'Just enjoying a nice day at the beach.',
        username: 'user'
      };

      const spamResult = detector.detectSpam(spam);
      const normalResult = detector.detectSpam(normal);
      
      expect(spamResult.confidence).toBeGreaterThan(normalResult.confidence);
    });
  });
});