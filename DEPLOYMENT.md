# Deployment Guide for External Platforms

This guide helps you deploy your StudyConnect application to external platforms like Render, Railway, or Heroku.

## Environment Variables

Your deployment platform needs these environment variables:

### Required Variables

1. **DATABASE_URL** (Required)
   - Your PostgreSQL database connection string
   - Example: `postgresql://user:password@host.neon.tech/database?sslmode=require`
   - Get this from your Neon, Supabase, or other PostgreSQL provider

2. **SESSION_SECRET** (Required for production)
   - A long random string for session encryption
   - Generate one: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Optional Variables

3. **DATABASE_SSL** (Optional)
   - Set to `"false"` only for local development
   - Default: SSL enabled with `rejectUnauthorized: false`
   - For production, keep this enabled (default)

4. **USE_NEON_HTTP** (Optional)
   - Set to `"true"` to force Neon HTTP driver (serverless)
   - Default: Auto-detected (Neon HTTP on Replit, node-postgres elsewhere)
   - Usually you don't need to set this

5. **Firebase Variables** (Optional, if using Firebase)
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

## Database Setup

The application uses **PostgreSQL**. You need to provision a PostgreSQL database from:

- **Neon** (recommended for serverless): https://neon.tech
- **Supabase**: https://supabase.com
- **Railway**: https://railway.app
- **ElephantSQL**: https://www.elephantsql.com
- Or any other PostgreSQL provider

### Database Connection

The app automatically uses the right database driver:
- **On Replit**: Uses Neon HTTP driver (serverless, optimized for Replit)
- **On Render/Railway/Heroku**: Uses node-postgres driver (traditional, works everywhere)

This is detected automatically - you don't need to configure anything!

## Deployment to Render

1. **Create a new Web Service** on Render

2. **Connect your GitHub repository**

3. **Configure the service:**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Environment**: Node

4. **Add Environment Variables:**
   - `DATABASE_URL`: Your PostgreSQL connection string (required!)
   - `SESSION_SECRET`: A random secret string
   - Any Firebase variables (if using Firebase)

5. **Deploy** - Your app will deploy successfully

6. **Run Database Migrations** (one-time, after first deploy):
   - Go to Render Shell or run command
   - Execute: `npm run db:push`
   - This creates all database tables
   - Only needed once (or when schema changes)

## Deployment to Railway

1. **Create a new project** on Railway

2. **Deploy from GitHub**

3. **Add PostgreSQL database:**
   - Railway can provision a PostgreSQL database automatically
   - Or connect to your external database

4. **Add Environment Variables:**
   - `DATABASE_URL`: Railway will set this automatically if you use their PostgreSQL
   - `SESSION_SECRET`: A random secret string
   - Any Firebase variables (if using Firebase)

5. **Run Database Migrations** (one-time, after deploy):
   - Open Railway's dashboard
   - Go to your service → Variables
   - Run: `npm run db:push` in the Railway CLI or via dashboard
   - This creates all database tables

## Deployment to Heroku

1. **Create a new app** on Heroku

2. **Add PostgreSQL addon:**
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```
   This automatically sets DATABASE_URL

3. **Set environment variables:**
   ```bash
   heroku config:set SESSION_SECRET="your-random-secret-here"
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

5. **Run Database Migrations** (one-time):
   ```bash
   heroku run npm run db:push
   ```

## Database Migrations

**Important:** After deploying for the first time (or after schema changes), you must run migrations to create/update database tables.

### When to Run Migrations

Run migrations:
- ✅ After your first deployment
- ✅ After changing database schema in `shared/db-schema.ts`
- ✅ If you see "relation does not exist" errors

### How to Run Migrations

**On Render:**
```bash
# Option 1: Use Render Shell (Dashboard → Shell tab)
npm run db:push

# Option 2: SSH into your service
render ssh
npm run db:push
```

**On Railway:**
```bash
# Use Railway CLI
railway run npm run db:push
```

**On Heroku:**
```bash
# Use heroku run command
heroku run npm run db:push
```

**Locally or via SSH:**
```bash
npm run db:push
```

### Migration Notes

- **Safe & Idempotent**: `db:push` won't break existing data
- **One-time**: You don't need to run this on every deploy
- **Schema Changes**: Only run again when you modify `shared/db-schema.ts`
- **Error "tables already exist"**: This is normal on re-runs, migrations are idempotent

### Why Not Automatic?

We don't run migrations automatically during app startup because:
- ❌ Blocks app start if migrations are slow
- ❌ Can cause issues on health check restarts
- ❌ Requires database access during build/startup
- ✅ Running manually gives you control

## Troubleshooting

### Database Connection Errors

If you see "Error connecting to database" errors:

1. **Check DATABASE_URL** is set correctly
2. **Verify SSL settings**: Most cloud databases require SSL
3. **Check firewall**: Make sure your deployment platform's IP is allowed
4. **Test connection**: Use `psql` or a database client to verify the connection string works

### Port Issues

The application uses port 5000 by default. Most platforms override this with their own PORT environment variable, which the app respects.

### Build Failures

If the build fails:

1. **Check Node version**: This app requires Node.js 18 or higher
2. **Clear cache**: Try clearing your platform's build cache
3. **Check dependencies**: Make sure all packages in package.json are available

## Development vs Production

- **Development (Replit)**: Uses Neon HTTP driver, optimized for Replit's environment
- **Production (Render/Railway/etc)**: Uses node-postgres driver, works on traditional hosting

The app automatically detects the environment and uses the appropriate driver. You don't need to change anything!

## Need Help?

Check the `.env.example` file in the project root for a template of required environment variables.
