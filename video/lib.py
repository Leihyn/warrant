import html, re, math

INK, PANEL, EDGE = "#0B0E14", "#111823", "#232E3D"
GREEN, RED, AMBER, GREY, DIM, FG = "#2DD4A7", "#F0685F", "#E3B341", "#39414F", "#7E8CA0", "#E8EEF6"

CSS = f"""
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:wght@400;500&display=swap');
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1920px;height:1080px;background:{INK};overflow:hidden;position:relative;
 font-family:'IBM Plex Sans',sans-serif;display:flex;align-items:center;justify-content:center}}
.stage{{width:1640px;display:flex;flex-direction:column;align-items:center;gap:34px;margin-bottom:104px}}
.eyebrow{{font-family:'IBM Plex Mono',monospace;font-size:19px;letter-spacing:.2em;text-transform:uppercase;color:{DIM}}}
h1{{font-family:Newsreader,serif;font-size:88px;color:{FG};line-height:1.06;letter-spacing:-.02em;text-align:center}}
h2{{font-family:Newsreader,serif;font-size:60px;color:{FG};line-height:1.12;text-align:center}}
.sub{{font-size:30px;color:{DIM};text-align:center;line-height:1.5;max-width:1200px}}
.cap{{position:absolute;left:0;right:0;bottom:50px;text-align:center;padding:0 130px}}
.cap span{{display:inline-block;background:rgba(4,7,12,.92);color:#f2f6fa;font-family:Newsreader,serif;
 font-size:37px;line-height:1.34;padding:14px 30px;border-radius:8px;border:1px solid #1d2633}}
.mono{{font-family:'IBM Plex Mono',monospace}}
.fade{{opacity:.16}}
/* terminal */
.term{{width:1480px;height:740px;background:#0d1117;border:1px solid {EDGE};border-radius:14px;
 box-shadow:0 40px 120px rgba(0,0,0,.7);display:flex;flex-direction:column;overflow:hidden}}
.bar{{height:50px;background:#151d28;border-bottom:1px solid {EDGE};display:flex;align-items:center;padding:0 20px;gap:9px;flex:none}}
.bar i{{width:12px;height:12px;border-radius:50%;background:#3a4553;display:block}}
.bar b{{color:#66748a;font-size:15px;font-weight:400;margin-left:16px}}
.tbody{{padding:24px 32px;font-family:'IBM Plex Mono',monospace;font-size:22px;line-height:1.6;color:#c3ccd9;white-space:pre;overflow:hidden}}
.pr{{color:{GREEN};margin-right:10px}} .hd{{color:#7f8da0}} .k{{color:#8fa0b5}} .v{{color:#dfe7f0}}
.ok{{color:{GREEN};font-weight:600}} .no{{color:{RED};font-weight:600}} .th{{color:{AMBER}}}
"""

LOGO = f"""<svg viewBox="0 0 480 480" width="{{w}}" height="{{w}}">
<polygon points="326,108 405.67,154 405.67,246 326,292 246.33,246 246.33,154" fill="none" stroke="{GREY}" stroke-width="17" stroke-linejoin="round"/>
<line x1="297" y1="229" x2="355" y2="171" stroke="#59626F" stroke-width="17" stroke-linecap="round"/>
<polygon points="178,142 278.45,200 278.45,316 178,374 77.55,316 77.55,200" fill="{INK}" stroke="{INK}" stroke-width="34" stroke-linejoin="round"/>
<polygon points="178,142 278.45,200 278.45,316 178,374 77.55,316 77.55,200" fill="none" stroke="{GREEN}" stroke-width="17" stroke-linejoin="round"/>
<path d="M 128 258 L 165 295 L 233 222" fill="none" stroke="{GREEN}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/></svg>"""

def page(inner, caption):
    c = f'<div class="cap"><span>{html.escape(caption)}</span></div>' if caption else ""
    return f'<meta charset="utf-8"><style>{CSS}</style>{inner}{c}'

def stage(*parts):
    return '<div class="stage">' + "".join(parts) + '</div>'

def box(label, sub="", w=380, colour=EDGE, text=FG, dim=False, mono=True, h=132):
    f = "fade" if dim else ""
    s = f'<div style="font-size:21px;color:{DIM};margin-top:9px">{sub}</div>' if sub else ""
    fam = "'IBM Plex Mono',monospace" if mono else "'IBM Plex Sans',sans-serif"
    return (f'<div class="{f}" style="width:{w}px;min-height:{h}px;background:{PANEL};border:2px solid {colour};'
            f'border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;'
            f'padding:20px 22px;text-align:center"><div style="font-family:{fam};font-size:27px;color:{text};'
            f'font-weight:600;line-height:1.3">{label}</div>{s}</div>')

def arrow(w=92, colour=GREY, dim=False):
    f = "fade" if dim else ""
    return (f'<svg class="{f}" width="{w}" height="26" viewBox="0 0 {w} 26"><line x1="0" y1="13" x2="{w-14}" y2="13" '
            f'stroke="{colour}" stroke-width="3"/><path d="M {w-16} 5 L {w-2} 13 L {w-16} 21 Z" fill="{colour}"/></svg>')

def row(*parts, gap=26):
    return f'<div style="display:flex;align-items:center;gap:{gap}px;justify-content:center;flex-wrap:wrap">' + "".join(parts) + "</div>"
