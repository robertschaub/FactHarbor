#!/usr/bin/env python3
"""V1 claimboundary quality over time, by branch with MULTI-MEMBERSHIP (read-only).
Reads test-output/quality-branch-membership.csv (a report appears under EVERY survivor branch
whose history contains its commit). Plots per-branch weekly-mean lines, overlaid so shared history
overlaps and forks fan out. main = bold black reference; untracked/orphan = gray (not branches)."""
import csv, datetime as dt, collections, sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# x-axis mode: 'build' = commit date of the analysis build; 'submission' = CreatedUtc (run time).
MODE = sys.argv[1] if len(sys.argv) > 1 else 'build'
assert MODE in ('build', 'submission'), "arg must be 'build' or 'submission'"

rows = collections.defaultdict(list)   # branch -> [(t, score, dirty)]
skipped = 0
with open('test-output/quality-branch-membership.csv') as f:
    for r in csv.DictReader(f):
        if MODE == 'build':
            bd = r.get('builddate', '')      # commit date; exclude rows with no commit
            if not bd:
                skipped += 1; continue
            try: t = dt.datetime.fromisoformat(bd[:10])
            except Exception: continue
        else:                                 # submission: CreatedUtc, always present
            iso = r.get('iso', '')
            try: t = dt.datetime.fromisoformat(iso[:19])
            except Exception: skipped += 1; continue
        rows[r['branch']].append((t, float(r['score']), int(r.get('dirty', 0) or 0)))
print(f'({MODE} x-axis; {skipped} membership rows excluded)')
AXLAB = ('BUILD timepoint — commit date of the analysis build (2026)' if MODE == 'build'
         else 'JOB SUBMISSION date — when the report ran, CreatedUtc (2026)')
TITLEKIND = 'by BUILD date (commit)' if MODE == 'build' else 'by JOB SUBMISSION date'
OUT = f'test-output/claimboundary-quality-by-branch-{MODE}.png'

def short(b):
    return (b.replace('codex/', '').replace('-2026-05-27', '')) if b.startswith('codex/') else b

# order: main first (reference), then branches by size, then untracked/orphan last
special = ['untracked (no commit)', 'orphan (no branch)', 'PROD (deployed)', 'qbd d3ad26ca (Mar 8)']
branches = [b for b in rows if b not in special]
branches.sort(key=lambda b: (-len(rows[b]), b))
if 'main' in branches:
    branches.remove('main'); branches = ['main'] + branches

palette = ['#000000', '#e8820c', '#1f77b4', '#2ca02c', '#9467bd', '#8c564b', '#d62728',
           '#17becf', '#bcbd22']
cmap = {}
ci = 0
for b in branches:
    cmap[b] = palette[ci % len(palette)]; ci += 1

fig, ax = plt.subplots(figsize=(14, 7))

def weekly(series):
    wk = collections.defaultdict(list)
    for t, s, d in series:
        wk[t.date() - dt.timedelta(days=t.weekday())].append(s)
    ks = sorted(w for w in wk if len(wk[w]) >= 3)
    x = [dt.datetime.combine(w + dt.timedelta(days=3), dt.time(12)) for w in ks]
    y = [float(np.mean(wk[w])) for w in ks]
    n = [len(wk[w]) for w in ks]                 # samples in each weekly bin
    return x, y, n

def annotate_n(x, y, n, color):
    for xi, yi, ni in zip(x, y, n):
        ax.annotate(str(ni), (xi, yi), textcoords='offset points', xytext=(0, 4),
                    fontsize=6, color=color, ha='center', va='bottom', zorder=10)

for b in branches:
    x, y, nn = weekly(rows[b])
    if not x: continue
    tot = len(rows[b]); dn = sum(1 for _,_,d in rows[b] if d)
    lw = 3.4 if b == 'main' else 2.0
    ax.plot(x, y, color=cmap[b], lw=lw, marker='o', ms=4, alpha=0.9 if b=='main' else 0.8,
            zorder=6 if b=='main' else 5,
            label=f'{short(b)}  (n={tot}, {100*dn//max(tot,1)}% dirty)')
    annotate_n(x, y, nn, cmap[b])

