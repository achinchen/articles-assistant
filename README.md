# Articles Assistant

A comprehensive RAG (Retrieval-Augmented Generation) system for technical blog search with advanced caching, query optimization, and performance monitoring.

## ✨ Features

- **🔍 Semantic Search**: Vector-based search using OpenAI embeddings and PostgreSQL pgvector
- **🤖 AI-Powered Answers**: GPT-4 integration with citation validation and source references
- **⚡ Redis Caching**: 20x performance improvement with intelligent TTL strategies
- **🧠 Query Enhancement**: AI-powered short query expansion for better search results
- **📊 Performance Monitoring**: Real-time metrics, alerting, and trend analysis
- **🎯 Dynamic Optimization**: Adaptive similarity thresholds and performance learning
- **🌐 REST API**: Express.js server with comprehensive error handling and rate limiting
- **🎨 React Widget**: Embeddable chat interface with i18n support (EN/ZH)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose
- OpenAI API key

### 1. Clone and Setup

```bash
git clone <repository-url>
cd articles-assistant
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file with your OpenAI API key:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 3. Start Services

```bash
# Start PostgreSQL and Redis
pnpm docker:up

# Install dependencies
pnpm install

# Setup database and ingest content
pnpm db:setup
pnpm ingest

# Start API server
pnpm api:dev
```

### 4. Test the API

```bash
# Query the assistant
pnpm query "How to improve team communication?"

# Check system status
curl http://localhost:3002/health
```

Your Articles Assistant is now running at `http://localhost:3002`! 🎉

## 📋 Installation

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd articles-assistant
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Start infrastructure**
   ```bash
   pnpm docker:up
   ```

5. **Database setup**
   ```bash
   pnpm db:setup
   ```

6. **Content ingestion**
   ```bash
   # Initialize submodule (if using git submodule for content)
   pnpm submodule:init
   
   # Ingest articles
   pnpm ingest
   ```

### Production Deployment

1. **Build the application**
   ```bash
   pnpm api:build
   ```

2. **Set production environment**
   ```bash
   export NODE_ENV=production
   export OPENAI_API_KEY=your-production-key
   ```

3. **Start with PM2 (recommended)**
   ```bash
   npm install -g pm2
   pm2 start dist/cli/api.js --name articles-assistant
   ```

### Docker Compose (Full Stack)

```bash
# Start all services including the app
docker-compose up -d

# View logs
docker-compose logs -f
```

## 📖 Usage

### API Endpoints

#### Search and Ask
```bash
# Ask a question
curl -X POST http://localhost:3002/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "How to improve code quality?"}'

# Advanced search with options
curl -X POST http://localhost:3002/ask \
  -H "Content-Type: application/json" \
  -d '{
    "query": "team communication",
    "method": "hybrid",
    "threshold": 0.7,
    "useCache": true
  }'
```

#### System Monitoring
```bash
# Health check
curl http://localhost:3002/health

# Performance metrics
curl http://localhost:3002/monitoring/metrics

# Cache statistics
curl http://localhost:3002/cache/stats

# Database optimization insights
curl http://localhost:3002/database/optimization
```

#### Analytics
```bash
# Query analytics
curl http://localhost:3002/analytics/queries

# Usage statistics
curl http://localhost:3002/stats
```

### CLI Tools

#### Content Management
```bash
# List available content
pnpm list
pnpm list:articles
pnpm list:series

# Ingest new content
pnpm ingest:fresh
pnpm ingest:article path/to/article.md

# Check ingestion status
pnpm stats
```

#### Cache Management
```bash
# Cache information
pnpm cache:info

# Cache metrics and performance
pnpm cache:metrics

# Clear cache
pnpm cache:clear

# Test cache performance
pnpm cache:test
```

#### Database Operations
```bash
# Database status
pnpm db:status

# Reset database
pnpm db:reset

# Database shell
pnpm db:shell
```

#### Query Testing
```bash
# Interactive query
pnpm query

# Direct query
pnpm query "your question here"

# Query with options
pnpm query --help
```

### React Widget Integration

```typescript
import { ArticlesAssistant } from './widget/dist/sdk';

// Initialize the widget
const assistant = new ArticlesAssistant({
  apiUrl: 'http://localhost:3002',
  locale: 'en', // or 'zh'
  theme: 'light' // or 'dark'
});

// Render in your app
assistant.render('#articles-assistant-container');
```

### Testing

