# Fairground demo: shooting script

Target 2:40. Hard cap 3:00. Narration is 344 words, about 2:27 of speech at a calm pace, leaving roughly 33 seconds for clicks, page loads and pauses. **Time your rehearsal with a stopwatch.**

Setup: **ChatGPT's in-app browser**, the "Do anything" bar at the bottom is where you type. Confirmed working.

Beats map to judging criteria: **[I]** Impact, **[W]** WebMCP Leverage, **[E]** Execution, **[C]** Creativity.

---

## Before you press record

- Open https://fairground-umber.vercel.app and **start a fresh deposit demo** (don't reuse a case that already has offers in it).
- Badge must read **"● WebMCP active, tools registered."** If the agent ever says it cannot reach the page, **relaunch the browser** — that fixes it.
- Click **"Got it"** to dismiss the blue "New here?" banner. It eats a third of the frame.
- Zoom 110 to 125 percent. Mic on. No music.
- Record in short clips and stitch. Cut every pause where nothing changes on screen.

**Where to point for agent activity: the CASE LOG** (right column). It records each agent action without revealing the numbers, which is exactly the story. The "Your agent on this page" panel resets whenever the page reloads, so don't rely on it.

---

## Scene 1 (0:00 to 0:20) The problem [I]

**NAVIGATE:** Start on the landing page. Scroll slowly past the Docket strip, then **click the demo card "The withheld deposit."** You are inside a live case by second 15.

**SAY:**
> **"Maya's landlord kept her twelve hundred dollar deposit, even though she passed the move-out inspection. A lawyer costs more than the deposit, and small claims court takes months. Most people in her position get no legal help, so they give up. This is Fairground: a neutral resolution room where both sides bring their own AI advocate."**

---

## Scene 2 (0:20 to 1:00) The agent uses the page [W]

**POINT AT:** The green badge **"WebMCP active, tools registered"**, then **"You are the claimant"** at the top right.

**TYPE INTO "Do anything":**
> "Review my claim against the landlord and give me a private reality check. Then set my floor at 800 dollars."

**POINT AT**, in this order, once the agent replies:

1. **Case log:** *"claimant requested a private reality check. (Contents private to that side.)"*
2. **Case log:** *"claimant set a private negotiation mandate. (Contents sealed.)"* — the platform records that it happened, never the number
3. **Left panel:** *"Private mandate on file: floor $800."*

**SAY:**
> **"I just talk. My agent is using this page's WebMCP tools: reading the claim, checking my position, sealing my floor at eight hundred dollars. The log records that it happened, never the number. The page decides which tools exist, based on who I am and where the case stands. My agent cannot see the landlord's numbers. And there is no signing tool at all. The procedure is the tool surface."**

---

## Scene 3 (1:00 to 1:45) Sealed offers and neutral mediation [W][C]

**CLICK:** **"Let the agents negotiate"** in the Autopilot card.

**POINT AT:** The envelopes flipping to **SEALED**, then each grey signal line: *"Round 1: no overlap. The gap..."*

**CLICK "Stop"** the moment the stepper reaches **Mediation**, so you control the next beat.

**POINT AT:** The mediator card: the label **"operated by the platform, controlled by neither party"**, then the amount.

**CLICK:** **"Accept proposal."**

**WAIT** for the landlord's acceptance and the stepper to reach **Agreement** before saying the last sentence.

**SAY:**
> **"Now both advocates negotiate within limits privately set by their humans. The offers stay sealed. If the two numbers ever overlap, the case settles instantly at the midpoint. If they do not, each side learns only whether the gap is closing. No overlap here, so a mediator controlled by neither party proposes a settlement based on the sealed history. Both sides accept."**

> If your advocate accepts before you hit Stop: **"My advocate confirmed the proposal stayed within the limit I authorized, and accepted. Signing is still mine alone."**

---

## Scene 4 (1:45 to 2:20) The human signature [C][E]

**CLICK:** **"Draft the agreement."** Scroll one screen of the plain-language text.

**POINT AT:** *"Signature: humans only. This is the one step no agent can take."*

**TYPE** your name, **CLICK "Sign agreement."** The counterpart countersigns; the **RESOLVED** stamp lands.

**END FRAMED ON:** the amount, both signatures with timestamps, and the **RECORD SEAL** together.

**SAY:**
> **"The agreement is drafted in plain language. My agent got me here, but it cannot sign. Consent is mine. I sign, the other side signs, resolved. Maya's dispute settles at [read the amount on screen], with a signed agreement and no lawyer. And this seal is a fingerprint of the signed record: anyone holding it can verify nothing was altered after signing."**

