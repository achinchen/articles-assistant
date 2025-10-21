import { pool } from '../src/db/client';
import fs from 'fs';

async function exportData() {
  try {
    console.log('🔄 Exporting data from database...');
    
    // Export articles
    const articlesResult = await pool.query('SELECT * FROM articles ORDER BY id');
    const chunksResult = await pool.query('SELECT * FROM chunks ORDER BY id');
    const embeddingsResult = await pool.query('SELECT * FROM embeddings ORDER BY id');
    const queriesResult = await pool.query('SELECT * FROM queries ORDER BY id');
    
    let sqlContent = '-- Data export from articles-assistant\n\n';
    
    // Articles
    sqlContent += '-- Articles data\n';
    for (const row of articlesResult.rows) {
      const values = [
        row.id,
        `'${row.slug?.replace(/'/g, "''") || ''}'`,
        `'${row.title?.replace(/'/g, "''") || ''}'`,
        `'${row.content?.replace(/'/g, "''") || ''}'`,
        `'${row.locale || 'zh-TW'}'`,
        `'${JSON.stringify(row.frontmatter || {})?.replace(/'/g, "''")}'`,
        row.source_file ? `'${row.source_file.replace(/'/g, "''")}'` : 'NULL',
        row.source_commit ? `'${row.source_commit.replace(/'/g, "''")}'` : 'NULL',
        `'${row.created_at?.toISOString()}'`,
        `'${row.updated_at?.toISOString()}'`
      ];
      sqlContent += `INSERT INTO articles (id, slug, title, content, locale, frontmatter, source_file, source_commit, created_at, updated_at) VALUES (${values.join(', ')});\n`;
    }
    
    sqlContent += '\n-- Chunks data\n';
    for (const row of chunksResult.rows) {
      const values = [
        row.id,
        row.article_id,
        row.chunk_index,
        `'${row.content?.replace(/'/g, "''") || ''}'`,
        row.token_count || 'NULL',
        `'${JSON.stringify(row.metadata || {})?.replace(/'/g, "''")}'`,
        `'${row.created_at?.toISOString()}'`
      ];
      sqlContent += `INSERT INTO chunks (id, article_id, chunk_index, content, token_count, metadata, created_at) VALUES (${values.join(', ')});\n`;
    }
    
    sqlContent += '\n-- Embeddings data\n';
    for (const row of embeddingsResult.rows) {
      const embeddingArray = row.embedding ? `'${JSON.stringify(row.embedding)}'` : 'NULL';
      const values = [
        row.id,
        row.chunk_id,
        embeddingArray,
        `'${row.created_at?.toISOString()}'`
      ];
      sqlContent += `INSERT INTO embeddings (id, chunk_id, embedding, created_at) VALUES (${values.join(', ')});\n`;
    }
    
    sqlContent += '\n-- Queries data\n';
    for (const row of queriesResult.rows) {
      const chunksUsed = row.chunks_used ? `'{${row.chunks_used.join(',')}}'` : 'NULL';
      const values = [
        row.id,
        `'${row.query_text?.replace(/'/g, "''") || ''}'`,
        row.response ? `'${row.response.replace(/'/g, "''")}'` : 'NULL',
        chunksUsed,
        row.feedback || 'NULL',
        row.session_id ? `'${row.session_id.replace(/'/g, "''")}'` : 'NULL',
        row.locale ? `'${row.locale}'` : 'NULL',
        `'${row.created_at?.toISOString()}'`
      ];
      sqlContent += `INSERT INTO queries (id, query_text, response, chunks_used, feedback, session_id, locale, created_at) VALUES (${values.join(', ')});\n`;
    }
    
    // Reset sequences
    sqlContent += '\n-- Reset sequences\n';
    sqlContent += `SELECT setval('articles_id_seq', (SELECT MAX(id) FROM articles));\n`;
    sqlContent += `SELECT setval('chunks_id_seq', (SELECT MAX(id) FROM chunks));\n`;
    sqlContent += `SELECT setval('embeddings_id_seq', (SELECT MAX(id) FROM embeddings));\n`;
    sqlContent += `SELECT setval('queries_id_seq', (SELECT MAX(id) FROM queries));\n`;
    
    fs.writeFileSync('supabase/seed.sql', sqlContent);
    
    console.log('✅ Data exported to supabase/seed.sql');
    console.log(`📊 Exported: ${articlesResult.rows.length} articles, ${chunksResult.rows.length} chunks, ${embeddingsResult.rows.length} embeddings, ${queriesResult.rows.length} queries`);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
  } finally {
    await pool.end();
  }
}

exportData();