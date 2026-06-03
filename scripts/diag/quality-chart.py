#!/usr/bin/env python3
"""Render claimboundary quality-over-time (read-only). Reads test-output/quality-ts.csv -> PNG.
Splits the trend by report kind (benchmark vs generic/field) because the bench fraction rises
over time and benchmark scores are bimodal -- so the naive aggregate mean is a mix signal,
not a quality signal. Two weekly-mean lines + bench-fraction make the confound visible."""
import csv, datetime as dt, collections, sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# x-axis mode: 'build' = commit date of ExecutedWebGitCommitHash (the analysis build);
#              'submission' = CreatedUtc (when the job ran). The submission view keeps the
#              early-March reports that have no commit, useful for spotting LLM-provider drift.
MODE = sys.argv[1] if len(sys.argv) > 1 else 'build'
assert MODE in ('build', 'submission'), "arg must be 'build' or 'submission'"

rows = []
skipped = 0
with open('test-output/quality-ts.csv') as f:
    for r in csv.DictReader(f):
        if MODE == 'build':
            bd = r.get('builddate', '')         # commit date; exclude rows with no commit
            if not bd:
                skipped += 1; continue
            try: t = dt.datetime.fromisoformat(bd[:10])
            except Exception: continue
        else:                                    # submission: CreatedUtc, always present
            iso = r.get('iso', '')
            try: t = dt.datetime.fromisoformat(iso[:19])
            except Exception: skipped += 1; continue
        rows.append((t, float(r['score']), r['kind']))
rows.sort(key=lambda x: x[0])
print(f'({MODE} x-axis; {skipped} reports excluded)')
AXLAB = ('BUILD timepoint — commit date of the analysis build (2026)' if MODE == 'build'
         else 'JOB SUBMISSION date — when the report ran, CreatedUtc (2026)')
TITLEKIND = 'by BUILD date (commit)' if MODE == 'build' else 'by JOB SUBMISSION date'
NOTE = 'reports w/ known build' if MODE == 'build' else 'all reports'
OUT = f'test-output/claimboundary-quality-by-{MODE}.png'

def weekly(sel):
    wk = collections.defaultdict(list)
    for t, s, k in rows:
        if sel(k):
            monday = t.date() - dt.timedelta(days=t.weekday())
            wk[monday].append(s)
    ks = sorted(wk)
    x = [dt.datetime.combine(w + dt.timedelta(days=3), dt.time(12)) for w in ks]
    y = [float(np.mean(wk[w])) for w in ks]
    n = [len(wk[w]) for w in ks]
    return x, y, n, ks

fig, (ax, ax2) = plt.subplots(2, 1, figsize=(13, 8), height_ratios=[3, 1], sharex=True)

# scatter (faint) on the top axis
gx = [t for t,s,k in rows if k=='generic']; gy=[s for t,s,k in rows if k=='generic']
bx = [t for t,s,k in rows if k=='bench'];   by=[s for t,s,k in rows if k=='bench']
ax.scatter(gx, gy, s=8, alpha=0.10, color='#4477aa', edgecolors='none')
ax.scatter(bx, by, s=10, alpha=0.16, color='#cc6677', edgecolors='none')

# weekly mean lines: generic (field health), bench (in-band), and naive aggregate (the mix artifact)
ax_x, ax_y, ax_n, _ = weekly(lambda k: True)
gx_, gy_, gn_, _ = weekly(lambda k: k=='generic')
bx_, by_, bn_, _ = weekly(lambda k: k=='bench')
ax.plot(ax_x, ax_y, color='gray', lw=1.3, ls=':', marker='.', ms=4, zorder=4,
        label='naive pooled mean (distorted by benchmark cadence)')
ax.plot(gx_, gy_, color='#1f5fa8', lw=2.6, marker='o', ms=4.5, zorder=6,
        label='generic / field reports — weekly mean (health)')
ax.plot(bx_, by_, color='#b03050', lw=2.6, marker='s', ms=4.5, zorder=6,
        label='benchmark reports — weekly mean (correctness, in-band)')

