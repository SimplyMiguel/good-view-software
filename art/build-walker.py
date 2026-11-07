"""Build the hero walker frames from art/base-sprite.png.

base-sprite.png is a 31x43 fighting-stance sprite (placeholder cloned from a
reference sheet; to be redrawn). It faces LEFT, the direction he walks.

Frames (all 35x47):
  walk1-4  the stance with legs shifted and a body bob
  turn     the stance's own pose, body squaring up (the 0.28s beat before front)
  front    symmetric body, Ryu's own hair and headband, front-facing face
  raise    phone lifted in the near fist, normal size
  phone    phone pushed at the camera, about 1.4x, as if zoomed in

    python3 art/build-walker.py   # needs Pillow; writes public/images/walker/*.png
"""

import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "images", "walker")

PAD = 2
LEG_TOP = 31  # rows >= this are separate legs
SPLIT_X = 16  # x <= SPLIT_X is the left leg, x > SPLIT_X the right leg
AXIS = 15  # mirror axis (base coords) for the camera-facing pose

# (left dx, left dy, right dx, right dy, body dy)
WALK = [
    (-1, 0, 1, 0, 0),    # contact, legs wide
    (2, 0, -2, -2, -1),  # passing, right foot lifted
    (-2, 0, 2, 0, 0),    # contact, other stride
    (2, -2, -2, 0, -1),  # passing, left foot lifted
]

PHONE = [
    "kkkkkk",
    "kPPPPk",
    "kPwwPk",
    "kPwPQk",
    "kPPPQk",
    "kPPQQk",
    "kPPQQk",
    "kQQQQk",
    "kkkkkk",
    "kkkkkk",
]
def phone_rows(w, h):
    """Phone sprite w x h: black bezel, light screen shading to blue, glare top-left."""
    rows = ["k" * w]
    for y in range(h - 3):
        mid = ""
        for x in range(w - 2):
            glare = (y == 0 and x < 3) or (y == 1 and x < 1)
            if glare:
                mid += "w"
            elif x + y * 0.5 > (w - 2) * 0.9 or y > (h - 3) * 0.7:
                mid += "Q"
            else:
                mid += "P"
        rows.append("k" + mid + "k")
    rows += ["k" * w, "k" * w]
    return rows


PHONE_BIG = phone_rows(8, 14)
COLOURS = {
    "k": (28, 20, 34),
    "P": (127, 211, 255),
    "Q": (47, 134, 201),
    "w": (255, 255, 255),
    "e": (28, 20, 34),  # pupil
    "m": (140, 70, 80),  # mouth
}


def canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def compose(base, left, right, body_dy):
    w, h = base.width + PAD * 2, base.height + PAD * 2
    px = base.load()
    out = canvas(w, h)
    op = out.load()
    ldx, ldy = left
    rdx, rdy = right
    for y in range(base.height):
        for x in range(base.width):
            p = px[x, y]
            if p[3] == 0:
                continue
            if y < LEG_TOP:
                dx, dy = 0, body_dy
            elif x <= SPLIT_X:
                dx, dy = ldx, ldy
            else:
                dx, dy = rdx, rdy
            tx, ty = x + PAD + dx, y + PAD + dy
            if 0 <= tx < w and 0 <= ty < h:
                op[tx, ty] = p
    # close the gap a body bob leaves above the legs
    if body_dy:
        for x in range(w):
            above = op[x, PAD + LEG_TOP - 1 + body_dy]
            below = op[x, PAD + LEG_TOP + body_dy + 1]
            if above[3] and not op[x, PAD + LEG_TOP + body_dy][3] and below[3]:
                op[x, PAD + LEG_TOP + body_dy] = above
    return out


def mirrored(base):
    """Left half of the stance plus its mirror image: a camera-facing body."""
    out = canvas(base.width + PAD * 2, base.height + PAD * 2)
    left = base.crop((0, 0, AXIS + 1, base.height))
    out.alpha_composite(left, (PAD, PAD))
    right = left.transpose(Image.FLIP_LEFT_RIGHT).crop((0, 0, left.width - 1, base.height))
    out.alpha_composite(right, (PAD + AXIS + 1, PAD))
    return out