```bash
# Run all tests
pnpm test

# Specific test suites
pnpm test:cache
pnpm test:monitoring
pnpm test:database
pnpm test:optimization

# Performance testing
pnpm test:api-performance

# Test with coverage
pnpm test:coverage
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 and embeddings | - | ✅ |
| `PORT` | Server port | `3002` | ❌ |
| `NODE_ENV` | Environment mode | `development` | ❌ |
| `DATABASE_URL` | PostgreSQL connection string | Computed | ❌ |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` | ❌ |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `localhost:3000,3001,3002` | ❌ |
| `RATE_LIMIT_PER_MINUTE` | API rate limit | `20` | ❌ |

### Cache Configuration

The system uses intelligent caching with variable TTL:

- **High-quality results**: Up to 24 hours
- **Medium-quality results**: 1-4 hours  
- **Low-quality results**: 5-30 minutes
- **Hybrid search**: 1.5x longer than vector-only

### Query Enhancement

Automatic enhancement for:
- Queries shorter than 15 characters
- Queries with 3 words or fewer
- Confidence threshold > 0.5

## 🏗️ Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                  │
├─────────────────┬─────────────────┬─────────────────────────────────────────┤
│   React Widget │   API Client    │           CLI Tools                     │
│                 │                 │                                         │
│  ┌─────────────┐│  ┌─────────────┐│  ┌─────────────────────────────────────┐│
│  │Chat Interface││  │HTTP Requests││  │cache • query • ingest • stats      ││
│  │i18n Support ││  │Widget SDK   ││  │list • db:setup • api:dev           ││
│  └─────────────┘│  └─────────────┘│  └─────────────────────────────────────┘│
└─────────────────┴─────────────────┴─────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY                                     │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│  CORS Handler   │  Rate Limiter   │ Authentication  │  Express Router     │
│                 │                 │                 │                     │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────┐ │
│ │Cross-Origin │ │ │20 req/min   │ │ │Helmet       │ │ │/ask /health     │ │
│ │Protection   │ │ │Protection   │ │ │Security     │ │ │/cache /stats    │ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └─────────────────┘ │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CORE SERVICES                                     │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│  Query Service  │  Cache Service  │Analytics Service│ Monitoring Service  │
│                 │                 │                 │                     │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────┐ │
│ │Search Logic │ │ │Redis Mgmt   │ │ │Usage Stats  │ │ │Performance      │ │
│ │Answer Gen   │ │ │TTL Strategy │ │ │Query Logs   │ │ │Alerts & Metrics │ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └─────────────────┘ │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI/ML LAYER                                      │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│Embedding Service│   LLM Service   │Query Enhancement│Dynamic Optimization │
│                 │                 │                 │                     │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────┐ │
│ │Vector Gen   │ │ │GPT-4 Answer │ │ │GPT-4o-mini  │ │ │Adaptive         │ │
│ │Similarity   │ │ │Citation     │ │ │Short Queries│ │ │Thresholds       │ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └─────────────────┘ │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                       │
├─────────────────────────┬─────────────────────────┬─────────────────────────┤
│    PostgreSQL + pgvector │      Redis Cache        │     File System         │
│                         │                         │                         │
│ ┌─────────────────────┐ │ ┌─────────────────────┐ │ ┌─────────────────────┐ │
│ │• Articles & Series  │ │ │• Query Results      │ │ │• Content Files      │ │
│ │• Vector Embeddings  │ │ │• Performance Data   │ │ │• Configuration      │ │
│ │• Analytics Data     │ │ │• Smart TTL (5m-24h) │ │ │• Logs & Scripts     │ │
│ │• Query Logs         │ │ │• 20x Speed Boost    │ │ │                     │ │
│ └─────────────────────┘ │ └─────────────────────┘ │ └─────────────────────┘ │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                   │
│                                                                             │
│                        ┌─────────────────────┐                             │
│                        │     OpenAI API      │                             │
│                        │                     │                             │
│                        │• GPT-4 (Answers)    │                             │
│                        │• GPT-4o-mini (Enhance)│                          │
│                        │• text-embedding-3   │                             │
│                        │  (Vector Generation)│                             │
│                        └─────────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Query Processing Flow

