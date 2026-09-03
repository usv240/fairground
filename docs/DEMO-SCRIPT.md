# Fairground demo: shooting script

Target 2:40 to 2:45. Hard cap 3:00. Narration is ~300 words, a calm pace with room to pause.

**Time the rehearsal with a stopwatch, do not estimate.** Word count is comfortable, but agent execution, three negotiation rounds, mediation, countersigning, and navigation all consume real seconds. If the rehearsal lands past 2:45, you have two levers before cutting words: trim waiting time in editing (every pause where nothing changes on screen should be cut), and cut "It cannot skip a step" and "The procedure is the tool surface" from Scene 2, always keeping "There is no signing tool at all." Aim to finish at 2:45 so you keep fifteen seconds of genuine safety margin.

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
| Rehearse once end to end | The deposit demo follows a reliable, rehearsed flow, so the real take will match |

Record in short clips and stitch them. Devpost's own guidance recommends jump cuts and trimming dead air.

---

## Scene 1 (0:00 to 0:20) The problem, over a working product [I]

**NAVIGATE:** Start on the landing page, top of the hero.

**POINT AT:** The headline "Justice, for disputes too small for lawyers", then scroll slowly past the "THE DOCKET, LIVE" strip.

**CLICK:** The middle demo card, **"The withheld deposit"**. You are inside a live case before second 15.

**SAY:**
> **"Maya's landlord kept her twelve hundred dollar deposit, even though she passed the move-out inspection. A lawyer costs more than the deposit. Small claims court takes months. Most people facing disputes this small receive no legal help at all, so many simply give up. This is Fairground: a neutral resolution room where both sides bring their own AI advocate."**

> The precise statistic and its source are on screen anyway: the stats band you scroll past reads "92 percent ... (Legal Services Corporation)". Letting the page carry the citation is safer than asserting the number in narration.

---

## Scene 2 (0:20 to 1:00) The agent uses the page [W]

**NAVIGATE:** You are now in the case room. The landlord's dispute is already on the record.

**POINT AT:** First the green **"WebMCP active"** badge in the right column, then the **"You are the claimant"** badge at the top right.

**TYPE INTO THE CHAT** beside the page:
> "Review my claim against the landlord and give me a private reality check. Then set my floor at 800 dollars."

**POINT AT:** The **"Your agent on this page"** feed as entries appear. **Hold for two full seconds** so a judge can read one line.

**POINT AT:** Once the agent finishes, these three in order:

1. **Case log, right column:** *"claimant set a private negotiation mandate. (Contents sealed.)"* The platform records that it happened without recording the number.
2. **Left panel:** *"Private mandate on file: floor $800."*
3. **Autopilot card:** *"never concedes past your private floor of $800."*

> There is no green confirmation bar in the agent path. That bar belongs to the manual form. If you set the floor by hand instead, point at the green bar and skip the three above.

**SAY:**
> **"I just talk. My agent is using this page's WebMCP tools: reading the claim, running a private reality check, and sealing my bottom line at eight hundred dollars. Every move it makes in my name shows up right here. And only I can see that number. Here is the core idea: the page decides which tools exist, based on who I am and where the case stands. My agent cannot see the landlord's numbers. It cannot skip a step. And there is no signing tool at all. The procedure is the tool surface."**

### Using ChatGPT's browser: find the chat that actually uses the page

The **"Do anything"** bar with a model picker ("5.6 Sol Medium") and "Approve for me" is **agent/Codex mode**. It has a terminal and browser automation, so it tends to solve tasks *around* the page (curl, commands) instead of calling the page's tools. That still changes the case, but it is not a WebMCP demo.

You want the plain chat beside the page: the **sidebar icon at the top right** (rightmost of the three icons next to minimize).

**The 10-second test.** In whichever chat you are trying, send:

> "What's the status of this case?"

- **"Your agent on this page" fills in** (for example *"Checked case status"*) → WebMCP is being used. Record here.
- **It stays grey** → that chat is bypassing the page. Switch chats and test again.

**The feed is the ground truth.** It populates only when a tool runs through `document.modelContext` on the page. Never narrate "my agent is using this page's WebMCP tools" over a grey feed.

**If no chat will use the tools**, shoot the honest variant: set the floor by hand (you get the green bar), and add one shot of **F12 → Application → WebMCP** in Chrome 152 with the flag enabled, showing the live tool list while you say *"this page registers twenty-three tools, scoped to my role and the phase of the case"*, then advance a phase and show the list change. The rest of the script is unchanged, and Autopilot still carries the negotiation.

---

## Scene 3 (1:00 to 1:45) Sealed offers and neutral mediation [W][C]

**CLICK:** **"Let the agents negotiate"** in the Autopilot card.

**POINT AT:** The two envelopes, **"Your envelope"** and **"Their envelope"**, as they flip to **SEALED**.

**POINT AT:** Each grey signal line as it appears: **"Round 1: no overlap. The gap narrowed by..."**

**CLICK "Stop"** the moment the stepper reaches **Mediation**. This hands control back to you and prevents your advocate from auto-accepting before you can talk about it.

**POINT AT:** The mediator card: first the small label **"operated by the platform, controlled by neither party"**, then the proposed amount, then one line of its reasoning.

**CLICK:** **"Accept proposal"** yourself.

**WAIT:** Hold for the landlord's acceptance to land and the stepper to move to **Agreement**, then say the final sentence. Do not say "both sides accept" until both have.

> If your advocate accepts before you hit Stop, that is fine and still on message. Say **"my advocate confirmed the proposal stayed within the limit I authorized, and accepted. Signing is still mine alone."** Then carry on to Scene 4.

**SAY:**
> **"Now both advocates negotiate within limits privately set by their humans. The offers stay sealed. If the two numbers ever overlap, the case settles instantly at the midpoint. If they do not, each side learns only whether the gap is closing. No overlap here, so a mediator controlled by neither party proposes a neutral settlement amount based on the sealed history that neither side can see. Both sides accept."**

---

## Scene 4 (1:45 to 2:20) The human signature [C][E]

**CLICK:** **"Draft the agreement"**.

**SCROLL:** Slowly through the plain-language agreement, one screen only.

**POINT AT:** The line **"Signature: humans only. This is the one step no agent can take."**

**TYPE:** Your name into the signature field, then **CLICK "Sign agreement"**.

**WAIT:** The counterpart countersigns and the **RESOLVED** stamp lands.

**POINT AT:** The final frame with the settled amount, both signatures with timestamps, and the **RECORD SEAL** all visible together.

**SAY:**
> **"The agreement is drafted in plain language. My agent got me here, but it cannot sign. Consent is mine. I sign, the other side signs, resolved. Maya's dispute settles at [read the amount on screen], with a signed agreement and no lawyer. And this seal is a fingerprint of the signed record: anyone holding the document can use it to verify that the record has not been altered since it was signed."**

> Say the real number off the screen. Do not guess it in advance; the mediator's figure varies slightly by run.

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
| Running past 2:55 | Cut **"It cannot skip a step"** and **"The procedure is the tool surface."** Always preserve **"There is no signing tool at all."** |
| A model call is slow | Cut the wait in editing. Never show dead air |

## The muted test

Watch your final cut with the sound off. A judge should still follow: claim, private limit, sealed rounds, mediation, human signature, resolved. If any step is unclear without narration, hold on that screen a beat longer or zoom in.

## Upload

YouTube, **public**. Title: **Fairground: settle disputes with your agent at your side (WebMCP Challenge)**. Turn on auto-captions, then correct "WebMCP" and "sealed offers" in the caption editor. Paste the link into the Devpost video field and submit.
