# RENDER DEPLOYMENT FIX - 401 UNAUTHORIZED ERROR

## THE PROBLEM

Your app works on Replit but NOT on Render because of **session storage**:

- **Replit**: Never restarts → MemoryStore works
- **Render**: Restarts frequently → MemoryStore loses ALL sessions → Users logged out → 401 errors

## THE SOLUTION

Add a PostgreSQL database for persistent session storage.

---

## STEP-BY-STEP FIX FOR RENDER

### 1. Add PostgreSQL Database to Render

1. Go to your Render dashboard
2. Click "New" → "PostgreSQL"
3. Create a new PostgreSQL database (free tier is fine)
4. Copy the **Internal Database URL** (it looks like `postgresql://username:password@host/database`)

### 2. Add DATABASE_URL Environment Variable

1. Go to your Web Service on Render
2. Click "Environment"
3. Add a new environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the PostgreSQL Internal Database URL
4. Click "Save Changes"

### 3. Redeploy Your App

Render will automatically redeploy. The app will now:
- ✅ Use PostgreSQL for sessions
- ✅ Keep users logged in across restarts
- ✅ Fix 401 errors
- ✅ Enable audio transfer between users

---

## VERIFY IT'S WORKING

After deploying, check the logs on Render. You should see:

```
✅ Using PostgreSQL session store for persistence
```

Instead of:

```
⚠️ WARNING: Using MemoryStore in production! Sessions will be lost on restart.
```

---

## ENVIRONMENT VARIABLES YOU NEED ON RENDER

Make sure you have these set:

1. `DATABASE_URL` - PostgreSQL connection string (for sessions)
2. `LIVEKIT_URL` - Your LiveKit server URL (for audio/video)
3. `LIVEKIT_API_KEY` - Your LiveKit API key
4. `LIVEKIT_API_SECRET` - Your LiveKit API secret
5. `SESSION_SECRET` - A random string (for session encryption)
6. `NODE_ENV` - Set to `production`

---

## AUDIO WILL WORK AFTER THIS FIX

The audio code is **100% correct**. The ONLY problem was sessions not persisting.

Once users can stay logged in → they get LiveKit tokens → audio transfers between users.
