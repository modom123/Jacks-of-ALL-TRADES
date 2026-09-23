# ============================================================
# File: build_commercial_v2_2026-09-23_1330.py
# Project: Jacks of All Trades Community Development
# Purpose: Build commercial #2 - 30-second 50/50 Raffle spot (16:9 and 9:16)
#          from the Detroit city video + services collage, event booth,
#          raffle and logo images, with the ticket QR code and joatamp.org
#          on every scene. The 9:16 version keeps
#          all text large, centered, and inside the TikTok / Reels safe zone.
# Generated: 2026-09-23 13:30
# Usage: python3 build_commercial_v2_2026-09-23_1330.py <video.mp4> <raffle> <services> <booth> <logo> <qr> <outdir>
# Requires: pillow, imageio-ffmpeg
# ============================================================
import subprocess, sys, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
VIDEO, RAFFLE, SERVICES, BOOTH, LOGO, QR, OUT = sys.argv[1:8]
STAMP = "2026-09-23_1330"
FPS = 30
BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
GOLD, WHITE, GREEN = (240, 196, 60), (255, 255, 255), (11, 61, 31)
SITE = "joatamp.org"

def font(sz): return ImageFont.truetype(BOLD, sz)

def fit(img, w, h, cover):
    r = (max if cover else min)(w / img.width, h / img.height)
    return img.resize((round(img.width * r), round(img.height * r)), Image.LANCZOS)

def layout(W, H):
    """Caption band + picture area. Vertical keeps clear of the TikTok/Reels
    top bar (~8%), bottom caption/UI (~20%) and right-side buttons."""
    if W > H:
        band_top, band_h = int(H * 0.76), int(H * 0.24)
        return dict(top=0, bottom=band_top, band_top=band_top, band_h=band_h,
                    sizes={"title": 88, "sub": 60, "site": 46}, maxw=W * 0.92)
    top, band_top, band_h = int(H * 0.08), int(H * 0.56), int(H * 0.22)
    return dict(top=top, bottom=band_top, band_top=band_top, band_h=band_h,
                sizes={"title": 92, "sub": 64, "site": 52}, maxw=W * 0.84)

def wrap(d, text, f, maxw):
    lines, cur = [], ""
    for word in text.split():
        t = (cur + " " + word).strip()
        if d.textlength(t, font=f) <= maxw or not cur: cur = t
        else: lines.append(cur); cur = word
    return [l.strip(" •") for l in lines + [cur]]  # no dangling bullets at line ends

