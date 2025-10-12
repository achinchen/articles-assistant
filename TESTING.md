# Testing Guide

This document describes the testing structure and conventions for the Articles Assistant project.

## Test Organization

Tests are organized alongside their source code using the `.test.ts` extension:

```
src/
├── cache/
│   ├── service.ts
│   └── service.test.ts          # Cache service tests
├── monitoring/
│   ├── performance.ts
│   └── performance.test.ts      # Performance monitoring tests
├── db/
│   ├── optimization.ts
│   └── optimization.test.ts     # Database optimization tests
├── query/
│   ├── enhancement/
│   │   ├── index.ts
│   │   └── index.test.ts        # Query enhancement tests
│   └── optimization/
│       ├── threshold.ts
│       └── threshold.test.ts    # Threshold optimization tests
└── api/
    └── routes/
        └── ask/
            └── performance.test.ts  # API performance tests
```

## Test Categories

### 1. Cache Tests (`src/cache/service.test.ts`)
- **Purpose**: Test Redis caching functionality
- **Coverage**: Cache operations, TTL calculations, invalidation
- **Dependencies**: Requires Redis connection
- **Commands**: `npm run test:cache`

### 2. Monitoring Tests (`src/monitoring/performance.test.ts`)
- **Purpose**: Test performance monitoring and alerting
- **Coverage**: Metrics collection, alert management, performance summaries
- **Dependencies**: None (pure unit tests)
- **Commands**: `npm run test:monitoring`

### 3. Database Tests (`src/db/optimization.test.ts`)
- **Purpose**: Test database optimization and analysis
- **Coverage**: Table stats, index analysis, maintenance operations
- **Dependencies**: PostgreSQL (gracefully skips if unavailable)
- **Commands**: `npm run test:database`

### 4. Query Enhancement Tests (`src/query/enhancement/index.test.ts`)
- **Purpose**: Test query enhancement for short queries
- **Coverage**: Query identification, configuration, search variations
- **Dependencies**: None (pure unit tests)
- **Commands**: `npm run test:query-enhancement`

### 5. Threshold Optimization Tests (`src/query/optimization/threshold.test.ts`)
- **Purpose**: Test dynamic similarity threshold adjustment
- **Coverage**: Threshold calculation, performance tracking, adaptive learning
- **Dependencies**: None (pure unit tests)
- **Commands**: `npm run test:query-optimization`

### 6. API Performance Tests (`src/api/routes/ask/performance.test.ts`)
- **Purpose**: Test API caching performance improvements
- **Coverage**: Cache hit/miss scenarios, response time measurements
- **Dependencies**: Redis connection, test server
- **Commands**: `npm run test:api-performance`

## Running Tests

### Individual Test Suites
```bash
npm run test:cache              # Cache functionality
npm run test:monitoring         # Performance monitoring
npm run test:database          # Database optimization
npm run test:query-optimization # Threshold optimization
npm run test:query-enhancement  # Query enhancement
npm run test:api-performance    # API performance
```

### All Optimization Tests
```bash
npm run test:optimization       # Runs all optimization-related tests
```

### All Tests
```bash
npm run test                    # All tests (watch mode)
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:coverage          # With coverage report
```

## Test Dependencies

### Redis Required
- `test:cache`
- `test:api-performance`

### PostgreSQL Optional
- `test:database` (gracefully skips if DB unavailable)

### No Dependencies
- `test:monitoring`
- `test:query-optimization`
- `test:query-enhancement`

## Test Conventions

### 1. File Naming
- Use `.test.ts` extension
- Place tests next to source files
- Mirror the source file name

### 2. Test Structure
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ServiceToTest } from './service';

describe('Service Name', () => {
  beforeAll(async () => {
    // Setup (e.g., connect to Redis)
  });

  afterAll(async () => {
    // Cleanup (e.g., close connections)
  });

  it('should describe what the test does', async () => {
    // Test implementation
  });
});
```

### 3. Graceful Degradation
Tests that depend on external services should:
- Use try/catch blocks
- Skip tests gracefully when services unavailable
- Log informative messages about skipped tests

### 4. Mocking Strategy
- Prefer real service connections for integration tests
- Use minimal mocking for unit tests
- Mock external APIs (OpenAI) in unit tests

## Performance Testing

### Cache Performance
The cache performance tests measure:
- First request (cache miss): ~3-5 seconds
- Second request (cache hit): ~10-20ms
- Expected speedup: 100-300x improvement

### Database Performance
Database tests validate:
- Query execution times
- Index usage statistics
- Connection pool health
- Optimization recommendations

## CI/CD Integration

Tests are designed to work in CI environments:
- No hardcoded ports or paths
- Graceful handling of missing services
- Comprehensive error messages
- Exit codes for automation

## Coverage Goals

Current test coverage focuses on:
- ✅ Cache operations and TTL logic
- ✅ Performance monitoring and alerts
- ✅ Database optimization analysis
- ✅ Query enhancement logic
- ✅ Threshold optimization algorithms
- ✅ API performance improvements

Future coverage expansion:
- [ ] Widget functionality tests
- [ ] Analytics service tests
- [ ] End-to-end user journey tests
- [ ] Load testing scenarios

## Debugging Tests

### Common Issues
1. **Redis Connection Failed**: Ensure Redis is running (`docker-compose up redis`)
2. **Database Tests Skipped**: Expected if PostgreSQL not available
3. **Timeout Errors**: Increase timeout for performance tests
4. **Import Errors**: Check TypeScript path mapping

### Debug Commands
```bash
npm run test:ui                 # Interactive test UI
npm run test -- --reporter=verbose  # Detailed output
npm run test:coverage          # Coverage analysis
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Resource Cleanup**: Always close connections in `afterAll`
3. **Meaningful Assertions**: Test behavior, not implementation
4. **Performance Thresholds**: Set realistic performance expectations
5. **Error Scenarios**: Test both success and failure paths
6. **Documentation**: Keep this guide updated with new tests

## Contributing

When adding new tests:
1. Follow the established naming conventions
2. Place tests next to source code
3. Add new test commands to `package.json`
4. Update this documentation
5. Ensure tests pass in isolation and in CI