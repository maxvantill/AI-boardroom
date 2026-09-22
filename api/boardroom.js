const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function askAgent(
  systemPrompt,
  userPrompt,
  model = "openrouter/free"
) {
  console.log(
    "Starting agent:",
    systemPrompt.split("\n").find((line) => line.trim()) || "Unknown agent"
  );

  const controller = new AbortController();

  // Stop an individual AI request if it takes longer than 3 minutes
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
        model: model,
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
      systemPrompt.split("\n").find((line) => line.trim()) || "Unknown agent"
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
      Four independent executive analyses.
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

Never present an uncertain market claim as a verified fact.

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
You are the CFO in an adversarial AI Boardroom.

Give a concise financial analysis of the business idea.

Analyze:

1. How the business could make money.
2. The biggest costs.
3. The 3 biggest financial risks.
4. What must be true for the business to become profitable.
5. Which financial assumptions need to be tested.

Do not invent precise financial numbers and present them as facts.

If you use estimated numbers, clearly label them as assumptions.

Keep the entire response under 350 words.
`,
      `
Business opportunity:

${idea}

Give your independent Round 1 financial analysis.
`
    );

    /*
      Run all four executives simultaneously.
    */

    const [ceo, market, cto, cfo] = await Promise.all([
      ceoPromise,
      marketPromise,
      ctoPromise,
      cfoPromise,
    ]);

    const firstRound = `
CEO / STRATEGIST:

${ceo}

MARKET RESEARCHER:

${market}

CTO:

${cto}

CFO:

${cfo}
`;

    /*
      ROUND 2
      Devil's Advocate attacks the strongest assumptions.
    */

    const devil = await askAgent(
      `
You are the Devil's Advocate in an adversarial AI Boardroom.

Your job is to stress-test the business after reviewing the four executive analyses.

Do not criticize the idea just for the sake of being negative.

Find the weaknesses that could actually cause the business to fail.

Identify only:

1. The 3 biggest weaknesses in the business idea.

2. The 3 most dangerous assumptions.

3. The strongest argument against building the business.

4. What evidence would prove those concerns wrong.

5. If the original idea is flawed, identify one potentially stronger direction or pivot worth testing.

Do not repeat the other agents' analysis.

Be skeptical, specific, and constructive.

Keep the entire response under 500 words.
`,
      `
Business opportunity:

${idea}

ROUND 1 EXECUTIVE ANALYSES:

${firstRound}
`
    );

    /*
      FINAL SYNTHESIS
      Chairman receives the complete debate.
    */

    const chairman = await askAgent(
      `
You are the Chairman of an adversarial AI Boardroom.

You are responsible for making the final decision after reviewing the independent executives and the Devil's Advocate.

You are balanced, skeptical, and constructive.

Do not automatically support the founder.

Do not automatically reject risky ideas either.

Your job is to determine whether the opportunity deserves to be pursued, tested, changed, or abandoned.

When agents disagree, resolve the disagreement instead of simply repeating both opinions.

Give the founder a concise final decision.

Use this structure:

1. VERDICT

Choose exactly one:

PURSUE
TEST FIRST
PIVOT
PASS

2. WHY

Give the 3 strongest reasons for the verdict.

3. BIGGEST RISKS

Give the 3 risks most likely to cause the business to fail.

4. WHAT MUST BE PROVEN

Identify the most important assumptions that need real-world evidence.

5. NEXT STEPS

Give 5 specific actions the founder should take next.

The actions should prioritize validation before unnecessary spending or development.

6. BETTER VERSION

If there is a meaningful way to improve or reposition the idea, explain it briefly.

If the original idea is already strong, say what should remain unchanged.

Do not repeat entire sections from the other executives.

Do not pretend uncertain claims are verified facts.

Keep the entire response under 700 words.
`,
      `
Business opportunity:

${idea}

ROUND 1 EXECUTIVE ANALYSES:

${firstRound}

DEVIL'S ADVOCATE:

${devil}
`
    );

    /*
      SEND RESULTS TO FRONTEND
    */

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