def paint(img, pixels):
    for (x, y), key in pixels.items():
        img.putpixel((x, y), COLOURS[key] + (255,))


# Front view: Ryu's own spiky hair and headband (top rows of the original
# sprite) over a hand-drawn front-facing face. Drawing new hair made him look
# generic; the hair and headband are what make him read as Ryu.
HAIR_ROWS = 12  # padded rows kept from the original sprite
FACE_X, FACE_Y = 12, 12  # 12-wide face, centred on the 35px frame (x=17.5)
# Left half of the face; the right half is its mirror image.
FACE_LEFT = [
    "accooo",  # brows
    "acwkwc",  # eye: white, pupil, white -- pupil centred, so he looks at you
    "eccccl",  # cheeks
    ".eccco",  # mouth
    "..eccc",  # chin
]
FACE_COLOURS = {
    "a": (101, 57, 78), "c": (245, 183, 161), "e": (180, 110, 129),
    "l": (185, 102, 119), "o": (70, 37, 59), "k": (70, 37, 59), "w": (254, 253, 254),
}


def front_face():
    img = canvas(12, len(FACE_LEFT))
    for y, left in enumerate(FACE_LEFT):
        for x, ch in enumerate(left + left[::-1]):
            if ch != ".":
                img.putpixel((x, y), FACE_COLOURS[ch] + (255,))
    return img


def facing_camera(base):
    """Symmetric body, Ryu's own hair and headband, and a front-facing face."""
    body = mirrored(base)
    for y in range(FACE_Y + len(FACE_LEFT)):
        for x in range(body.width):
            body.putpixel((x, y), (0, 0, 0, 0))
    hair = compose(base, (0, 0), (0, 0), 0).crop((0, 0, body.width, HAIR_ROWS))
    body.alpha_composite(hair, (0, 0))
    body.alpha_composite(front_face(), (FACE_X, FACE_Y))
    return body


def stamp_phone(img, rows, x0, y0, grip_from):
    """Draw a phone, then redraw the glove over its lower rows so the fist grips it."""
    out = img.copy()
    op = out.load()
    src = img.load()
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            op[x0 + dx, y0 + dy] = COLOURS[ch] + (255,)
    for y in range(y0 + grip_from, y0 + len(rows)):
        for x in range(x0 - 1, x0 + len(rows[0]) + 1):
            p = src[x, y]
            if p[3] and p[0] > 150 and p[1] < 120:
                op[x, y] = p
    return out


def raised_phone(img):
    """Normal-size phone lifted in the near fist."""
    return stamp_phone(img, PHONE, 5, 14, 6)


def zoomed_phone(img):
    """Phone pushed toward the camera: about 1.4x the size, as if the lens zoomed in."""
    return stamp_phone(img, PHONE_BIG, 3, 11, 8)


def main():
    os.makedirs(OUT, exist_ok=True)
    base = Image.open(os.path.join(HERE, "base-sprite.png")).convert("RGBA")
    frames = {}
    for i, (ldx, ldy, rdx, rdy, bdy) in enumerate(WALK):
        frames["walk%d" % (i + 1)] = compose(base, (ldx, ldy), (rdx, rdy), bdy)
    frames["turn"] = compose(base, (0, 0), (0, 0), 0)
    frames["front"] = facing_camera(base)
    frames["raise"] = raised_phone(frames["front"])
    frames["phone"] = zoomed_phone(frames["front"])
    for name, img in frames.items():
        img.save(os.path.join(OUT, name + ".png"))

    order = ("walk1", "walk2", "walk3", "walk4", "turn", "front", "raise", "phone")
    w, h = frames["front"].size
    sheet = Image.new("RGBA", (w * len(order) * 6, h * 6), (162, 200, 191, 255))
    for i, name in enumerate(order):
        sheet.alpha_composite(frames[name].resize((w * 6, h * 6), Image.NEAREST), (i * w * 6, 0))
    sheet.save("/tmp/walker-sheet-10.png")
    print("wrote %d frames (%dx%d) to %s" % (len(frames), w, h, os.path.normpath(OUT)))


if __name__ == "__main__":
    main()
