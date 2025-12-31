#!/bin/bash
# Test graph caching functionality

echo "=== Test 1: First request (cache miss) ==="
response1=$(curl -s https://api.metacogna.ai/api/graph)
cached1=$(echo "$response1" | jq -r '.metadata.cached // .metadata.cacheHit')
timestamp1=$(echo "$response1" | jq -r '.metadata.generatedAt')
nodeCount=$(echo "$response1" | jq -r '.metadata.nodeCount')

echo "Cached: $cached1"
echo "Generated at: $timestamp1"
echo "Node count: $nodeCount"
echo ""

echo "=== Test 2: Second request (should be cache hit) ==="
sleep 1
response2=$(curl -s https://api.metacogna.ai/api/graph)
cached2=$(echo "$response2" | jq -r '.metadata.cached // .metadata.cacheHit')
timestamp2=$(echo "$response2" | jq -r '.metadata.generatedAt')

echo "Cached: $cached2"
echo "Generated at: $timestamp2"
echo ""

if [ "$timestamp1" = "$timestamp2" ] && [ "$cached2" = "true" ]; then
  echo "✅ Graph caching WORKS - same timestamp, cache hit"
else
  echo "⚠️  Cache behavior: cached=$cached2, timestamps match: $([ "$timestamp1" = "$timestamp2" ] && echo 'yes' || echo 'no')"
fi

echo ""
echo "=== Test 3: Check KV for cache key ==="
echo "(Note: May not show immediately due to eventual consistency)"
