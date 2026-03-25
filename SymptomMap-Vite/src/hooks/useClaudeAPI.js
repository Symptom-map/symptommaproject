// src/hooks/useClaudeAPI.js
import { useState } from 'react';

export function useClaudeAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateSuggestions = async (selectedDiags, currentSymptoms, diagMap) => {
    setLoading(true);
    setError(null);

    try {
      // Build prompt with exact same logic as original
      const diagLabels = selectedDiags
        .map(id => diagMap[id]?.label || id)
        .join(', ');

      const syms = currentSymptoms
        .filter(n => !n.hub)
        .map(n => n.name)
        .join(', ') || 'none yet';

      const prompt = `You are a psychoeducation assistant for SymptomMap.

The user has these mental health diagnoses: ${diagLabels}

They already mapped these symptoms: ${syms}

Suggest 6-8 NEW symptoms (not already in their map) they might experience.

Focus on:
- Intersections between their diagnoses
- Lesser-known but common symptoms
- Things they might not realize are symptoms

Respond ONLY with valid JSON (no markdown, no preamble):
{
  "symptoms": [
    {
      "name": "brief name (max 4 words)",
      "reason": "1 sentence why it appears with their diagnoses",
      "diagnoses": ["diagnosis1", "diagnosis2"]
    }
  ]
}

Examples:
- For TDA + Ansiedad: "Parálisis por decisiones"
- For TLP + C-PTSD: "Hipervigilancia emocional"
- For AN + TLP: "Disociación alimentaria"

IMPORTANT:
- DO NOT suggest symptoms already in their map
- Keep names concise and relatable
- Reason should explain the connection, not describe the symptom
- Use the same language as the diagnosis labels (Spanish if they're in Spanish)`;

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract text from response
      const text = data.content
        .map(block => block.text || '')
        .join('')
        .trim()
        .replace(/```json|```/g, '')
        .trim();

      const parsed = JSON.parse(text);

      // Map diagnosis names to IDs
      const suggestions = (parsed.symptoms || []).map((s, idx) => {
        const conds = (s.diagnoses || [])
          .map(diagName => {
            // Find matching diagnosis by label
            const found = Object.values(diagMap).find(
              d => d.label.toLowerCase() === diagName.toLowerCase()
            );
            return found?.id;
          })
          .filter(Boolean);

        return {
          name: s.name,
          reason: s.reason,
          conds: conds.length > 0 ? conds : selectedDiags.slice(0, 1), // fallback to first diag
          _idx: idx
        };
      });

      setLoading(false);
      return suggestions;

    } catch (err) {
      console.error('Claude API error:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const generateCustomSymptoms = async (customDiagName, otherDiags, diagMap) => {
    setLoading(true);
    setError(null);

    try {
      const otherLabels = otherDiags
        .map(id => diagMap[id]?.label || id)
        .join(', ') || 'none';

      const prompt = `You are a psychoeducation assistant.

The user has been diagnosed with: ${customDiagName}
They also have these other diagnoses: ${otherLabels}.

Suggest 6-8 common symptoms or experiences for "${customDiagName}", focusing on intersections with their other diagnoses if applicable.

Respond ONLY with valid JSON (no markdown, no preamble):
{
  "symptoms": [
    { "name": "short symptom name (max 4 words)", "reason": "brief explanation why it appears" }
  ]
}`;

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content
        .map(block => block.text || '')
        .join('')
        .trim()
        .replace(/```json|```/g, '')
        .trim();

      const parsed = JSON.parse(text);

      setLoading(false);
      return parsed.symptoms || [];

    } catch (err) {
      console.error('Claude API error:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    generateSuggestions,
    generateCustomSymptoms,
    loading,
    error
  };
}
