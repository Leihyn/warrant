import sys, os, re, html, json
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

CAP = f"{os.path.dirname(os.path.dirname(__file__))}/scratchpad/cap"
CAP = "/private/tmp/claude-501/-Users-machine-Desktop-dev/aa6836ba-e1c4-4552-b17d-3f3078f20c90/scratchpad/cap"
def tlines(p): return [l.rstrip() for l in open(f"{CAP}/{p}").read().split("\n") if l.strip()]
GOOD, BAD, STAT = tlines("good.txt"), tlines("bad.txt"), tlines("status.txt")

def colour(l):
    e = html.escape(l)
    if "===" in l: return f'<span class="hd">{e}</span>'
    if "REVERTED" in l: return f'<span class="no">{e}</span>'
    if "verifySingle    true" in l or "status  1" in l: return f'<span class="ok">{e}</span>'
    if re.match(r"\s*response\s", l): return f'<span class="{"ok" if "100" in l else "no"}">{e}</span>'
    if re.match(r"\s*tag\s", l): return f'<span class="{"no" if "REVERTED" in l else "ok"}">{e}</span>'
    if l.strip().startswith(("The precompile","It does not","That gap")): return f'<span class="th">{e}</span>'
    m = re.match(r"^(\s*\S+)(\s{2,})(.*)$", l)
    if m: return f'<span class="k">{html.escape(m.group(1))}</span>{m.group(2)}<span class="v">{html.escape(m.group(3))}</span>'
    return e

def terminal(cmd, src, upto):
    body = "".join(f"<div>{colour(l)}</div>" for l in src[:upto])
    return ('<div class="term"><div class="bar"><i></i><i></i><i></i><b>warrant — zsh</b></div>'
            f'<div class="tbody"><div style="margin-bottom:12px;color:#e8eef6"><span class="pr">$</span>{html.escape(cmd)}</div>{body}</div></div>')

S = []
def add(inner, cap, hold): S.append((page(inner, cap), hold))

# ── 1. logo ────────────────────────────────────────────────────────────
add(stage(LOGO.format(w=190),
     '<h1 style="font-size:104px">Warrant</h1>',
     '<div class="sub" style="font-size:34px">An ERC-8004 validator with no keys and no opinion.</div>'),
    "", 3.4)

# ── 2. the question ────────────────────────────────────────────────────
add(stage('<div class="eyebrow">The problem</div>',
     '<h1>An agent finishes a job<br>and says it was paid.</h1>',
     f'<div style="font-family:Newsreader,serif;font-size:76px;color:{GREEN};margin-top:6px">Who checks?</div>'),
    "An autonomous agent finishes a job and says it was paid. Who checks?", 5.0)

# ── 3. the validator slot ──────────────────────────────────────────────
slot = box("ERC-8004 · ValidationRegistry", "validatorAddress = ?", w=640, colour=EDGE, h=150, mono=False)
opts = [("A human reviewer","can be lazy, or bought",RED),("A staked node","only as honest as its stake is large",RED),
        ("A TEE","a hardware vendor's promise",RED),("A contract","trusts nothing. needs no keys",GREEN)]
for n in (1,2,3,4):
    cards = row(*[box(t, s, w=340, colour=(c if i < n else EDGE), text=(FG if i < n else DIM),
                      dim=(i >= n), mono=False, h=168) for i,(t,s,c) in enumerate(opts)], gap=22)
    lead = ("ERC-8004 names three things you can put in the validator slot."
            if n < 4 else "But validatorAddress is just an address — and an address can be a contract.")
    add(stage('<div class="eyebrow">The validator slot</div>', slot, arrow(0) and "", cards,
              f'<div class="sub" style="margin-top:4px">{lead}</div>'),
        ("ERC-8004 says trust a reviewer, a staked node, or a TEE. All three are somebody you must trust."
         if n < 4 else "But an address can be a contract. And a contract does not need an opinion."),
        (1.5 if n < 3 else (2.6 if n == 3 else 5.0)))

