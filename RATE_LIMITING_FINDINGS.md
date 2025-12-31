# Rate Limiting Implementation Findings

## Date: 2026-01-01

## Summary

Rate limiting using Cloudflare KV has been implemented but has **critical limitations** due to KV's eventual consistency model.

## Implementation Status

✅ **What Works:**
- KV binding configured correctly (`348b0947be954a5284079344767cfbad`)
- Rate limit counter storage and retrieval
- Incremental counter updates
- Rate limit checking logic

❌ **What Doesn't Work:**
- **Rapid burst protection**: KV eventual consistency causes race conditions
- Under high load, multiple requests read stale values and overwrite each other
- Counter values become unreliable: `1→2→1→2→3→4→5→3→6→7→8→9→4→10`

## Root Cause

**Cloudflare KV is eventually consistent**, not immediately consistent. From the logs:

```
Request 1: count = null → writes count: 1
Request 2: count = 1 → writes count: 2  (correct)
Request 3: count = 1 → writes count: 2  (READ STALE VALUE, overwrites)
Request 4: count = 2 → writes count: 3
Request 5: count = 3 → writes count: 4
Request 6: count = 3 → writes count: 4  (READ STALE VALUE, overwrites)
```

When requests arrive faster than KV write propagation (~100-200ms), they read the same base value and clobber each other's writes.

## Production Impact

- **Low-moderate traffic**: Works reasonably well (5-10 req/sec)
- **Burst traffic**: Ineffective (20+ concurrent requests bypass limits)
- **Sustained abuse**: Eventually catches up, provides some protection

## Solutions

### Option 1: Durable Objects (Recommended for Production)

**Pros:**
- Strong consistency guarantees
- Perfect for rate limiting
- No race conditions

**Cons:**
- Requires code refactor
- Additional cost per Durable Object
- More complex deployment

**Implementation:**
```typescript
// Create RateLimiterDurableObject class
// Each userId gets its own DO instance
// DO handles atomic counter increments
```

### Option 2: Accept Current Limitations

**Pros:**
- Already implemented
- Zero additional cost
- Works for basic abuse prevention

**Cons:**
- Not reliable for bursts
- Can be bypassed by rapid requests

**Recommendation:** Acceptable for MVP/beta, upgrade to Durable Objects for production scale.

### Option 3: Remove Rate Limiting

**Pros:**
- Simplifies codebase
- No false promises

**Cons:**
- Zero abuse protection
- Vulnerable to DoS

## Current Configuration

- **Search endpoint**: 20 requests/minute per userId
- **Chat endpoint**: 10 requests/minute per userId
- **Implementation**: KV-backed with 60-second TTL windows
- **Graceful degradation**: If KV unavailable, allows all requests

## Recommendations

1. **Short-term**: Keep current KV implementation, document limitations
2. **Medium-term**: Migrate to Durable Objects for production
3. **Alternative**: Use Cloudflare's Zone Rate Limiting rules (not Worker-level)

## Testing Evidence

```bash
# Test with same userId, 22 rapid requests
# Expected: 20 pass, 2 blocked (429)
# Actual: 22 pass, 0 blocked

# KV counter sequence (from logs):
1, 2, 1, 2, 3, 4, 5, 3, 6, 7, 8, 9, 4, 10, ...
# (should be: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...)
```

## Files Modified

- `worker/src/index.ts` - Rate limiting logic with checkRateLimit helper
- `worker/wrangler.toml` - KV namespace binding
- Debug endpoint: `GET /api/debug/bindings` - Shows KV binding status

## Next Steps

- [ ] Decide: Keep KV limitations or implement Durable Objects
- [x] Document findings
- [ ] Update user-facing documentation with rate limit caveats
- [x] Verify graph caching works (KV is suitable for caching use case)
