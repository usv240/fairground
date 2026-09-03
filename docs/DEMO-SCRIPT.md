# Fairground demo: shooting script

Target 2:40. Hard cap 3:00. Narration is ~300 words, which is a calm speaking pace with room to pause.

Each beat maps to a judging criterion: **[I]** Potential Impact, **[W]** WebMCP Leverage, **[E]** Execution, **[C]** Creativity. All four are equally weighted, so all four appear.

---

## Before you press record

| Check | Why |
|---|---|
| Open https://fairground-umber.vercel.app in **ChatGPT's in-app browser**, agent panel beside the page | Judges will use this exact setup |
| Confirm the badge reads **"WebMCP active"** (green dot) | This is your proof the tools are live |
| Browser zoom **110 to 125 percent** | Small labels must survive YouTube compression |
| Fresh profile, no old cases | The "New here?" banner should appear |
| Mic on, quiet room, **no music** | Rules forbid copyrighted audio |
| Rehearse once end to end | The deposit demo is deterministic, so the real take will match |

Record in short clips and stitch them. Devpost's own guidance recommends jump cuts and trimming dead air.

---

## Scene 1 (0:00 to 0:20) The problem, over a working product [I]

**NAVIGATE:** Start on the landing page, top of the hero.

**POINT AT:** The headline "Justice, for disputes too small for lawyers", then scroll slowly past the "THE DOCKET, LIVE" strip.

**CLICK:** The middle demo card, **"The withheld deposit"**. You are inside a live case before second 15.

**SAY:**
> **"Maya's landlord kept her twelve hundred dollar deposit, even though she passed the move-out inspection. A lawyer costs more than the deposit. Small claims court takes months. Ninety-two percent of people in her position get no legal help at all, so most give up. This is Fairground: a neutral resolution room where both sides bring their own AI advocate."**

---

## Scene 2 (0:20 to 1:00) The agent uses the page [W]

**NAVIGATE:** You are now in the case room. The landlord's dispute is already on the record.

**POINT AT:** First the green **"WebMCP active"** badge in the right column, then the **"You are the claimant"** badge at the top right.

**TYPE INTO THE AGENT PANEL:**
> "Review the claim against me and give me a private reality check. Then set my floor at 800 dollars."

**POINT AT:** The **"Your agent on this page"** feed as entries appear. **Hold for two full seconds** so a judge can read one line.

**POINT AT:** The green confirmation bar: **"Private mandate saved: you will not settle below $800. The other side can never see this number."**

**SAY:**
> **"I just talk. My agent is using this page's WebMCP tools: reading the claim, running a private reality check, and sealing my bottom line at eight hundred dollars. Every move it makes in my name shows up right here. And only I can see that number. Here is the core idea: the page decides which tools exist, based on who I am and where the case stands. My agent cannot see the landlord's numbers. It cannot skip a step. And there is no signing tool at all. The procedure is the tool surface."**

> If the agent stalls, set the floor by hand in the "Your floor" field and say the same words. The feed and the sealed mandate are what matter.

---

## Scene 3 (1:00 to 1:45) Sealed offers and neutral mediation [W][C]

**CLICK:** **"Let the agents negotiate"** in the Autopilot card.

**POINT AT:** The two envelopes, **"Your envelope"** and **"Their envelope"**, as they flip to **SEALED**.

**POINT AT:** Each grey signal line as it appears: **"Round 1: no overlap. The gap narrowed by..."**

**CLICK "Stop"** the moment the stepper reaches **Mediation**. This hands control back to you and prevents your advocate from auto-accepting before you can talk about it.

**POINT AT:** The mediator card: first the small label **"operated by the platform, controlled by neither party"**, then the proposed amount, then one line of its reasoning.

**CLICK:** **"Accept proposal"** yourself. The other side accepts a second later and the stepper moves to **Agreement**.

> If your advocate accepts before you hit Stop, that is fine and still on message. Say **"my advocate checked it against my floor and accepted for me"**, then carry on to Scene 4.

**SAY:**
> **"Now both advocates negotiate within limits privately set by their humans. The offers stay sealed. If the two numbers ever overlap, the case settles instantly at the midpoint. If they do not, each side learns only whether the gap is closing. No overlap here, so a neutral mediator, the only party who can see the sealed history, proposes one fair number. Both sides accept."**

---

## Scene 4 (1:45 to 2:20) The human signature [C][E]

**CLICK:** **"Draft the agreement"**.

**SCROLL:** Slowly through the plain-language agreement, one screen only.

**POINT AT:** The line **"Signature: humans only. This is the one step no agent can take."**

**TYPE:** Your name into the signature field, then **CLICK "Sign agreement"**.

**WAIT:** The counterpart countersigns and the **RESOLVED** stamp lands.

**POINT AT:** The final frame with the settled amount, both signatures with timestamps, and the **RECORD SEAL** all visible together.

**SAY:**
> **"The agreement is drafted in plain language. My agent got me here, but it cannot sign. Consent is mine. I sign, the other side signs, resolved. Maya's dispute is settled, with a signed agreement and no lawyer. And this seal is a fingerprint of the signed record: anyone holding the document can use it to check that the record was never altered."**

> Read the real amount off the screen when you say "settled". Say the number.

---

## Scene 5 (2:20 to 2:40) Proof and close [I][E]

**NAVIGATE:** Back to the landing page.

**POINT AT:** The **"THE DOCKET, LIVE"** counter.

**END ON:** The hero headline, held still for two seconds.

**SAY:**
> **"Does it work? In product testing, thirty simulated disputes ran end to end through this live deployment. Every one reached settlement, in under a minute each. Each settlement feeds this public docket as anonymous totals, including the one you just watched. Two opposing agents, one neutral page, and a signature only a human can give. Justice, for disputes too small for lawyers. Fairground."**

---

## If something goes sideways

| Problem | Do this |
|---|---|
| Autopilot settles by overlap instead of mediation | Say **"the two sealed offers overlapped, so it settled instantly at the midpoint"** and skip the mediator sentences |
| Agent phrasing is odd in Scene 2 | Re-record that clip only; agents vary between runs |
| Running past 2:55 | Cut the last two sentences of Scene 2. The line **"there is no signing tool at all"** must survive |
| A model call is slow | Cut the wait in editing. Never show dead air |

## The muted test

Watch your final cut with the sound off. A judge should still follow: claim, private limit, sealed rounds, mediation, human signature, resolved. If any step is unclear without narration, hold on that screen a beat longer or zoom in.

## Upload

YouTube, **public**. Title: **Fairground: settle disputes with your agent at your side (WebMCP Challenge)**. Turn on auto-captions, then correct "WebMCP" and "sealed offers" in the caption editor. Paste the link into the Devpost video field and submit.