# ── 4. attestcoin ──────────────────────────────────────────────────────
flow = row(box("Ethereum<br>mainnet","a finalized block",w=300,h=160,mono=False), arrow(),
           box("Creditcoin<br>prover","Merkle + continuity",w=300,h=160,mono=False), arrow(),
           box("0x0FD2","native precompile",w=300,h=160,colour=GREEN,text=GREEN), arrow(),
           box("included<br>= true","",w=240,h=160,colour=GREEN,text=GREEN,mono=False))
add(stage('<div class="eyebrow">Attestcoin Protocol</div>',
     '<h2>Proof, not an oracle.</h2>', flow,
     '<div class="sub">No operator. No committee. No one to bribe.</div>'),
    "Attestcoin proves natively that a transaction was in a finalized Ethereum block. No oracle operator.", 5.6)

# ── 5. THE GAP — the money shot ────────────────────────────────────────
def tx(amount, status, logs, ok, dim=False):
    c = GREEN if ok else RED
    return (f'<div class="{"fade" if dim else ""}" style="width:440px;background:{PANEL};border:2px solid {c};border-radius:12px;padding:22px 24px">'
            f'<div class="mono" style="font-size:30px;color:{FG};font-weight:600">{amount}</div>'
            f'<div class="mono" style="font-size:22px;color:{c};margin-top:12px">receipt status {status}</div>'
            f'<div class="mono" style="font-size:21px;color:{DIM};margin-top:6px">{logs}</div></div>')

def blockfig(step):
    inner = row(tx("45.00 USDC","1","1 log emitted",True, step<1), tx("13.00 USDC","0","0 logs emitted — moved nothing",False, step<1), gap=40)
    blk = (f'<div style="border:2px dashed {EDGE};border-radius:14px;padding:26px 34px 30px">'
           f'<div class="mono" style="font-size:22px;color:{DIM};margin-bottom:20px;text-align:center">'
           f'Ethereum mainnet &nbsp;·&nbsp; block 25,971,533 &nbsp;·&nbsp; one block, one Merkle root</div>{inner}</div>')
    out = ""
    if step >= 2:
        out = ('<div style="display:flex;gap:250px;margin-top:-6px">' + arrow(0) + '</div>'
               + f'<div style="text-align:center">{box("0x0FD2 says true to both", "inclusion is proven — for both", w=760, colour=GREEN, text=GREEN, h=120)}</div>')
    gap = ""
    if step >= 3:
        gap = (f'<div style="margin-top:8px;border:2px solid {AMBER};border-radius:12px;padding:20px 30px;background:rgba(227,179,65,.07)">'
               f'<div style="font-family:Newsreader,serif;font-size:40px;color:{AMBER};text-align:center">'
               f'The block prover does not check whether the transaction succeeded.</div></div>')
    return stage('<div class="eyebrow">The gap</div>', blk, out, gap)

add(blockfig(1), "Two real USDC transfers, sitting in the SAME Ethereum block.", 4.4)
add(blockfig(2), "Attestcoin returns true for both — because both really are in that block.", 4.6)
add(blockfig(3), "But inclusion is not success. A reverted payment proves exactly as well as a real one.", 6.0)

# ── 6. the four invariants ─────────────────────────────────────────────
INV = [("I-1","Inclusion","0x0FD2 verifies the Merkle proof and continuity chain",True),
       ("I-2","Replay","one proof, one settlement",True),
       ("I-3","Receipt status","the transaction must have succeeded",False),
       ("I-4","Emitter + arguments","the log must come from the expected token, and match the claim",None)]
