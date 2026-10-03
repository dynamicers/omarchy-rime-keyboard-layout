// omarchy-rime-keyboard-layout: mock D-Bus snapshots; never mutate real input state.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omarchy-rime-keyboard-layout-test-'));
try {
  fs.writeFileSync(path.join(dir, 'busctl'), `#!/bin/bash
[[ "$*" == *"--auto-start=no"* ]] || exit 9
method="\${!#}"
echo "$method" >> "$TRACE"
case $method in
  State)
    case $CASE in
      missing) exit 1 ;;
      inactive) echo '{"data":[1]}' ;;
      malformed) echo 'not json' ;;
      *) echo '{"data":[2]}' ;;
    esac ;;
  CurrentInputMethodInfo)
    [[ $CASE == old || $CASE == old-rime ]] && exit 1
    if [[ $CASE == other ]]; then
      echo '{"data":["pinyin","Pinyin","","fcitx-pinyin","拼","zh"]}'
    else
      echo '{"data":["rime","Rime","","fcitx-rime","ㄓ","zh","rime",true,"",{}]}'
    fi ;;
  IsAsciiMode)
    [[ "$*" == *"/rime org.fcitx.Fcitx.Rime1"* ]] || exit 9
    case $CASE in
      english) echo '{"data":[true]}' ;;
      no-rime-api) exit 1 ;;
      bad-rime-api) echo '{"data":["false"]}' ;;
      malformed-rime-api) echo 'invalid JSON' ;;
      *) echo '{"data":[false]}' ;;
    esac ;;
  *) exit 9 ;;
esac
`, {mode: 0o755});
  fs.writeFileSync(path.join(dir, 'fcitx5-remote'), `#!/bin/bash
[[ "$*" == "--check -n" ]] || exit 9
if [[ $CASE == old-rime ]]; then echo rime; else echo pinyin; fi
`, {mode: 0o755});
  const trace = path.join(dir, 'trace');
  const read = (scenario) => {
    fs.writeFileSync(trace, '');
    return JSON.parse(execFileSync('bash', [path.resolve(__dirname, '../fcitx-state.sh')], {
      env: {...process.env, PATH: `${dir}:${process.env.PATH}`, CASE: scenario, TRACE: trace}, encoding: 'utf8'
    }));
  };
  assert.equal(read('missing').state, 0);
  assert.equal(read('malformed').state, 0);
  assert.deepEqual(read('inactive'), {state: 1, id: '', name: '', label: '', language: '', asciiMode: null});
  assert.equal(fs.readFileSync(trace, 'utf8'), 'State\n');
  assert.deepEqual(read('active'), {state: 2, id: 'rime', name: 'Rime', label: 'ㄓ', language: 'zh', asciiMode: false});
  assert.equal(read('english').asciiMode, true);
  assert.equal(read('no-rime-api').asciiMode, null);
  assert.equal(read('bad-rime-api').asciiMode, null);
  assert.equal(read('malformed-rime-api').asciiMode, null);
  assert.deepEqual(read('old-rime'), {state: 2, id: 'rime', name: 'rime', label: '', language: '', asciiMode: false});
  assert.deepEqual(read('old'), {state: 2, id: 'pinyin', name: 'pinyin', label: '', language: '', asciiMode: null});
  assert.equal(fs.readFileSync(trace, 'utf8').includes('IsAsciiMode'), false);
  assert.equal(read('other').asciiMode, null);
  assert.equal(fs.readFileSync(trace, 'utf8').includes('IsAsciiMode'), false);
  console.log('snapshot tests passed');
} finally {
  fs.rmSync(dir, {recursive: true, force: true});
}
