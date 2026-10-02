#!/usr/bin/env python3
"""Derive assets/tokens/bric-tokens.json from assets/tokens/bric-tokens.css.

Run from the repo root after regenerating the CSS (see tools/figma-export-tokens.js):
    python3 tools/derive-token-json.py

Also asserts the invariants the CSS relies on: every var() alias resolves to a declared token, and every
alias declared on :root is re-declared under body.light (otherwise light mode silently keeps dark values).
"""
import json
import re
import sys

CSS = 'assets/tokens/bric-tokens.css'
OUT = 'assets/tokens/bric-tokens.json'

css = open(CSS).read()
decl = {}
for sel, body in re.findall(r'(:root(?:,\.bric-dark)?|body\.light)\s*\{(.*?)\n\}', css, re.S):
    sel = ':root' if sel.startswith(':root') else sel
    for name, val in re.findall(r'(--bric-[a-z0-9-]+):\s*([^;]+);', body):
        decl.setdefault(sel, {})[name] = val.strip()
root, light = decl[':root'], decl['body.light']

aliases = [n for n, v in root.items() if v.startswith('var(')]
missing = [n for n in aliases if n not in light]
refs = [m for v in list(root.values()) + list(light.values()) for m in re.findall(r'var\((--bric-[a-z0-9-]+)\)', v)]
dangling = [r for r in refs if r not in root]
if missing or dangling:
    sys.exit(f'invariant failed — aliases missing from body.light: {missing}; dangling var(): {dangling}')


def kind(name):
    if re.match(r'--bric-(space|corner)-', name):
        return 'dimension'
    if '-duration-' in name:
        return 'duration'
    if '-easing' in name:
        return 'cubicBezier'
    return 'color'


tokens = {n: {'type': kind(n), 'dark': v, 'light': light.get(n, v)} for n, v in root.items()}
out = {
    '_generated': 'Derived from bric-tokens.css (which is generated from Figma file O6bdoXtisdLxlsjhI41rqR) — do not edit by hand. '
                  'Flat list keyed by CSS custom property; values may be var() aliases (resolve them against the active mode). '
                  'Deprecated Figma tokens are omitted.',
    'tokens': tokens,
}
open(OUT, 'w').write(json.dumps(out, indent=2) + '\n')
print(f'{len(tokens)} tokens, {len(aliases)} aliases, {len(light)} light-block declarations')