> Say the real number off the screen. It varies slightly per run.

---

## Scene 5 (2:20 to 2:40) Both sides, for real [C][E]

Show the mechanism, do not just claim it. Four beats, about eighteen seconds. Everything is pre-staged (see setup below), so this is only clicking and pasting.

**BEAT 1 — NAVIGATE** to the pre-staged **real** case in window one. **POINT AT** the right column card **"Invite the other party"**.

**BEAT 2 — CLICK "Copy."** The button flips to **"Copied ✓"**.

**BEAT 3 — SWITCH** to window two. **PASTE** into the address bar and press Enter.

**BEAT 4 — THE RESPONDENT'S CASE ROOM LOADS.** Point at three things quickly:
- The badge, now reading **"You are the respondent"** (it said claimant one second ago)
- Their own **"Private reality check"** button
- The evidence, labelled **"other side"** from their point of view

**SAY** (start on Beat 1, land the last line as the respondent page appears):
> **"That was practice mode. In a real case, I copy one link and send it. They open the same case from their own side, with their own agent and their own private reality check. Neither side ever sees the other's numbers."**

> Jump-cut the page load between Beats 3 and 4. Never show a loading screen.

---

## Scene 6 (2:35 to 2:55) Proof and close [I][E]

**NAVIGATE:** Back to the landing page. **POINT AT** the Docket counter. **END ON** the hero headline, held two seconds.

**SAY:**
> **"We ran thirty simulated disputes end to end on this live deployment. Every one settled, in under a minute each. They feed this public docket, including the one you just watched. Two opposing agents, one neutral page, and a signature only a human can give. Justice, for disputes too small for lawyers. Fairground."**

---

## Setup for Scene 5 (do this before you record)

Use the same dispute as the demo, so the respondent's view shows a claim the viewer already recognises.

1. On the landing page, scroll to **"Put it on the table"** and **uncheck "Practice mode"**. The button changes to **"Open case & get invite link"**. Fill in:

   - **Case title:** `Withheld security deposit — 44 Cedar St.`
   - **What happened:** `After two years at 44 Cedar St., I moved out on June 30 and left the unit clean. The property manager signed a move-out checklist marking every room OK, then kept my entire $1,200 deposit, claiming wall damage discovered later. State law required an itemized deduction list within 21 days; I never received one.`
   - **Amount:** `1200`
   - **Category:** `Security deposit`

   Click **"Open case & get invite link"**.

2. Inside the case, **add one piece of evidence**. Without it the respondent's record is empty and Beat 4 has nothing to point at.

   - **Evidence title:** `Move-out inspection checklist`
   - **What does it show:** `Signed by the property manager on June 30. Every room marked OK, no damage noted anywhere.`
   - **Type:** `document`, then click **"Add to record"**

3. Click **"Serve claim → get invite link"**. The **"Invite the other party"** card now appears in the right column. This step is required: the card stays hidden during intake. **Stop here.**
4. Open a **second window** (a different browser profile, or Incognito) and leave it on any page. Do **not** paste the link yet, so the reveal is live on camera.
5. Position the windows so you can switch between them quickly.

> Do not let the respondent file a response during setup. The invite card disappears once they do.

> Keep this beat to one breath. It exists to prove the two-party claim is real, not to run a second negotiation.

---

## If something goes sideways

| Problem | Do this |
|---|---|
| Agent says it cannot reach the page | Relaunch ChatGPT's browser, reopen the case |
| Agent is slow | Cut the wait in editing. Never show dead air |
| Autopilot settles by overlap instead of mediation | Say **"the two sealed offers overlapped, so it settled instantly at the midpoint"** and skip the mediator lines |
| Running past 2:50 | Cut, in this order: **"The procedure is the tool surface"** (Scene 2), **"Same table, two advocates"** (Scene 5), **"They feed this public docket as anonymous totals, including the one you just watched"** (Scene 6). Always keep **"There is no signing tool at all."** |

## Two gates before upload

1. **Muted test.** Watch with sound off. A judge should still follow: claim → private limit → sealed rounds → mediation → human signature → resolved.
2. **Stopwatch.** Under 3:00, ideally 2:45.

## Upload

YouTube, **public**. Title: **Fairground: settle disputes with your agent at your side (WebMCP Challenge)**. Turn on auto-captions, then fix "WebMCP" and "sealed offers" in the caption editor. Paste the link into Devpost and submit.
