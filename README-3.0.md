# PLAYROOM 3.0

Based on PLAYROOM Continuous Feed. Existing games and TikTok feed retained.

## What changed
- AI chat UI calls a Netlify Function, which calls an OpenAI model server-side.
- The secret API key is never embedded in public HTML or JS.
- Snake speeds up as you score.
- Branding updated to 3.0.

## Activate real AI
1. Upload the extracted folder as a Netlify site using Git-based deployment or Netlify CLI (the function must be deployed, not just opened as a local HTML file).
2. In Netlify site settings, add an environment variable named `OPENAI_API_KEY` with your own OpenAI API key. Optional: `OPENAI_MODEL` (default `gpt-4o-mini`).
3. Redeploy. Chat requests will then use the server function. API use may incur charges.
4. Configure Netlify rate limiting or authentication before sharing publicly: the endpoint otherwise allows visitors to consume your API quota.

## Limitations
- A ZIP opened locally cannot call Netlify functions. Without a deployed backend, AI displays an unavailable message.
- Existing offline calculator, quiz, and reference tabs continue to work.
- TikTok embeds require access to TikTok.
- This build has not been browser-tested end to end.
