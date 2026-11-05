#!/usr/bin/env python3
"""V6B Generator Studio: local web UI backed by the ORIGINAL live_v6b.py.

No edits to game/ or approved assets. Generated files live in disposable
temporary folders. A browser cannot run this NumPy/Pillow engine on Pages;
run this small server locally instead.
"""
from __future__ import annotations

import io
import json
import os
import re
import shutil
import sys
import tempfile
import threading
import uuid
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
V6B = REPO / "chars-iso" / "v6b"
sys.path.insert(0, str(V6B / "tools"))
import live_v6b as engine  # noqa: E402

HOST = os.environ.get("V6B_HOST", "0.0.0.0" if os.environ.get("RENDER") else "127.0.0.1")
PORT = int(os.environ.get("PORT", "8766"))
MAX_JOBS = 2
LOCK = threading.Lock()
JOBS: OrderedDict[str, dict] = OrderedDict()
STYLES = {"mid", "wavy", "long"}
FRINGES = {"bangs", "swept", "curtain"}
TOPS = {"tee", "graphic", "shirt", "cardigan"}
PANTS = {"trousers", "baggy"}
DIRECTIONS = tuple(engine.DIRS)
ACTIONS = tuple(engine.ROWMAP)
EXPRESSIONS = tuple(engine.EXPRS)
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
SLUG = re.compile(r"[^a-z0-9_]+")


def color(value, fallback):
    return value.upper() if isinstance(value, str) and HEX.fullmatch(value) else fallback


def recolor_ramp(old: dict, key: str, replacement: str):
    original = old[key]
    old_rgb = [int(original[i:i + 2], 16) for i in (1, 3, 5)]
    new_rgb = [int(replacement[i:i + 2], 16) for i in (1, 3, 5)]
    result = {}
    for name, value in old.items():
        rgb = [int(value[i:i + 2], 16) for i in (1, 3, 5)]
        out = [min(255, round(v * n / max(1, o))) for v, n, o in zip(rgb, new_rgb, old_rgb)]
        result[name] = "#" + "".join(f"{v:02X}" for v in out)
    return result


def make_config(params: dict):
    template = str(params.get("template", "ichsan"))
    if template not in ("ichsan", "noor"):
        raise ValueError("Unknown V6B template")
    with (V6B / "live" / "chars" / (template + ".json")).open() as fp:
        c = json.load(fp)
    name = str(params.get("name", "new_character"))[:48].strip().lower()
    name = SLUG.sub("_", name.replace(" ", "_")).strip("_") or "new_character"
    c["name"] = name
    hair = str(params.get("hair_style", c["hair_style"]))
    if hair not in STYLES:
        raise ValueError("Unsupported native V6B hair style")
    c["hair_style"] = hair
    fringe = str(params.get("fringe", "bangs"))
    if fringe not in FRINGES:
        raise ValueError("Unsupported fringe")
    if fringe == "bangs":
        c.pop("fringe", None)
    else:
        c["fringe"] = False if fringe == "swept" else "curtain"
    c["hair_map"] = recolor_ramp(c["hair_map"], "3", color(params.get("hair_color"), c["hair_map"]["3"]))
    c["skin_map"] = recolor_ramp(c["skin_map"], "i", color(params.get("skin_color"), c["skin_map"]["i"]))
    c["lash"] = bool(params.get("lashes", template == "noor"))
    c["glasses_default"] = bool(params.get("glasses", template == "ichsan"))
    c["glasses_shape"] = "round" if params.get("glasses_shape") == "round" else None
    c["mustache"] = "#5E4636" if params.get("mustache") else None
    c.pop("stubble", None)
    if params.get("stubble"):
        c["stubble"] = ["#D8B79C", "#B08E76"]
    c["arms"] = "down"

    kind = str(params.get("shirt_kind", "tee"))
    if kind not in TOPS:
        raise ValueError("Unsupported native V6B top")
    shirt_color = color(params.get("shirt_color"), "#2A3242")
    outer_color = color(params.get("outer_color"), "#454B5B")
    top = {"id": kind + "_custom", "type": "shirt" if kind == "shirt" else "tee", "color": shirt_color}
    if kind == "graphic":
        top["graphic"] = {"c1": "#ECF0F4", "c2": "#E4572E", "c3": "#F2C14E"}
    outer = None
    if kind == "cardigan":
        outer = {"id": "cardigan_custom", "type": "cardigan", "color": outer_color}
        if params.get("cardigan_dots"):
            outer["dots"] = "#ECF0F4"
    c["sleeves"] = "long" if kind == "cardigan" else "short"
    pant_kind = str(params.get("pants_kind", "trousers"))
    if pant_kind not in PANTS:
        raise ValueError("Unsupported native V6B trousers")
    outfit = {
        "shirt": top,
        "outer": outer,
        "acc": None,
        "pants": {
            "id": pant_kind + "_custom",
            "type": pant_kind,
            "color": color(params.get("pants_color"), "#3A4458"),
            "rips": bool(params.get("rips", False)),
        },
        "shoes": {"id": "shoes_custom", "color": color(params.get("shoes_color"), "#5A412F")},
        "held": None,
    }
    c["outfits"] = {"default": outfit}
    c["default_outfit"] = "default"
    # This extra key is ignored by live_v6b but makes UI exports round-trip.
    c["_studio"] = {k: v for k, v in params.items() if k in {
        "name", "template", "hair_style", "fringe", "hair_color", "skin_color",
        "glasses", "lashes", "mustache", "stubble", "glasses_shape",
        "shirt_kind", "shirt_color", "outer_color", "pants_kind",
        "pants_color", "shoes_color", "cardigan_dots", "rips"
    }}
    return c


