# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database Configuration
DB_PASSWORD=your_database_password_here

# JWT Secret for Authentication
JWT_SECRET=your_jwt_secret_here

# xAI Grok API Key (get from https://x.ai/api)
GROK_API_KEY=your_grok_api_key_here
```

## Getting Your Grok API Key

1. Visit https://x.ai/api
2. Sign in with your xAI account
3. Generate an API key
4. Add it to your `.env` file as `GROK_API_KEY`

## Docker Setup

The docker-compose.yml file will automatically load these environment variables. Make sure your `.env` file is in the same directory as `docker-compose.yml`.
