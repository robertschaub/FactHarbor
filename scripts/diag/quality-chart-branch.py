#!/usr/bin/env python3
"""V1 claimboundary quality over time, by branch with MULTI-MEMBERSHIP (read-only).
Reads test-output/quality-branch-membership.csv (a report appears under EVERY survivor branch
whose history contains its commit). Plots per-branch weekly-mean lines, overlaid so shared history
overlaps and forks fan out. main = bold black reference; untracked/orphan = gray (not branches)."""
import csv, datetime as dt, collections
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

rows = collections.defaultdict(list)   # branch -> [(t, score, dirty)]
with open('test-output/quality-branch-membership.csv') as f:
    for r in csv.DictReader(f):
        try: t = dt.datetime.fromisoformat(r['iso'][:19])
        except Exception: continue
        rows[r['branch']].append((t, float(r['score']), int(r.get('dirty', 0) or 0)))

def short(b):
    return (b.replace('codex/', '').replace('-2026-05-27', '')) if b.startswith('codex/') else b

# order: main first (reference), then branches by size, then untracked/orphan last
special = ['untracked (no commit)', 'orphan (no branch)', 'PROD (deployed)']
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
    return x, y

for b in branches:
    x, y = weekly(rows[b])
    if not x: continue
    n = len(rows[b]); dn = sum(1 for _,_,d in rows[b] if d)
    lw = 3.4 if b == 'main' else 2.0
    ax.plot(x, y, color=cmap[b], lw=lw, marker='o', ms=4, alpha=0.9 if b=='main' else 0.8,
            zorder=6 if b=='main' else 5,
            label=f'{short(b)}  (n={n}, {100*dn//max(n,1)}% dirty)')

# PROD (deployed instance) — bold reference series (the Captain's "deployed quality" baseline)
if 'PROD (deployed)' in rows:
    x, y = weekly(rows['PROD (deployed)'])
    if x: ax.plot(x, y, color='#d62728', lw=3.6, marker='D', ms=6, zorder=8,
                  label=f'PROD deployed instance  (n={len(rows["PROD (deployed)"])})')
# other non-branch reference series
for b, col, ls in [('untracked (no commit)', '#888888', '--'), ('orphan (no branch)', '#bbbbbb', ':')]:
    if b in rows:
        x, y = weekly(rows[b])
        if x: ax.plot(x, y, color=col, lw=1.8, ls=ls, marker='.', ms=4, zorder=3,
                      label=f'{b}  (n={len(rows[b])})')

for d, lab in [('2026-04-22','deployed (2f7a2805)'), ('2026-05-24','rehome rebuild'), ('2026-05-28','gated / HEAD era')]:
    x = dt.datetime.fromisoformat(d)
    ax.axvline(x, color='gray', ls=':', lw=1.0, alpha=0.7)
    ax.text(x, 104, lab, rotation=90, va='bottom', ha='center', fontsize=8, color='dimgray')

total = sum(len(v) for v in rows.values())
ax.set_ylim(0, 112); ax.set_xlabel('build timepoint (report run date, 2026)')
ax.set_ylabel('report quality score 0-100 (Captain criteria)')
ax.set_title('V1 claimboundary quality over time, by branch (multi-membership: a report appears under '
             'every branch containing its commit)')
ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %d'))
ax.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=mdates.MO))
plt.setp(ax.get_xticklabels(), rotation=45, ha='right', fontsize=8)
ax.legend(loc='lower left', fontsize=8, framealpha=0.93, ncol=2,
          title='survivor branches (main-anchored; <10 divergent-from-main dropped)')
ax.grid(True, alpha=0.2)
plt.tight_layout()
plt.savefig('test-output/claimboundary-quality-by-branch.png', dpi=130)
print('saved test-output/claimboundary-quality-by-branch.png  (branches plotted:', len(branches), ')')