```
CLIENT REQUEST FLOW:
════════════════════

┌─────────────┐    POST /ask     ┌─────────────┐    Rate Limit    ┌─────────────┐
│   Client    │ ────────────────► │ API Gateway │ ────────────────► │Query Service│
│(Widget/CLI) │    {query}       │             │   & Validation   │             │
└─────────────┘                  └─────────────┘                  └─────────────┘
                                                                          │
                                                                          ▼
                                                                  ┌─────────────┐
                                                                  │Cache Service│
                                                                  │Check Redis  │
                                                                  └─────────────┘
                                                                          │
                                              ┌─── CACHE HIT ─────────────┴─── CACHE MISS ───┐
                                              │                                               │
                                              ▼                                               ▼
                                    ┌─────────────┐                               ┌─────────────┐
                                    │Return Cached│                               │   Process   │
                                    │Result (5ms) │                               │Fresh Query  │
                                    └─────────────┘                               └─────────────┘
                                              │                                               │
                                              │                                               ▼
                                              │                                   ┌─────────────┐
                                              │                                   │Query Length │
                                              │                                   │Check < 15?  │
                                              │                                   └─────────────┘
                                              │                                               │
                                              │                          ┌─── YES ───────────┴─── NO ────┐
                                              │                          │                               │
                                              │                          ▼                               ▼
                                              │                  ┌─────────────┐                ┌─────────────┐
                                              │                  │Enhancement  │                │   Direct    │
                                              │                  │GPT-4o-mini  │                │   Search    │
                                              │                  └─────────────┘                └─────────────┘
                                              │                          │                               │
                                              │                          ▼                               │
                                              │                  ┌─────────────┐                        │
                                              │                  │Confidence   │                        │
                                              │                  │Check > 0.5? │                        │
                                              │                  └─────────────┘                        │
                                              │                          │                               │
                                              │                     ┌────┴────┐                         │
                                              │                     │ Use     │                         │
                                              │                     │Enhanced │                         │
                                              │                     └────┬────┘                         │
                                              │                          │                               │
                                              │                          └─────────┬─────────────────────┘
                                              │                                    │
                                              │                                    ▼
                                              │                          ┌─────────────┐
                                              │                          │Vector Search│
                                              │                          │+ Hybrid     │
                                              │                          └─────────────┘
                                              │                                    │
                                              │                                    ▼
                                              │                          ┌─────────────┐
                                              │                          │PostgreSQL   │
                                              │                          │Query pgvector│
                                              │                          └─────────────┘
                                              │                                    │
                                              │                                    ▼
                                              │                          ┌─────────────┐
                                              │                          │GPT-4 Answer │
                                              │                          │Generation   │
                                              │                          └─────────────┘
                                              │                                    │
                                              │                                    ▼
                                              │                          ┌─────────────┐
                                              │                          │Store in     │
                                              │                          │Cache w/ TTL │
                                              │                          └─────────────┘
                                              │                                    │
                                              └────────────────────────────────────┴─────────┐
                                                                                             │
                                                                                             ▼
                                                                                   ┌─────────────┐
                                                                                   │Return Result│
                                                                                   │to Client    │
                                                                                   └─────────────┘

PERFORMANCE METRICS:
═══════════════════
• Cache Hit:  ~5ms   (95% improvement)
• Cache Miss: ~114ms (includes AI processing)  
• Enhancement: ~200ms (for short queries)
```

### Core Components

- **API Server**: Express.js with TypeScript
- **Database**: PostgreSQL with pgvector extension
- **Cache**: Redis with intelligent TTL strategies
- **AI/ML**: OpenAI GPT-4 and text-embedding-3-small
- **Search**: Vector embeddings + hybrid search
- **Monitoring**: Custom performance monitoring with alerting

### Performance Optimizations

- **20x cache speedup**: 114ms → 5ms for cached queries
- **Query enhancement**: 85% average confidence for short queries
- **Database optimization**: 90%+ cache hit ratio recommendations
- **Dynamic thresholds**: Adaptive similarity adjustment

### Security Features

- Rate limiting (20 requests/minute default)
- CORS protection
- Helmet security headers
- Input validation and sanitization
- Error handling without information leakage

## 📊 Monitoring & Analytics

### Performance Metrics

- Response times and cache hit rates
- Query enhancement confidence scores
- Database optimization insights
- API error rates and uptime

### Alerting

Configurable alerts for:
- High response times (>1000ms)
- Low cache hit rate (<50%)
- High memory usage (>500MB Redis)
- API error rate (>5%)

### Usage Analytics

- Query patterns and user behavior
- Popular content and search terms
- Performance trends and optimization opportunities

## 🧪 Testing

The project includes comprehensive testing:

- **40 tests** across 6 test suites
- **Co-located tests** with source code
- **Performance validation** with actual timing
- **Graceful degradation** for optional dependencies

See [TESTING.md](./TESTING.md) for detailed testing documentation.

