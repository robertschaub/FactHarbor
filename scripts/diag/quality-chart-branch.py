#!/usr/bin/env python3
"""Claimboundary quality over time, SEPARATED BY BRANCH (read-only).
Reads test-output/quality-ts.csv -> PNG. Color = branch (base-commit ancestry).
Top: branch-colored scatter + per-branch weekly-mean lines (drawn where n>=3/week).
Bottom: weekly report volume stacked by branch (when each branch was active)."""
import csv, datetime as dt, collections
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

COLORS = {
    'main':'#1f5fa8', 'rehome':'#e8820c', 'Pipeline_V2':'#8856a7',
    'codex-pre-rehome':'#2ca25f', 'other-branch':'#8c564b', 'untracked':'#9a9a9a',
    'unknown-commit':'#d62728',
}
ORDER = ['main','rehome','Pipeline_V2','codex-pre-rehome','other-branch','untracked','unknown-commit']

rows = []
with open('test-output/quality-ts.csv') as f:
    for r in csv.DictReader(f):
        try: t = dt.datetime.fromisoformat(r['iso'][:19])
        except Exception: continue
        rows.append((t, float(r['score']), r['branch'], int(r.get('dirty', 0) or 0)))
rows.sort(key=lambda x: x[0])
branches = [b for b in ORDER if any(x[2]==b for x in rows)]

fig, (ax, ax2) = plt.subplots(2, 1, figsize=(13.5, 8.5), height_ratios=[3,1], sharex=True)

# scatter by branch (dirty = lower alpha + 'x'; clean = filled dot)
for b in branches:
    cx = [t for t,s,br,d in rows if br==b and not d]; cy=[s for t,s,br,d in rows if br==b and not d]
    dx = [t for t,s,br,d in rows if br==b and d];     dy=[s for t,s,br,d in rows if br==b and d]
    ax.scatter(cx, cy, s=11, alpha=0.30, color=COLORS[b], edgecolors='none')
    ax.scatter(dx, dy, s=14, alpha=0.30, color=COLORS[b], marker='x', linewidths=0.7)

# per-branch weekly mean lines (n>=3/week)
def weekly_means(b):
    wk = collections.defaultdict(list)
    for t,s,br,d in rows:
        if br==b:
            wk[t.date()-dt.timedelta(days=t.weekday())].append(s)
    ks = sorted(w for w in wk if len(wk[w])>=3)
    x = [dt.datetime.combine(w+dt.timedelta(days=3), dt.time(12)) for w in ks]
    y = [float(np.mean(wk[w])) for w in ks]
    return x, y
n_by_branch = collections.Counter(x[2] for x in rows)
for b in branches:
    x, y = weekly_means(b)
    if x:
        ax.plot(x, y, color=COLORS[b], lw=2.6, marker='o', ms=4.5, zorder=6,
                label=f'{b}  (n={n_by_branch[b]})')

for d, lab in [('2026-04-22','deployed (2f7a2805)'), ('2026-05-24','rehome rebuild'), ('2026-05-28','gated / HEAD era')]:
    x = dt.datetime.fromisoformat(d)
    for a in (ax, ax2): a.axvline(x, color='gray', ls=':', lw=1.0, alpha=0.7)
    ax.text(x, 104, lab, rotation=90, va='bottom', ha='center', fontsize=8, color='dimgray')

ax.set_ylim(0,112); ax.set_ylabel('report quality score 0-100 (Captain criteria)')
ax.set_title(f'FactHarbor claimboundary quality over time, by branch  '
             f'(n={len(rows)} reports, all 5 DBs; x-marker = dirty/experiment tree)')
ax.legend(loc='lower left', fontsize=8.3, framealpha=0.92, ncol=2); ax.grid(True, alpha=0.2)

# bottom: weekly report volume stacked by branch
wk_counts = {b: collections.defaultdict(int) for b in branches}
allweeks = set()
for t,s,br,d in rows:
    w = t.date()-dt.timedelta(days=t.weekday()); wk_counts[br][w]+=1; allweeks.add(w)
weeks = sorted(allweeks)
wx = [dt.datetime.combine(w+dt.timedelta(days=3), dt.time(12)) for w in weeks]
bottom = np.zeros(len(weeks))
for b in branches:
    vals = np.array([wk_counts[b][w] for w in weeks])
    ax2.bar(wx, vals, bottom=bottom, width=5.5, color=COLORS[b], alpha=0.85, label=b)
    bottom += vals
ax2.set_ylabel('reports / week', fontsize=9); ax2.set_xlabel('build timepoint (report run date, 2026)')
ax2.grid(True, alpha=0.2)
ax2.xaxis.set_major_formatter(mdates.DateFormatter('%b %d'))
ax2.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=mdates.MO))
plt.setp(ax2.get_xticklabels(), rotation=45, ha='right', fontsize=8)

plt.tight_layout()
plt.savefig('test-output/claimboundary-quality-by-branch.png', dpi=130)
print('saved test-output/claimboundary-quality-by-branch.png')
print('\nper-branch overall mean score:')
for b in branches:
    ys=[s for _,s,br,_ in rows if br==b]
    dn=sum(1 for _,_,br,d in rows if br==b and d)
    print(f'  {b:18s} n={len(ys):4d}  mean={np.mean(ys):4.0f}  dirty={dn}/{len(ys)}')
