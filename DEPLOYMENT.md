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
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `SESSION_SECRET`: A random secret string
   - Any Firebase variables (if using Firebase)

5. **Deploy** and Render will build and start your app

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

5. **Configure Start Command** (if needed):
   - Usually Railway detects this automatically from package.json

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

## Database Migrations

After deploying, you may need to run migrations to create the database tables:

```bash
npm run db:push
```

Or on your deployment platform, run:
```bash
npx drizzle-kit push
```

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
