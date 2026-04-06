"""
Process Telegram BotFather guide screenshots:
- Crop to relevant areas
- Blur sensitive info (tokens, user IDs, usernames)
- Add red highlight boxes around key elements
- Output clean guide images for website
"""
from PIL import Image, ImageDraw, ImageFilter
import os

INPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(INPUT_DIR, "processed")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def add_red_box(img, box, width=4):
    draw = ImageDraw.Draw(img)
    for i in range(width):
        draw.rectangle(
            [box[0] - i, box[1] - i, box[2] + i, box[3] + i],
            outline=(255, 40, 40),
        )
    return img


def blur_region(img, box, intensity=30):
    """Completely obscure a region with solid dark fill + pixelation."""
    region = img.crop(box)
    # Heavy pixelation: shrink to tiny then scale back
    small = region.resize((8, 4), Image.NEAREST)
    pixelated = small.resize(region.size, Image.NEAREST)
    # Darken the pixelated region
    darkened = Image.blend(pixelated, Image.new("RGB", region.size, (30, 35, 50)), 0.7)
    img.paste(darkened, box)
    return img


# ============================================================
# Step 1: Search BotFather
# ============================================================
img1 = Image.open(os.path.join(INPUT_DIR, "WhatsApp Image 2026-04-04 at 23.46.56.jpeg"))
w1, h1 = img1.size
print(f"Step 1 (BotFather search): {w1}x{h1}")
entry_top = int(h1 * 0.55)
add_red_box(img1, (10, entry_top, w1 - 10, h1 - 10), width=4)
img1.save(os.path.join(OUTPUT_DIR, "step1-search-botfather.png"), "PNG")
print("  -> step1-search-botfather.png")

# ============================================================
# Step 2: /newbot command flow (crop top of full conversation)
# ============================================================
img4 = Image.open(os.path.join(INPUT_DIR, "WhatsApp Image 2026-04-04 at 23.46.56 (3).jpeg"))
w4, h4 = img4.size
print(f"Step 2 source (full convo): {w4}x{h4}")
step2_crop = img4.crop((0, 0, w4, int(h4 * 0.45)))
step2_crop.save(os.path.join(OUTPUT_DIR, "step2-newbot-command.png"), "PNG")
print("  -> step2-newbot-command.png")

# ============================================================
# Step 3: Token display — blur the actual token, add red box
# ============================================================
img4_token = img4.copy()

# Blur the bot token string (the HTTP API token line area)
# Token is at roughly y: 72-88% of image, x: full width
token_text_top = int(h4 * 0.755)
token_text_bottom = int(h4 * 0.825)
blur_region(img4_token, (30, token_text_top, w4 - 30, token_text_bottom))

# Also blur the bot username "NexGenAI_test_bot" appearances
# In the user's sent messages (purple bubbles) — roughly y: 18%, 35%, and in the "Done" message
# Blur "t.me/NexGenAI_test_bot" link in the Done message
done_msg_top = int(h4 * 0.44)
done_msg_link = int(h4 * 0.49)
blur_region(img4_token, (int(w4 * 0.25), done_msg_top, int(w4 * 0.85), done_msg_link))

# Blur bot username in sent bubbles (purple) — "NexGenAI_test_bot"
# Sent bubble 1: ~y 12-16%
blur_region(img4_token, (int(w4 * 0.45), int(h4 * 0.135), int(w4 * 0.92), int(h4 * 0.175)))
# Sent bubble 2: ~y 28-32%
blur_region(img4_token, (int(w4 * 0.45), int(h4 * 0.275), int(w4 * 0.92), int(h4 * 0.315)))

# Red box around the token area (including blurred region)
token_box_top = int(h4 * 0.72)
token_box_bottom = int(h4 * 0.88)
add_red_box(img4_token, (15, token_box_top, w4 - 15, token_box_bottom), width=5)

img4_token.save(os.path.join(OUTPUT_DIR, "step3-copy-token.png"), "PNG")
print("  -> step3-copy-token.png")

# ============================================================
# Step 4a: Search userinfobot
# ============================================================
img_uid_search = Image.open(
    os.path.join(INPUT_DIR, "WhatsApp Image 2026-04-05 at 00.14.23.jpeg")
)
ws, hs = img_uid_search.size
print(f"Step 4a (userinfobot search): {ws}x{hs}")
entry_top_s = int(hs * 0.55)
add_red_box(img_uid_search, (10, entry_top_s, ws - 10, hs - 10), width=4)
img_uid_search.save(os.path.join(OUTPUT_DIR, "step4a-search-userinfobot.png"), "PNG")
print("  -> step4a-search-userinfobot.png")

# ============================================================
# Step 4b: Userinfobot reply — blur username, ID, name
# ============================================================
img_uid = Image.open(
    os.path.join(INPUT_DIR, "WhatsApp Image 2026-04-05 at 00.14.23 (1).jpeg")
)
wu, hu = img_uid.size
print(f"Step 4b (userinfobot reply): {wu}x{hu}")

# Blur the entire info block: @username, Id, First name
# The info text is roughly y: 25-72%, x: 8-75%
info_top = int(hu * 0.25)
info_bottom = int(hu * 0.58)
blur_region(img_uid, (int(wu * 0.08), info_top, int(wu * 0.62), info_bottom))

# Red box around the "Id: XXXXXXX" line area to show where the ID is
# The Id line is roughly y: 33-42%
id_box_top = int(hu * 0.30)
id_box_bottom = int(hu * 0.62)
add_red_box(img_uid, (int(wu * 0.05), id_box_top, int(wu * 0.65), id_box_bottom), width=4)

img_uid.save(os.path.join(OUTPUT_DIR, "step4b-userinfobot-reply.png"), "PNG")
print("  -> step4b-userinfobot-reply.png")

print("\n=== ALL DONE ===")
print(f"Output: {OUTPUT_DIR}")
for f in sorted(os.listdir(OUTPUT_DIR)):
    if f.endswith(".png"):
        sz = os.path.getsize(os.path.join(OUTPUT_DIR, f))
        print(f"  {f} ({sz // 1024}KB)")
