import { SpamRule, TwitterPost } from './types';

export const spamRules: SpamRule[] = [
  {
    name: 'excessive_caps',
    check: (post: TwitterPost) => {
      const capsRatio = (post.text.match(/[A-Z]/g) || []).length / post.text.length;
      return capsRatio > 0.7 && post.text.length > 10;
    },
    severity: 3,
    description: 'Post contains excessive capital letters'
  },
  {
    name: 'repeated_characters',
    check: (post: TwitterPost) => {
      return /(.)\1{4,}/.test(post.text);
    },
    severity: 2,
    description: 'Post contains repeated characters (5+ in a row)'
  },
  {
    name: 'excessive_emojis',
    check: (post: TwitterPost) => {
      const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
      const emojiCount = (post.text.match(emojiRegex) || []).length;
      return emojiCount > 5 || (emojiCount > 2 && post.text.length < 50);
    },
    severity: 2,
    description: 'Post contains excessive emojis'
  },
  {
    name: 'suspicious_urls',
    check: (post: TwitterPost) => {
      const urlRegex = /https?:\/\/[^\s]+/g;
      const urls = post.text.match(urlRegex) || [];
      return urls.length > 2 || urls.some(url => 
        url.includes('bit.ly') || 
        url.includes('tinyurl') || 
        url.includes('t.co') ||
        url.length > 100
      );
    },
    severity: 5,
    description: 'Post contains suspicious or excessive URLs'
  },
  {
    name: 'spam_keywords',
    check: (post: TwitterPost) => {
      const spamKeywords = [
        'free money', 'click here', 'limited time', 'act now', 'guaranteed',
        'make money fast', 'work from home', 'lose weight fast', 'miracle cure',
        'buy now', 'special offer', 'congratulations you won', 'claim your prize'
      ];
      const text = post.text.toLowerCase();
      return spamKeywords.some(keyword => text.includes(keyword));
    },
    severity: 5,
    description: 'Post contains spam keywords'
  },
  {
    name: 'excessive_mentions',
    check: (post: TwitterPost) => {
      const mentions = (post.text.match(/@\w+/g) || []).length;
      return mentions > 3;
    },
    severity: 3,
    description: 'Post contains excessive mentions'
  },
  {
    name: 'excessive_hashtags',
    check: (post: TwitterPost) => {
      const hashtags = (post.text.match(/#\w+/g) || []).length;
      return hashtags > 5 || (hashtags > 2 && post.text.length < 50);
    },
    severity: 2,
    description: 'Post contains excessive hashtags'
  },
  {
    name: 'profanity_filter',
    check: (post: TwitterPost) => {
      const profanityWords = [
        'fuck', 'shit', 'bitch', 'asshole', 'damn', 'crap'
      ];
      const text = post.text.toLowerCase();
      return profanityWords.some(word => text.includes(word));
    },
    severity: 3,
    description: 'Post contains profanity'
  },
  {
    name: 'too_short',
    check: (post: TwitterPost) => {
      return post.text.trim().length < 3;
    },
    severity: 1,
    description: 'Post is too short to be meaningful'
  },
  {
    name: 'all_numbers',
    check: (post: TwitterPost) => {
      const cleanText = post.text.replace(/[^a-zA-Z0-9]/g, '');
      return cleanText.length > 0 && /^\d+$/.test(cleanText);
    },
    severity: 2,
    description: 'Post contains only numbers'
  }
];