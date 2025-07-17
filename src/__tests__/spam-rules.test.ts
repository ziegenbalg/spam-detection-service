import { spamRules } from '../spam-rules';
import { TwitterPost } from '../types';

describe('Spam Rules', () => {
  test('all rules should have required properties', () => {
    spamRules.forEach(rule => {
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('check');
      expect(rule).toHaveProperty('severity');
      expect(rule).toHaveProperty('description');
      expect(typeof rule.name).toBe('string');
      expect(typeof rule.check).toBe('function');
      expect(typeof rule.severity).toBe('number');
      expect(typeof rule.description).toBe('string');
      expect(rule.severity).toBeGreaterThan(0);
    });
  });

  describe('Individual rule tests', () => {
    test('excessive_caps rule', () => {
      const rule = spamRules.find(r => r.name === 'excessive_caps')!;
      
      const spamPost: TwitterPost = { text: 'THIS IS ALL CAPS AND VERY LONG TEXT' };
      const normalPost: TwitterPost = { text: 'This is normal text with Some caps' };
      const shortCapsPost: TwitterPost = { text: 'HI' };

      expect(rule.check(spamPost)).toBe(true);
      expect(rule.check(normalPost)).toBe(false);
      expect(rule.check(shortCapsPost)).toBe(false);
    });

    test('repeated_characters rule', () => {
      const rule = spamRules.find(r => r.name === 'repeated_characters')!;
      
      const spamPost: TwitterPost = { text: 'Wooooooow this is amazing!' };
      const normalPost: TwitterPost = { text: 'Wow this is cool!' };

      expect(rule.check(spamPost)).toBe(true);
      expect(rule.check(normalPost)).toBe(false);
    });

    test('excessive_emojis rule', () => {
      const rule = spamRules.find(r => r.name === 'excessive_emojis')!;
      
      const spamPost1: TwitterPost = { text: '🎉🎉🎉🎉🎉🎉 Party time!' };
      const spamPost2: TwitterPost = { text: '🎉🎉🎉 Short' };
      const normalPost: TwitterPost = { text: 'Having fun 🎉 today!' };

      expect(rule.check(spamPost1)).toBe(true);
      expect(rule.check(spamPost2)).toBe(true);
      expect(rule.check(normalPost)).toBe(false);
    });

    test('suspicious_urls rule', () => {
      const rule = spamRules.find(r => r.name === 'suspicious_urls')!;
      
      const spamPost1: TwitterPost = { text: 'Check out http://bit.ly/spam http://tinyurl.com/bad http://example.com' };
      const spamPost2: TwitterPost = { text: 'Visit http://bit.ly/suspicious' };
      const normalPost: TwitterPost = { text: 'Check out https://twitter.com' };

      expect(rule.check(spamPost1)).toBe(true);
      expect(rule.check(spamPost2)).toBe(true);
      expect(rule.check(normalPost)).toBe(false);
    });

    test('spam_keywords rule', () => {
      const rule = spamRules.find(r => r.name === 'spam_keywords')!;
      
      const spamPost: TwitterPost = { text: 'Free money for everyone! Click here now!' };
      const normalPost: TwitterPost = { text: 'Just got my free coffee today.' };

      expect(rule.check(spamPost)).toBe(true);
      expect(rule.check(normalPost)).toBe(false);
    });

    test('excessive_mentions rule', () => {
      const rule = spamRules.find(r => r.name === 'excessive_mentions')!;
      
      const spamPost: TwitterPost = { text: 'Hey @user1 @user2 @user3 @user4 check this!' };
      const normalPost: TwitterPost = { text: 'Thanks @user1 and @user2!' };

      expect(rule.check(spamPost)).toBe(true);
      expect(rule.check(normalPost)).toBe(false);
    });

    test('excessive_hashtags rule', () => {
      const rule = spamRules.find(r => r.name === 'excessive_hashtags')!;
      
      const spamPost1: TwitterPost = { text: 'Check #this #amazing #deal #now #limited #time #offer' };
      const spamPost2: TwitterPost = { text: '#deal #now #buy' };
      const normalPost: TwitterPost = { text: 'Great day at the #beach #vacation' };

      expect(rule.check(spamPost1)).toBe(true);
      expect(rule.check(spamPost2)).toBe(true);
      expect(rule.check(normalPost)).toBe(false);
    });

    test('profanity_filter rule', () => {
      const rule = spamRules.find(r => r.name === 'profanity_filter')!;
      
      const profanePost: TwitterPost = { text: 'This is fucking terrible shit' };
      const normalPost: TwitterPost = { text: 'This is really bad content' };

      expect(rule.check(profanePost)).toBe(true);
      expect(rule.check(normalPost)).toBe(false);
    });

    test('too_short rule', () => {
      const rule = spamRules.find(r => r.name === 'too_short')!;
      
      const shortPost: TwitterPost = { text: 'Hi' };
      const normalPost: TwitterPost = { text: 'Hello everyone!' };

      expect(rule.check(shortPost)).toBe(true);
      expect(rule.check(normalPost)).toBe(false);
    });

    test('all_numbers rule', () => {
      const rule = spamRules.find(r => r.name === 'all_numbers')!;
      
      const numbersPost: TwitterPost = { text: '1234567890' };
      const normalPost: TwitterPost = { text: 'Call me at 123-456-7890' };

      expect(rule.check(numbersPost)).toBe(true);
      expect(rule.check(normalPost)).toBe(false);
    });
  });
});