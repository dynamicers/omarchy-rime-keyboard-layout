// omarchy-rime-keyboard-layout: pure label/priority logic for QML and tests.
function normalize(snapshot) {
  snapshot = snapshot || {}
  var state = Number(snapshot.state)
  return {
    state: state === 1 || state === 2 ? state : 0,
    id: typeof snapshot.id === "string" ? snapshot.id : "",
    name: typeof snapshot.name === "string" ? snapshot.name : "",
    label: typeof snapshot.label === "string" ? snapshot.label : "",
    language: typeof snapshot.language === "string" ? snapshot.language : "",
    asciiMode: typeof snapshot.asciiMode === "boolean" ? snapshot.asciiMode : null
  }
}

function inputLabel(snapshot, overrides, chineseLabel, englishLabel) {
  var im = normalize(snapshot)
  if (im.state !== 2) return ""
  // A static engine-name override must not mask Rime's changing ASCII flag.
  // If the Rime API is missing, keep the engine label instead of guessing.
  if (im.id === "rime" && im.asciiMode !== null) {
    return im.asciiMode ? (englishLabel || "EN") : (chineseLabel || "中")
  }
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, im.id)
      && typeof overrides[im.id] === "string" && overrides[im.id].trim()) {
    return overrides[im.id].trim()
  }
  // Keyboard input methods are valid Fcitx methods too; don't show "KEY".
  if (im.id.indexOf("keyboard-") === 0) {
    return (im.language || im.id.substring(9).split("-")[0]).split("_")[0].substring(0, 3).toUpperCase()
  }
  // Other engines, or Rime without its mode API, use the native short label.
  var label = im.label.trim() || im.name.trim() || im.id.trim() || "IM"
  return label.substring(0, 3)
}

function displayLabel(snapshot, layoutLabel, overrides, chineseLabel, englishLabel) {
  return inputLabel(snapshot, overrides, chineseLabel, englishLabel) || layoutLabel || ""
}

if (typeof module !== "undefined") {
  module.exports = {normalize: normalize, inputLabel: inputLabel, displayLabel: displayLabel}
}
