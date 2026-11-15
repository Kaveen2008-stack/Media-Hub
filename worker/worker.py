"""GitHub Actions worker: scan a URL, or download/re-encode videos and upload to Pixeldrain."""
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import quote

import requests
import yt_dlp

PD = "https://pixeldrain.com/api"
AUTH = ("", os.environ["PIXELDRAIN_API_KEY"])
JOB = os.environ["JOB_ID"]
MODE = os.environ["MODE"]
PAYLOAD = json.loads(os.environ["PAYLOAD"])
COOKIES = os.environ.get("YT_COOKIES", "").strip()


# ---------- helpers ----------
def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def safe_name(title: str) -> str:
    title = re.sub(r"^out-j\w+-\d+-", "", title)
    return re.sub(r"[^\w\- ]+", "", title).strip()[:60] or "video"


def upload(path: Path | bytes, name: str) -> str:
    url = f"{PD}/file/{quote(name)}"
    if isinstance(path, bytes):
        r = requests.put(url, data=path, auth=AUTH, timeout=120)
    else:
        with open(path, "rb") as f:
            r = requests.put(url, data=f, auth=AUTH, timeout=3600)
    r.raise_for_status()
    return r.json()["id"]


def ydl_base(tmp: Path | None = None) -> dict:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "js_runtimes": {"node": {}},   # solve YouTube JS challenges with Node
    }
    if COOKIES and tmp is not None:
        ck = tmp / "cookies.txt"
        ck.write_text(COOKIES)
        opts["cookiefile"] = str(ck)
    return opts


# ---------- scan ----------
def scan() -> None:
    with tempfile.TemporaryDirectory() as t:
        opts = ydl_base(Path(t)) | {
            "extract_flat": "in_playlist",
            "skip_download": True,
            "ignore_no_formats_error": True,   # scan needs metadata only
            "playlistend": 100,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(PAYLOAD["url"], download=False)
    entries = list(info.get("entries") or [info])
    items = []
    for e in entries:
        if not e:
            continue
        page = e.get("webpage_url") or e.get("url")
        if not page or not page.startswith("http"):
            continue
        thumb = e.get("thumbnail") or ((e.get("thumbnails") or [{}])[-1].get("url"))
        if not thumb and e.get("id") and "youtube" in (e.get("ie_key") or "").lower():
            thumb = f"https://i.ytimg.com/vi/{e['id']}/mqdefault.jpg"
        items.append({
            "id": str(e.get("id") or page),
            "title": e.get("title") or "Untitled",
            "url": page,
            "thumbnail": thumb,
            "duration": e.get("duration"),
        })
    upload(json.dumps({"items": items}).encode(), f"job-{JOB}.json")


# ---------- process ----------
def fetch_source(item: dict, tmp: Path) -> Path:
    if item.get("pd_id"):
        dst = tmp / "src.mp4"
        with requests.get(f"{PD}/file/{item['pd_id']}", auth=AUTH, stream=True, timeout=120) as r:
            r.raise_for_status()
            with open(dst, "wb") as f:
                for chunk in r.iter_content(1 << 20):
                    f.write(chunk)
        return dst
    opts = ydl_base(tmp) | {
        "noplaylist": True,
        "format": "bv*[height<=1080]+ba/b[height<=1080]/b",
        "merge_output_format": "mp4",
        "outtmpl": str(tmp / "src.%(ext)s"),
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([item["url"]])
    files = [p for p in tmp.glob("src.*")]
    if not files:
        raise RuntimeError("download produced no file")
    return files[0]


def has_audio(path: Path) -> bool:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
         "stream=index", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    ).stdout.strip()
    return bool(out)


def encode(src: Path, dst: Path, s: dict) -> None:
    speed = clamp(float(s.get("speed", 1)), 0.5, 2.0)
    zoom = clamp(float(s.get("zoom", 1)), 1.0, 1.5)
    br = clamp(float(s.get("brightness", 0)), -0.3, 0.3)
    ct = clamp(float(s.get("contrast", 1)), 0.7, 1.4)
    sat = clamp(float(s.get("saturation", 1)), 0.5, 1.6)

    v = []
    if speed != 1:
        v.append(f"setpts=PTS/{speed}")
    if zoom > 1:
        v.append(f"scale=trunc(iw*{zoom}/2)*2:trunc(ih*{zoom}/2)*2")
        v.append(f"crop=trunc(iw/{zoom}/2)*2:trunc(ih/{zoom}/2)*2")
    if (br, ct, sat) != (0, 1, 1):
        v.append(f"eq=brightness={br}:contrast={ct}:saturation={sat}")

    cmd = ["ffmpeg", "-y", "-i", str(src)]
    if v:
        cmd += ["-vf", ",".join(v)]
    if speed != 1 and has_audio(src):
        cmd += ["-af", f"atempo={speed}"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(dst)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError("ffmpeg failed: " + r.stderr[-300:])


def process() -> int:
    items = PAYLOAD["items"][:50]
    settings = PAYLOAD.get("settings", {})
    failed = 0
    for i, item in enumerate(items):
        title = item.get("title", "video")
        print(f"[{i + 1}/{len(items)}] {title}", flush=True)
        with tempfile.TemporaryDirectory() as t:
            tmp = Path(t)
            try:
                src = fetch_source(item, tmp)
                out = tmp / "out.mp4"
                encode(src, out, settings)
                fid = upload(out, f"out-{JOB}-{i}-{safe_name(title)}.mp4")
                print(f"  uploaded -> {fid}", flush=True)
            except Exception as e:  # noqa: BLE001
                failed += 1
                print(f"  FAILED: {e}", file=sys.stderr, flush=True)
    return failed


if __name__ == "__main__":
    try:
        if MODE == "scan":
            scan()
        else:
            sys.exit(1 if process() else 0)
    except SystemExit:
        raise
    except Exception as e:  # noqa: BLE001
        if MODE == "scan":
            upload(json.dumps({"error": str(e)[:300]}).encode(), f"job-{JOB}.json")
        raise
