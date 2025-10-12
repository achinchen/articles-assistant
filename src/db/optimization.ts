import { pool } from './client';
import { logger } from '@/utils/logger';

export interface IndexAnalysis {
  tableName: string;
  indexName: string;
  indexType: string;
  columns: string[];
  sizeBytes: number;
  sizeMB: number;
  scans: number;
  tuplesRead: number;
  tuplesReturned: number;
  efficiency: number; // tuplesReturned / tuplesRead
}

export interface TableStats {
  tableName: string;
  rowCount: number;
  sizeBytes: number;
  sizeMB: number;
  deadTuples: number;
  indexScans: number;
  seqScans: number;
  scanRatio: number; // index_scans / (index_scans + seq_scans)
}

export interface QueryPerformance {
  query: string;
  calls: number;
  totalTime: number;
  avgTime: number;
  percentOfTotal: number;
}

export class DatabaseOptimizer {
  /**
   * Analyze table statistics
   */
  static async getTableStats(): Promise<TableStats[]> {
    const query = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins + n_tup_upd + n_tup_del as total_operations,
        n_live_tup as row_count,
        n_dead_tup as dead_tuples,
        idx_scan as index_scans,
        seq_scan as seq_scans,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC;
    `;

    try {
      const result = await pool.query(query);
      
      return result.rows.map(row => ({
        tableName: row.tablename,
        rowCount: parseInt(row.row_count) || 0,
        sizeBytes: parseInt(row.size_bytes) || 0,
        sizeMB: (parseInt(row.size_bytes) || 0) / 1024 / 1024,
        deadTuples: parseInt(row.dead_tuples) || 0,
        indexScans: parseInt(row.index_scans) || 0,
        seqScans: parseInt(row.seq_scans) || 0,
        scanRatio: this.calculateScanRatio(
          parseInt(row.index_scans) || 0,
          parseInt(row.seq_scans) || 0
        ),
      }));
    } catch (error) {
      logger.error('Failed to get table stats:', error);
      return [];
    }
  }

  /**
   * Analyze index usage and efficiency
   */
  static async getIndexAnalysis(): Promise<IndexAnalysis[]> {
    const query = `
      SELECT 
        t.schemaname,
        t.tablename,
        t.indexname,
        t.idx_scan as scans,
        t.idx_tup_read as tuples_read,
        t.idx_tup_fetch as tuples_returned,
        pg_relation_size(t.schemaname||'.'||t.indexname) as size_bytes,
        i.indisunique,
        i.indisprimary,
        array_to_string(array_agg(a.attname ORDER BY a.attnum), ', ') as columns,
        am.amname as index_type
      FROM pg_stat_user_indexes t
      JOIN pg_index i ON t.indexrelid = i.indexrelid
      JOIN pg_class c ON i.indexrelid = c.oid
      JOIN pg_am am ON c.relam = am.oid
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE t.schemaname = 'public'
      GROUP BY t.schemaname, t.tablename, t.indexname, t.idx_scan, 
               t.idx_tup_read, t.idx_tup_fetch, i.indisunique, 
               i.indisprimary, am.amname, c.oid
      ORDER BY t.idx_scan DESC, size_bytes DESC;
    `;

    try {
      const result = await pool.query(query);
      
      return result.rows.map(row => ({
        tableName: row.tablename,
        indexName: row.indexname,
        indexType: row.index_type,
        columns: row.columns ? row.columns.split(', ') : [],
        sizeBytes: parseInt(row.size_bytes) || 0,
        sizeMB: (parseInt(row.size_bytes) || 0) / 1024 / 1024,
        scans: parseInt(row.scans) || 0,
        tuplesRead: parseInt(row.tuples_read) || 0,
        tuplesReturned: parseInt(row.tuples_returned) || 0,
        efficiency: this.calculateEfficiency(
          parseInt(row.tuples_returned) || 0,
          parseInt(row.tuples_read) || 0
        ),
      }));
    } catch (error) {
      logger.error('Failed to get index analysis:', error);
      return [];
    }
  }

  /**
   * Get slow queries (requires pg_stat_statements extension)
   */
  static async getSlowQueries(): Promise<QueryPerformance[]> {
    // Check if pg_stat_statements is available
    const extensionCheck = await pool.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
      ) as has_extension;
    `);

