import { IPBlocker } from '../ip-blocker';

describe('IPBlocker', () => {
  let ipBlocker: IPBlocker;

  beforeEach(() => {
    ipBlocker = new IPBlocker();
  });

  describe('IP validation', () => {
    test('should validate IPv4 addresses', () => {
      expect(ipBlocker.addIP('192.168.1.1')).toBe(true);
      expect(ipBlocker.addIP('10.0.0.1')).toBe(true);
      expect(ipBlocker.addIP('255.255.255.255')).toBe(true);
    });

    test('should reject invalid IPv4 addresses', () => {
      expect(ipBlocker.addIP('256.1.1.1')).toBe(false);
      expect(ipBlocker.addIP('192.168.1')).toBe(false);
      expect(ipBlocker.addIP('not.an.ip.address')).toBe(false);
    });

    test('should validate IPv6 addresses', () => {
      expect(ipBlocker.addIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(ipBlocker.addIP('::1')).toBe(true);
      expect(ipBlocker.addIP('::')).toBe(true);
    });

    test('should block and unblock IP addresses', () => {
      const ip = '192.168.1.100';
      
      // Add IP to blocklist
      expect(ipBlocker.addIP(ip)).toBe(true);
      
      // Check if IP is blocked
      const result = ipBlocker.validateIP(ip);
      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe('IP address is in blocklist');
      expect(result.blockedIP).toBe(ip);
      
      // Remove IP from blocklist
      expect(ipBlocker.removeIP(ip)).toBe(true);
      
      // Check if IP is no longer blocked
      const result2 = ipBlocker.validateIP(ip);
      expect(result2.isBlocked).toBe(false);
    });

    test('should handle non-blocked IPs', () => {
      const ip = '192.168.1.200';
      
      const result = ipBlocker.validateIP(ip);
      expect(result.isBlocked).toBe(false);
      expect(result.reason).toBeUndefined();
      expect(result.blockedIP).toBeUndefined();
    });

    test('should handle invalid IPs gracefully', () => {
      const result = ipBlocker.validateIP('invalid-ip');
      expect(result.isBlocked).toBe(false);
    });
  });

  describe('CIDR range blocking', () => {
    test('should validate CIDR ranges', () => {
      expect(ipBlocker.addRange('192.168.1.0/24')).toBe(true);
      expect(ipBlocker.addRange('10.0.0.0/8')).toBe(true);
      expect(ipBlocker.addRange('172.16.0.0/12')).toBe(true);
    });

    test('should reject invalid CIDR ranges', () => {
      expect(ipBlocker.addRange('192.168.1.0/33')).toBe(false);
      expect(ipBlocker.addRange('invalid/range')).toBe(false);
      expect(ipBlocker.addRange('192.168.1.0')).toBe(false);
    });

    test('should block IPs in CIDR ranges', () => {
      ipBlocker.addRange('192.168.1.0/24');
      
      // IPs in range should be blocked
      expect(ipBlocker.validateIP('192.168.1.1').isBlocked).toBe(true);
      expect(ipBlocker.validateIP('192.168.1.100').isBlocked).toBe(true);
      expect(ipBlocker.validateIP('192.168.1.254').isBlocked).toBe(true);
      
      // IPs outside range should not be blocked
      expect(ipBlocker.validateIP('192.168.2.1').isBlocked).toBe(false);
      expect(ipBlocker.validateIP('10.0.0.1').isBlocked).toBe(false);
    });

    test('should remove CIDR ranges', () => {
      const range = '192.168.1.0/24';
      
      ipBlocker.addRange(range);
      expect(ipBlocker.validateIP('192.168.1.1').isBlocked).toBe(true);
      
      expect(ipBlocker.removeRange(range)).toBe(true);
      expect(ipBlocker.validateIP('192.168.1.1').isBlocked).toBe(false);
      
      // Removing non-existent range should return false
      expect(ipBlocker.removeRange(range)).toBe(false);
    });
  });

  describe('Blocklist management', () => {
    test('should get blocked IPs list', () => {
      ipBlocker.addIP('192.168.1.1');
      ipBlocker.addIP('10.0.0.1');
      
      const blockedIPs = ipBlocker.getBlockedIPs();
      expect(blockedIPs).toContain('192.168.1.1');
      expect(blockedIPs).toContain('10.0.0.1');
      expect(blockedIPs).toHaveLength(2);
    });

    test('should get blocked ranges list', () => {
      ipBlocker.addRange('192.168.1.0/24');
      ipBlocker.addRange('10.0.0.0/8');
      
      const blockedRanges = ipBlocker.getBlockedRanges();
      expect(blockedRanges).toContain('192.168.1.0/24');
      expect(blockedRanges).toContain('10.0.0.0/8');
      expect(blockedRanges).toHaveLength(2);
    });

    test('should clear all blocked IPs and ranges', () => {
      ipBlocker.addIP('192.168.1.1');
      ipBlocker.addRange('10.0.0.0/8');
      
      expect(ipBlocker.getBlockedIPs()).toHaveLength(1);
      expect(ipBlocker.getBlockedRanges()).toHaveLength(1);
      
      ipBlocker.clearAll();
      
      expect(ipBlocker.getBlockedIPs()).toHaveLength(0);
      expect(ipBlocker.getBlockedRanges()).toHaveLength(0);
    });
  });

  describe('Client IP extraction', () => {
    test('should extract IP from X-Forwarded-For header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 192.168.1.1'
        }
      };
      
      const ip = ipBlocker.extractClientIP(req);
      expect(ip).toBe('203.0.113.1');
    });

    test('should extract IP from X-Real-IP header', () => {
      const req = {
        headers: {
          'x-real-ip': '203.0.113.2'
        }
      };
      
      const ip = ipBlocker.extractClientIP(req);
      expect(ip).toBe('203.0.113.2');
    });

    test('should extract IP from CF-Connecting-IP header', () => {
      const req = {
        headers: {
          'cf-connecting-ip': '203.0.113.3'
        }
      };
      
      const ip = ipBlocker.extractClientIP(req);
      expect(ip).toBe('203.0.113.3');
    });

    test('should fall back to connection remote address', () => {
      const req = {
        headers: {},
        connection: {
          remoteAddress: '203.0.113.4'
        }
      };
      
      const ip = ipBlocker.extractClientIP(req);
      expect(ip).toBe('203.0.113.4');
    });

    test('should handle missing IP information', () => {
      const req = {
        headers: {}
      };
      
      const ip = ipBlocker.extractClientIP(req);
      expect(ip).toBeNull();
    });
  });
});