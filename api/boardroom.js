export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
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
          "Authorization":
            `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            "https://ai-boardroom-eight.vercel.app",
          "X-Title": "AI Boardroom"
        },

        body: JSON.stringify({
          model: "openrouter/free",

          messages: [
            {
              role: "system",
              content: `
You are the ${role} on an elite AI Boardroom.

The founder does NOT want encouragement or agreement.

Your job is to think critically and challenge assumptions.

${instructions}

IMPORTANT RULES:

- Separate facts from assumptions.
- Never invent statistics.
- Never pretend an assumption is proven.
- Identify weaknesses.
- Identify opportunities.
- Explain what needs real-world validation.
- Be specific and practical.
`
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

      const answer =
        data?.choices?.[0]?.message?.content;

      if (!answer) {
        throw new Error(
          `${role} returned an empty response.`
        );
      }

      return answer;
    }

    // ==================================================
    // BOARD MEMBER 1 — CEO / STRATEGIST
    // ==================================================

    const ceo = await askAgent(
      "CEO / Strategist",

      `
Analyze the business from the perspective of the founder.

Answer:

1. What problem is being solved?
2. Who has this problem?
3. How painful is the problem?
4. Why would someone pay?
5. What could make this company different?
6. What would the simplest version look like?
7. How could this potentially become a large company?
8. What are the biggest strategic weaknesses?

Do not assume the business is good.
`
    );

    // ==================================================
    // BOARD MEMBER 2 — MARKET RESEARCHER
    // ==================================================

    const market = await askAgent(
      "Market Researcher",

      `
Analyze the market.

Focus on:

1. Likely target customers
2. Existing alternatives
3. Competitors
4. Customer behavior
5. Possible market gaps
6. Customer acquisition challenges
7. What would make customers switch?
8. What assumptions require actual market research?

Do not invent market statistics.
Clearly identify information that must be verified.
`
    );

    // ==================================================
    // BOARD MEMBER 3 — CTO
    // ==================================================

    const cto = await askAgent(
      "CTO / Technology Officer",

      `
Analyze technical feasibility.

Determine:

1. What technology is required?
2. What can realistically be built by a small startup?
3. Where could AI provide a real advantage?
4. What should NOT be built initially?
5. What integrations might be required?
6. What security issues exist?
7. What scalability problems could appear?
8. What could make the technology difficult or expensive?

Focus on building the simplest useful product first.
`
    );

    // ==================================================
    // BOARD MEMBER 4 — CFO
    // ==================================================

    const cfo = await askAgent(
      "CFO / Financial Officer",

      `
Attack the business economics.

Determine:

1. Who pays?
2. What could they pay?
3. Possible revenue models
4. Major costs
5. Customer acquisition challenges
6. Potential margins
7. Whether the economics could scale
8. What financial assumptions must be tested
9. What would cause the business to lose money?

Do not invent financial results.
Use logical assumptions and clearly label them.
`
    );

    // ==================================================
    // BOARD MEMBER 5 — DEVIL'S ADVOCATE
    // ==================================================

    const earlyBoardroom = `

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
`;

    const devil = await askAgent(
      "Devil's Advocate / Red Team",

      `
Your job is to try to DESTROY this business idea.

Do not be polite.

Look for:

1. Weak assumptions
2. Fake differentiation
3. Strong competitors
4. Better existing alternatives
5. Poor economics
6. Difficult customer acquisition
7. Technical problems
8. Regulatory problems
9. Operational problems
10. Reasons customers might not care
11. Reasons the founder could waste months building this

Then answer:

- What is the strongest argument AGAINST this company?
- What is the strongest argument FOR this company?
- Which Board members are making assumptions?
- What evidence would prove the idea is worth pursuing?
- What experiment should happen BEFORE significant money is invested?
`,
      earlyBoardroom
    );

    // ==================================================
    // BOARD MEMBER 6 — CHAIRMAN
    // ==================================================

    const completeBoardroom = `

========================================
CEO / STRATEGIST
========================================

${ceo}


========================================
MARKET RESEARCHER
========================================

${market}


========================================
CTO
========================================

${cto}


========================================
CFO
========================================

${cfo}


========================================
DEVIL'S ADVOCATE
========================================

${devil}
`;

    const chairman = await askAgent(
      "Chairman / Final Synthesizer",

      `
You are responsible for synthesizing the entire Boardroom.

Do NOT simply choose the argument that sounds best.

Your job is to identify what is actually known versus what is speculation.

Produce the following:

1. EXECUTIVE ASSESSMENT

Explain whether this idea deserves a real-world validation test.

2. CORE CUSTOMER PROBLEM

State the problem in simple language.

3. FIRST CUSTOMER

Identify the specific customer segment that should be tested first.

4. BUSINESS MODEL

Explain exactly how the company could make money.

5. DIFFERENTIATION

Explain what would actually need to be different.

6. BIGGEST RISKS

List the five biggest reasons this could fail.

7. ASSUMPTION LEDGER

Separate:

KNOWN:
Things supported by evidence or logic.

ASSUMED:
Things we currently believe but have not proven.

UNKNOWN:
Things we need to discover.

8. 30-DAY VALIDATION PLAN

Give concrete actions the founder can take before building a large product.

9. KILL CRITERIA

Explain what evidence would cause the founder to abandon, change, or redesign the idea.

10. REVISED BUSINESS MODEL

If the original idea is weak, redesign it.

Do not protect the original idea simply because the founder proposed it.

11. FINAL ACTION

Give the single most important next action.

The Boardroom exists to find the strongest opportunity supported by evidence.

It does NOT exist to make the founder feel good.
`,
      completeBoardroom
    );

    // ==================================================
    // FINAL BOARDROOM REPORT
    // ==================================================

    const finalReport = `
# AI BOARDROOM ANALYSIS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 👔 CEO / STRATEGIST

${ceo}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📊 MARKET RESEARCHER

${market}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚙️ CTO / TECHNOLOGY

${cto}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 💰 CFO / FINANCIAL ANALYSIS

${cfo}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚔️ DEVIL'S ADVOCATE

${devil}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ♦️ CHAIRMAN'S FINAL SYNTHESIS

${chairman}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# END OF BOARDROOM
`;

    return res.status(200).json({
      success: true,
      response: finalReport
    });

  } catch (error) {
    return res.status(500).json({
      error:
        error?.message ||
        "The AI Boardroom encountered an unexpected error."
    });
  }
}
