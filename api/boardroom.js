const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const FAST_MODEL = "openai/gpt-5.6-luna";
const CHAIRMAN_MODEL = "openai/gpt-5.6-luna-pro";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

/* =========================================================
   STANDARD AGENT
========================================================= */

async function askAgent(
  systemPrompt,
  userPrompt,
  model = FAST_MODEL,
  timeoutMs = 75000
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
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

    return (
      data?.choices?.[0]?.message?.content ||
      "No response returned."
    );
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   LIVE WEB RESEARCH
========================================================= */

async function researchBusiness(idea) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,

      body: JSON.stringify({
        model: FAST_MODEL,

        messages: [
          {
            role: "system",
            content: `
You are the Research Analyst for an AI Boardroom.

Use current web research to investigate the business idea.

Focus only on information that could materially change the business decision.

Research:

1. Direct competitors.
2. Current competitor pricing when available.
3. Existing alternatives.
4. Evidence of customer demand or customer pain.
5. Important industry conditions.
6. Barriers to entry.
7. Important recent developments.
8. Distribution challenges.
9. Claims that cannot be verified.

RULES:

Never invent statistics, competitors, pricing, market size,
customer counts, growth rates, or URLs.

Prefer official company websites, government sources,
primary sources, credible research organizations, and
reputable industry publications.

Treat company marketing statements as claims.

Clearly separate verified evidence from uncertainty.

Keep the report under 700 words.
`,
          },
          {
            role: "user",
            content: `Research this business opportunity:\n\n${idea}`,
          },
        ],

        tools: [
          {
            type: "openrouter:web_search",
            parameters: {
              engine: "exa",
              max_results: 4,
              max_total_results: 8,
              max_characters: 2200,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `OpenRouter research error ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();

    return (
      data?.choices?.[0]?.message?.content ||
      "No research returned."
    );
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   SAVE REPORT TO SUPABASE
========================================================= */

async function saveReportToSupabase(idea, agents) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error("Supabase environment variables are missing.");
    return false;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/boardroom_reports`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          idea,
          agents,
          user_id: null,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Supabase save error ${response.status}: ${errorText}`
      );
      return false;
    }

    console.log("Boardroom report saved to Supabase.");
    return true;
  } catch (error) {
    console.error("Supabase save failed:", error);
    return false;
  }
}

/* =========================================================
   HANDLER
========================================================= */

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

    /* =====================================================
       STAGE 1 — RESEARCH
    ===================================================== */

    const research = await researchBusiness(idea);

    const evidence = `
BUSINESS IDEA:

${idea}

CURRENT WEB RESEARCH:

${research}

Use this research as evidence, but challenge weak sources
and company marketing claims.

Never turn an uncertain claim into a fact.
`;

    /* =====================================================
       STAGE 2 — FOUR EXECUTIVES IN PARALLEL
    ===================================================== */

    const [ceo, market, cto, cfo] = await Promise.all([
      askAgent(
        `
You are the CEO and Strategist in an adversarial AI Boardroom.

Evaluate:

- target customer
- problem severity
- value proposition
- business model
- positioning
- distribution
- scalability
- competition
- differentiation
- defensibility
- execution difficulty

Use the current research.

Identify what is supported by evidence and what remains an assumption.

If competitors already solve the problem, explain what must
be substantially better.

If a stronger version of the idea exists, identify it.

Do not automatically support the founder.

Keep the response under 350 words.
`,
        evidence
      ),

      askAgent(
        `
You are the Market Researcher in an adversarial AI Boardroom.

Use the current research to evaluate:

- target customer
- customer pain
- competitors
- alternatives
- competitor pricing
- willingness to pay
- frequency of the problem
- barriers to adoption
- switching costs
- distribution
- evidence gaps

Never invent statistics.

Distinguish verified evidence from assumptions.

Identify the most important customer tests still required.

Keep the response under 350 words.
`,
        evidence
      ),

      askAgent(
        `
You are the CTO in an adversarial AI Boardroom.

Evaluate:

- smallest useful MVP
- architecture
- AI requirements
- APIs
- data requirements
- data licensing
- security
- privacy
- reliability
- scalability
- third-party dependencies
- technical defensibility

Challenge unnecessary AI.

Prefer deterministic calculations where appropriate.

Do not confuse buildability with business viability.

Keep the response under 350 words.
`,
        evidence
      ),

      askAgent(
        `
You are the CFO in an adversarial AI Boardroom.

Evaluate:

- revenue models
- researched competitor pricing
- major costs
- acquisition economics
- usage frequency
- retention
- gross margins
- data/API costs
- financial risks
- requirements for profitability

Do not invent precise financial numbers.

Any suggested price or threshold not supported by research
must be labeled TESTING ASSUMPTION.

Keep the response under 350 words.
`,
        evidence
      ),
    ]);

    const firstRound = `
CEO:
${ceo}

MARKET:
${market}

CTO:
${cto}

CFO:
${cfo}
`;

    const debateContext = `
BUSINESS IDEA:

${idea}

CURRENT RESEARCH:

${research}

EXECUTIVE ANALYSES:

${firstRound}
`;

    /* =====================================================
       STAGE 3 — CROSS EXAM + DEVIL RUN TOGETHER
    ===================================================== */

    const [crossExamination, devil] = await Promise.all([
      askAgent(
        `
You are the Cross-Examination Moderator.

Do NOT write another general business analysis.

Find:

1. The biggest disagreement between executives.
2. Claims supported by research versus unsupported assumptions.
3. Important contradictions.
4. The most dangerous shared assumption.
5. The 3 questions the Chairman must resolve.
6. What the board genuinely agrees on.

Do not invent disagreements.

Keep the response under 400 words.
`,
        debateContext
      ),

      askAgent(
        `
You are the Devil's Advocate.

Attack the business using the strongest evidence available.

Identify:

1. The 3 biggest failure risks.
2. The 3 most dangerous assumptions.
3. The strongest argument against building it.
4. The strongest competitive threat.
5. Evidence that would change your mind.
6. One stronger direction or pivot if appropriate.

Do not be negative merely for the sake of being negative.

Do not invent facts.

Keep the response under 400 words.
`,
        debateContext
      ),
    ]);

    /* =====================================================
       STAGE 4 — CHAIRMAN
    ===================================================== */

    const chairman = await askAgent(
      `
You are the Chairman of an adversarial AI Boardroom.

Make the final business decision using:

- current web research
- CEO analysis
- market analysis
- CTO analysis
- CFO analysis
- cross-examination
- Devil's Advocate

Do NOT simply summarize everyone.

Resolve disagreements.

Never present assumptions as researched facts.

Any suggested price, interview count, conversion target,
financial target, or other numerical recommendation that
is not directly supported by research must be labeled:

TESTING ASSUMPTION

Use this structure:

1. VERDICT

Choose exactly one:

PURSUE
TEST FIRST
PIVOT
PASS

Give one short explanation.


2. EVIDENCE THAT MATTERS

Give the 3 most important pieces of researched evidence.


3. WHY

Give the 3 strongest reasons for the verdict.


4. COMPETITIVE REALITY

Explain who already solves the problem and what this
business must do differently.


5. BOARD DISAGREEMENT

Identify and resolve the most important disagreement.


6. BIGGEST RISKS

Give the 3 biggest risks.


7. WHAT MUST BE PROVEN

State the critical assumptions and how to test them.


8. BUSINESS MODEL

Recommend the strongest initial revenue model.

Separate researched pricing from testing assumptions.


9. MVP

Describe the smallest product worth testing.


10. DEFENSIBILITY

Explain what could eventually become difficult to copy.

If there is currently no moat, say so.


11. NEXT 5 ACTIONS

Give exactly 5 concrete actions.

Prioritize customer validation, willingness to pay,
distribution, data quality, and unit economics before
expensive development.


12. BETTER VERSION

Describe a stronger version or positioning if appropriate.


13. CHAIRMAN'S BOTTOM LINE

In 2-4 direct sentences answer:

What should the founder do now?

What should the founder NOT spend money on yet?

What evidence would justify proceeding?

Keep the entire report under 850 words.
`,
      `
BUSINESS IDEA:

${idea}

====================
LIVE RESEARCH
====================

${research}

====================
EXECUTIVES
====================

${firstRound}

====================
CROSS-EXAMINATION
====================

${crossExamination}

====================
DEVIL'S ADVOCATE
====================

${devil}
`,
      CHAIRMAN_MODEL,
      90000
    );

    const agents = {
      ceo,
      market,
      cto,
      cfo,
      devil,
      chairman,
      crossExamination,
    };

    /* =====================================================
       SAVE TO SUPABASE
    ===================================================== */

    const cloudSaved = await saveReportToSupabase(
      idea.trim(),
      agents
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({
      idea,
      research,
      agents,
      cloudSaved,
    });
  } catch (error) {
    console.error("Boardroom error:", error);

    if (error?.name === "AbortError") {
      return res.status(504).json({
        error:
          "One Boardroom stage took too long. Please try again.",
      });
    }

    return res.status(500).json({
      error: error?.message || "Boardroom failed.",
    });
  }
}
