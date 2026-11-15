"""GitHub Actions worker: pull a video from Pixeldrain, edit with FFmpeg, upload the result."""
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import quote

import requests

from editor import build_command

PD = "https://pixeldrain.com/api"
AUTH = ("", os.environ["PIXELDRAIN_API_KEY"])
JOB = os.environ["JOB_ID"]
PAYLOAD = json.loads(os.environ["PAYLOAD"])


def safe_name(name: str) -> str:
    name = re.sub(r"\.[^.]+$", "", name)
    name = re.sub(r"^(edit|out)-j\w+-(\d+-)?", "", name)
    return re.sub(r"[^\w\- ]+", "", name).strip()[:60] or "video"


def pd_download(file_id: str, dst: Path, attempts: int = 3, deadline: int = 600) -> None:
    """Download with short connect/read timeouts, retries and progress logs."""
    last: Exception | None = None
    for n in range(1, attempts + 1):
        t0 = time.time()
        try:
            print(f"  download attempt {n}/{attempts} …", flush=True)
            with requests.get(f"{PD}/file/{file_id}", auth=AUTH, stream=True,
                              timeout=(15, 30)) as r:
                print(f"  HTTP {r.status_code} after {time.time() - t0:.1f}s", flush=True)
                r.raise_for_status()
                got, tick = 0, time.time()
                with open(dst, "wb") as f:
                    for chunk in r.iter_content(1 << 20):
                        f.write(chunk)
                        got += len(chunk)
                        if time.time() - tick > 5:
                            print(f"  {got / 1048576:.1f} MB so far", flush=True)
                            tick = time.time()
                        if time.time() - t0 > deadline:
                            raise TimeoutError("download deadline exceeded")
            print(f"  done: {got / 1048576:.1f} MB in {time.time() - t0:.1f}s", flush=True)
            return
        except Exception as e:  # noqa: BLE001
            last = e
            print(f"  attempt {n} failed: {type(e).__name__}: {e}", file=sys.stderr, flush=True)
            time.sleep(3)
    raise RuntimeError(f"Could not download from Pixeldrain: {last}")


def pd_upload(path: Path, name: str) -> str:
    with open(path, "rb") as f:
        r = requests.put(f"{PD}/file/{quote(name)}", data=f, auth=AUTH, timeout=(15, 900))
    r.raise_for_status()
    return r.json()["id"]


def probe(path: Path) -> dict:
    j = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "format=duration:stream=codec_type,width,height:stream_side_data=rotation:stream_tags=rotate",
         "-of", "json", str(path)],
        capture_output=True, text=True, check=True).stdout)
    v = next(s for s in j["streams"] if s.get("codec_type") == "video")
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []):
        if "rotation" in sd:
            rot = int(sd["rotation"])
    rot = rot or int((v.get("tags") or {}).get("rotate", 0))
    if abs(rot) % 180 == 90:          # ffmpeg auto-rotates, so frame dims are swapped
        w, h = h, w
    return {
        "w": w, "h": h, "dur": float(j["format"]["duration"]),
        "has_audio": any(s.get("codec_type") == "audio" for s in j["streams"]),
    }


def main() -> None:
    src_meta = PAYLOAD["source"]
    spec = PAYLOAD.get("spec", {})
    with tempfile.TemporaryDirectory() as t:
        work = Path(t)
        src = work / "src.bin"
        print("downloading source…", flush=True)
        pd_download(src_meta["id"], src)

        music = None
        if spec.get("musicId"):
            music = work / "music.bin"
            print("downloading music…", flush=True)
            pd_download(spec["musicId"], music)

        info = probe(src)
        out = work / "out.mp4"
        cmd, out_dur = build_command(spec, info, src, out, work, music)
        print(f"encoding ({out_dur:.1f}s output)…", flush=True)
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            print(r.stderr[-1500:], file=sys.stderr)
            sys.exit(1)

        name = f"edit-{JOB}-{safe_name(src_meta.get('name', 'video'))}.mp4"
        print("uploading…", flush=True)
        print("uploaded ->", pd_upload(out, name), flush=True)


if __name__ == "__main__":
    main()
