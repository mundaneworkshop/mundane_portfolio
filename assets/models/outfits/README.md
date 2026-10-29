# Minifigure outfits

Each outfit lives in its own folder here: `assets/models/outfits/<outfit-id>/*.glb`.
An outfit can have several GLBs (body, legs, hat, …). They load together and are
fitted as ONE figure, so export every part of an outfit from the same scene so they
share an origin and scale.

`assets/outfits.json` lists the outfits the site shows (order = cycle order):

```json
{ "version": 1, "outfits": [
  { "id": "space-suit", "name": "Space suit", "enabled": true,
    "parts": [ { "file": "assets/models/outfits/space-suit/body.glb" } ] }
] }
```

With no outfits listed, the site shows the original sig-fig head.

## Workflow

1. Open the site with `?edit=1`, click **☺ outfits**.
2. **＋ New outfit**, name it, **⬆ Add GLB(s)**. It previews live on the hologram
   (draft = stored in this browser only).
3. **⇩ Export bundle** downloads `mw-outfits.zip`. Unzip it at the repo root
   (it contains `assets/outfits.json` and `assets/models/outfits/<id>/…`), commit, push.
4. Once deployed, the draft shows as "repo" and you can delete the local copy.

Renames, enabling/disabling, order and the figure size/height/cycle settings made in the
manager sync through the normal SAVE (`copyOvr`), no commit needed.