def band_layer(W, H, lines):
    """Transparent full frame holding the green caption band with centered text."""
    L = layout(W, H)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rectangle((0, L["band_top"], W, L["band_top"] + L["band_h"]), fill=(*GREEN, 230))
    d.rectangle((0, L["band_top"], W, L["band_top"] + 6), fill=GOLD)
    d.rectangle((0, L["band_top"] + L["band_h"] - 6, W, L["band_top"] + L["band_h"]), fill=GOLD)
    if lines[-1][0] != SITE: lines = lines + [(SITE, "site", GOLD)]
    scale = L["band_h"] * 0.88
    while True:  # wrap each line; shrink only if the whole block doesn't fit the band
        rows = []
        for text, role, color in lines:
            f = font(int(L["sizes"][role] * (W if W > H else 1080) / (1920 if W > H else 1080)))
            for r in wrap(d, text, f, L["maxw"]): rows.append((r, f, color))
        total = sum(int(f.size * 1.2) for _, f, _ in rows)
        if total <= scale: break
        L["sizes"] = {k: v - 4 for k, v in L["sizes"].items()}
    y = L["band_top"] + (L["band_h"] - total) / 2
    for r, f, color in rows:
        tw = d.textlength(r, font=f)
        d.text(((W - tw) / 2, y), r, font=f, fill=color,
               stroke_width=max(3, f.size // 14), stroke_fill=(0, 0, 0))
        y += int(f.size * 1.2)
    return layer

def qr_card(side):
    """White card holding the ticket QR code with a 'SCAN FOR TICKETS' label."""
    pad, label_h = side // 14, side // 4
    card = Image.new("RGB", (side, side + label_h), WHITE)
    q = Image.open(QR).convert("RGB").resize((side - 2 * pad,) * 2, Image.NEAREST)
    card.paste(q, (pad, pad))
    d = ImageDraw.Draw(card)
    f = font(label_h // 3)
    while d.textlength("SCAN FOR TICKETS", font=f) > side - 2 * pad: f = font(f.size - 1)
    tw = d.textlength("SCAN FOR TICKETS", font=f)
    y = side - pad // 2 + (label_h - 2.3 * f.size) / 2
    d.text(((side - tw) / 2, y), "SCAN FOR TICKETS", font=f, fill=GREEN)
    tw2 = d.textlength(SITE, font=f)
    d.text(((side - tw2) / 2, y + 1.2 * f.size), SITE, font=f, fill=(0, 0, 0))
    framed = Image.new("RGB", (card.width + 12, card.height + 12), GOLD)
    framed.paste(card, (6, 6))
    return framed

def blurred_bg(img, W, H):
    bg = fit(img, W, H, True)
    bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2,
                  (bg.width - W) // 2 + W, (bg.height - H) // 2 + H))
    return bg.filter(ImageFilter.GaussianBlur(28)).point(lambda p: p * 0.45)

def slide(src, W, H, lines, crop_top=0, name="s", qr=None):
    L = layout(W, H); land = W > H
    img = Image.open(src).convert("RGB")
    if crop_top: img = img.crop((0, crop_top, img.width, img.height))
    bg = blurred_bg(img, W, H)
    a0, a1 = L["top"], L["bottom"]; area = a1 - a0
    if qr == "big":  # end card: logo + large QR side by side (stacked on vertical)
        if land:
            card = qr_card(int(area * 0.62))
            fg = fit(img, W * 0.50, area * 0.88, False)
            gap = W // 20; x0 = (W - fg.width - gap - card.width) // 2
            bg.paste(fg, (x0, a0 + (area - fg.height) // 2))
            bg.paste(card, (x0 + fg.width + gap, a0 + (area - card.height) // 2))
        else:
            card = qr_card(int(area * 0.46))
            fg = fit(img, W * 0.80, area * 0.40, False)
            gap = area // 30; y0 = a0 + (area - fg.height - gap - card.height) // 2
            bg.paste(fg, ((W - fg.width) // 2, y0))
            bg.paste(card, ((W - card.width) // 2, y0 + fg.height + gap))
    else:
        fg = fit(img, W * 0.92, area * 0.90, False)
        if qr == "small":
            card = qr_card(int(H * 0.19) if land else int(area * 0.24))
            if land:  # corner, just above the caption band
                bg.paste(fg, ((W - fg.width) // 2, a0 + (area - fg.height) // 2))
                m = W // 40
                bg.paste(card, (W - card.width - m, a1 - card.height - m))
            else:  # vertical: picture on top, QR centered under it (clear of side buttons)
                fg = fit(img, W * 0.84, area - card.height - area // 25, False)
                gap = area // 40; y0 = a0 + (area - fg.height - gap - card.height) // 2
                bg.paste(fg, ((W - fg.width) // 2, y0))
                bg.paste(card, ((W - card.width) // 2, y0 + fg.height + gap))
        else:
            bg.paste(fg, ((W - fg.width) // 2, a0 + (area - fg.height) // 2))
    bg = Image.alpha_composite(bg.convert("RGBA"), band_layer(W, H, lines)).convert("RGB")
    p = os.path.join(OUT, f"_{name}_{W}x{H}.png"); bg.save(p); return p

def band_png(W, H, lines, name):
    p = os.path.join(OUT, f"_{name}_{W}x{H}.png"); band_layer(W, H, lines).save(p); return p

def build(W, H, tag):
    land = W > H; L = layout(W, H)
    services = slide(SERVICES, W, H, [("ONE CALL. EVERY SOLUTION.", "title", GOLD),
                                       ("BUILDING • ROOFING • PLUMBING • YARD WORK", "sub", WHITE)],
                     name="services")
    booth = slide(BOOTH, W, H, [("OUT HERE FOR DETROIT", "title", GOLD),
                                 ("JACKS OF ALL TRADES COMMUNITY DEVELOPMENT", "sub", WHITE)],
                  name="booth", qr="small")
    raffle = slide(RAFFLE, W, H, [("ONE WINNER TAKES HALF THE POT", "title", GOLD),
                                   ("THE OTHER HALF BUILDS OUR COMMUNITY", "sub", WHITE)],
                   name="raffle", qr="small")
    logo = slide(LOGO, W, H, [("GET YOUR TICKETS NOW", "title", GOLD),
                               (SITE, "sub", WHITE)], name="logo", qr="big")
    segs = []  # (input args, duration, filter-graph fragment using {i})
    clips = [(0, 4.0, [("DETROIT", "title", GOLD), ("THE MOTOR CITY", "sub", WHITE)])]
    for n, (ss, dur, lines) in enumerate(clips):
        if land:  # full-frame video + caption band
            segs.append(([["-ss", str(ss), "-t", str(dur), "-i", VIDEO],
                          ["-loop", "1", "-t", str(dur), "-i", band_png(W, H, lines, f"clip{n}")]], dur,
                         f"[{{i}}:v]scale={W}:{H}:force_original_aspect_ratio=increase,"
                         f"crop={W}:{H},fps={FPS}[m{{i}}];"
                         f"[m{{i}}][{{j}}:v]overlay=0:0:shortest=1,setsar=1,format=yuv420p"))
        else:  # vertical: blurred fill + fitted clip + big centered caption band
            area = L["bottom"] - L["top"]
            vh = int(W * 9 / 16) // 2 * 2
            vy = L["top"] + (area - vh) // 2
            segs.append(([["-ss", str(ss), "-t", str(dur), "-i", VIDEO],
                          ["-loop", "1", "-t", str(dur), "-i", band_png(W, H, lines, f"clip{n}")]], dur,
                         f"[{{i}}:v]fps={FPS},split[a{{i}}][b{{i}}];"
                         f"[a{{i}}]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
                         f"boxblur=24:2,eq=brightness=-0.25[bg{{i}}];"
                         f"[b{{i}}]scale={W}:{vh}[fg{{i}}];"
                         f"[bg{{i}}][fg{{i}}]overlay=0:{vy}[m{{i}}];"
                         f"[m{{i}}][{{j}}:v]overlay=0:0:shortest=1,setsar=1,format=yuv420p"))
    for p, dur in ((services, 6.0), (booth, 6.0), (raffle, 7.0), (logo, 9.0)):
        n = int(dur * FPS)
        segs.append(([["-loop", "1", "-t", str(dur), "-i", p]], dur,
                     f"[{{i}}:v]scale={W*2}:{H*2},zoompan=z='1+0.04*on/{n}':x='iw/2-(iw/zoom/2)':"
                     f"y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS},setsar=1,format=yuv420p"))
    args, fc, idx = [], [], 0
    for k, (inputs, dur, filt) in enumerate(segs):
        i = idx; j = idx + 1
        for inp in inputs: args += inp; idx += 1
        fc.append(filt.format(i=i, j=j) +
                  f",trim=duration={dur},setpts=PTS-STARTPTS,fps={FPS},settb=1/{FPS}[v{k}]")
    X = 0.5; last, offset = "v0", segs[0][1] - X
    for k in range(1, len(segs)):
        fc.append(f"[{last}][v{k}]xfade=transition=fade:duration={X}:offset={offset:.2f}[x{k}]")
        last = f"x{k}"; offset += segs[k][1] - X
    total = offset + X
    fc.append(f"[{last}]fade=t=in:st=0:d=0.4,fade=t=out:st={total-0.8:.2f}:d=0.8[vout]")
    args += ["-i", VIDEO]
    fc.append(f"[{idx}:a]atrim=0:{total:.2f},asetpts=PTS-STARTPTS,volume=0.9,"
              f"afade=t=in:d=0.5,afade=t=out:st={total-1.5:.2f}:d=1.5[aout]")
    out = os.path.join(OUT, f"JOAT_5050_Raffle_Commercial2_{tag}_{STAMP}.mp4")
    subprocess.run([FF, "-y", "-v", "error", *args, "-filter_complex", ";".join(fc),
                    "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "medium",
                    "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
                    "-metadata", f"comment=Jacks of All Trades 50/50 Raffle commercial {STAMP}",
                    out], check=True)
    print(out, f"{total:.2f}s")

os.makedirs(OUT, exist_ok=True)
build(1920, 1080, "16x9")
build(1080, 1920, "9x16")
for f in os.listdir(OUT):
    if f.startswith("_"): os.remove(os.path.join(OUT, f))
