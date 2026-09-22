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

    async function askAgent(model, role, instructions, context = "") {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai-boardroom-eight.vercel.app",
          "X-Title": "AI Boardroom"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `You are the ${role} on an elite AI Boardroom.

Your job is to challenge assumptions rather than blindly agree.

${instructions}

Be specific.
Separate facts from assumptions.
Do not invent market data.
Point out what would need to be tested in the real world.`
            },
            {
              role: "user",
              content: `
BUSINESS IDEA:

${idea}

${context}
`
            }
          ],
          temperature: 0.7
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

    // ==========================================
    // ROUND 1 — INDEPENDENT BOARD MEMBERS
    // ==========================================

    const ceo = await askAgent(
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "CEO / Strategist",
      `
Develop the overall business strategy.

Determine:
- What problem is being solved?
- Who specifically has the problem?
- Why would they pay?
- What could make this business meaningfully different?
- What is the simplest version that could be launched?
- How could it become a very large company?

Do not assume the idea is good.
`
    );

    const market = await askAgent(
      "inclusionai/ling-3.0-flash-fin:free",
      "Market Researcher",
      `
Analyze the market.

Determine:
- Who the competitors would be
- What existing alternatives customers have
- Whether this problem appears large enough to matter
- What customer segment should be tested first
- What assumptions require actual market research
- What could make customer acquisition difficult

Do not invent statistics.
`
    );

    const cto = await askAgent(
      "poolside/laguna-s-2.1:free",
      "CTO / Technology Officer",
      `
Analyze technical feasibility.

Determine:
- What technology would actually be required
- What could realistically be built by a small startup
- What should NOT be built initially
- Where AI provides a genuine advantage
- Technical risks
- Data, security, integration, and scalability concerns
`
    );

    const cfo = await askAgent(
      "nvidia/nemotron-3.5-lightning:free",
      "CFO / Financial Officer",
      `
Attack the economics.

Determine:
- Who pays
- Possible revenue models
- Major costs
- Customer acquisition challenges
- Potential margins
- Whether the economics could scale
- What numbers must be validated before investing serious money

Do not make up financial results.
`
    );

    // ==========================================
    // ROUND 2 — DEVIL'S ADVOCATE
    // ==========================================

    const debateContext = `
Here are the other Board members' initial arguments.

--- CEO / STRATEGIST ---
${ceo}

--- MARKET RESEARCHER ---
${market}

--- CTO ---
${cto}

--- CFO ---
${cfo}
`;

    const devil = await askAgent(
      "google/gemma-4-31b-it:free",
      "Devil's Advocate / Red Team",
      `
Your job is to try to KILL the business idea.

Do not be polite.

Look for:
- Contradictions between Board members
- Weak assumptions
- Fake differentiation
- Competitive threats
- Bad economics
- Difficult customer acquisition
- Technical problems
- Regulatory or operational problems
- Reasons customers may not care
- Reasons the founder could waste months building something nobody wants

Then identify:
1. The strongest argument against the business
2. The strongest argument for it
3. What evidence would prove the skeptics wrong
4. What experiment should happen before major investment
`,
      debateContext
    );

    // ==========================================
    // ROUND 3 — CHAIRMAN SYNTHESIS
    // ==========================================

    const fullBoardroom = `
==============================
CEO / STRATEGIST
==============================
${ceo}

==============================
MARKET RESEARCHER
==============================
${market}

==============================
CTO
==============================
${cto}

==============================
CFO
==============================
${cfo}

==============================
DEVIL'S ADVOCATE
==============================
${devil}
`;

    const chairman = await askAgent(
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "Chairman / Final Synthesizer",
      `
You are the final decision-making analyst.

Do NOT simply choose whichever argument sounds best.

Analyze the entire Boardroom debate and produce:

1. EXECUTIVE VERDICT
Explain whether the idea deserves a real-world test.

2. CORE PROBLEM
State the actual customer problem in simple language.

3. TARGET CUSTOMER
Identify the first customer segment to test.

4. BUSINESS MODEL
Explain exactly how the company could make money.

5. DIFFERENTIATION
Explain what would need to be genuinely different.

6. BIGGEST RISKS
List the five biggest ways this could fail.

7. ASSUMPTION LEDGER
Separate:
- Things we know
- Things we believe
- Things we do NOT know

8. 30-DAY VALIDATION PLAN
Give concrete actions that can be completed before building a large product.

9. KILL CRITERIA
Explain what evidence would cause the founder to abandon or radically change the idea.

10. REVISED BUSINESS MODEL
If the original idea is weak, redesign it rather than simply rejecting it.

11. FINAL BOARDROOM ACTION
Give the single most important next action for the founder.

Remember:
The Boardroom does not exist to make the founder feel good.
It exists to find the strongest business opportunity supported by evidence.
`,
      fullBoardroom
    );

    // ==========================================
    // FINAL RESPONSE
    // ==========================================

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
