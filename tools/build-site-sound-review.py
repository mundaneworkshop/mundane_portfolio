#!/usr/bin/env python3
"""Build the hosted "Site Sound Review" artifact from tools/ui-sounds.html.

The repo page loads ../assets/battle/audio.js, ../assets/tokens/bric-tokens.css and the clips in ../assets/audio/ by relative path, so it only works through a
local server. A hosted artifact can't reach repo files, so this script produces ONE self-contained HTML fragment (title + style + body + scripts, no <html>/<head>
wrapper: the Artifact tool adds that) with all of it inlined:

  - assets/tokens/bric-tokens.css      -> inline <style>
  - assets/battle/audio.js             -> inline <script> (the synth UI lab uses MWAudio)
  - assets/audio/{site-ambient,gate-*,holo-*}.m4a -> window.SR_EMBED[name] = base64 (the clips the site's non-arcade sounds play)
  - notes + candidate list              -> artifact `db` (collection "site", docs rows/notes) when the page runs hosted

Usage:   python3 tools/build-site-sound-review.py [out.html]      (default: ./site-sound-review.artifact.html)
Publish: Artifact tool, file_path = the output, capabilities {"db": {}}. Re-run and republish after changing audio.js, the tokens or a site clip.
"""
import base64, glob, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
def read(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()

page = read('tools/ui-sounds.html')
style = re.search(r'<style>(.*?)</style>', page, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', page, re.S).group(1)
scripts = re.findall(r'<script>(.*?)</script>', body, re.S)              # inline scripts, in page order
body_html = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.S).strip()   # (the src= one, audio.js, is inlined below)

tokens = read('assets/tokens/bric-tokens.css')
audio_js = read('assets/battle/audio.js')
assert '</script' not in audio_js, 'audio.js contains </script: escape it before inlining'

clips = {}
for pat in ('site-ambient', 'gate-*', 'holo-*'):
    for f in sorted(glob.glob(os.path.join(ROOT, 'assets/audio', pat + '.m4a'))):
        clips[os.path.basename(f)[:-4]] = base64.b64encode(open(f, 'rb').read()).decode('ascii')
embed = 'window.SR_EMBED=' + '{' + ','.join('"%s":"%s"' % (k, v) for k, v in clips.items()) + '};'

adapter = """
/* hosted only: keep the notes and the candidate list in the artifact database (collection "site", docs "rows" and "notes"), so they follow you across browsers.
   The candidate AUDIO files themselves stay in this browser (IndexedDB), like the other review page. */
(function(){
  if(!(window.claude&&claude.use)) return;
  claude.use('db').then(function(d){
    if(!d) return; var S=window.__siteSoundReview; if(!S) return; var T={};
    window.__srSaved=function(k,v){ clearTimeout(T[k]); T[k]=setTimeout(function(){ d.doc('site/'+k).set({v:JSON.stringify(v)}).catch(function(){}); },500); };
    d.collection('site').onSnapshot(function(snap){ snap.docs.forEach(function(doc){ var x=doc.data()||{}; if(x.v&&(doc.id==='rows'||doc.id==='notes')){ try{ S.setState(doc.id,JSON.parse(x.v)); }catch(e){} } }); },function(){});
  });
})();
"""

out = []
out.append('<title>Site Sound Review</title>')
out.append('<style>\n:root{color-scheme:dark}\n' + tokens + '\n' + style + '\n</style>')
out.append(body_html)
out.append('<script>' + embed + '</script>')
out.append('<script>' + audio_js + '</script>')
for s in scripts:
    out.append('<script>' + s + '</script>')
out.append('<script>' + adapter + '</script>')
html = '\n'.join(out) + '\n'

dest = sys.argv[1] if len(sys.argv) > 1 else 'site-sound-review.artifact.html'
open(dest, 'w', encoding='utf-8').write(html)
print('wrote %s: %.1f KB, %d clips embedded (%.1f KB base64), %d inline page scripts' % (dest, len(html) / 1024, len(clips), sum(len(v) for v in clips.values()) / 1024, len(scripts)))
