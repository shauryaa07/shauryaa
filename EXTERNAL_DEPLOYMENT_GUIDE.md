# Deploy StudyConnect to Any Platform

This app uses **100% standard infrastructure** and can be deployed to any Node.js hosting platform (Render, Railway, Fly.io, Heroku, etc.).

## Prerequisites

1. A PostgreSQL database (any provider: Render, Neon, Railway, Supabase, etc.)
2. Node.js 20+ hosting platform

## Environment Variables

Set these in your deployment platform:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PORT` | No | Server port (auto-set by most platforms) | `10000` |
| `DATABASE_SSL` | No | Set to `false` to disable SSL | `true` (default) |

## Deployment Steps

### Option 1: Deploy to Render

1. **Create PostgreSQL Database**
   - Go to https://dashboard.render.com
   - Click "New +" → "PostgreSQL"
   - Choose a name and region
   - Click "Create Database"
   - Copy the **Internal Database URL**

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Build Command**: `npm install && npm run db:push && npm run build`
     - **Start Command**: `npm run start`
   - Add environment variable:
     - Key: `DATABASE_URL`
     - Value: (paste your database URL)
   - Click "Create Web Service"

3. **Done!** Your app will build and deploy automatically.

### Option 2: Deploy to Railway

1. **Create PostgreSQL Database**
   - New Project → "Provision PostgreSQL"
   - Copy the `DATABASE_URL` from the Variables tab

2. **Deploy App**
   - New → "Deploy from GitHub repo"
   - Select your repository
   - Railway auto-detects the build process
   - Add `DATABASE_URL` environment variable
   - Deploy!

### Option 3: Deploy to Fly.io

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create App**
   ```bash
   fly launch
   ```

3. **Add PostgreSQL**
   ```bash
   fly postgres create
   fly postgres attach
   ```

4. **Deploy**
   ```bash
   fly deploy
   ```

## Build Commands Explained

```bash
# Install dependencies
npm install

# Push database schema (creates tables)
npm run db:push

# Build frontend and backend
npm run build
```

## Start Command

```bash
npm run start
```

This runs the production server on the port specified by the `PORT` environment variable (default: 5000).

## Database Schema Migration

The first deployment will automatically create all database tables via `npm run db:push`.

If you update the schema later:
1. Update `shared/db-schema.ts`
2. Redeploy (the build command runs `db:push` automatically)

## SSL Configuration

Most PostgreSQL providers require SSL. The app enables SSL by default.

To disable SSL (not recommended):
```
DATABASE_SSL=false
```

## Troubleshooting

### Build fails with "drizzle-kit: not found"
- Make sure `drizzle-kit` is in `dependencies` (not `devDependencies`) in package.json
- It's already configured correctly in this project

### Database connection fails
- Verify `DATABASE_URL` is set correctly
- Check that your database allows connections from your hosting platform's IP
- Make sure SSL is enabled (or disabled if your database doesn't use SSL)

### App crashes on startup
- Check the logs for specific errors
- Verify `DATABASE_URL` is accessible
- Ensure database schema was pushed successfully

## Scaling

This app is stateless and can be horizontally scaled by adding more instances. WebRTC connections are peer-to-peer, so no additional infrastructure is needed for video.

## What's Included

- ✅ Standard PostgreSQL database (node-postgres)
- ✅ Express.js backend
- ✅ React + Vite frontend
- ✅ WebRTC for peer-to-peer video
- ✅ WebSocket for real-time messaging
- ✅ Production-ready build process

## What's NOT Included (Platform Handles It)

- No cloud-specific SDKs
- No vendor lock-in
- No proprietary services
- Standard Node.js everywhere
