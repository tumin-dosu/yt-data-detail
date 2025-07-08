import re
import pathlib
import sys

if len(sys.argv) != 2:
    print("Usage: python update_version.py NEW_VERSION")
    sys.exit(1)

new_version = sys.argv[1]
target_dir = pathlib.Path(".")
file_exts = [".js", ".ts", ".py", ".sh", ".cpp", ".java",".css"]

version_pattern = re.compile(r'(\*+\s*@version\s+)([\w\.\-]+)')

for file_path in target_dir.rglob("*"):
    if file_path.suffix in file_exts:
        try:
            text = file_path.read_text(encoding="utf-8")
        except Exception as e:
            print(f"Skipped (read error): {file_path}")
            continue

        def replacer(match):
            return f"{match.group(1)}{new_version}"

        new_text, count = version_pattern.subn(replacer, text)

        if count > 0:
            file_path.write_text(new_text, encoding="utf-8")
            print(f"Updated: {file_path}")