# PROD (deployed instance) — bold reference series (the Captain's "deployed quality" baseline)
if 'PROD (deployed)' in rows:
    x, y, nn = weekly(rows['PROD (deployed)'])
    if x:
        ax.plot(x, y, color='#d62728', lw=3.6, marker='D', ms=6, zorder=8,
                label=f'PROD deployed instance  (n={len(rows["PROD (deployed)"])})')
        annotate_n(x, y, nn, '#d62728')
# quality_before_decline d3ad26ca (Mar 8) — deliberately-run measurement, distinct star
if 'qbd d3ad26ca (Mar 8)' in rows:
    x, y, nn = weekly(rows['qbd d3ad26ca (Mar 8)'])
    if x:
        ax.plot(x, y, color='#117733', lw=0, marker='*', ms=22, zorder=12, markeredgecolor='black', markeredgewidth=0.6,
                label=f'quality_before_decline d3ad26ca (Mar 8, n={len(rows["qbd d3ad26ca (Mar 8)"])})')
        annotate_n(x, y, nn, '#117733')
# other non-branch reference series
for b, col, ls in [('untracked (no commit)', '#888888', '--'), ('orphan (no branch)', '#bbbbbb', ':')]:
    if b in rows:
        x, y, nn = weekly(rows[b])
        if x:
            ax.plot(x, y, color=col, lw=1.8, ls=ls, marker='.', ms=4, zorder=3,
                    label=f'{b}  (n={len(rows[b])})')
            annotate_n(x, y, nn, col)

for d, lab in [('2026-04-22','deployed (2f7a2805)'), ('2026-05-24','rehome rebuild'), ('2026-05-28','gated / HEAD era')]:
    x = dt.datetime.fromisoformat(d)
    ax.axvline(x, color='gray', ls=':', lw=1.0, alpha=0.7)
    ax.text(x, 104, lab, rotation=90, va='bottom', ha='center', fontsize=8, color='dimgray')

# claimboundary origin commit 9cdc8889 (Feb 17) — extend axis back to it
ORIGIN = dt.datetime(2026, 2, 17)
ax.axvline(ORIGIN, color='#117733', ls='--', lw=1.5, alpha=0.9)
ax.text(ORIGIN, 104, 'claimboundary origin (9cdc8889, Feb 17)', rotation=90, va='bottom', ha='center', fontsize=8, color='#117733')
ax.set_xlim(left=ORIGIN - dt.timedelta(days=3))
gap_note = 'no report data\nbefore Mar 1' if MODE == 'submission' else 'no commit-tagged\ndata before ~Mar 21'
ax.text(ORIGIN + dt.timedelta(days=4), 55, gap_note, fontsize=7, color='gray', style='italic', va='center', ha='left')

total = sum(len(v) for v in rows.values())
ax.set_ylim(0, 112); ax.set_xlabel(AXLAB)
ax.set_ylabel('report quality score 0-100 (Captain criteria)')
ax.set_title(f'V1 claimboundary quality {TITLEKIND}, by branch (multi-membership: a report '
             'appears under every branch containing its commit)')
ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %d'))
ax.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=mdates.MO))
plt.setp(ax.get_xticklabels(), rotation=45, ha='right', fontsize=8)
ax.legend(loc='lower left', fontsize=8, framealpha=0.93, ncol=2,
          title='survivor branches (main-anchored; <10 divergent-from-main dropped) · point labels = weekly sample count')
ax.grid(True, alpha=0.2)
plt.tight_layout()
plt.savefig(OUT, dpi=130)
print('saved', OUT, ' (branches plotted:', len(branches), ')')
