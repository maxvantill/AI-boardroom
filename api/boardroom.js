export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { idea } = req.body;

    if (!idea || !idea.trim()) {
      return res.status(400).json({ error: "Please provide a business idea." });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-boardroom-eight.vercel.app",
        "X-Title": "AI Boardroom"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "system",
            content:
              "You are the CEO and Strategist of an AI Boardroom. Analyze business ideas seriously. Do not blindly agree with the founder. Identify assumptions, weaknesses, opportunities, risks, competitors, and ways the idea could become a scalable business."
          },
          {
            role: "user",
            content: `Analyze this business idea as the first member of an AI Boardroom:\n\n${idea}`
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenRouter request failed."
      });
    }

    return res.status(200).json({
      success: true,
      response: data.choices?.[0]?.message?.content || "No response received."
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error."
    });
  }
}
