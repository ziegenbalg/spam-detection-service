import { IPBlocklist, IPValidationResult } from './types';

export class IPBlocker {
  private blocklist: IPBlocklist;

  constructor() {
    this.blocklist = {
      blockedIPs: new Set(),
      blockedRanges: []
    };
  }

  public validateIP(ip: string): IPValidationResult {
    if (!ip || !this.isValidIP(ip)) {
      return { isBlocked: false };
    }

    // Check exact IP matches
    if (this.blocklist.blockedIPs.has(ip)) {
      return {
        isBlocked: true,
        reason: 'IP address is in blocklist',
        blockedIP: ip
      };
    }

    // Check CIDR ranges
    for (const range of this.blocklist.blockedRanges) {
      if (this.isIPInRange(ip, range)) {
        return {
          isBlocked: true,
          reason: `IP address is in blocked range: ${range}`,
          blockedIP: ip
        };
      }
    }

    return { isBlocked: false };
  }

  public addIP(ip: string): boolean {
    if (!this.isValidIP(ip)) {
      return false;
    }
    this.blocklist.blockedIPs.add(ip);
    return true;
  }

  public removeIP(ip: string): boolean {
    return this.blocklist.blockedIPs.delete(ip);
  }

  public addRange(cidr: string): boolean {
    if (!this.isValidCIDR(cidr)) {
      return false;
    }
    if (!this.blocklist.blockedRanges.includes(cidr)) {
      this.blocklist.blockedRanges.push(cidr);
    }
    return true;
  }

  public removeRange(cidr: string): boolean {
    const index = this.blocklist.blockedRanges.indexOf(cidr);
    if (index > -1) {
      this.blocklist.blockedRanges.splice(index, 1);
      return true;
    }
    return false;
  }

  public getBlockedIPs(): string[] {
    return Array.from(this.blocklist.blockedIPs);
  }

  public getBlockedRanges(): string[] {
    return [...this.blocklist.blockedRanges];
  }

  public clearAll(): void {
    this.blocklist.blockedIPs.clear();
    this.blocklist.blockedRanges = [];
  }

  private isValidIP(ip: string): boolean {
    // IPv4 validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(ip)) {
      return true;
    }

    // IPv6 validation (simplified)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    return ipv6Regex.test(ip);
  }

  private isValidCIDR(cidr: string): boolean {
    const parts = cidr.split('/');
    if (parts.length !== 2) {
      return false;
    }

    const [ip, mask] = parts;
    if (!this.isValidIP(ip)) {
      return false;
    }

    const maskNum = parseInt(mask, 10);
    if (isNaN(maskNum)) {
      return false;
    }

    // IPv4 CIDR: mask should be 0-32
    if (ip.includes('.')) {
      return maskNum >= 0 && maskNum <= 32;
    }

    // IPv6 CIDR: mask should be 0-128
    return maskNum >= 0 && maskNum <= 128;
  }

  private isIPInRange(ip: string, cidr: string): boolean {
    try {
      const [network, mask] = cidr.split('/');
      const maskBits = parseInt(mask, 10);

      if (ip.includes('.') && network.includes('.')) {
        // IPv4
        return this.isIPv4InRange(ip, network, maskBits);
      } else if (ip.includes(':') && network.includes(':')) {
        // IPv6 - simplified check
        return this.isIPv6InRange(ip, network, maskBits);
      }

      return false;
    } catch {
      return false;
    }
  }

  private isIPv4InRange(ip: string, network: string, maskBits: number): boolean {
    const ipNum = this.ipv4ToNumber(ip);
    const networkNum = this.ipv4ToNumber(network);
    const mask = (0xFFFFFFFF << (32 - maskBits)) >>> 0;

    return (ipNum & mask) === (networkNum & mask);
  }

  private isIPv6InRange(ip: string, network: string, maskBits: number): boolean {
    // Simplified IPv6 range checking - exact match for now
    // In production, you'd want a more sophisticated implementation
    const ipExpanded = this.expandIPv6(ip);
    const networkExpanded = this.expandIPv6(network);
    
    if (!ipExpanded || !networkExpanded) {
      return false;
    }

    const hexCharsToCheck = Math.floor(maskBits / 4);
    return ipExpanded.substring(0, hexCharsToCheck) === networkExpanded.substring(0, hexCharsToCheck);
  }

  private ipv4ToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  private expandIPv6(ip: string): string | null {
    try {
      // Simple IPv6 expansion - handles basic cases
      if (ip === '::') return '0000:0000:0000:0000:0000:0000:0000:0000';
      if (ip === '::1') return '0000:0000:0000:0000:0000:0000:0000:0001';
      
      // For full IPv6 expansion, you'd need a more complete implementation
      return ip.toLowerCase();
    } catch {
      return null;
    }
  }

  public extractClientIP(req: any): string | null {
    // Check various headers for the real client IP
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = forwarded.split(',').map((ip: string) => ip.trim());
      return ips[0];
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = req.headers['cf-connecting-ip'];
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    // Fall back to connection remote address
    return req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.ip || 
           null;
  }
}