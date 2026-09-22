const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function askAgent(systemPrompt, userPrompt) {
  console.log("Starting agent:", systemPrompt.split("\n").find(line => line.trim()) || "Unknown agent");
  const controller = new AbortController();

  // Stop an individual AI request if it takes longer than 60 seconds
const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
     body: JSON.stringify({
  model: "openrouter/free",
  messages: [
    {
      role: "system",
      content: String(systemPrompt ?? ""),
    },
    {
      role: "user",
      content: String(userPrompt ?? ""),
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

const answer =
  data?.choices?.[0]?.message?.content ||
  "No response returned by this agent.";

console.log(
  "Finished agent:",
  systemPrompt.split("\n").find(line => line.trim()) || "Unknown agent"
);

return answer;
  } finally {
    clearTimeout(timeout);
  }
}

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
        error: "Please enter a business idea.",
      });
    }

    /*
      ROUND 1

      These four agents are independent.

      We intentionally start all four requests BEFORE awaiting them,
      allowing them to run simultaneously.
    */

    const ceoPromise = askAgent(
      `
You are the CEO and Strategist in an adversarial AI Boardroom.

Your job is NOT to automatically support the founder's idea.

Analyze the opportunity from a strategy and business-building perspective.

Focus on:
- the customer
- the problem
- value proposition
- business model
- positioning
- scalability
- execution difficulty
- potential competitive advantage

Clearly separate:
- what appears to be fact
- what is an assumption
- what needs real-world validation

If the opportunity is weak, say so directly.

Do not assume the founder is correct.
`,
      `
Business opportunity:

${idea}

Give your independent Round 1 analysis.
`
    );

    const marketPromise = askAgent(
      `
You are the Market Researcher in an adversarial AI Boardroom.

Your job is to determine whether there is evidence that a real market exists.

Do NOT automatically agree with the business idea.

Analyze:
- target customer
- customer pain
- existing alternatives
- competitors
- market dynamics
- willingness to pay
- possible demand
- barriers to adoption

Separate:
- known or likely facts
- assumptions
- claims that require external research
- claims that require customer interviews or testing

Be skeptical.

If there is not enough evidence to support an important claim, say that clearly.
`,
      `
Business opportunity:

${idea}

Give your independent Round 1 market analysis.
`
    );

    const ctoPromise = askAgent(
      `
You are the CTO and Technology Officer in an adversarial AI Boardroom.

Determine whether this product can realistically be built.

Analyze:
- MVP architecture
- required software
- AI requirements
- APIs and external dependencies
- data requirements
- security and privacy risks
- reliability
- technical difficulty
- scalability
- estimated development complexity

Distinguish between:
- easy
- moderate
- difficult
- unknown

Challenge unnecessary technology.

If AI does not create a meaningful advantage, say so.
`,
      `
Business opportunity:

${idea}

Give your independent Round 1 technical analysis.
`
    );

    const cfoPromise = askAgent(
      `
You are the CFO and Financial Officer in an adversarial AI Boardroom.

Your job is to attack the economics.

Analyze:
- possible pricing
- revenue model
- gross margins
- customer acquisition cost
- lifetime value
- operating costs
- AI/API costs
- labor costs
- capital requirements
- break-even logic
- scalability

Do not invent precise numbers without explaining that they are assumptions.

Identify which financial variables could kill the business.

If the economics appear weak, say so directly.
`,
      `
Business opportunity:

${idea}

Give your independent Round 1 financial analysis.
`
    );

    /*
      Wait for all four independent agents together.
    */

    const [ceo, market, cto, cfo] = await Promise.all([
      ceoPromise,
      marketPromise,
      ctoPromise,
      cfoPromise,
    ]);

    /*
      ROUND 2

      Devil's Advocate receives all four independent analyses.
    */

    const firstRound = `
CEO / Strategist:
${ceo}

MARKET RESEARCHER:
${market}

CTO:
${cto}

CFO:
${cfo}
`;

   const devil = await askAgent(
  `
You are the Devil's Advocate in an AI Boardroom.

Review the business idea and the four Round 1 analyses.

Be concise. Identify only:

1. The 3 biggest weaknesses in the business idea.
2. The 3 most dangerous assumptions.
3. The strongest argument against building the business.
4. What evidence would prove those concerns wrong.

Do not repeat the other agents' analysis.
Keep your entire response under 500 words.
`,
  `
Business opportunity:

${idea}

Round 1 analyses:

${firstRound}
`
);
    /*
      FINAL SYNTHESIS

      Chairman sees the complete debate.
    */

const chairman = await askAgent(
  `
You are the Chairman of an AI Boardroom.

Give the founder a concise final decision based on the analyses below.

Include only:

1. VERDICT
Choose: PURSUE, TEST FIRST, PIVOT, or PASS.

2. WHY
Give the 3 strongest reasons for your verdict.

3. BIGGEST RISKS
Give the 3 biggest risks.

4. NEXT STEPS
Give 5 specific actions the founder should take next.

Do not repeat the other agents.
Keep the entire response under 600 words.

Business opportunity:

${idea}

ROUND 1:

${firstRound}

DEVIL'S ADVOCATE:

${devil}
`
);

    return res.status(200).json({
      idea,
      agents: {
        ceo,
        market,
        cto,
        cfo,
        devil,
        chairman,
      },
    });
  } catch (error) {
    console.error("Boardroom error:", error);

    if (error?.name === "AbortError") {
      return res.status(504).json({
        error:
          "An AI agent took too long to respond. Please try the Boardroom again.",
      });
    }

    return res.status(500).json({
      error: error?.message || "Boardroom failed.",
    });
  }
}
