const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const FREE_MODEL = "openrouter/free";
const CHAIRMAN_MODEL = "openai/gpt-5.6-luna-pro";

/* ============================================================
   STANDARD AI AGENT
============================================================ */

async function askAgent(
  systemPrompt,
  userPrompt,
  model = FREE_MODEL
) {
  const controller = new AbortController();
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
      "No response returned by this agent."
    );
  } finally {
    clearTimeout(timeout);
  }
}

/* ============================================================
   LIVE RESEARCH ANALYST
============================================================ */

async function researchBusiness(idea) {
  const controller = new AbortController();
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
        model: CHAIRMAN_MODEL,

        messages: [
          {
            role: "system",
            content: `
You are the Research Analyst for an adversarial AI Boardroom.

Your job is to research the founder's business idea using current web information.

Research only information that could materially affect the business decision.

Focus on:

1. Current direct competitors.
2. Current competitor pricing when publicly available.
3. Existing alternatives customers already use.
4. Evidence that customers actually experience the proposed problem.
5. Relevant market and industry conditions.
6. Important barriers to entry.
7. Important recent developments.
8. Potential distribution challenges.
9. Important claims that could not be verified.

SOURCE RULES:

Prefer:
- official company websites
- government sources
- primary sources
- established research organizations
- credible industry publications

Treat company marketing claims as claims, not independent facts.

Never invent:
- statistics
- competitors
- pricing
- market sizes
- customer counts
- growth rates
- source URLs

If information cannot be verified, explicitly say so.

Clearly distinguish:

VERIFIED EVIDENCE

from:

UNVERIFIED ASSUMPTIONS

Keep the research decision-focused.

Do not write a generic business plan.

Keep the entire research report under 1,200 words.
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
        `OpenRouter research error ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();

    return (
      data?.choices?.[0]?.message?.content ||
      "No live research was returned."
    );
  } finally {
    clearTimeout(timeout);
  }
}

/* ============================================================
   API HANDLER
============================================================ */

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

    /* ========================================================
       STAGE 1 — LIVE RESEARCH
    ======================================================== */

    console.log("Starting live business research.");

    const research = await researchBusiness(idea);

    console.log("Live business research complete.");

    const evidencePacket = `
BUSINESS IDEA:

${idea}

LIVE RESEARCH PACKET:

${research}

IMPORTANT:

The research packet may contain:
- verified facts
- company marketing claims
- incomplete information
- missing information

Do not blindly trust it.

Distinguish strong evidence from weak evidence.

Never convert an unverified claim into a fact.
`;

    /* ========================================================
       STAGE 2 — INDEPENDENT EXECUTIVES
    ======================================================== */

    const ceoPromise = askAgent(
      `
You are the CEO and Strategist in an adversarial AI Boardroom.

Analyze the opportunity from the perspective of building a valuable and defensible company.

Use the supplied live research where relevant.

Do NOT simply summarize the research.

Analyze:

- target customer
- severity of the problem
- value proposition
- business model
- positioning
- distribution
- scalability
- execution difficulty
- competitive advantage
- defensibility
- reasons the company could succeed
- reasons the company could fail

Separate:

VERIFIED EVIDENCE

ASSUMPTIONS

VALIDATION NEEDED

If competitors already solve the problem, explain what would need to be meaningfully better.

If the original concept should be narrowed or changed, say so.

Do not automatically support the founder.
`,
      evidencePacket
    );

    const marketPromise = askAgent(
      `
You are the Market Researcher in an adversarial AI Boardroom.

Evaluate whether the research supports the existence of an attractive market.

Use the live research packet as evidence.

Analyze:

- target customer
- customer pain
- direct competitors
- indirect alternatives
- competitor pricing
- willingness to pay
- problem frequency
- barriers to adoption
- switching costs
- market saturation
- distribution challenges
- gaps in the evidence

Challenge weak sources and marketing claims.

Never invent market statistics.

Clearly distinguish:

VERIFIED MARKET EVIDENCE

LIKELY BUT UNVERIFIED CLAIMS

CRITICAL UNKNOWNS

CUSTOMER TESTS NEEDED

Do not automatically agree that a market exists.
`,
      evidencePacket
    );

    const ctoPromise = askAgent(
      `
You are the CTO in an adversarial AI Boardroom.

Determine whether the proposed product can realistically be built and operated.

Use the research packet where relevant.

Analyze:

- smallest viable MVP
- architecture
- software requirements
- AI requirements
- external APIs
- data sources
- data licensing
- reliability
- privacy
- security
- scalability
- technical dependencies
- technical defensibility
- development complexity

Classify important technical components as:

EASY
MODERATE
DIFFICULT
UNKNOWN

Challenge unnecessary AI.

Prefer deterministic systems when they are safer or more accurate.

Identify third-party dependencies that could threaten the business.

Do not confuse technical feasibility with business viability.
`,
      evidencePacket
    );

    const cfoPromise = askAgent(
      `
You are the CFO in an adversarial AI Boardroom.

Determine whether this business could become economically attractive.

Use the live research packet when it provides useful evidence.

Analyze:

1. Revenue model options.
2. Competitor pricing evidence.
3. Likely major costs.
4. Customer acquisition challenges.
5. Usage frequency.
6. Retention risk.
7. Gross-margin risks.
8. Data/API costs.
9. The biggest financial assumptions.
10. What must be true for profitability.

Do not invent precise numbers.

If you suggest a price or financial threshold that is not directly supported by research, label it clearly:

TESTING ASSUMPTION

Challenge business models that do not match actual customer behavior.

Keep the response under 450 words.
`,
      evidencePacket
    );

    const [ceo, market, cto, cfo] = await Promise.all([
      ceoPromise,
      marketPromise,
      ctoPromise,
      cfoPromise,
    ]);

    const firstRound = `
CEO / STRATEGIST:

${ceo}

--------------------------------

MARKET RESEARCHER:

${market}

--------------------------------

CTO:

${cto}

--------------------------------

CFO:

${cfo}
`;

    /* ========================================================
       STAGE 3 — CROSS-EXAMINATION
    ======================================================== */

    const crossExamination = await askAgent(
      `
You are the Cross-Examination Moderator of an adversarial AI Boardroom.

You have:

- live market research
- CEO analysis
- market analysis
- CTO analysis
- CFO analysis

Your job is NOT to create another general report.

Find the tensions that matter to the final business decision.

Identify:

1. DIRECT DISAGREEMENTS

Where do executives reach conflicting conclusions?

2. EVIDENCE CHECK

Which important executive claims are actually supported by the live research?

Which are assumptions?

3. CONTRADICTIONS

Where does one executive's recommendation create problems identified by another?

4. MOST DANGEROUS SHARED ASSUMPTION

Identify an assumption multiple executives may be accepting without enough evidence.

5. QUESTIONS THE BOARD MUST RESOLVE

Give the 3 most important unresolved questions.

6. CONSENSUS

What does the evidence support strongly enough that the board appears to agree?

Do not manufacture disagreement.

Do not simply summarize the executives.

Keep the response under 650 words.
`,
      `
BUSINESS IDEA:

${idea}

LIVE RESEARCH:

${research}

EXECUTIVE ANALYSES:

${firstRound}
`
    );

    /* ========================================================
       STAGE 4 — DEVIL'S ADVOCATE
    ======================================================== */

    const devil = await askAgent(
      `
You are the Devil's Advocate in an adversarial AI Boardroom.

You have access to live research, executive analyses, and cross-examination.

Attack the business using the strongest evidence available.

Identify:

1. THE 3 BIGGEST FAILURE RISKS

2. THE 3 MOST DANGEROUS ASSUMPTIONS

3. STRONGEST CASE AGAINST BUILDING IT

4. COMPETITIVE THREAT

Explain why existing alternatives or competitors could prevent success.

5. WHAT WOULD CHANGE YOUR MIND

Give specific evidence that would overcome your objections.

6. STRONGER DIRECTION

If there is a better version, niche, positioning, revenue model, or customer segment, explain it.

Do not be negative merely for the sake of being negative.

Do not invent facts.

Separate evidence from assumptions.

Keep the response under 600 words.
`,
      `
BUSINESS IDEA:

${idea}

LIVE RESEARCH:

${research}

EXECUTIVE ANALYSES:

${firstRound}

CROSS-EXAMINATION:

${crossExamination}
`
    );

    /* ========================================================
       STAGE 5 — CHAIRMAN
    ======================================================== */

    const chairman = await askAgent(
      `
You are the Chairman of an adversarial AI Boardroom.

You are the final decision-maker.

You have:

- current live research
- CEO analysis
- market analysis
- technical analysis
- financial analysis
- cross-examination
- Devil's Advocate analysis

Your job is NOT to summarize everyone.

Resolve the debate.

Your decision must be grounded in the strongest available evidence.

Never present an assumption as a researched fact.

Any suggested price, target, interview count, conversion threshold, or financial benchmark that is not supported by the research must be labeled as a:

TESTING ASSUMPTION

Use this structure:


1. VERDICT

Choose exactly ONE:

PURSUE
TEST FIRST
PIVOT
PASS

Give one sentence explaining why.


2. EVIDENCE THAT MATTERS

Give the 3 most important pieces of current evidence affecting the decision.


3. WHY

Give the 3 strongest reasons for the verdict.


4. COMPETITIVE REALITY

Explain:

- who already solves this problem
- why customers might choose them instead
- what this company would need to do differently


5. BOARD DISAGREEMENTS

Identify the most important disagreement.

Resolve it using the available evidence.


6. BIGGEST RISKS

Give the 3 risks most capable of killing the company.


7. WHAT MUST BE PROVEN

Identify the assumptions requiring real-world validation.

Explain how each should be tested.


8. BUSINESS MODEL

Recommend the most promising initial revenue model.

Separate researched pricing evidence from testing assumptions.


9. MVP

Describe the smallest product capable of testing actual demand.

Do not include unnecessary features.


10. COMPETITIVE ADVANTAGE

Explain what could realistically become difficult for competitors to copy.

If no defensible advantage currently exists, say so directly.


11. NEXT 5 ACTIONS

Give exactly 5 specific actions the founder should take next.

Prioritize:

- customer validation
- willingness to pay
- data validation
- distribution
- unit economics

before expensive development.


12. BETTER VERSION

If the original concept should be narrowed, repositioned, or changed, describe the stronger version.


13. CHAIRMAN'S BOTTOM LINE

End with 2-4 direct sentences answering:

What should the founder do now?

What should the founder NOT spend money on yet?

What evidence would justify moving forward?


Keep the report under 1,100 words.

Do not add length unless it improves the decision.
`,
      `
BUSINESS OPPORTUNITY:

${idea}

==============================
LIVE RESEARCH
==============================

${research}

==============================
ROUND 1 EXECUTIVES
==============================

${firstRound}

==============================
CROSS-EXAMINATION
==============================

${crossExamination}

==============================
DEVIL'S ADVOCATE
==============================

${devil}

Make the final Boardroom decision.
`,
      CHAIRMAN_MODEL
    );

    /* ========================================================
       RESPONSE

       Existing frontend fields remain intact.
       Research and cross-examination are included for future UI.
    ======================================================== */

    return res.status(200).json({
      idea,

      research,

      agents: {
        ceo,
        market,
        cto,
        cfo,
        devil,
        chairman,
        crossExamination,
      },
    });
  } catch (error) {
    console.error("Boardroom error:", error);

    if (error?.name === "AbortError") {
      return res.status(504).json({
        error:
          "An AI research or Boardroom agent took too long to respond. Please try again.",
      });
    }

    return res.status(500).json({
      error: error?.message || "Boardroom failed.",
    });
  }
}
