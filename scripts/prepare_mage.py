"""Rebuild the local CC0 mage; requires Python and Node/npm with network access."""
import json
import pathlib
import struct
import subprocess
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
REVISION = "672074b73ba276876a19e8816ecdc5241817ab47"
URL = f"https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/{REVISION}/addons/kaykit_character_pack_adventures/Characters/gltf/Mage.glb"
CLIPS = {"Idle", "Walking_A", "Walking_Backwards", "Running_A", "Jump_Idle", "Spellcasting", "Spellcast_Shoot", "Blocking", "Interact", "Hit_A", "Death_A", "Cheer"}
with urllib.request.urlopen(URL, timeout=60) as response:
    data = response.read()
length = struct.unpack_from("<I", data, 12)[0]
model = json.loads(data[20:20 + length])
model["animations"] = [clip for clip in model["animations"] if clip["name"] in CLIPS]
assert len(model["animations"]) == len(CLIPS)
chunk = json.dumps(model, separators=(",", ":")).encode()
chunk += b" " * (-len(chunk) % 4)
rest = data[20 + length:]
output = ROOT / "public/art/mage/mage.glb"
output.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as temp:
    selected = pathlib.Path(temp) / "selected.glb"
    selected.write_bytes(struct.pack("<III", 0x46546C67, 2, 20 + len(chunk) + len(rest)) + struct.pack("<II", len(chunk), 0x4E4F534A) + chunk + rest)
    subprocess.run(["npx", "--yes", "@gltf-transform/cli@4.5.1", "prune", str(selected), str(output)], check=True, cwd=ROOT)
print(f"Prepared {output} ({output.stat().st_size} bytes), {len(CLIPS)} clips")
