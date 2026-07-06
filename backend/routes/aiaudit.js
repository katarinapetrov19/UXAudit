const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');
const auth = require('../middleware/auth');

// Ensure ai_audit_counts table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_audit_counts (
    user_id TEXT NOT NULL,
    month TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, month),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const AI_LIMITS = { free: 3, pro: 100, agency: 500 };

const SYSTEM_PROMPT = `You are a senior UX designer auditing a web page. You will receive a structured extract of a page (headings, CTAs, navigation, forms, copy) and must identify real UX problems.

Return a JSON array of issues. Each issue must have:
- type: one of "Hierarchy" | "Copy" | "Navigation" | "Forms" | "Consistency" | "Clarity"
- severity: "Critical" | "Major" | "Minor" | "Info"
- message: a single clear sentence describing the problem (max 120 chars)
- recommendation: 1-2 sentences on how to fix it
- element: the element type involved (e.g. "h1", "button", "nav", "form")

Focus on:
- Hierarchy: Is there a clear visual and content hierarchy? Is the primary action obvious?
- Copy: Is the copy clear, specific, and action-oriented? Is there vague language?
- Navigation: Is navigation logical, labelled clearly, not overloaded?
- Forms: Are fields labelled, grouped logically, minimal?
- Consistency: Are patterns, terminology, and tone consistent?
- Clarity: Does the user immediately understand what the page is for and what to do?

Be specific — reference actual text from the page. Do not hallucinate elements that aren't in the extract.
Return ONLY valid JSON array, no markdown, no explanation.`;

router.post('/', auth, async (req, res) => {
  const user = req.user;
  const { url, pageStructure } = req.body;

  if (!url || !pageStructure) {
    return res.status(400).json({ error: 'url and pageStructure are required' });
  }

  // Check monthly limit
  const month = new Date().toISOString().slice(0, 7);
  const limit = AI_LIMITS[user.plan] ?? AI_LIMITS.free;
  let row = db.prepare('SELECT count FROM ai_audit_counts WHERE user_id = ? AND month = ?').get(user.id, month);
  const used = row ? row.count : 0;

  if (used >= limit) {
    return res.status(402).json({
      error: `AI audit limit reached (${limit}/month on ${user.plan} plan). Upgrade for more.`,
      used, limit
    });
  }

  // Build user message from page structure
  const userMessage = `URL: ${url}

PAGE STRUCTURE:
${JSON.stringify(pageStructure, null, 2)}

Audit this page and return issues as a JSON array.`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    });

    const raw = message.content[0]?.text || '[]';

    let issues;
    try {
      issues = JSON.parse(raw);
    } catch (e) {
      // Try to extract JSON from response if model added any wrapping text
      const match = raw.match(/\[[\s\S]*\]/);
      issues = match ? JSON.parse(match[0]) : [];
    }

    // Increment usage count
    if (row) {
      db.prepare('UPDATE ai_audit_counts SET count = count + 1 WHERE user_id = ? AND month = ?').run(user.id, month);
    } else {
      db.prepare('INSERT INTO ai_audit_counts (user_id, month, count) VALUES (?, ?, 1)').run(user.id, month);
    }

    res.json({
      issues,
      usage: { used: used + 1, limit, remaining: limit - used - 1 }
    });

  } catch (err) {
    console.error('AI audit error:', err);
    res.status(500).json({ error: 'AI audit failed: ' + err.message });
  }
});

module.exports = router;
