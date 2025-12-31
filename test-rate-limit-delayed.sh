#!/bin/bash
# Test rate limiting with delays (to account for KV eventual consistency)

echo "Testing rate limiting with 1-second delays..."
echo ""

for i in {1..5}; do
  response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST https://api.metacogna.ai/api/search \
    -H "Content-Type: application/json" \
    -d '{"query":"delayed test","userId":"test-delayed-user","topK":3}')

  http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)

  if [ "$http_code" = "429" ]; then
    echo "Request $i: ⛔ RATE LIMITED (429)"
  else
    echo "Request $i: ✅ OK ($http_code)"
  fi

  sleep 1
done

echo ""
echo "Now testing 22 rapid requests to confirm KV consistency issue..."
echo ""

for i in {1..22}; do
  response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST https://api.metacogna.ai/api/search \
    -H "Content-Type: application/json" \
    -d '{"query":"rapid test","userId":"test-rapid-user","topK":3}')

  http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)

  if [ "$http_code" = "429" ]; then
    echo "Request $i: ⛔ RATE LIMITED"
  else
    echo "Request $i: ✅ OK"
  fi
done