# 3rd line: mix-adjusted combination — fix the bench:field ratio at its all-time average
# every week, so movement reflects quality change, not the changing benchmark cadence.
nb = sum(1 for _,_,k in rows if k=='bench'); ng = len(rows)-nb
wB, wG = nb/(nb+ng), ng/(nb+ng)
gmap = {x.date():(y,n) for x,y,n in zip(gx_,gy_,gn_)}
bmap = {x.date():(y,n) for x,y,n in zip(bx_,by_,bn_)}
cx, cy = [], []
for d in sorted(set(gmap) & set(bmap)):
    (gy0,gn0),(by0,bn0) = gmap[d], bmap[d]
    if gn0>=3 and bn0>=3:
        cx.append(dt.datetime.combine(d, dt.time(12))); cy.append(wG*gy0 + wB*by0)
ax.plot(cx, cy, color='#117733', lw=3.2, marker='D', ms=5.5, zorder=7,
        label=f'combined, mix-adjusted (fixed {wG:.0%} field / {wB:.0%} bench)')

for d, lab in [('2026-04-22','deployed (2f7a2805)'), ('2026-05-24','rehome rebuild'), ('2026-05-28','gated / HEAD era')]:
    x = dt.datetime.fromisoformat(d)
    for a in (ax, ax2): a.axvline(x, color='gray', ls=':', lw=1.1, alpha=0.8)
    ax.text(x, 104, lab, rotation=90, va='bottom', ha='center', fontsize=8, color='dimgray')

# claimboundary origin commit 9cdc8889 (Feb 17) — extend axis back to it
ORIGIN = dt.datetime(2026, 2, 17)
for a in (ax, ax2): a.axvline(ORIGIN, color='#117733', ls='--', lw=1.5, alpha=0.9)
ax.text(ORIGIN, 104, 'claimboundary origin (9cdc8889, Feb 17)', rotation=90, va='bottom', ha='center', fontsize=8, color='#117733')
ax.set_xlim(left=ORIGIN - dt.timedelta(days=3))
gap_note = 'no report data\nbefore Mar 1' if MODE == 'submission' else 'no commit-tagged\ndata before ~Mar 21'
ax.text(ORIGIN + dt.timedelta(days=4), 55, gap_note, fontsize=7, color='gray', style='italic', va='center', ha='left')

dr0 = min(t for t,_,_ in rows).date(); dr1 = max(t for t,_,_ in rows).date()
ax.set_ylim(0, 112)
ax.set_ylabel('report quality score 0-100  (Captain criteria)')
ax.set_title(f'FactHarbor claimboundary quality {TITLEKIND}  (n={len(rows)} {NOTE}, {dr0} .. {dr1})')
ax.legend(loc='lower left', fontsize=8.5, framealpha=0.92); ax.grid(True, alpha=0.2)

# bottom panel: weekly bench-fraction (the confound driver) + weekly report count
frac_x, frac_v = [], []
wk_all = collections.defaultdict(lambda: [0,0])
for t,s,k in rows:
    monday = t.date() - dt.timedelta(days=t.weekday())
    wk_all[monday][0] += 1
    if k=='bench': wk_all[monday][1] += 1
for w in sorted(wk_all):
    tot, b = wk_all[w]
    frac_x.append(dt.datetime.combine(w + dt.timedelta(days=3), dt.time(12)))
    frac_v.append(100.0*b/tot)
ax2.bar(frac_x, frac_v, width=5, color='#cc6677', alpha=0.55, label='% benchmark runs that week')
ax2.set_ylim(0, 100); ax2.set_ylabel('% benchmark', fontsize=9)
ax2.set_xlabel(AXLAB)
ax2.grid(True, alpha=0.2); ax2.legend(loc='upper left', fontsize=8)
ax2.xaxis.set_major_formatter(mdates.DateFormatter('%b %d'))
ax2.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=mdates.MO))
plt.setp(ax2.get_xticklabels(), rotation=45, ha='right', fontsize=8)

plt.tight_layout()
plt.savefig(OUT, dpi=130)
print('saved', OUT)
print('\nweekly means (generic / field health):')
for x,y,n in zip(gx_,gy_,gn_): print(f'  {x.date()}  gen_mean={y:4.0f}  n={n}')
print('\nweekly means (benchmark in-band):')
for x,y,n in zip(bx_,by_,bn_): print(f'  {x.date()}  bench_mean={y:4.0f}  n={n}')
