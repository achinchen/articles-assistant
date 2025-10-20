# Deployment Guide

## Supabase Deployment

### Prerequisites
1. Supabase account and project
2. Upstash account for Redis (free tier)
3. GitHub repository with secrets configured
4. OpenAI API key

### Setup Instructions

#### 1. Create Supabase Project
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize project (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF
```

#### 2. Set up Upstash Redis
```bash
# 1. Go to https://console.upstash.com/
# 2. Create a new Redis database (free tier: 10K commands/day)
# 3. Copy the Redis URL from the dashboard
```

#### 3. Configure Environment Variables

Create the following secrets in your GitHub repository settings:

```
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
SUPABASE_DB_PASSWORD=your_database_password
SUPABASE_PROJECT_ID=your_project_ref
REDIS_URL=redis://default:your_password@your_endpoint.upstash.io:6379
OPENAI_API_KEY=your_openai_api_key
```

Create the following variables in your GitHub repository:

```
VITE_API_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1
```

#### 4. Deploy Database Schema
```bash
# Push migrations to Supabase
supabase db push
```

#### 5. Deploy Edge Functions
```bash
# Deploy the ask function
supabase functions deploy ask --no-verify-jwt

# Set environment variables for the function
supabase secrets set OPENAI_API_KEY=your_openai_api_key
supabase secrets set REDIS_URL=redis://default:your_password@your_endpoint.upstash.io:6379
```

#### 6. Enable Required Extensions
In your Supabase dashboard, go to Database > Extensions and enable:
- `vector` (for embeddings)
- `uuid-ossp` (for UUID generation)

### Widget Deployment

The widget is automatically built and deployed via GitHub Actions when you push to the main branch.

#### Manual Widget Build
```bash
# Install widget dependencies
pnpm widget:install

# Build widget
pnpm widget:build

# Preview widget locally
pnpm widget:preview
```

#### Widget Configuration
Update your environment variables:

```bash
# For Supabase Edge Functions
VITE_API_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1

# For direct API (if using Express server)
VITE_API_URL=https://your-api-domain.com
```

### CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will:

1. **Test**: Run unit tests and build API
2. **Build Widget**: Install dependencies, lint, and build the widget
3. **Deploy**: Deploy to Supabase (on main branch only)
   - Deploy database migrations
   - Deploy Edge Functions
   - Upload widget files to Supabase Storage

### Local Development with Supabase

```bash
# Start Supabase locally
supabase start

# Start local Redis (option 1: Docker)
docker-compose -f docker-compose.redis.yml up -d

# Start local Redis (option 2: Direct)
redis-server

# Run your API with local services
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres \
REDIS_URL=redis://localhost:6379 \
pnpm api:dev

# Develop widget with local API
cd widget
VITE_API_URL=http://localhost:3002 pnpm dev
```

### Alternative Redis Providers

If you prefer other Redis providers:

#### Redis Cloud (Redis Labs)
- Free tier: 30MB storage
- URL format: `redis://username:password@endpoint:port`

#### Railway
- $5/month credit covers Redis + other services  
- URL format: `redis://default:password@redis.railway.app:port`

#### Render
- Free tier with 90-day limit
- Good for development/testing

### Troubleshooting

#### Common Issues:

1. **Migration fails**: Ensure your database has the required extensions enabled
2. **Edge function deployment fails**: Check that OPENAI_API_KEY is set in Supabase secrets
3. **Widget can't connect**: Verify VITE_API_URL is correctly set and accessible
4. **CORS errors**: Update the corsHeaders in the Edge function if needed

#### Useful Commands:

```bash
# Check Supabase status
supabase status

# View function logs
supabase functions serve --debug

# Reset local database
supabase db reset

# Generate types from database
supabase gen types typescript --local > types/supabase.ts
```

### Production Checklist

- [ ] Supabase project created and configured
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Environment variables set
- [ ] GitHub secrets configured
- [ ] Widget build pipeline working
- [ ] CORS configured for production domains
- [ ] Rate limiting configured
- [ ] Monitoring and analytics enabled