## 💾 Database Architecture

### PostgreSQL + pgvector Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                          ARTICLES                              │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID      PRIMARY KEY                          │
│ title           VARCHAR   Article title                        │
│ content         TEXT      Full article content                 │
│ slug            VARCHAR   URL-friendly identifier              │
│ locale          VARCHAR   Language (en/zh)                     │
│ series_id       UUID      FOREIGN KEY → series(id)            │
│ status          VARCHAR   published/draft/archived             │
│ created_at      TIMESTAMP Creation time                        │
│ updated_at      TIMESTAMP Last modification                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        EMBEDDINGS                              │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID      PRIMARY KEY                          │
│ article_id      UUID      FOREIGN KEY → articles(id)          │
│ chunk_text      TEXT      Text chunk for embedding             │
│ embedding       VECTOR    OpenAI embedding (1536 dimensions)   │
│ chunk_index     INTEGER   Position in article                  │
│ created_at      TIMESTAMP Generation time                      │
└─────────────────────────────────────────────────────────────────┘

RELATIONSHIPS: SERIES (1) ←→ (N) ARTICLES ←→ (N) EMBEDDINGS
INDEXES: Vector search, fast lookups, time-based queries
```

### Intelligent Caching System

```
┌─────────────────────────────────────────────────────────────────┐
│                    TTL STRATEGY                                │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│  High Quality   │ Medium Quality  │   Low Quality   │  Hybrid   │
│    24 hours     │    4 hours      │   30 minutes    │  1.5x TTL │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌───────┐ │
│ │Similarity   │ │ │Moderate     │ │ │Low scores   │ │ │Vector │ │
│ │Score > 0.8  │ │ │relevance    │ │ │< 0.6        │ │ │+ Text │ │
│ │High         │ │ │0.6 - 0.8    │ │ │Poor match   │ │ │Search │ │
│ │confidence   │ │ │Good enough  │ │ │Quick expire │ │ │Bonus  │ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └───────┘ │
└─────────────────┴─────────────────┴─────────────────┴───────────┘

PERFORMANCE: 20x Speed Improvement (114ms → 5ms)
CACHE HIT RATE: 95% target with quality-based TTL
```

### Vector Search Pipeline

```
EMBEDDING GENERATION:
────────────────────
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Article Text │───►│Text Chunking│───►│OpenAI Embed │───►│Store in     │
│(Markdown)   │    │512 tokens   │    │text-embed-3│    │pgvector     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘

SEARCH PROCESS:
──────────────
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│User Query   │───►│Query Embed  │───►│Cosine       │───►│Result       │
│(Enhanced)   │    │via OpenAI   │    │Similarity   │    │Ranking      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘

HYBRID SEARCH: Vector Search (Semantic) + Full-Text Search (BM25) = Best Results
```

## 🎨 Widget Architecture

### React Component Hierarchy

```
ArticlesAssistant SDK
├── FloatingButton
└── ChatWindow
    ├── Header
    ├── MessageList
    │   ├── Message (user/bot)
    │   └── TypingIndicator
    └── InputBox

INTEGRATION:
const assistant = new ArticlesAssistant({
  apiUrl: 'http://localhost:3002',
  locale: 'en',
  theme: 'light'
});
assistant.render('#container');
```

## 📊 Key Performance Metrics

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Cache Hit Rate | >50% | 95% | Redis caching effectiveness |
| API Response Time (Cached) | <50ms | ~5ms | Cached query performance |
| API Response Time (Fresh) | <500ms | ~114ms | Fresh query processing |
| Query Enhancement Confidence | >80% | 85% | AI enhancement quality |
| Memory Usage (Redis) | <500MB | Monitored | Cache memory consumption |
| API Error Rate | <5% | <1% | System reliability |
| Uptime | >99.9% | 99.9%+ | Service availability |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Run the test suite: `pnpm test`
5. Commit your changes: `git commit -m 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

### Development Guidelines

- Follow existing code conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

- **Documentation**: See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for detailed features and architecture
- **Testing**: See [TESTING.md](./TESTING.md) for testing guidelines
- **Issues**: Report bugs and feature requests in the repository issues

## 🔄 Recent Updates

**v2.0** - Cache & Optimization Release
- Advanced Redis caching with 20x performance improvement
- AI-powered query enhancement for better search results
- Real-time performance monitoring and alerting
- Dynamic threshold optimization and database analysis
- Comprehensive testing suite with 40 tests

---

**Built with ❤️ for better technical content discovery**