#!/bin/bash
# Test rate limiting - should allow 20/min for search

echo "Testing rate limiting on /api/search (limit: 20 req/min)"
echo "Making 22 rapid requests..."
echo ""

for i in {1..22}; do
  response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST https://api.metacogna.ai/api/search \
    -H "Content-Type: application/json" \
    -d '{"query":"test","userId":"test-user-ratelimit","topK":3}')

  http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)
  body=$(echo "$response" | grep -v "HTTP_CODE")

  if [ "$http_code" = "429" ]; then
    echo "Request $i: ⛔ RATE LIMITED (429)"
    echo "  Response: $(echo $body | jq -c .)"
  else
    echo "Request $i: ✅ OK ($http_code)"
  fi
done

echo ""
echo "Testing chat rate limit (limit: 10 req/min)"
echo "Making 12 rapid requests..."
echo ""

for i in {1..12}; do
  response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST https://api.metacogna.ai/api/chat \
    -H "Content-Type: application/json" \
    -d '{"query":"test","userId":"test-user-chat","agentType":"rag-chat"}')

  http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)

  if [ "$http_code" = "429" ]; then
    echo "Request $i: ⛔ RATE LIMITED (429)"
  else
    echo "Request $i: ✅ OK ($http_code)"
  fi
done
