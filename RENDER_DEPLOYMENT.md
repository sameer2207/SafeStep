# Deploy to Render.com - Step by Step

## Step 1: Create Account

1. Go to **https://render.com**
2. Click "Sign Up"
3. Use GitHub to sign up (easier)

## Step 2: Connect GitHub Repository

1. On Render, click "New +"
2. Select "Web Service"
3. Click "Connect account" (GitHub)
4. Select your repository: **Kunal862-art/PROJECT-2**
5. Click "Connect"

## Step 3: Configure the Service

Fill in these settings:

| Field             | Value                                        |
| ----------------- | -------------------------------------------- |
| **Name**          | safestep-backend                             |
| **Runtime**       | Python 3                                     |
| **Build Command** | `pip install -r requirements.txt`            |
| **Start Command** | `gunicorn -w 4 -b 0.0.0.0:$PORT backend:app` |
| **Environment**   | Free                                         |
| **Region**        | Choose closest to you                        |

## Step 4: Add Environment Variables (Optional but Recommended)

Click "Add Environment Variable"

| Key              | Value      |
| ---------------- | ---------- |
| FLASK_ENV        | production |
| PYTHONUNBUFFERED | true       |

## Step 5: Deploy

1. Click "Create Web Service"
2. Wait for deployment (2-3 minutes)
3. Once deployed, you'll see a URL like: `https://safestep-backend.onrender.com`

## Step 6: Update Frontend

Once you have your backend URL:

1. Go to **app.js** (line 7)
2. Change this:

```javascript
const API_BASE_URL = "https://safestep-backend.onrender.com/api";
```

To your actual URL (replace `safestep-backend` with whatever name Render gives you):

```javascript
const API_BASE_URL = "https://your-actual-render-url.onrender.com/api";
```

3. Commit and push to GitHub
4. Netlify will auto-redeploy

## Step 7: Test

1. Go to your Netlify site: https://kunal-safestep.netlify.app/
2. Try to login
3. Should work now!

## Troubleshooting

### Backend URL is wrong

- Check Render dashboard for the correct URL
- Update app.js line 7

### Still getting "Backend returned invalid response"

- Check browser console (F12)
- Verify backend URL is accessible: `https://your-url.onrender.com/api/health`

### Backend keeps crashing

- Check Render logs
- Make sure `gunicorn` is in requirements.txt

---

**Your current app.js is set to:**

- `https://safestep-backend.onrender.com/api`

If Render generates a different URL, update line 7 in app.js with the correct one!
