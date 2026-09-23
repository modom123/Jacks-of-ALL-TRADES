# ============================================================
# File: build_commercial_2026-09-23_1230.py
# Project: Jacks of All Trades Community Development
# Purpose: Build the 30-second 50/50 Raffle commercial (16:9 and 9:16)
#          from the Detroit city video + raffle / crew / logo images.
# Generated: 2026-09-23 12:30
# Usage: python3 build_commercial_2026-09-23_1230.py <video.mp4> <raffle> <crew> <logo> <outdir>
# Requires: pillow, imageio-ffmpeg
# ============================================================
import subprocess, sys, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
VIDEO, RAFFLE, CREW, LOGO, OUT = sys.argv[1:6]
STAMP = "2026-09-23_1230"
FPS = 30
BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
GOLD, WHITE, GREEN = (240, 196, 60), (255, 255, 255), (11, 61, 31)
LINK = "zeffy.com  •  Jacks of All Trades Community Development"

def font(sz): return ImageFont.truetype(BOLD, sz)

def fit(img, w, h, cover):
    r = (max if cover else min)(w / img.width, h / img.height)
    return img.resize((round(img.width * r), round(img.height * r)), Image.LANCZOS)

def centered(draw, W, y, text, f, fill, stroke=6):
    tw = draw.textlength(text, font=f)
    draw.text(((W - tw) / 2, y), text, font=f, fill=fill,
              stroke_width=stroke, stroke_fill=(0, 0, 0))

def slide(src, W, H, lines, crop_top=0, bottom_band=True, name="s"):
    img = Image.open(src).convert("RGB")
    if crop_top: img = img.crop((0, crop_top, img.width, img.height))
    bg = fit(img, W, H, True)
    bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2,
                  (bg.width - W) // 2 + W, (bg.height - H) // 2 + H))
    bg = bg.filter(ImageFilter.GaussianBlur(28)).point(lambda p: p * 0.45)
    band_h = int(H * (0.24 if W > H else 0.22)) if bottom_band else 0
    area = H - band_h
    fg = fit(img, W * 0.92, area * (0.88 if W > H else 0.70), False)
    bg.paste(fg, ((W - fg.width) // 2, (area - fg.height) // 2))
    d = ImageDraw.Draw(bg)
    if bottom_band:
        overlay = Image.new("RGBA", (W, band_h), (*GREEN, 225))
        bg.paste(overlay, (0, H - band_h), overlay)
        d.rectangle((0, H - band_h, W, H - band_h + 6), fill=GOLD)
        y = H - band_h + int(band_h * 0.12)
        for text, size, color in lines:
            f = font(int(size * (W if W > H else W * 1.35) / 1920))
            while d.textlength(text, font=f) > W * 0.92: f = font(f.size - 2)
            centered(d, W, y, text, f, color, stroke=max(3, f.size // 14))
            y += int(f.size * 1.18)
    p = os.path.join(OUT, f"_{name}_{W}x{H}.png"); bg.save(p); return p

def build(W, H, tag):
    vf_video = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
                f"setsar=1,fps={FPS},format=yuv420p")
    crew = slide(CREW, W, H, [("RESTORING DETROIT", 92, GOLD),
                               ("ONE HOME AT A TIME", 70, WHITE)], name="crew")
    raffle = slide(RAFFLE, W, H, [("ONE WINNER TAKES HALF THE POT", 84, GOLD),
                                   ("THE OTHER HALF BUILDS OUR COMMUNITY", 58, WHITE)], name="raffle")
    logo = slide(LOGO, W, H, [("GET YOUR TICKETS NOW", 96, GOLD),
                               (LINK, 44, WHITE)], crop_top=125, name="logo")
    # segments: (input args, duration, filter)
    segs = [
        (["-ss", "0", "-t", "4", "-i", VIDEO], 4.0, vf_video),     # DETROIT aerial
        (["-ss", "20", "-t", "3.5", "-i", VIDEO], 3.5, vf_video),  # Michigan Central reborn
    ]
    for p, dur in ((crew, 6.5), (raffle, 8.5), (logo, 9.5)):
        n = int(dur * FPS)
        segs.append((["-loop", "1", "-t", str(dur), "-i", p], dur,
                     f"scale={W*2}:{H*2},zoompan=z='1+0.06*on/{n}':x='iw/2-(iw/zoom/2)':"
                     f"y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS},setsar=1,format=yuv420p"))
    args, fc = [], []
    for i, (inp, dur, filt) in enumerate(segs):
        args += inp; fc.append(f"[{i}:v]{filt},trim=duration={dur},setpts=PTS-STARTPTS,fps={FPS},settb=1/{FPS}[v{i}]")
    X = 0.5; last, offset = "v0", segs[0][1] - X
    for i in range(1, len(segs)):
        fc.append(f"[{last}][v{i}]xfade=transition=fade:duration={X}:offset={offset:.2f}[x{i}]")
        last = f"x{i}"; offset += segs[i][1] - X
    total = offset + X
    fc.append(f"[{last}]fade=t=in:st=0:d=0.4,fade=t=out:st={total-0.8:.2f}:d=0.8[vout]")
    ai = len(segs); args += ["-i", VIDEO]
    fc.append(f"[{ai}:a]atrim=0:{total:.2f},asetpts=PTS-STARTPTS,volume=0.9,"
              f"afade=t=in:d=0.5,afade=t=out:st={total-1.5:.2f}:d=1.5[aout]")
    out = os.path.join(OUT, f"JOAT_5050_Raffle_Commercial_{tag}_{STAMP}.mp4")
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
