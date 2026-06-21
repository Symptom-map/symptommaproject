// ─────────────────────────────────────────────────────────────
// ai.js — todas las llamadas a Claude viven aquí
// Para cambiar un prompt, editá la función correspondiente.
// ─────────────────────────────────────────────────────────────

const API_URL = '/api/claude'

async function callClaude(prompt, maxTokens = 1000) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error ${res.status}`)
  }
  const data = await res.json()
  return data.content.map(b => b.text || '').join('').trim()
    .replace(/```json|```/g, '').trim()
}

// ── 1. Sugerir síntomas ───────────────────────────────────────
export async function suggestSymptoms({ diagLabels, diagProfiles, existingNames, lang = 'es' }) {
  const profileContext = Object.entries(diagProfiles || {})
    .map(([id, p]) => {
      const parts = []
      if (p.subtype?.length) parts.push(`subtipo: ${[].concat(p.subtype).join(', ')}`)
      if (p.age)             parts.push(`diagnosticada a los ${p.age}`)
      if (p.triggers?.length)parts.push(`detonadores: ${[].concat(p.triggers).join(', ')}`)
      if (p.known)           parts.push(`síntomas conocidos: ${p.known}`)
      return parts.length ? `${id}: ${parts.join(' | ')}` : null
    })
    .filter(Boolean).join('\n')

  const isES = lang === 'es'
  const prompt = isES
    ? `Eres un asistente de psicoeducación para personas con diagnósticos de salud mental confirmados.

Diagnósticos: ${diagLabels.join(', ')}.
${profileContext ? `Perfil:\n${profileContext}` : ''}
Síntomas ya en el mapa: ${existingNames.length ? existingNames.join(', ') : 'ninguno'}.

Sugiere 8-12 síntomas relevantes para este perfil. Enfócate en intersecciones entre diagnósticos. Lenguaje de primera persona, no patologizante.

Responde SO