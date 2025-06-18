# Rickorty Visual Novel - Render Deployment Guide

## Quick Deploy to Render

1. **Fork/Upload** this repository to your GitHub account

2. **Connect to Render**:
   - Go to [render.com](https://render.com)
   - Click "New+" → "Web Service"
   - Connect your GitHub repository

3. **Configure Environment**:
   - Render will auto-detect the `render.yaml` configuration
   - **IMPORTANT**: Add your `CHUTES_API_KEY` environment variable:
     - In Render dashboard → Environment → Add Environment Variable
     - Key: `CHUTES_API_KEY`
     - Value: Your actual Chutes API key

4. **Deploy**:
   - Click "Deploy Web Service"
   - Wait for build to complete (should be very fast - no dependencies)
   - Your game will be live at the provided `.onrender.com` URL

## Files for Deployment

- `render.yaml` - Main deployment configuration
- `requirements-render.txt` - Empty requirements file (using built-in Python modules only)
- `server.py` - Updated to use Render's dynamic PORT environment variable

## Manual Deploy Alternative

If you prefer manual setup over render.yaml:

1. Create new Web Service in Render
2. Set **Build Command**: `pip install -r requirements-render.txt`
3. Set **Start Command**: `python server.py`
4. Add environment variable: `CHUTES_API_KEY`

The game will automatically handle the dynamic port assignment from Render.