def invfig(step):
    rows=[]
    for i,(k,t,d,ok) in enumerate(INV):
        shown = i < step
        mark = "" if not shown else ('<span style="color:%s;font-size:34px">✓</span>'%GREEN if ok else
               ('<span style="color:%s;font-size:34px">✕</span>'%RED if ok is False else '<span style="color:%s;font-size:34px">✓</span>'%GREY))
        col = EDGE if not shown else (RED if ok is False else EDGE)
        rows.append(f'<div class="{"" if shown else "fade"}" style="display:flex;align-items:center;gap:28px;width:1280px;'
                    f'background:{PANEL};border:2px solid {col};border-radius:12px;padding:20px 28px">'
                    f'<div class="mono" style="font-size:26px;color:{GREEN};width:74px;font-weight:600">{k}</div>'
                    f'<div style="flex:1;text-align:left"><div style="font-size:28px;color:{FG};font-weight:600">{t}</div>'
                    f'<div style="font-size:21px;color:{DIM};margin-top:4px">{d}</div></div><div>{mark}</div></div>')
    note = ('<div class="sub" style="color:%s;font-size:30px">The reverted payment passes I-1 and I-2 — and fails here.</div>'%RED) if step>=3 else ""
    return stage('<div class="eyebrow">What Warrant checks</div>',
                 '<div style="display:flex;flex-direction:column;gap:16px">'+"".join(rows)+'</div>', note)
add(invfig(2), "Warrant decodes the receipt from the proven transaction bytes.", 3.4)
add(invfig(3), "The reverted payment passes inclusion and replay — and fails on receipt status.", 4.6)
add(invfig(4), "Four invariants must hold before it will answer 100.", 3.6)

# ── 7. evidence: the real terminal ─────────────────────────────────────
for n,h in [(6,2.0),(8,1.6),(13,1.6),(16,2.6)]:
    add(stage(terminal("node tools/warrant.mjs preflight 0x415fab3…2d7ea6", BAD, n)),
        "This is the live tool, against the real precompile.", h)
add(stage(terminal("node tools/warrant.mjs preflight 0x415fab3…2d7ea6", BAD, len(BAD))),
    "verifySingle: true. And the payment still did not happen.", 5.0)

# ── 8. the answer ──────────────────────────────────────────────────────
def verdict(n, v, tag, c):
    return (f'<div style="width:560px;background:{PANEL};border:2px solid {c};border-radius:14px;padding:34px 30px;text-align:center">'
            f'<div style="font-size:23px;color:{DIM};font-family:\'IBM Plex Sans\'">{n}</div>'
            f'<div style="font-family:Newsreader,serif;font-size:118px;color:{c};line-height:1.05;margin:10px 0">{v}</div>'
            f'<div class="mono" style="font-size:22px;color:{c}">{tag}</div></div>')
add(stage('<div class="eyebrow">ERC-8004 validationResponse · on chain</div>',
     row(verdict("The payment that happened","100","attestcoin:0x0FD2",GREEN),
         verdict("The payment that did not","0","REVERTED",RED), gap=48),
     '<div class="sub">Both settled on Creditcoin CC3. Both readable by anyone.</div>'),
    "On chain: 100 for the payment that happened, 0 for the one that did not.", 6.2)

# ── 9. close ───────────────────────────────────────────────────────────
add(stage(LOGO.format(w=140),
     '<h1 style="font-size:72px">No keys. No stake. No quorum.</h1>',
     f'<div class="sub" style="font-size:33px;color:{GREEN}">Nothing to bribe, because there is nobody to bribe.</div>',
     f'<div class="mono" style="font-size:24px;color:{DIM};margin-top:18px;text-align:center;line-height:1.9">'
     f'Live on Creditcoin CC3 · chain 102031<br>0x606D9162aD1666B9c5735545A2c81af1f3948cF1<br>github.com/Leihyn/warrant</div>'),
    "", 6.4)

FR = "/private/tmp/claude-501/-Users-machine-Desktop-dev/aa6836ba-e1c4-4552-b17d-3f3078f20c90/scratchpad/vid2/frames"
os.makedirs(FR, exist_ok=True)
for i,(h,_) in enumerate(S): open(f"{FR}/s{i:03d}.html","w").write(h)
json.dump([d for _,d in S], open(f"{FR}/../durations.json","w"))
print(f"states={len(S)}  total={sum(d for _,d in S):.1f}s")
