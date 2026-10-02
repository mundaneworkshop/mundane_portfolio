/* Figma → assets/tokens/bric-tokens.css exporter.
 *
 * Not runnable locally: it executes inside the Figma plugin sandbox. Run it with the figma-console MCP
 * (`figma_execute`) while the "BRIC DS" file (key O6bdoXtisdLxlsjhI41rqR) is open, then write the returned
 * `css` string to assets/tokens/bric-tokens.css and run tools/derive-token-json.py to refresh the JSON.
 * Review the git diff — it should only contain intentional token changes.
 *
 * Rules baked in (do not change without reading docs/project-history/interactive-states.md):
 *  - names: `--bric-` + variable name with "/" → "-"
 *  - dark is the default on :root; light overrides go under body.light (the site's theming mechanism)
 *  - alias tokens (value is another variable) are emitted in BOTH blocks — CSS resolves var() where it is
 *    declared, so an alias left only on :root never sees the body.light overrides
 *  - variables whose description starts with "DEPRECATED" are omitted
 */
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = Object.fromEntries(vars.map(v => [v.id, v]));
const color = cols.find(c => c.name === 'Color'), motion = cols.find(c => c.name === 'Motion'), prim = cols.find(c => c.name === 'Primitives');
const LIGHT = color.modes.find(m => m.name === 'Light').modeId, DARK = color.modes.find(m => m.name === 'Dark').modeId;
const cssName = n => '--bric-' + n.replace(/\//g, '-');
const H = x => Math.round(x * 255).toString(16).padStart(2, '0').toUpperCase();
const lit = c => c.a !== undefined && c.a < 1
  ? `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${+c.a.toFixed(3)})`
  : `#${H(c.r)}${H(c.g)}${H(c.b)}`;
const val = (v, m) => { const x = v.valuesByMode[m]; return x && x.type === 'VARIABLE_ALIAS' ? { alias: byId[x.id].name } : { lit: lit(x) }; };
const same = (a, b) => a.alias ? a.alias === b.alias : a.lit === b.lit;
const ref = r => r.alias ? `var(${cssName(r.alias)})` : r.lit;
const isDep = v => /^DEPRECATED/.test(v.description || '');
const order = ['surface', 'content', 'border', 'interactive', 'fx', 'feedback', 'register', 'schematic', 'holonet', 'danger', 'display'];
const grp = v => v.name.split('/')[0];
const live = color.variableIds.map(i => byId[i]).filter(v => !isDep(v)).sort((a, b) => order.indexOf(grp(a)) - order.indexOf(grp(b)));
const pv = re => prim.variableIds.map(i => byId[i]).filter(v => re.test(v.name));

let css = `/* BRIC DS tokens — GENERATED from the Figma file "BRIC DS" (key ${figma.fileKey || 'O6bdoXtisdLxlsjhI41rqR'}).\n * Do not edit by hand: change the variable in Figma, then regenerate (see docs/project-history/interactive-states.md).\n *\n * Namespaced --bric-* so nothing collides with the site's own vars (--bg, --text, --amber, …).\n * Theming matches the site: dark is the default on :root, light overrides live under body.light\n * (toggled by applyTheme()). Mode-independent tokens (register/*) appear once, in :root.\n * Alias tokens (value is var(--bric-…)) appear in BOTH blocks — see the note in body.light.\n * Deprecated Figma tokens (interactive/primary|secondary|ghost/*) are intentionally omitted.\n */\n:root{\n  /* spacing — 8px stud scale (primitives) */\n`;
pv(/^space\//).forEach(v => { css += `  ${cssName(v.name)}: ${Object.values(v.valuesByMode)[0]}px;\n`; });
css += `  /* corner */\n`;
pv(/^corner\//).forEach(v => { css += `  ${cssName(v.name)}: ${Object.values(v.valuesByMode)[0]}px;\n`; });
css += `  /* motion — Snap (mechanical) and Float (springy) */\n`;
motion.variableIds.map(i => byId[i]).forEach(v => { css += `  ${cssName(v.name)}: ${Object.values(v.valuesByMode)[0]};\n`; });
let last = '';
const lightEntries = [];
live.forEach(v => {
  const g = grp(v); if (g !== last) { css += `  /* color · ${g} (dark) */\n`; last = g; }
  const d = val(v, DARK), l = val(v, LIGHT);
  css += `  ${cssName(v.name)}: ${ref(d)};\n`;
  if (d.alias || !same(d, l)) lightEntries.push([v, l]);
});
css += `}\nbody.light{\n`; last = '';
lightEntries.forEach(([v, l]) => {
  const g = grp(v); if (g !== last) { css += `  /* color · ${g} (light) */\n`; last = g; }
  if (g === 'interactive' && l.alias && !css.includes('re-declared here')) css += `  /* aliases are re-declared here: var() resolves where it is declared,\n     so aliases left only on :root would never see the body.light overrides above */\n`;
  css += `  ${cssName(v.name)}: ${ref(l)};\n`;
});
css += `}\n`;
return { css, tokens: live.length };
