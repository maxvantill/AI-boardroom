export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { idea } = req.body;

    if (!idea || !idea.trim()) {
      return res.status(400).json({
        error: "Please provide a business idea."
      });
    }

    const OPENROUTER_URL =
      "https://openrouter.ai/api/v1/chat/completions";

    async function askAgent(role, instructions, context = "") {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai-boardroom-eight.vercel.app",
          "X-Title": "AI Boardroom"
        },
        body: JSON.stringify({
          model: "openrouter/free",

          // If the selected free model fails,
          // OpenRouter can try another available free model.
          models: [
            "nvidia/nemotron-3-ultra-253b-v1:free",
            "google/gemma-4-31b-it:free",
            "inclusionai/ling-2.0:free",
            "openrouter/free"
          ],

          messages: [
            {
              role: "system",
              content: `You are the ${role} on an elite AI Boardroom.

Your job is to challenge assumptions rather than blindly agree.

${instructions}

Be specific.
Separate facts from assumptions.
Do not invent market data.
Point out what needs to be tested in the real world.`
            },
            {
              role: "user",
              content: `
BUSINESS IDEA:

${idea}

${context}
`
            }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
          `${role} failed to respond.`
        );
      }

      return data.choices?.[0]?.message?.content ||
        `${role} returned no response.`;
    }

    // CEO
    const ceo = await askAgent(
      "CEO / Strategist",
      `
Develop the overall business strategy.

Analyze:
- The customer problem
- Target customer
- Why someone would pay
- Differentiation
- Business model
- Scalability
- What could make the idea fail
`
    );

    // MARKET
    const market = await askAgent(
      "Market Researcher",
      `
Analyze the market.

Determine:
- Competitors
- Existing alternatives
- Customer demand assumptions
- Target market
- Customer acquisition challenges
- What needs real-world validation

Do not invent statistics.
`
    );

    // CTO
    const cto = await askAgent(
      "CTO / Technology Officer",
      `
Analyze technical feasibility.

Determine:
- Technology required
- What can be built cheaply
- What should NOT be built initially
- Where AI actually helps
- Security and scalability concerns
`
    );

    // CFO
    const cfo = await askAgent(
      "CFO / Financial Officer",
      `
Attack the economics.

Determine:
- Who pays
- Revenue model
- Major costs
- Customer acquisition
- Potential margins
- Scalability
- Financial assumptions that must be tested
`
    );

    // DEVIL'S ADVOCATE
    const debateContext = `
CEO:
${ceo}

MARKET RESEARCHER:
${market}

CTO:
${cto}

CFO:
${cfo}
`;

    const devil = await askAgent(
      "Devil's Advocate / Red Team",
      `
Try to destroy this business idea.

Look for:
- Weak assumptions
- Fake differentiation
- Competition
- Bad economics
- Technical problems
- Customer acquisition problems
- Reasons customers may not care

Then identify:
1. Strongest argument against it
2. Strongest argument for it
3. Evidence needed to prove the idea
4. The first experiment the founder should run
`,
      debateContext
    );

    // CHAIRMAN
    const fullBoardroom = `
CEO:
${ceo}

MARKET RESEARCHER:
${market}

CTO:
${cto}

CFO:
${cfo}

DEVIL'S ADVOCATE:
${devil}
`;

    const chairman = await askAgent(
      "Chairman / Final Synthesizer",
      `
Analyze the entire Boardroom debate.

Produce:

1. EXECUTIVE VERDICT
Does this idea deserve a real-world test?

2. CORE PROBLEM

3. TARGET CUSTOMER

4. BUSINESS MODEL

5. DIFFERENTIATION

6. BIGGEST RISKS

7. ASSUMPTION LEDGER
Separate:
- Known
- Believed
- Unknown

8. 30-DAY VALIDATION PLAN

9. KILL CRITERIA
What evidence would cause the founder to abandon or change the idea?

10. REVISED BUSINESS MODEL
If necessary, redesign the idea.

11. FINAL ACTION
Give the single most important next action.

Do not simply agree with the founder.
The goal is evidence, not encouragement.
`,
      fullBoardroom
    );

    return res.status(200).json({
      success: true,
      response: `
# AI BOARDROOM ANALYSIS

## CEO / STRATEGIST

${ceo}

---

## MARKET RESEARCHER

${market}

---

## CTO

${cto}

---

## CFO

${cfo}

---

## DEVIL'S ADVOCATE

${devil}

---

# CHAIRMAN'S FINAL SYNTHESIS

${chairman}
`
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Boardroom error."
    });
  }
}
