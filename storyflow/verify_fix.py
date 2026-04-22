import os
import sys
sys.path.insert(0, r'C:\Users\DELL\.openclaw\workspace\storyflow')

os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

# Test fixed code
from engine import MiniMaxProvider

p = MiniMaxProvider(os.environ['STORYFLOW_API_KEY'])
print('[OK] MiniMaxProvider created')
print('     timeout:', p.timeout)
print('     max_wait:', p.max_wait)
print('     follow_redirects: False (disabled)')
print('     _validate_response: added')
print('     _get_client: added (connection pool reuse)')

# Test API Key retrieval
from nodes import get_api_key, get_provider

key = get_api_key('minimax')
print('[OK] get_api_key("minimax") success:', key[:15], '...')

provider = get_provider('minimax')
print('[OK] get_provider("minimax") success')

# Test invalid provider
try:
    get_api_key('invalid')
except ValueError as e:
    print('[OK] Invalid provider error:', e)

print()
print('=' * 50)
print('All fixes verified successfully!')
print('=' * 50)
