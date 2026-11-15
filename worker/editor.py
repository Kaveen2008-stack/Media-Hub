"""Pure FFmpeg command builder for the editor. No network / env access here."""
from pathlib import Path

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
ASPECTS = {"9:16": 9 / 16, "1:1": 1.0, "16:9": 16 / 9, "4:5": 4 / 5}


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def num(d: dict, key: str, default: float) -> float:
    try:
        return float(d.get(key, default))
    except (TypeError, ValueError):
        return float(default)


def even(n) -> int:
    return max(2, int(round(n)) // 2 * 2)


def atempo_chain(speed: float) -> str:
    parts, s = [], speed
    while s > 2.0:
        parts.append("atempo=2.0")
        s /= 2.0
    while s < 0.5:
        parts.append("atempo=0.5")
        s /= 0.5
    parts.append(f"atempo={s:.4f}")
    return ",".join(parts)


def build_command(spec: dict, info: dict, src: Path, out: Path, work: Path,
                  music: Path | None = None) -> tuple[list[str], float]:
    """info: {w, h, dur, has_audio}. Returns (ffmpeg argv, output duration)."""
    w, h, dur = int(info["w"]), int(info["h"]), float(info["dur"])

    # ---- trim / speed ----
    start = clamp(num(spec, "start", 0), 0, max(0, dur - 0.1))
    end_raw = spec.get("end")
    end = dur if end_raw is None else clamp(float(end_raw), start + 0.1, dur)
    speed = clamp(num(spec, "speed", 1), 0.25, 4.0)
    out_dur = (end - start) / speed

    v: list[str] = []

    # ---- rotate / flip ----
    rot = int(num(spec, "rotate", 0)) % 360
    if rot == 90:
        v.append("transpose=1")
    elif rot == 270:
        v.append("transpose=2")
    elif rot == 180:
        v += ["hflip", "vflip"]
    if rot in (90, 270):
        w, h = h, w
    if spec.get("flipH"):
        v.append("hflip")
    if spec.get("flipV"):
        v.append("vflip")

    # ---- reframe (aspect) + zoom/pan: one crop, one scale ----
    ratio = ASPECTS.get(spec.get("aspect", "original"))
    if ratio:
        if w / h > ratio:
            cw, ch = even(h * ratio), h
        else:
            cw, ch = w, even(w / ratio)
    else:
        cw, ch = w, h
    cx0, cy0 = (w - cw) / 2, (h - ch) / 2

    z = clamp(num(spec, "zoom", 1), 1.0, 4.0)
    px = clamp(num(spec, "panX", 0), -1, 1)
    py = clamp(num(spec, "panY", 0), -1, 1)
    zw, zh = min(cw, even(cw / z)), min(ch, even(ch / z))
    x = int(round(cx0 + (cw - zw) * (1 + px) / 2))
    y = int(round(cy0 + (ch - zh) * (1 + py) / 2))
    x, y = clamp(x, 0, w - zw), clamp(y, 0, h - zh)

    cur_w, cur_h = w, h
    if (zw, zh, x, y) != (w, h, 0, 0):
        v.append(f"crop={zw}:{zh}:{x}:{y}")
        cur_w, cur_h = zw, zh

    cap = spec.get("height")
    if cap and int(cap) < ch:
        oh = even(int(cap))
        ow = even(oh * cw / ch)
    else:
        ow, oh = even(cw), even(ch)
    if (ow, oh) != (cur_w, cur_h):
        v.append(f"scale={ow}:{oh}:flags=lanczos")

    # ---- color ----
    b = clamp(num(spec, "brightness", 0), -0.5, 0.5)
    c = clamp(num(spec, "contrast", 1), 0.5, 2.0)
    s = clamp(num(spec, "saturation", 1), 0.0, 3.0)
    g = clamp(num(spec, "gamma", 1), 0.5, 2.0)
    if (b, c, s, g) != (0, 1, 1, 1):
        v.append(f"eq=brightness={b}:contrast={c}:saturation={s}:gamma={g}")
    hue = clamp(num(spec, "hue", 0), -180, 180)
    if hue:
        v.append(f"hue=h={hue}")
    t = clamp(num(spec, "temperature", 0), -1, 1)
    if t:
        k = round(0.15 * t, 3)
        v.append(f"colorbalance=rs={k}:bs={-k}:rm={k}:bm={-k}")
    look = spec.get("look", "none")
    if look == "grayscale":
        v.append("hue=s=0")
    elif look == "sepia":
        v.append("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131")
    elif look == "invert":
        v.append("negate")

    # ---- effects ----
    blur = clamp(num(spec, "blur", 0), 0, 20)
    if blur:
        v.append(f"gblur=sigma={blur}")
    sharp = clamp(num(spec, "sharpen", 0), 0, 2)
    if sharp:
        v.append(f"unsharp=5:5:{sharp}:5:5:0")
    vig = clamp(num(spec, "vignette", 0), 0, 1)
    if vig:
        v.append(f"vignette=angle={round(max(0.3, 1.5 - 1.2 * vig), 3)}")
    grain = clamp(num(spec, "grain", 0), 0, 40)
    if grain:
        v.append(f"noise=alls={int(grain)}:allf=t")

    # ---- speed (video) ----
    if speed != 1:
        v.append(f"setpts=PTS/{speed}")

    # ---- fades ----
    fi = clamp(num(spec, "fadeIn", 0), 0, out_dur / 2)
    fo = clamp(num(spec, "fadeOut", 0), 0, out_dur / 2)
    if fi:
        v.append(f"fade=t=in:st=0:d={fi}")
    if fo:
        v.append(f"fade=t=out:st={max(0, out_dur - fo):.3f}:d={fo}")

    # ---- text layers (textfile avoids all escaping problems) ----
    for i, tl in enumerate((spec.get("texts") or [])[:8]):
        text = str(tl.get("text", "")).strip()[:300]
        if not text:
            continue
        tf = work / f"text{i}.txt"
        tf.write_text(text, encoding="utf-8")
        color = str(tl.get("color", "#ffffff"))
        color = "0x" + color[1:] if len(color) == 7 and color[0] == "#" and all(
            ch in "0123456789abcdefABCDEF" for ch in color[1:]) else "white"
        fs = max(8, int(oh * clamp(float(tl.get("size", 6)), 1, 30) / 100))
        tx = clamp(float(tl.get("x", 0.5)), 0, 1)
        ty = clamp(float(tl.get("y", 0.85)), 0, 1)
        ts = clamp(float(tl.get("start", 0) or 0), 0, out_dur)
        te_raw = tl.get("end")
        te = out_dur if te_raw is None else clamp(float(te_raw), ts, out_dur)
        box = f":box=1:boxcolor=black@0.45:boxborderw={max(4, fs // 4)}" if tl.get("box", True) else ""
        v.append(
            f"drawtext=fontfile={FONT}:textfile={tf}:expansion=none:fontsize={fs}"
            f":fontcolor={color}:x=(w-text_w)*{tx}:y=(h-text_h)*{ty}{box}"
            f":enable='between(t,{ts:.2f},{te:.2f})'"
        )

    v.append("format=yuv420p")

    # ---- audio ----
    has_audio = bool(info.get("has_audio")) and not spec.get("mute")
    a: list[str] = []
    if has_audio:
        if speed != 1:
            a.append(atempo_chain(speed))
        vol = clamp(num(spec, "volume", 1), 0, 3)
        if vol != 1:
            a.append(f"volume={vol}")
        if fi:
            a.append(f"afade=t=in:st=0:d={fi}")
        if fo:
            a.append(f"afade=t=out:st={max(0, out_dur - fo):.3f}:d={fo}")

    mv = clamp(num(spec, "musicVolume", 0.5), 0, 2)
    fc = [f"[0:v]{','.join(v)}[v]"]
    if has_audio and music:
        fc.append(f"[0:a]{','.join(a) or 'anull'}[am]")
        fc.append(f"[1:a]aloop=loop=-1:size=2147483647,atrim=0:{out_dur:.3f},volume={mv}[mu]")
        fc.append("[am][mu]amix=inputs=2:duration=first:dropout_transition=0,volume=2[a]")
        audio_map = ["-map", "[a]"]
    elif music:
        fc.append(f"[1:a]aloop=loop=-1:size=2147483647,atrim=0:{out_dur:.3f},volume={mv}[a]")
        audio_map = ["-map", "[a]"]
    elif has_audio:
        fc.append(f"[0:a]{','.join(a) or 'anull'}[a]")
        audio_map = ["-map", "[a]"]
    else:
        audio_map = ["-an"]

    crf = int(clamp(num(spec, "crf", 20), 16, 30))
    cmd = ["ffmpeg", "-y", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(src)]
    if music:
        cmd += ["-i", str(music)]
    cmd += ["-filter_complex", ";".join(fc), "-map", "[v]", *audio_map,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf),
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(out)]
    return cmd, out_dur
