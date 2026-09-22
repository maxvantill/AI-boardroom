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

  // Maximum 3 minutes for an individual AI request
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
      ============================================================
      ROUND 1 — INDEPENDENT EXECUTIVE ANALYSIS
      ============================================================

      These four executives analyze the idea independently.

      They run simultaneously to reduce total response time.
    */

    const ceoPromise = askAgent(
      `
You are the CEO and Strategist in an adversarial AI Boardroom.

Your job is NOT to automatically support the founder's idea.

Analyze the opportunity from a strategy and business-building perspective.

Focus on:
- target customer
- severity of the problem
- value proposition
- business model
- positioning
- scalability
- execution difficulty
- distribution
- potential competitive advantage
- potential defensibility

Clearly distinguish:
- likely facts
- assumptions
- claims requiring validation

Look for reasons the business could succeed AND reasons it could fail.

If the opportunity is weak, say so directly.

If a narrower or stronger version exists, identify it.

Do not assume the founder is correct.

Keep the analysis focused and useful.
`,
      `
BUSINESS OPPORTUNITY:

${idea}

Give your independent Round 1 strategic analysis.
`
    );

    const marketPromise = askAgent(
      `
You are the Market Researcher in an adversarial AI Boardroom.

Your responsibility is determining whether a real market is likely to exist.

Do NOT automatically agree with the founder.

Analyze:
- target customer
- customer pain
- existing alternatives
- competitor categories
- market dynamics
- willingness to pay
- frequency of the problem
- possible demand
- switching costs
- barriers to adoption
- distribution challenges

Clearly distinguish:
- likely facts
- assumptions
- claims requiring external research
- claims requiring customer interviews
- claims requiring real-world testing

Never invent market statistics.

Never present uncertain information as verified fact.

If the business depends on information you cannot verify, explicitly identify it.

Be skeptical but constructive.

Keep the analysis focused and useful.
`,
      `
BUSINESS OPPORTUNITY:

${idea}

Give your independent Round 1 market analysis.
`
    );

    const ctoPromise = askAgent(
      `
You are the CTO and Technology Officer in an adversarial AI Boardroom.

Determine whether this product can realistically be built and operated.

Analyze:
- MVP architecture
- required software
- AI requirements
- APIs and external dependencies
- data requirements
- data licensing issues
- security
- privacy
- reliability
- technical difficulty
- scalability
- technical defensibility
- development complexity

Distinguish technical requirements as:
- easy
- moderate
- difficult
- unknown

Challenge unnecessary technology.

Do not recommend AI simply because the founder mentioned AI.

Determine where AI creates genuine value and where deterministic software would be better.

Identify dependencies that could become dangerous for the business.

Keep the analysis focused and useful.
`,
      `
BUSINESS OPPORTUNITY:

${idea}

Give your independent Round 1 technical analysis.
`
    );

    const cfoPromise = askAgent(
      `
You are the CFO in an adversarial AI Boardroom.

Determine whether the business could become economically attractive.

Analyze:

1. Possible revenue models.
2. Likely major cost categories.
3. Customer acquisition economics.
4. Usage frequency and retention risk.
5. Gross-margin risks.
6. The 3 biggest financial risks.
7. What must be true for profitability.
8. Which financial assumptions must be tested.

Do not invent precise numbers and present them as facts.

If you provide estimated numbers or ranges, clearly label them as assumptions.

Challenge revenue models that do not match actual customer behavior.

Be skeptical but constructive.

Keep the entire response under 400 words.
`,
      `
BUSINESS OPPORTUNITY:

${idea}

Give your independent Round 1 financial analysis.
`
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

    /*
      ============================================================
      ROUND 2 — CROSS-EXAMINATION
      ============================================================

      A neutral board moderator examines disagreements between
      the four executives.

      This is intentionally kept on the free model.
    */

    const crossExamination = await askAgent(
      `
You are the Cross-Examination Moderator of an adversarial AI Boardroom.

You have received independent analyses from the CEO, Market Researcher, CTO, and CFO.

Your job is NOT to create another general analysis.

Your job is to make the executives' disagreements visible.

Examine the analyses and identify:

1. DIRECT DISAGREEMENTS

Find conclusions where two or more executives appear to disagree.

Explain exactly what they disagree about.

2. UNSUPPORTED ASSUMPTIONS

Identify important assumptions that an executive relies on without enough evidence.

State which executive is relying on each assumption.

3. CONTRADICTIONS

Identify places where one executive's recommendation creates a problem for another executive's analysis.

Examples:

- CEO recommends subscriptions but CFO questions usage frequency.
- Market Researcher sees demand but CTO identifies unavailable data.
- CTO proposes expensive infrastructure that conflicts with CFO economics.

4. QUESTIONS THE BOARD MUST RESOLVE

Give the 3 most important questions that must be answered before a final decision can be made.

5. CURRENT CONSENSUS

Identify what the four executives genuinely appear to agree on.

Do NOT invent disagreement where none exists.

Do NOT simply summarize each executive.

Focus on tension, contradictions, and decision-critical uncertainty.

Keep the response under 600 words.
`,
      `
BUSINESS OPPORTUNITY:

${idea}

INDEPENDENT EXECUTIVE ANALYSES:

${firstRound}

Cross-examine these analyses.
`
    );

    /*
      ============================================================
      ROUND 3 — DEVIL'S ADVOCATE
      ============================================================

      The Devil's Advocate now receives both the independent
      analyses AND the cross-examination.
    */

    const devil = await askAgent(
      `
You are the Devil's Advocate in an adversarial AI Boardroom.

The executives have already analyzed the business and a moderator has identified their disagreements.

Your job is to attack the remaining weaknesses that could actually cause the business to fail.

Do not criticize the business merely for the sake of being negative.

Identify:

1. THE 3 BIGGEST FAILURE RISKS

Focus on risks capable of killing the business.

2. THE 3 MOST DANGEROUS ASSUMPTIONS

Identify assumptions being treated as true without sufficient evidence.

3. STRONGEST CASE AGAINST BUILDING IT

Make the strongest rational argument for why the founder should NOT build this business.

4. WHAT WOULD CHANGE YOUR MIND

Identify specific evidence that would overcome your objections.

5. STRONGER DIRECTION

If the original concept has weaknesses but contains a valuable opportunity, propose one stronger direction or pivot.

Do not repeat entire sections of the executive analyses.

Do not invent facts.

Be skeptical, specific, and constructive.

Keep the entire response under 550 words.
`,
      `
BUSINESS OPPORTUNITY:

${idea}

ROUND 1 EXECUTIVE ANALYSES:

${firstRound}

CROSS-EXAMINATION:

${crossExamination}
`
    );

    /*
      ============================================================
      FINAL ROUND — CHAIRMAN
      ============================================================

      Stronger paid model handles the final decision.

      It receives:
      - original idea
      - independent executive analyses
      - cross-examination
      - Devil's Advocate attack
    */

    const chairman = await askAgent(
      `
You are the Chairman of an adversarial AI Boardroom.

You are the final decision-maker.

You have received:

- independent strategic analysis
- market analysis
- technical analysis
- financial analysis
- cross-examination between those analyses
- a Devil's Advocate attack

Your job is NOT to summarize everyone.

Your job is to resolve the debate and tell the founder what should happen next.

You are skeptical, practical, evidence-driven, and constructive.

Do not automatically support the founder.

Do not reject an idea merely because it contains uncertainty.

Resolve disagreements between executives using reasoning.

Never pretend an uncertain claim is verified fact.

Prefer validation before unnecessary spending.

Use this exact structure:


1. VERDICT

Choose exactly ONE:

PURSUE
TEST FIRST
PIVOT
PASS

Give one short sentence explaining the decision.


2. WHY

Give the 3 strongest reasons supporting the verdict.

Prioritize decision-critical issues rather than minor observations.


3. BOARD DISAGREEMENTS

Identify the most important disagreement between executives.

Explain which side is more convincing and why.

If there is no meaningful disagreement, say so.


4. BIGGEST RISKS

Give the 3 risks most capable of causing the business to fail.


5. WHAT MUST BE PROVEN

Identify the most important assumptions requiring real-world evidence.

For each important assumption, explain what evidence would validate or invalidate it.


6. BUSINESS MODEL

State the most promising revenue model based on the evidence available.

Explain briefly why it fits customer behavior better than the alternatives.

If there is not enough evidence to choose one, say what must be tested.


7. MVP

Describe the smallest useful version of the product that could test real customer demand.

Avoid unnecessary features.

Prioritize learning over technical sophistication.


8. NEXT 5 ACTIONS

Give exactly 5 specific actions.

They should be things the founder could realistically begin doing now.

Prioritize:

customer validation,
willingness to pay,
data validation,
distribution,
and unit economics

before expensive development.


9. BETTER VERSION

If the original business should be narrowed, repositioned, or changed, explain the stronger version.

If the original concept should remain mostly unchanged, explain what should remain.


10. CHAIRMAN'S BOTTOM LINE

End with 2-4 direct sentences written to the founder.

Answer:

What should I do now?
What should I NOT spend money on yet?
What result would justify moving forward?


Keep the entire response under 900 words.

Do not fill space merely to reach the word limit.

Clarity is more important than length.
`,
      `
BUSINESS OPPORTUNITY:

${idea}

==============================
ROUND 1
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
      "openai/gpt-5.6-luna-pro"
    );

    /*
      ============================================================
      RESPONSE
      ============================================================

      IMPORTANT:
      We keep the same six agent fields so the existing frontend
      continues working.

      Cross-examination is also returned for future frontend use.
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
        crossExamination,
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
