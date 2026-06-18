# TripStory Deployment Guide

## Recommended Structure

Use two deployments:

- Frontend: Vercel, from `tripstory/`
- Backend API: Render, from the repository root
- Database: MongoDB Atlas

This project should not be converted to static-only hosting yet. The backend uses Express, MongoDB, auth cookies, file uploads, OpenAI image generation, admin APIs, and external travel/weather APIs.

## Current Deployment

TripStory is currently deployed here:

- Frontend: `https://trip-story-rose.vercel.app`
- Backend API: `https://tripstory-api.onrender.com`

Render currently has a free web service instance type, but free services can be slow after inactivity. For a smoother always-on site, use a paid small instance.

Important: uploaded files are stored in the local `uploads/` folder. On many hosts, local disk is not permanent unless you attach persistent storage. For production, move uploads to Cloudinary, S3, or another object storage service.

## Backend Environment Variables

Set these on the backend hosting service:

```text
NODE_ENV=production
PORT=8080
CLEAR_VENDOR_SAMPLE_DATA=false
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=long-random-secret
JWT_REFRESH_SECRET=another-long-random-secret
ADMIN_SIGNUP_SECRET=optional-admin-signup-code
CLIENT_ORIGIN=https://trip-story-rose.vercel.app

KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=https://tripstory-api.onrender.com/auth/kakao/callback
KAKAO_REST_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://tripstory-api.onrender.com/auth/google/callback

OPENAI_API_KEY=
KMA_SERVICE_KEY=
KTO_SERVICE_KEY=
OPENWEATHER_API_KEY=

WEATHER_API_URL=
KTO_API_URL=
KTO_LOC_API_URL=
KTO_AREACODE_API_URL=
```

Do not set `CLIENT_ORIGIN` to the backend URL. It must be the Vercel frontend URL.

### Backend Variable Map

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | Express, cookies, TLS behavior | Use `production` on Render and `development` locally. |
| `PORT` | No | Express server | Render injects a port automatically; local default is `8080`. |
| `CLEAR_VENDOR_SAMPLE_DATA` | No | Local market seed cleanup | Keep `false` unless intentionally clearing vendor sample data in development. |
| `MONGODB_URI` | Yes | Mongoose | Local example: `mongodb://127.0.0.1:27017/tripstory`. |
| `MONGO_URI`, `MONGO_URL` | No | Legacy seed/fix scripts | Optional aliases for one-off scripts only. |
| `JWT_ACCESS_SECRET` | Yes | Login/session auth | Use a long random value. |
| `JWT_REFRESH_SECRET` | Yes | Refresh cookies | Use a different long random value from access secret. |
| `ADMIN_SIGNUP_SECRET` | No | Admin signup | If set, admin registration requires this code. |
| `JWT_SECRET`, `JWT_USER_SECRET`, `JWT_ADMIN_SECRET`, `ADMIN_JWT_SECRET` | No | Notice router fallback | Legacy token secret fallbacks. Prefer `JWT_ACCESS_SECRET` for normal auth. |
| `CLIENT_ORIGIN` | Yes | CORS and OAuth return URL | Must be the frontend URL, not the API URL. |
| `KAKAO_CLIENT_ID` | For Kakao login | `/auth/kakao` | Kakao OAuth REST API key/client id. |
| `KAKAO_CLIENT_SECRET` | Optional | `/auth/kakao/callback` | Only needed if enabled in Kakao settings. |
| `KAKAO_REDIRECT_URI` | For Kakao login | OAuth callback | Must match Kakao Developers exactly. |
| `KAKAO_REST_KEY` | For maps/places | `/geo/kakao`, `/api/places` | Used for Kakao local/place APIs. |
| `GOOGLE_CLIENT_ID` | For Google login | `/auth/google` | Google OAuth client id. |
| `GOOGLE_CLIENT_SECRET` | For Google login | `/auth/google/callback` | Google OAuth client secret. |
| `GOOGLE_REDIRECT_URI` | For Google login | OAuth callback | Must match Google Cloud Console exactly. |
| `OPENAI_API_KEY` | For AI features | AI trip/story/image routes | AI generation fails without it. |
| `KMA_SERVICE_KEY` | For weather course | `/api/weather-course` | Encoding key expected by current backend. |
| `KTO_SERVICE_KEY` | For tourism/course data | `/api/weather-course` | Encoding key expected by current backend. |
| `OPENWEATHER_API_KEY` | For weather tiles | `/tiles/...` route | Used by backend weather tile proxy. |
| `WEATHER_API_URL`, `KTO_API_URL`, `KTO_LOC_API_URL`, `KTO_AREACODE_API_URL` | No | Weather course router | Endpoint overrides; usually leave blank. |
| `HTTPS_PROXY`, `HTTP_PROXY` | No | External API requests | Optional proxy settings for restricted networks. |
| `SEED_AUTHOR_ID`, `SEED_AUTHOR_NAME`, `SEED_PLACEHOLDER_IMG` | No | Seed scripts | Only needed when running sample-data scripts. |

## Frontend Environment Variables

Set this on Vercel for the frontend project:

```text
REACT_APP_API_URL=https://tripstory-api.onrender.com
REACT_APP_NAVER_CLIENT_ID=...
REACT_APP_WEATHER_API_KEY=...
REACT_APP_KAKAO_REST_KEY=...
```

After changing `REACT_APP_API_URL`, redeploy the Vercel project. React embeds this value at build time.

### Frontend Variable Map

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `REACT_APP_API_URL` | Yes in deploy | API clients, OAuth links, uploaded images | Use an empty value locally only when relying on CRA proxy. |
| `REACT_APP_NAVER_CLIENT_ID` | For map screens | Naver Maps SDK | Needed by Trip map and route preview screens. |
| `REACT_APP_WEATHER_API_KEY` | For weather widgets | OpenWeather frontend calls | Needed by main/weather course widgets. |
| `REACT_APP_KAKAO_REST_KEY` | Optional fallback | Frontend reverse geocoding | Used when Kakao address lookup runs in the browser. |

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

## OAuth Callback URLs

When the backend domain changes, update the OAuth provider dashboards too:

- Kakao redirect URI: `https://tripstory-api.onrender.com/auth/kakao/callback`
- Google redirect URI: `https://tripstory-api.onrender.com/auth/google/callback`

## Quick Verification

After backend deploy:

```text
https://tripstory-api.onrender.com/healthz
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
