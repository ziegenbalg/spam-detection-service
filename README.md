# Twitter Spam Detection Service

A minimal TypeScript service that detects spammy or abusive Twitter posts using rule-based content analysis. This service helps automatically reject or flag problematic content before it gets posted to a social media platform.

## Features

- **Real-time spam detection** - Analyzes posts instantly via REST API
- **Rule-based filtering** - Uses 10+ detection rules for common spam patterns
- **AI-powered analysis** - Optional Google Gemini integration for advanced spam detection
- **IP address blocking** - Block malicious IPs and IP ranges (CIDR)
- **Configurable thresholds** - Customizable spam and flag thresholds
- **Action classification** - Returns `allow`, `flag`, or `reject` recommendations
- **Confidence scoring** - Provides confidence levels for detections
- **Comprehensive testing** - Full test coverage with Jest

## Detection Rules

The service implements the following spam detection rules:

1. **Excessive Capitals** - Detects posts with >70% capital letters
2. **Repeated Characters** - Finds 5+ consecutive identical characters
3. **Excessive Emojis** - Flags posts with too many emojis
4. **Suspicious URLs** - Identifies shortened URLs and excessive links
5. **Spam Keywords** - Detects common spam phrases like "free money"
6. **Excessive Mentions** - Flags posts with 3+ user mentions
7. **Excessive Hashtags** - Identifies posts with too many hashtags
8. **Profanity Filter** - Basic profanity detection
9. **Length Validation** - Checks for posts that are too short/long
10. **All Numbers** - Detects posts containing only numbers

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd twitter-spam-detector

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Starting the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on port 3000 (or the port specified in the `PORT` environment variable).

### API Endpoints

#### POST /validate-post
Validates a Twitter post for spam content.

