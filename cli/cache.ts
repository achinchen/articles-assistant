#!/usr/bin/env ts-node

import { CacheService } from '@/cache/service';
import { getRedisClient, closeRedisConnection, pingRedis } from '@/cache/client';
import { logger } from '@/utils/logger';

async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'info':
        await showInfo();
        break;
      
      case 'metrics':
        await showMetrics();
        break;
      
      case 'clear':
        await clearCache();
        break;
      
      case 'maintenance':
        await runMaintenance();
        break;
      
      case 'test':
        await testCache();
        break;
      
      default:
        console.log(`
Cache Management CLI

Usage: npm run cache <command>

Commands:
  info         Show Redis connection and cache info
  metrics      Show cache hit/miss metrics
  clear        Clear all cache
  maintenance  Run cache maintenance tasks
  test         Test cache functionality

Examples:
  npm run cache info
  npm run cache metrics
  npm run cache clear
        `);
    }
  } catch (error) {
    logger.error('Cache CLI error:', error);
    process.exit(1);
  } finally {
    await closeRedisConnection();
  }
}

async function showInfo() {
  console.log('=== Redis Connection Info ===');
  
  try {
    const client = await getRedisClient();
    const ping = await pingRedis();
    const info = await CacheService.getInfo();
    const config = CacheService.getConfig();
    
    console.log(`Connected: ${client.isOpen}`);
    console.log(`Ping: ${ping ? 'PONG' : 'FAILED'}`);
    console.log(`Memory used: ${(parseInt(info.used_memory || '0') / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Max memory: ${info.maxmemory ? (parseInt(info.maxmemory) / 1024 / 1024).toFixed(2) + ' MB' : 'unlimited'}`);
    console.log(`Keys: ${info.db0 || '0 keys'}`);
    
    console.log('\n=== Cache Configuration ===');
    console.log(`Default TTL: ${config.default}s (${(config.default / 60).toFixed(1)}m)`);
    console.log(`Short Query TTL: ${config.shortQuery}s (${(config.shortQuery / 60).toFixed(1)}m)`);
    console.log(`High Quality TTL: ${config.highQuality}s (${(config.highQuality / 60).toFixed(1)}m)`);
    console.log(`Hybrid Search TTL: ${config.hybridSearch}s (${(config.hybridSearch / 60).toFixed(1)}m)`);
    console.log(`TTL Range: ${config.min}s - ${config.max}s`);
    
  } catch (error) {
    console.error('Failed to get info:', error);
  }
}

async function showMetrics() {
  console.log('=== Cache Metrics ===');
  
  try {
    const metrics = await CacheService.getMetrics();
    const total = metrics.hits + metrics.misses;
    
    console.log(`Hits: ${metrics.hits}`);
    console.log(`Misses: ${metrics.misses}`);
    console.log(`Errors: ${metrics.errors}`);
    console.log(`Total requests: ${total}`);
    console.log(`Hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
    
    if (total > 0) {
      console.log(`\nPerformance:`);
      console.log(`- Cache is ${metrics.hitRate > 0.5 ? 'performing well' : 'underperforming'}`);
      console.log(`- ${metrics.misses} queries had to hit the database`);
      console.log(`- ${metrics.hits} queries served from cache`);
    }
    
  } catch (error) {
    console.error('Failed to get metrics:', error);
  }
}

async function clearCache() {
  console.log('=== Clearing Cache ===');
  
  try {
    await CacheService.clear();
    await CacheService.resetMetrics();
    console.log('✅ Cache cleared and metrics reset');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

async function runMaintenance() {
  console.log('=== Running Cache Maintenance ===');
  
  try {
    await CacheService.runMaintenance();
    console.log('✅ Maintenance completed');
    
    // Show updated metrics
    await showMetrics();
  } catch (error) {
    console.error('Failed to run maintenance:', error);
  }
}

async function testCache() {
  console.log('=== Testing Cache Functionality ===');
  
  try {
    // Test connection
    const client = await getRedisClient();
    console.log(`✅ Redis connection: ${client.isOpen ? 'OK' : 'FAILED'}`);
    
    // Test ping
    const ping = await pingRedis();
    console.log(`✅ Redis ping: ${ping ? 'OK' : 'FAILED'}`);
    
    // Test basic operations
    const testKey = 'articles-assistant:test:' + Date.now();
    await client.setEx(testKey, 10, 'test-value');
    const value = await client.get(testKey);
    await client.del(testKey);
    
    console.log(`✅ Basic operations: ${value === 'test-value' ? 'OK' : 'FAILED'}`);
    
    // Test cache service methods
    const metrics = await CacheService.getMetrics();
    console.log(`✅ Metrics retrieval: OK (${metrics.hits + metrics.misses} total requests)`);
    
    const info = await CacheService.getInfo();
    console.log(`✅ Info retrieval: OK (${Object.keys(info).length} properties)`);
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  main();
}