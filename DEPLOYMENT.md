# TripStory Deployment Guide

## Recommended Structure

Use two deployments:

- Frontend: Vercel, from `tripstory/`
- Backend API: Render, Railway, Fly.io, or another Node web service, from the repository root
- Database: MongoDB Atlas

This project should not be converted to static-only hosting yet. The backend uses Express, MongoDB, auth cookies, file uploads, OpenAI image generation, admin APIs, and external travel/weather APIs.

## Best Low-Cost Path

The easiest migration from Railway is Render Web Service.

Render currently has a free web service instance type, but free services can be slow after inactivity. For a smoother always-on site, use a paid small instance. Railway also works well if you are okay with its monthly minimum.

Important: uploaded files are stored in the local `uploads/` folder. On many hosts, local disk is not permanent unless you attach persistent storage. For production, move uploads to Cloudinary, S3, or another object storage service.

## Backend Environment Variables

Set these on the backend hosting service:

```text
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=long-random-secret
JWT_REFRESH_SECRET=another-long-random-secret
CLIENT_ORIGIN=https://your-vercel-domain.vercel.app

KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=https://your-backend-domain/auth/kakao/callback

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://your-backend-domain/auth/google/callback

OPENAI_API_KEY=
KMA_SERVICE_KEY=
KTO_SERVICE_KEY=
```

Do not set `CLIENT_ORIGIN` to the backend URL. It must be the Vercel frontend URL.

## Frontend Environment Variables

Set this on Vercel for the frontend project:

```text
REACT_APP_API_URL=https://your-backend-domain
REACT_APP_NAVER_CLIENT_ID=...
REACT_APP_WEATHER_API_KEY=...
REACT_APP_KAKAO_REST_KEY=...
```

After changing `REACT_APP_API_URL`, redeploy the Vercel project. React embeds this value at build time.

## Render Setup

1. Push this repository to GitHub.
2. In Render, create a new Web Service from the repository.
3. Use root directory: repository root, not `tripstory/`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Health check path: `/healthz`
7. Add the backend environment variables above.
8. Deploy.
9. Copy the Render backend URL.
10. Put that URL into Vercel as `REACT_APP_API_URL`.
11. Put the Vercel URL into the backend as `CLIENT_ORIGIN`.

## Railway Setup

If you keep Railway, deploy only the backend from the repository root.

The `railway.toml` has been adjusted so Railway does not install and build the React frontend. Vercel already handles the frontend.

## OAuth Callback URLs

When the backend domain changes, update the OAuth provider dashboards too:

- Kakao redirect URI: `https://your-backend-domain/auth/kakao/callback`
- Google redirect URI: `https://your-backend-domain/auth/google/callback`

## Quick Verification

After backend deploy:

```text
https://your-backend-domain/healthz
```

Expected response:

```json
{"ok":true}
```

Then open the Vercel frontend and test:

- Register/login
- Refresh after login
- My page/profile update
- TripStory feed/write
- Admin login
