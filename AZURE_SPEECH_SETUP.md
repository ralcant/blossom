# Azure Speech Service Setup Guide

## What You Need

Blossom uses **Azure Speech Service** for audio transcription with word-level timestamps.

## Setup Steps

### 1. Create Azure Speech Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"**
3. Search for **"Speech"** or **"Cognitive Services Speech"**
4. Click **"Create"**
5. Fill in:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new or select existing
   - **Region**: Choose closest region (e.g., `eastus`, `westus2`)
   - **Name**: Choose a unique name (e.g., `blossom-speech`)
   - **Pricing tier**: **Free F0** (20 hours/month) or **Standard S0**
6. Click **"Review + Create"** → **"Create"**

### 2. Get Your Credentials

Once the resource is created:

1. Go to your Speech resource
2. Click **"Keys and Endpoint"** in the left menu
3. Copy:
   - **Key 1** or **Key 2** (either works)
   - **Location/Region** (e.g., `eastus`)

### 3. Add to Environment Variables

Update your `.env.local` file:

```env
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=eastus  # or your chosen region
```

## Pricing

- **Free Tier (F0)**: 5 hours/month of audio transcription
  - Perfect for testing and hobby projects
  - No credit card required initially

- **Standard Tier (S0)**: $1/hour of audio transcription
  - $0.006/minute of audio (batch transcription)
  - Pay only for what you use

For a 3-minute song: **$0.018** per transcription

## Features Included

✅ Word-level timestamps
✅ High accuracy transcription
✅ No file size limits (unlike OpenAI Whisper's 25MB cap)
✅ Speaker diarization support (optional)
✅ Support for 100+ languages

## Comparison

| Feature | Azure Speech | Azure OpenAI Whisper |
|---------|-------------|---------------------|
| Cost | $0.006/min | $0.017/min |
| Word timestamps | ✅ Yes | ✅ Yes |
| File size limit | None | 25MB |
| Diarization | ✅ Yes | ❌ No |

**Bottom line**: Azure Speech is **3x cheaper** and better for this use case!
