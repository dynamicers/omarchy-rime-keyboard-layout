#!/usr/bin/env bash
# omarchy-rime-keyboard-layout: read-only Fcitx5/Rime snapshot.
# --auto-start=no must not launch Fcitx when it is stopped.
set -u
controller() {
  busctl --user --auto-start=no --timeout=1 --json=short call \
    org.fcitx.Fcitx5 /controller org.fcitx.Fcitx.Controller1 "$1" 2>/dev/null
}

state=$(controller State | jq -er '.data[0] | select(. == 1 or . == 2)' 2>/dev/null) || state=0
if [[ $state != 2 ]]; then
  printf '{"state":%s,"id":"","name":"","label":"","language":"","asciiMode":null}\n' "$state"
  exit 0
fi

# Newer Fcitx exposes its localized display name and native short label.
info=$(controller CurrentInputMethodInfo) || info=
if [[ -n $info ]] && jq -e '.data | type == "array" and length >= 6' <<<"$info" >/dev/null 2>&1; then
  snapshot=$(jq -c '{state:2, id:.data[0], name:.data[1], label:.data[4], language:.data[5]}' <<<"$info")
else
  # Compatibility with Fcitx versions without CurrentInputMethodInfo.
  im=$(timeout 1s fcitx5-remote --check -n 2>/dev/null) || im=
  snapshot=$(jq -cn --arg id "$im" '{state:2, id:$id, name:$id, label:"", language:""}')
fi

ascii_mode=null
if [[ $(jq -r '.id' <<<"$snapshot") == rime ]]; then
  # The controller cannot report engine-private modes. fcitx5-rime exports
  # the most recent input context's actual ASCII flag through its own API.
  mode=$(busctl --user --auto-start=no --timeout=1 --json=short call \
    org.fcitx.Fcitx5 /rime org.fcitx.Fcitx.Rime1 IsAsciiMode 2>/dev/null) || mode=
  ascii_mode=$(jq -c 'if (.data[0] | type) == "boolean" then .data[0] else null end' \
    <<<"$mode" 2>/dev/null) || ascii_mode=null
  [[ $ascii_mode == true || $ascii_mode == false ]] || ascii_mode=null
fi

# null means unavailable, not Chinese. Preserve false without jq -e treating
# the valid Chinese-mode response as a failure.
jq -c --argjson asciiMode "$ascii_mode" '. + {asciiMode:$asciiMode}' <<<"$snapshot"
