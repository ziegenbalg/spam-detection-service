#!/usr/bin/env python3

import requests
import json
import time
import sys
from typing import Dict, Any, List

# Configuration
SERVICE_URL = 'http://localhost:3000'
DELAY_BETWEEN_REQUESTS = 1.0  # 1 second

# Test posts - mix of normal and spam content
test_posts = [
    # Normal posts
    {
        "text": "Just had a great coffee at the local cafe. Perfect way to start the day!",
        "category": "Normal"
    },
    {
        "text": "Working on a new project today. TypeScript is really growing on me.",
        "category": "Normal"
    },
    {
        "text": "Beautiful sunset tonight. Nature never fails to amaze me.",
        "category": "Normal"
    },
    {
        "text": "Thanks @john for the book recommendation! Really enjoying it so far.",
        "category": "Normal"
    },
    
    # Spam posts
    {
        "text": "FREE MONEY!!! CLICK HERE NOW!!! GUARANTEED RESULTS!!!",
        "category": "Spam (Keywords)"
    },
    {
        "text": "WOOOOOOOW THIS IS AMAAAAAZING!!!! BUY NOW!!!!!",
        "category": "Spam (Repeated chars + caps)"
    },
    {
        "text": "🎉🎉🎉🎉🎉🎉 AMAZING DEAL! 🔥🔥🔥🔥🔥 LIMITED TIME! 💰💰💰",
        "category": "Spam (Excessive emojis)"
    },
    {
        "text": "Check out http://bit.ly/scam1 and http://tinyurl.com/spam2 and http://bit.ly/fake3",
        "category": "Spam (Suspicious URLs)"
    },
    {
        "text": "Hey @user1 @user2 @user3 @user4 @user5 check this out!",
        "category": "Spam (Excessive mentions)"
    },
    {
        "text": "Buy now! #deal #amazing #limited #time #offer #money #free #guaranteed",
        "category": "Spam (Excessive hashtags)"
    },
    {
        "text": "Make money fast from home! Work from home guaranteed income! Click here!",
        "category": "Spam (MLM/Scam)"
    },
    {
        "text": "1234567890",
        "category": "Spam (All numbers)"
    }
]

def make_request(method: str, path: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Make HTTP request to the spam detection service."""
    url = f"{SERVICE_URL}{path}"
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'SpamDetectionTester/1.0'
    }
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == 'POST':
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method.upper() == 'PUT':
            response = requests.put(url, headers=headers, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        return {
            'status': response.status_code,
            'data': response.json() if response.text else None
        }
    except requests.exceptions.RequestException as e:
        return {
            'status': 0,
            'error': str(e)
        }
    except json.JSONDecodeError:
        return {
            'status': response.status_code,
            'data': response.text,
            'error': 'Failed to parse JSON response'
        }

def test_health() -> bool:
    """Test if the service is healthy and running."""
    print('🏥 Testing service health...')
    response = make_request('GET', '/health')
    
    if response.get('error'):
        print(f"❌ Service unreachable: {response['error']}")
        return False
    elif response['status'] == 200:
        print('✅ Service is healthy')
        return True
    else:
        print(f"❌ Service unhealthy (status: {response['status']})")
        return False

def check_ai_status():
    """Check the AI detection status."""
    print('\n🤖 Checking AI status...')
    response = make_request('GET', '/ai-status')
    
    if response.get('error'):
        print(f"❌ Failed to check AI status: {response['error']}")
        return
    
    if response['status'] == 200:
        ai = response['data']
        print(f"AI Enabled: {'YES' if ai['ai_enabled'] else 'NO'}")
        print(f"AI Configured: {'YES' if ai['ai_configured'] else 'NO'}")
        print(f"Connection Status: {'CONNECTED' if ai['connection_status'] else 'DISCONNECTED'}")
        
        if ai.get('model_info'):
            print(f"Model: {ai['model_info']['model']}")
    else:
        print(f"❌ Request failed (status: {response['status']})")

def test_spam_detection(post: Dict[str, str], index: int):
    """Test spam detection for a single post."""
    print(f"\n📝 Test {index + 1}: {post['category']}")
    print(f"Text: \"{post['text']}\"")
    
    data = {
        'text': post['text'],
        'username': f'testuser{index}',
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    }
    
    response = make_request('POST', '/validate-post', data)
    
    if response.get('error'):
        print(f"❌ Request error: {response['error']}")
        return
    
    if response['status'] == 200:
        detection = response['data']['detection']
        action_emoji = {
            'allow': '✅',
            'flag': '⚠️',
            'reject': '❌'
        }
        
        action = detection['action']
        print(f"Result: {action_emoji.get(action, '❓')} {action.upper()}")
        print(f"Spam: {'YES' if detection['isSpam'] else 'NO'} (confidence: {detection['confidence'] * 100:.1f}%)")
        
        if detection.get('reasons'):
            print(f"Reasons: {', '.join(detection['reasons'])}")
        
        if detection.get('aiAnalysis'):
            ai = detection['aiAnalysis']
            print(f"AI Analysis: {'SPAM' if ai['isSpam'] else 'CLEAN'} ({ai['severity']} severity)")
            print(f"AI Reasoning: {ai['reasoning']}")
            if ai.get('categories'):
                print(f"AI Categories: {', '.join(ai['categories'])}")
                
    elif response['status'] == 403:
        print("❌ Request blocked (IP may be blocked)")
        if response.get('data') and response['data'].get('reason'):
            print(f"Reason: {response['data']['reason']}")
    else:
        print(f"❌ Request failed (status: {response['status']})")
        if response.get('data') and response['data'].get('error'):
            print(f"Error: {response['data'].get('message', 'Unknown error')}")

def run_tests():
    """Run all spam detection tests."""
    print('🚀 Starting Twitter Spam Detection Service Test\n')
    print('=' * 50)
    
    # Test service health
    if not test_health():
        print('\n❌ Service is not available. Make sure the server is running on port 3000.')
        print('Run: npm run dev')
        sys.exit(1)
    
    # Check AI status
    check_ai_status()
    
    # Test all posts
    print(f"\n📊 Testing {len(test_posts)} posts...\n")
    print('=' * 50)
    
    for i, post in enumerate(test_posts):
        test_spam_detection(post, i)
        
        # Add delay between requests to avoid overwhelming the service
        if i < len(test_posts) - 1:
            time.sleep(DELAY_BETWEEN_REQUESTS)
    
    # Summary
    print('\n' + '=' * 50)
    print('🎯 Test Summary:')
    print(f"✅ Tested {len(test_posts)} posts")
    print('📈 Results show both normal and spam detection capabilities')
    print('🔧 Adjust thresholds in /config endpoint if needed')
    
    print('\n💡 Try these commands to interact with the service:')
    print('   curl http://localhost:3000/health')
    print('   curl http://localhost:3000/config')
    print('   curl http://localhost:3000/ai-status')
    print('   curl http://localhost:3000/blocked-ips')
    
    print('\n✨ Test completed!')

def main():
    """Main function to run the tests."""
    try:
        run_tests()
    except KeyboardInterrupt:
        print('\n\n⏹️  Test interrupted by user')
        sys.exit(0)
    except Exception as e:
        print(f'\n💥 Test script failed: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main()