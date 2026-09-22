const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { idea } = req.body || {};

    if (!idea || !idea.trim()) {
      return res.status(400).json({
        error: "Please provide a business idea.",
      });
    }

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: "openai/gpt-5.6-luna-pro",

        messages: [
          {
            role: "system",
            content: `
You are the Research Analyst for an AI Boardroom.

Research the business idea using current web information.

Focus on:

1. Current direct competitors
2. Competitor pricing when publicly available
3. Existing alternatives
4. Evidence that customers experience this problem
5. Relevant market or industry information
6. Important barriers to entry
7. Important recent developments
8. Claims that could NOT be verified

RULES:

Never invent statistics.

Never invent competitors.

Never invent pricing.

Never present an assumption as a verified fact.

Prefer primary sources and credible sources.

When possible, include the source URL for important factual claims.

Clearly distinguish VERIFIED FACTS from ASSUMPTIONS.

Keep the report concise.
`,
          },

          {
            role: "user",
            content: `
Research this business opportunity:

${idea}
`,
          },
        ],

        tools: [
          {
            type: "openrouter:web_search",
            parameters: {
              engine: "exa",
              max_results: 5,
              max_total_results: 10,
              max_characters: 3000,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `OpenRouter error ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();

    return res.status(200).json({
      research:
        data?.choices?.[0]?.message?.content ||
        "No research returned.",

      searchRequests:
        data?.usage?.server_tool_use?.web_search_requests ??
        "Not reported",
    });
  } catch (error) {
    console.error("Research test error:", error);

    return res.status(500).json({
      error: error?.message || "Research test failed.",
    });
  }
}
