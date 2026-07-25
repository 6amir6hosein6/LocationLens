#!/usr/bin/env python3
"""
Create a GitHub Release and upload APK/AAB assets.

For a PUBLIC repository, the token only needs the 'public_repo' scope.
Create one at: https://github.com/settings/tokens/new
    - Token name: LocationLens Release
    - Scopes: public_repo (or repo if private)

Usage:
    export GH_TOKEN=ghp_xxxxxxxx
    python3 create-release.py
"""

import os
import sys
import json
import subprocess

REPO = "6amir6hosein6/LocationLens"
TAG = "v1.0.0-persian"
NAME = "LocationLens Persian RTL Release"
APK_PATH = "LocationLens-release.apk"
AAB_PATH = "LocationLens-release.aab"

BODY = """## \u062a\u063a\u06cc\u06cc\u0631\u0627\u062a \u0641\u0627\u0631\u0633\u06cc\u200c\u0633\u0627\u0632\u06cc

### UI
- \u062a\u0645\u0627\u0645 \u0645\u062a\u0648\u0646 \u0627\u067e\u0644\u06cc\u06a9\u06cc\u0634\u0646 \u0628\u0647 \u0641\u0627\u0631\u0633\u06cc \u062a\u0631\u062c\u0645\u0647 \u0634\u062f
- \u062d\u0627\u0644\u062a RTL \u0641\u0639\u0627\u0644 \u0634\u062f
- \u0641\u0648\u0646\u062a Vazirmatn \u0627\u0636\u0627\u0641\u0647 \u0634\u062f
- \u0627\u0639\u062f\u0627\u062f \u0646\u0645\u0627\u06cc\u0634\u06cc \u0628\u0647 \u0641\u0627\u0631\u0633\u06cc \u062a\u0628\u062f\u06cc\u0644 \u0634\u062f\u0646\u062f
- \u062a\u0627\u0631\u06cc\u062e\u200c\u0647\u0627 \u0628\u0647 \u062a\u0642\u0648\u06cc\u0645 \u0641\u0627\u0631\u0633\u06cc \u062a\u063a\u06cc\u06cc\u0631 \u06a9\u0631\u062f\u0646\u062f

### \u0628\u0633\u062a\u0647\u200c\u0647\u0627\u06cc \u0633\u06a9\u0647
| \u0628\u0633\u062a\u0647 | \u0633\u06a9\u0647 | \u0642\u06cc\u0645\u062a |
|---|---|---|
| \u0628\u0631\u0646\u0632\u06cc | ۱۰ | ۳۵۰,۰۰۰ \u0631\u06cc\u0627\u0644 |
| \u0646\u0642\u0631\u0647\u200c\u0627\u06cc | ۲۰ | ۵۵۰,۰۰۰ \u0631\u06cc\u0627\u0644 |
| \u0637\u0644\u0627\u06cc\u06cc | ۵۰ | ۱,۲۵۰,۰۰۰ \u0631\u06cc\u0627\u0644 |

### \u0622\u06cc\u06a9\u0648\u0646 \u0648 \u0644\u0648\u06af\u0648
- \u0644\u0648\u06af\u0648\u06cc \u062c\u062f\u06cc\u062f \u062f\u0631 \u0648\u0628 \u0648 \u0627\u0646\u062f\u0631\u0648\u06cc\u062f
- \u0627\u0633\u067e\u0644\u0634 \u0627\u0633\u06a9\u0631\u06cc\u0646 \u0633\u0641\u06cc\u062f \u0628\u0627 \u0644\u0648\u06af\u0648\u06cc \u0645\u0631\u06a9\u0632\u06cc
"""


def run(cmd, **kwargs):
    """Run a shell command and return stdout."""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, **kwargs)
    if result.returncode != 0:
        print(f"Command failed: {cmd}")
        print(result.stderr)
        sys.exit(1)
    return result.stdout.strip()


def create_release(token):
    url = f"https://api.github.com/repos/{REPO}/releases"
    payload = json.dumps({
        "tag_name": TAG,
        "name": NAME,
        "body": BODY,
        "draft": False,
        "prerelease": False,
    })
    resp = run(
        f'curl -s -X POST -H "Authorization: token {token}" '
        f'-H "Content-Type: application/json" '
        f'-d \'{payload}\' "{url}"'
    )
    data = json.loads(resp)
    if "upload_url" not in data:
        print(f"Failed to create release: {resp}")
        sys.exit(1)
    upload_url = data["upload_url"].replace("{?name,label}", "")
    html_url = data.get("html_url", "")
    print(f"Release created: {html_url}")
    return upload_url


def upload_asset(upload_url, filepath, token):
    if not os.path.isfile(filepath):
        print(f"File not found: {filepath}")
        sys.exit(1)
    filename = os.path.basename(filepath)
    content_type = (
        "application/vnd.android.package-archive"
        if filepath.endswith(".apk")
        else "application/octet-stream"
    )
    url = f'{upload_url}?name={filename}'
    print(f"Uploading {filename} ...")
    run(
        f'curl -s -X POST -H "Authorization: token {token}" '
        f'-H "Content-Type: {content_type}" '
        f'--data-binary "@{filepath}" "{url}"'
    )
    print(f"Uploaded: {filename}")


def main():
    token = os.environ.get("GH_TOKEN", "")
    if not token:
        print("GH_TOKEN environment variable is not set.")
        print("Create a token at: https://github.com/settings/tokens/new")
        print("Scopes needed for PUBLIC repo: public_repo")
        print("Usage: export GH_TOKEN=ghp_xxxxxx && python3 create-release.py")
        sys.exit(1)

    upload_url = create_release(token)
    upload_asset(upload_url, APK_PATH, token)
    upload_asset(upload_url, AAB_PATH, token)
    print(f"\nDone: https://github.com/{REPO}/releases/tag/{TAG}")


if __name__ == "__main__":
    main()
