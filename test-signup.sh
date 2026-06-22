#!/bin/bash
# Test script for signup flow

echo "=== Testing Play4Purpose Signup Flow ==="
echo ""

# Check if server is running
echo "1. Checking if dev server is running..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✓ Server is running on port 3000"
else
    echo "   ✗ Server not running. Start with: npm run dev"
    exit 1
fi

echo ""
echo "2. Testing registration API with valid data..."

RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@example.com",
    "password": "Test123456",
    "full_name": "Test User"
  }')

echo "   Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "   ✓ Registration successful"
else
    echo "   ✗ Registration failed"
    echo "   Check server logs for details"
fi

echo ""
echo "3. Testing validation (weak password)..."

RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123",
    "full_name": "Test User"
  }')

echo "   Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":false'; then
    echo "   ✓ Validation working (rejected weak password)"
else
    echo "   ✗ Validation not working"
fi

echo ""
echo "4. Testing validation (invalid email)..."

RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "Test123456",
    "full_name": "Test User"
  }')

echo "   Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":false'; then
    echo "   ✓ Validation working (rejected invalid email)"
else
    echo "   ✗ Validation not working"
fi

echo ""
echo "=== Test Complete ==="
echo ""
echo "Next steps:"
echo "1. Check Supabase Dashboard > Authentication > Users to see if user was created"
echo "2. Check Supabase Dashboard > Database > profiles table to see if profile was created"
echo "3. Try logging in at http://localhost:3000/login"