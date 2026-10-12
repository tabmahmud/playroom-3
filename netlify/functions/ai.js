// PLAYROOM Groq AI proxy. Set GROQ_API_KEY in Netlify environment variables (Functions scope).
const SYSTEM = 'You are PLAYROOM AI, a friendly, accurate assistant for studying, coding, and explaining browser games. Be concise, honest, and age-appropriate. Never claim you can see or control the website.';
const json = (statusCode, payload) => ({statusCode, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body:JSON.stringify(payload)});
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405,{error:'Method not allowed'});
  const key = process.env.GROQ_API_KEY;
  if (!key) return json(503,{error:'AI is not configured. Set GROQ_API_KEY in Netlify environment variables.'});
  if ((event.body || '').length > 14000) return json(413,{error:'Request too large'});
  try {
    const body = JSON.parse(event.body || '{}');
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const clean = messages.slice(-12).filter(m => ['user','assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim()).map(m => ({role:m.role,content:m.content.slice(0,1200)}));
    if (!clean.length || clean[clean.length-1].role !== 'user') return json(400,{error:'Message required'});
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    let response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},
        body:JSON.stringify({model,messages:[{role:'system',content:SYSTEM},...clean],max_completion_tokens:700}),
        signal:controller.signal
      });
    } finally { clearTimeout(timer); }
    if (!response.ok) {
      if (response.status === 429) return json(502,{error:'Groq free-tier rate limit reached (429). Wait before trying again.'});
      if (response.status === 401 || response.status === 403) return json(502,{error:'Groq authentication error ('+response.status+'). Check GROQ_API_KEY and account access.'});
      return json(502,{error:'Groq provider error ('+response.status+'). Check model availability and account limits.'});
    }
    const result = await response.json();
    const reply = result.choices?.[0]?.message?.content?.trim();
    if (!reply) return json(502,{error:'Groq returned no text. Try another question.'});
    return json(200,{reply});
  } catch(e) {
    return json(500,{error:e.name === 'AbortError' ? 'Groq request timed out. Try again.' : 'Unable to complete the AI request.'});
  }
};