    if (!extensionCheck.rows[0]?.has_extension) {
      logger.info('pg_stat_statements extension not available');
      return [];
    }

    const query = `
      SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        100.0 * total_exec_time / (
          SELECT SUM(total_exec_time) 
          FROM pg_stat_statements 
          WHERE query NOT LIKE '%pg_stat_statements%'
        ) as percent_of_total
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
        AND query NOT LIKE 'COMMIT%'
        AND query NOT LIKE 'BEGIN%'
        AND calls > 5
      ORDER BY total_exec_time DESC
      LIMIT 20;
    `;

    try {
      const result = await pool.query(query);
      
      return result.rows.map(row => ({
        query: row.query.replace(/\s+/g, ' ').trim(),
        calls: parseInt(row.calls) || 0,
        totalTime: parseFloat(row.total_exec_time) || 0,
        avgTime: parseFloat(row.mean_exec_time) || 0,
        percentOfTotal: parseFloat(row.percent_of_total) || 0,
      }));
    } catch (error) {
      logger.error('Failed to get slow queries:', error);
      return [];
    }
  }

  /**
   * Check vector index performance
   */
  static async analyzeVectorIndex(): Promise<{
    indexSize: number;
    totalVectors: number;
    avgScanTime: number;
    recommendedOptimizations: string[];
  }> {
    try {
      // Get index size
      const sizeQuery = `
        SELECT pg_size_pretty(pg_relation_size('embeddings_embedding_idx')) as size,
               pg_relation_size('embeddings_embedding_idx') as size_bytes;
      `;
      const sizeResult = await pool.query(sizeQuery);
      
      // Get vector count
      const countQuery = `SELECT COUNT(*) as total FROM embeddings;`;
      const countResult = await pool.query(countQuery);
      
      const indexSize = parseInt(sizeResult.rows[0]?.size_bytes) || 0;
      const totalVectors = parseInt(countResult.rows[0]?.total) || 0;
      
      // Calculate recommendations
      const recommendations: string[] = [];
      
      if (totalVectors > 10000 && indexSize > 100 * 1024 * 1024) {
        recommendations.push('Consider increasing ivfflat lists parameter for better performance');
      }
      
      if (totalVectors < 1000) {
        recommendations.push('Vector count is low - index may not provide significant benefits');
      }
      
      // Estimate scan time (simplified)
      const avgScanTime = Math.log(totalVectors) * 0.1; // Rough estimate
      
      return {
        indexSize,
        totalVectors,
        avgScanTime,
        recommendedOptimizations: recommendations,
      };
    } catch (error) {
      logger.error('Failed to analyze vector index:', error);
      return {
        indexSize: 0,
        totalVectors: 0,
        avgScanTime: 0,
        recommendedOptimizations: ['Error analyzing vector index'],
      };
    }
  }

  /**
   * Get connection and cache statistics
   */
  static async getConnectionStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    cacheHitRatio: number;
    bufferStats: Record<string, any>;
  }> {
    try {
      // Connection stats
      const connQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE state = 'active') as active,
          COUNT(*) FILTER (WHERE state = 'idle') as idle
        FROM pg_stat_activity;
      `;
      const connResult = await pool.query(connQuery);
      
      // Cache hit ratio
      const cacheQuery = `
        SELECT 
          ROUND(
            100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2
          ) as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database();
      `;
      const cacheResult = await pool.query(cacheQuery);
      
      // Buffer stats
      const bufferQuery = `
        SELECT 
          setting as shared_buffers,
          unit
        FROM pg_settings 
        WHERE name = 'shared_buffers';
      `;
      const bufferResult = await pool.query(bufferQuery);
      
      return {
        totalConnections: parseInt(connResult.rows[0]?.total) || 0,
        activeConnections: parseInt(connResult.rows[0]?.active) || 0,
        idleConnections: parseInt(connResult.rows[0]?.idle) || 0,
        cacheHitRatio: parseFloat(cacheResult.rows[0]?.cache_hit_ratio) || 0,
        bufferStats: bufferResult.rows[0] || {},
      };
    } catch (error) {
      logger.error('Failed to get connection stats:', error);
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        cacheHitRatio: 0,
        bufferStats: {},
      };
    }
  }

  /**
   * Generate optimization recommendations
   */
  static async getOptimizationRecommendations(): Promise<{
    recommendations: string[];
    priority: 'high' | 'medium' | 'low';
    category: string;
  }[]> {
    const recommendations: {
      recommendations: string[];
      priority: 'high' | 'medium' | 'low';
      category: string;
    }[] = [];

    try {
      const [tableStats, indexAnalysis, connectionStats] = await Promise.all([
        this.getTableStats(),
        this.getIndexAnalysis(),
        this.getConnectionStats(),
      ]);

      // Analyze table stats
      tableStats.forEach(table => {
        if (table.scanRatio < 0.9 && table.seqScans > 100) {
          recommendations.push({
            recommendations: [
              `Table '${table.tableName}' has low index usage (${(table.scanRatio * 100).toFixed(1)}%). Consider adding indexes for frequent queries.`
            ],
            priority: 'high',
            category: 'Indexing',
          });
        }

        if (table.deadTuples / table.rowCount > 0.1) {
          recommendations.push({
            recommendations: [
              `Table '${table.tableName}' has high dead tuple ratio (${((table.deadTuples / table.rowCount) * 100).toFixed(1)}%). Consider running VACUUM.`
            ],
            priority: 'medium',
            category: 'Maintenance',
          });
        }
      });

      // Analyze index efficiency
      indexAnalysis.forEach(index => {
        if (index.scans === 0 && index.sizeMB > 1) {
          recommendations.push({
            recommendations: [
              `Index '${index.indexName}' on table '${index.tableName}' is never used but takes ${index.sizeMB.toFixed(2)}MB. Consider dropping it.`
            ],
            priority: 'medium',
            category: 'Indexing',
          });
        }

        if (index.efficiency < 0.1 && index.scans > 10) {
          recommendations.push({
            recommendations: [
              `Index '${index.indexName}' has low efficiency (${(index.efficiency * 100).toFixed(1)}%). Consider optimizing queries or index structure.`
            ],
            priority: 'medium',
            category: 'Performance',
          });
        }
      });

      // Connection analysis
      if (connectionStats.cacheHitRatio < 95) {
        recommendations.push({
          recommendations: [
            `Buffer cache hit ratio is ${connectionStats.cacheHitRatio}%. Consider increasing shared_buffers.`
          ],
          priority: 'high',
          category: 'Configuration',
        });
      }

      if (connectionStats.totalConnections > 100) {
        recommendations.push({
          recommendations: [
            `High connection count (${connectionStats.totalConnections}). Consider connection pooling.`
          ],
          priority: 'medium',
          category: 'Configuration',
        });
      }

    } catch (error) {
      logger.error('Failed to generate recommendations:', error);
    }

    return recommendations;
  }

  /**
   * Run VACUUM and ANALYZE on all tables
   */
  static async runMaintenance(): Promise<{ success: boolean; message: string }> {
    try {
      // Get all user tables
      const tablesQuery = `
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `;
      const tablesResult = await pool.query(tablesQuery);

      for (const row of tablesResult.rows) {
        const tableName = row.tablename;
        
        // Run VACUUM ANALYZE
        await pool.query(`VACUUM ANALYZE ${tableName};`);
        logger.info(`Maintenance completed for table: ${tableName}`);
      }

      return {
        success: true,
        message: `Maintenance completed for ${tablesResult.rows.length} tables`,
      };
    } catch (error) {
      logger.error('Database maintenance failed:', error);
      return {
        success: false,
        message: `Maintenance failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private static calculateScanRatio(indexScans: number, seqScans: number): number {
    const total = indexScans + seqScans;
    return total > 0 ? indexScans / total : 0;
  }

  private static calculateEfficiency(returned: number, read: number): number {
    return read > 0 ? returned / read : 0;
  }
}