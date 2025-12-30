# API Client Usage Examples

The centralized API client uses `import.meta.env.BASE_API_URL` for all API calls.

## Basic Usage

```typescript
import { apiPost, apiGet, apiRequest } from './ApiClient';

// POST request
const result = await apiPost('/chat', {
  message: 'Hello',
  context: 'user-context'
});

// GET request
const data = await apiGet('/graph');

// Custom request
const response = await apiRequest('/custom-endpoint', {
  method: 'PUT',
  body: JSON.stringify(payload)
});
```

## Pattern from User Request

```typescript
const API_BASE = import.meta.env.BASE_API_URL;

await fetch(`${API_BASE}/chat`, {
  method: "POST",
  body: JSON.stringify(payload),
});
```

This pattern is now encapsulated in the `ApiClient` service. Use the helper functions instead:

```typescript
import { apiPost } from './ApiClient';

await apiPost('/chat', payload);
```

## Environment Variable Setup

Set `BASE_API_URL` in your environment:
- Development: `BASE_API_URL=/api` (default)
- Production: `BASE_API_URL=https://api.metacogna.ai`

The API client automatically handles:
- URL construction
- JSON serialization
- Error handling
- Content-Type headers