**Request:**
```json
{
  "text": "Check out this amazing deal!",
  "username": "user123",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Response:**
```json
{
  "post": {
    "text": "Check out this amazing deal!",
    "username": "user123",
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "detection": {
    "isSpam": false,
    "confidence": 0.1,
    "reasons": [],
    "action": "allow"
  },
  "processed_at": "2024-01-01T00:00:00Z"
}
```

#### GET /health
Returns the service health status.

#### GET /config
Returns the current detection configuration.

#### PUT /config
Updates the detection configuration.

**Request:**
```json
{
  "spamThreshold": 10,
  "flagThreshold": 5,
  "maxTextLength": 280,
  "minTextLength": 1
}
```

#### GET /rules
Lists all available detection rules.

#### GET /ai-status
Returns the status of AI detection integration.

**Response:**
```json
{
  "ai_enabled": false,
  "ai_configured": false,
  "connection_status": false,
  "model_info": null
}
```

#### POST /ai-test
Tests AI detection with a sample text (requires API key).

**Request:**
```json
{
  "text": "Sample text to analyze"
}
```

**Response:**
```json
{
  "ai_analysis": {
    "isSpam": false,
    "confidence": 0.1,
    "reasoning": "Content appears to be normal conversation",
    "categories": [],
    "severity": "low"
  },
  "test_successful": true
}
```

#### GET /blocked-ips
Returns all blocked IP addresses and ranges.

**Response:**
```json
{
  "blocked_ips": ["192.168.1.100", "203.0.113.5"],
  "blocked_ranges": ["10.0.0.0/8", "172.16.0.0/12"],
  "total_blocked_ips": 2,
  "total_blocked_ranges": 2
}
```

#### POST /blocked-ips
Adds an IP address or CIDR range to the blocklist.

**Request (IP address):**
```json
{
  "ip": "192.168.1.100"
}
```

**Request (IP range):**
```json
{
  "range": "10.0.0.0/8"
}
```

#### DELETE /blocked-ips/:identifier
Removes an IP address or range from the blocklist.

**Examples:**
```bash
# Remove IP address
DELETE /blocked-ips/192.168.1.100

# Remove IP range (URL encoded)
DELETE /blocked-ips/10.0.0.0%2F8?type=range
```

### Example Usage

```bash
# Test with a normal post
curl -X POST http://localhost:3000/validate-post \
  -H "Content-Type: application/json" \
  -d '{"text": "Just had a great day at the park!"}'

# Test with spam content
curl -X POST http://localhost:3000/validate-post \
  -H "Content-Type: application/json" \
  -d '{"text": "FREE MONEY!!! CLICK HERE NOW!!!"}'

# Block an IP address
curl -X POST http://localhost:3000/blocked-ips \
  -H "Content-Type: application/json" \
  -d '{"ip": "192.168.1.100"}'

# Block an IP range
curl -X POST http://localhost:3000/blocked-ips \
  -H "Content-Type: application/json" \
  -d '{"range": "10.0.0.0/8"}'

# List blocked IPs
curl http://localhost:3000/blocked-ips

# Check AI status
curl http://localhost:3000/ai-status

# Test AI detection (requires API key)
curl -X POST http://localhost:3000/ai-test \
  -H "Content-Type: application/json" \
  -d '{"text": "Buy now! Limited time offer!"}'
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting and Type Checking

```bash
# Run ESLint
npm run lint

# Run TypeScript type checking
npm run typecheck
```

### Project Structure

```
src/
├── __tests__/          # Test files
├── types.ts           # TypeScript type definitions
├── spam-rules.ts      # Spam detection rules
├── spam-detector.ts   # Core detection logic
├── server.ts          # Express server implementation
└── index.ts          # Application entry point
```

## Configuration

The service can be configured through the `/config` endpoint or by modifying the default configuration:

- `spamThreshold`: Total severity score needed to reject a post (default: 6)
- `flagThreshold`: Total severity score needed to flag a post (default: 3)
- `maxTextLength`: Maximum allowed post length (default: 280)
- `minTextLength`: Minimum allowed post length (default: 1)
- `enableIPBlocking`: Enable/disable IP address blocking (default: true)
- `enableAIDetection`: Enable/disable AI-powered spam detection (default: false)
- `geminiApiKey`: Google Gemini API key for AI detection (optional)

## How It Works

1. **IP Validation**: Checks if client IP is blocked (if IP blocking enabled)
2. **Post Validation**: Checks basic requirements (text present, length limits)
3. **Rule Evaluation**: Runs all spam detection rules against the post
4. **AI Analysis**: Optionally analyzes content with Google Gemini (if enabled)
5. **Severity Scoring**: Each triggered rule adds to the total severity score
6. **Action Determination**: Based on severity score and AI analysis:
   - High-confidence AI spam detection can override rules
   - Score ≥ `spamThreshold`: `reject`
   - Score ≥ `flagThreshold`: `flag`
   - Score < `flagThreshold`: `allow`
7. **Confidence Calculation**: Combines rule-based and AI confidence scores

### IP Blocking Features

- **Individual IP Blocking**: Block specific IPv4 and IPv6 addresses
- **Range Blocking**: Block entire IP ranges using CIDR notation
- **Automatic IP Detection**: Extracts client IP from various headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
- **Immediate Blocking**: Blocked IPs are rejected before spam analysis
- **Dynamic Management**: Add/remove IPs and ranges via API endpoints

### AI Detection Features

- **Google Gemini Integration**: Uses Google's advanced AI for content analysis
- **Context-Aware Analysis**: Understands context, intent, and subtle spam indicators
- **Category Classification**: Identifies specific types of spam (scams, promotion, harassment, etc.)
- **Severity Assessment**: Provides low/medium/high severity ratings
- **Fallback Handling**: Gracefully handles API errors and rate limits
- **Confidence Scoring**: Provides detailed confidence metrics for AI decisions

### Setting up AI Detection

1. **Get a Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/) to get your API key
2. **Set Environment Variable**: `export GEMINI_API_KEY=your_api_key_here`
3. **Enable AI Detection**: Update configuration to enable AI features
4. **Test Connection**: Use `/ai-status` endpoint to verify setup

```bash
# Enable AI detection
curl -X PUT http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d '{"enableAIDetection": true, "geminiApiKey": "your_key_here"}'
```

## Performance Considerations

- All rules run in O(n) time relative to post length
- Memory usage is minimal - no persistent storage required
- Suitable for real-time API usage
- Stateless design allows for horizontal scaling
- AI detection adds ~1-3 seconds latency (can be disabled for faster responses)
- Gemini API has rate limits - consider caching for high-volume usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.