def generate(params: dict):
    config = make_config(params)
    key = uuid.uuid4().hex[:12]
    root = Path(tempfile.mkdtemp(prefix="v6b-studio-"))
    study = root / "study"
    study.mkdir()
    for source in (V6B / "study").glob("*.npy"):
        shutil.copy2(source, study / source.name)
    cfgpath = root / "config.json"
    cfgpath.write_text(json.dumps(config, indent=2), encoding="utf-8")
    try:
        # live_v6b reads ROOT at runtime. Keep the shared module isolated.
        with LOCK:
            previous, game = engine.ROOT, engine.GAME
            try:
                engine.ROOT = str(root)
                engine.GAME = False
                engine.build(str(cfgpath))
            finally:
                engine.ROOT, engine.GAME = previous, game
        folder = root / "live" / "parts" / config["name"]
        manifest = json.loads((folder / "manifest.json").read_text())
        active = next(iter(manifest["sheets"].values()))
        sheet = root / "live" / active["sheet"]
        if not sheet.exists():
            raise RuntimeError("V6B output sheet was not created")
        result = {
            "root": root,
            "config": config,
            "folder": folder,
            "layers": active["layers"],
            "sheet": sheet,
            "atlas": {},
        }
        JOBS[key] = result
        while len(JOBS) > MAX_JOBS:
            _, old = JOBS.popitem(last=False)
            shutil.rmtree(old["root"], ignore_errors=True)
        return {"id": key, "name": config["name"], "frame": [64, 112], "pivot": [32, 100],
                "directions": DIRECTIONS, "actions": ACTIONS, "expressions": EXPRESSIONS}
    except Exception:
        shutil.rmtree(root, ignore_errors=True)
        raise


def atlas(job, action: str, expr: str):
    if action not in ACTIONS or expr not in EXPRESSIONS:
        raise ValueError("Unknown animation or expression")
    cache_key = (action, expr)
    if cache_key in job["atlas"]:
        return job["atlas"][cache_key]
    frame_count = 6 if action in ("walk", "swim") else 4
    output = Image.new("RGBA", (64 * frame_count, 112 * 4))
    images = {}
    for layer, path in job["layers"].items():
        images[layer] = Image.open(job["folder"] / path).convert("RGBA")
    images["face"] = Image.open(job["folder"] / "faces" / ("face_" + expr + ".png")).convert("RGBA")
    images["brows"] = Image.open(job["folder"] / "faces" / ("brows_" + expr + ".png")).convert("RGBA")
    for direction in range(4):
        row = (engine.ROWMAP[action] + direction) * 112
        for frame in range(frame_count):
            x = frame * 64
            cell = Image.new("RGBA", (64, 112))
            for layer in engine.ORDER:
                img = images.get(layer)
                if img is not None:
                    cell.alpha_composite(img.crop((x, row, x + 64, row + 112)))
            output.paste(cell, (x, direction * 112))
    buf = io.BytesIO()
    output.save(buf, "PNG")
    result = buf.getvalue()
    job["atlas"][cache_key] = result
    return result


class Handler(BaseHTTPRequestHandler):
    def write(self, status, content, mime="application/json; charset=utf-8", extra=None):
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for key, val in (extra or {}).items():
            self.send_header(key, val)
        self.end_headers()
        self.wfile.write(content)

    def reply(self, status, obj):
        self.write(status, json.dumps(obj).encode())

    def do_GET(self):
        parts = urlsplit(self.path)
        query = parse_qs(parts.query)
        try:
            if parts.path == "/health":
                self.write(200, b"ok", "text/plain; charset=utf-8")
                return
            if parts.path in ("/", "/index.html", "/style.css", "/app.js"):
                name = "index.html" if parts.path == "/" else parts.path[1:]
                mime = ("text/html; charset=utf-8" if name.endswith(".html")
                        else "text/css; charset=utf-8" if name.endswith(".css")
                        else "text/javascript; charset=utf-8")
                self.write(200, (HERE / name).read_bytes(), mime)
                return
            if parts.path in ("/api/atlas", "/api/sheet", "/api/config"):
                job_id = query.get("id", [""])[0]
                if job_id not in JOBS:
                    self.reply(404, {"error": "Character not found; regenerate"})
                    return
                job = JOBS[job_id]
                if parts.path == "/api/atlas":
                    data = atlas(job, query.get("action", ["idle"])[0],
                                 query.get("expression", ["neutral"])[0])
                    self.write(200, data, "image/png")
                elif parts.path == "/api/sheet":
                    self.write(200, job["sheet"].read_bytes(), "image/png", {
                        "Content-Disposition": "attachment; filename=" + job["config"]["name"] + "_v6b_sheet.png"
                    })
                else:
                    self.write(200, json.dumps(job["config"], indent=2).encode(), "application/json", {
                        "Content-Disposition": "attachment; filename=" + job["config"]["name"] + ".json"
                    })
                return
            self.reply(404, {"error": "Not found"})
        except ValueError as ex:
            self.reply(422, {"error": str(ex)})
        except Exception as ex:
            self.reply(500, {"error": str(ex)})

    def do_POST(self):
        if self.path != "/api/generate":
            self.reply(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 16384:
                self.reply(413, {"error": "Invalid configuration size"})
                return
            params = json.loads(self.rfile.read(length))
            if not isinstance(params, dict):
                raise ValueError("Expected an object")
            self.reply(200, generate(params))
        except (ValueError, json.JSONDecodeError) as ex:
            self.reply(422, {"error": str(ex)})
        except Exception as ex:
            self.reply(500, {"error": str(ex)})


def main():
    print(f"V6B Generator Studio — http://{HOST}:{PORT}")
    print("Temporary previews only. Ctrl+C to close the server.")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        for job in JOBS.values():
            shutil.rmtree(job["root"], ignore_errors=True)


if __name__ == "__main__":
    main()
