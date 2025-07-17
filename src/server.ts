import express from 'express';
import cors from 'cors';
import { SpamDetector } from './spam-detector';
import { TwitterPost } from './types';
import { IPBlocker } from './ip-blocker';

export class SpamDetectionServer {
  private app: express.Application;
  private spamDetector: SpamDetector;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.spamDetector = new SpamDetector();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // IP blocking middleware
    this.app.use((req, res, next) => {
      const clientIP = this.spamDetector.getIPBlocker().extractClientIP(req);
      if (clientIP) {
        req.clientIP = clientIP;
        const ipValidation = this.spamDetector.getIPBlocker().validateIP(clientIP);
        if (ipValidation.isBlocked) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Your IP address has been blocked',
            reason: ipValidation.reason,
            ip: clientIP
          });
        }
      }
      next();
    });
  }

  private setupRoutes(): void {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    this.app.post('/validate-post', async (req, res) => {
      try {
        const post: TwitterPost = {
          text: req.body.text,
          username: req.body.username,
          timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
          clientIP: req.clientIP
        };

        const result = await this.spamDetector.detectSpam(post);
        
        res.json({
          post: {
            text: post.text,
            username: post.username,
            timestamp: post.timestamp,
            clientIP: post.clientIP
          },
          detection: result,
          processed_at: new Date().toISOString()
        });
      } catch (error) {
        res.status(400).json({
          error: 'Invalid request',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/config', (req, res) => {
      res.json(this.spamDetector.getConfig());
    });

    this.app.put('/config', (req, res) => {
      try {
        this.spamDetector.updateConfig(req.body);
        res.json({
          message: 'Configuration updated successfully',
          config: this.spamDetector.getConfig()
        });
      } catch (error) {
        res.status(400).json({
          error: 'Invalid configuration',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/rules', (req, res) => {
      res.json({
        message: 'Available spam detection rules',
        rules_count: 10,
        rules: [
          'excessive_caps', 'repeated_characters', 'excessive_emojis',
          'suspicious_urls', 'spam_keywords', 'excessive_mentions',
          'excessive_hashtags', 'profanity_filter', 'too_short', 'all_numbers'
        ]
      });
    });

    // IP blocking endpoints
    this.app.get('/blocked-ips', (req, res) => {
      try {
        const blockedIPs = this.spamDetector.getBlockedIPs();
        const blockedRanges = this.spamDetector.getBlockedRanges();
        
        res.json({
          blocked_ips: blockedIPs,
          blocked_ranges: blockedRanges,
          total_blocked_ips: blockedIPs.length,
          total_blocked_ranges: blockedRanges.length
        });
      } catch (error) {
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/blocked-ips', (req, res) => {
      try {
        const { ip, range } = req.body;
        
        if (ip) {
          const success = this.spamDetector.blockIP(ip);
          if (success) {
            res.json({
              message: 'IP address blocked successfully',
              blocked_ip: ip
            });
          } else {
            res.status(400).json({
              error: 'Invalid IP address',
              message: 'The provided IP address is not valid'
            });
          }
        } else if (range) {
          const success = this.spamDetector.blockIPRange(range);
          if (success) {
            res.json({
              message: 'IP range blocked successfully',
              blocked_range: range
            });
          } else {
            res.status(400).json({
              error: 'Invalid IP range',
              message: 'The provided CIDR range is not valid'
            });
          }
        } else {
          res.status(400).json({
            error: 'Missing parameter',
            message: 'Either "ip" or "range" parameter is required'
          });
        }
      } catch (error) {
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.delete('/blocked-ips/:identifier', (req, res) => {
      try {
        const identifier = req.params.identifier;
        const { type } = req.query;
        
        let success = false;
        let message = '';
        
        if (type === 'range') {
          success = this.spamDetector.unblockIPRange(identifier);
          message = success ? 'IP range unblocked successfully' : 'IP range not found in blocklist';
        } else {
          success = this.spamDetector.unblockIP(identifier);
          message = success ? 'IP address unblocked successfully' : 'IP address not found in blocklist';
        }
        
        if (success) {
          res.json({ message, removed: identifier });
        } else {
          res.status(404).json({ error: 'Not found', message });
        }
      } catch (error) {
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // AI detection endpoints
    this.app.get('/ai-status', async (req, res) => {
      try {
        const isConfigured = this.spamDetector.isAIConfigured();
        let connectionStatus = false;
        
        if (isConfigured) {
          connectionStatus = await this.spamDetector.testAIConnection();
        }
        
        res.json({
          ai_enabled: this.spamDetector.getConfig().enableAIDetection,
          ai_configured: isConfigured,
          connection_status: connectionStatus,
          model_info: isConfigured ? this.spamDetector.getGeminiDetector().getConfig() : null
        });
      } catch (error) {
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/ai-test', async (req, res) => {
      try {
        if (!this.spamDetector.isAIConfigured()) {
          return res.status(400).json({
            error: 'AI not configured',
            message: 'Gemini API key is required'
          });
        }

        const { text } = req.body;
        if (!text) {
          return res.status(400).json({
            error: 'Missing text',
            message: 'Text parameter is required'
          });
        }

        const aiResult = await this.spamDetector.getGeminiDetector().analyzeSpam({ text });
        
        res.json({
          ai_analysis: aiResult,
          test_successful: aiResult !== null
        });
      } catch (error) {
        res.status(500).json({
          error: 'AI analysis failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: 'The requested endpoint does not exist'
      });
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`Spam detection server running on port ${this.port}`);
        resolve();
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}