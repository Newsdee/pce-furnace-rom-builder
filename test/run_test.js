#!/usr/bin/env node
// Quick test runner: node run_test.js <input.fur|.dmf> <output_dir>
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const INPUT = process.argv[2];
const OUTPUT_DIR = process.argv[3] || 'new';
if (!INPUT) { console.error('Usage: node run_test.js <file.fur> [output_dir]'); process.exit(1); }
const isFUR = /\.fur$/i.test(INPUT);
const songName = path.basename(INPUT).replace(/\.[^/.]+$/, '');

const sandbox = {
    console, setTimeout, Uint8Array, DataView, ArrayBuffer, String, JSON, Math, Error, Set, parseInt, isNaN,
    pako: {
        inflate(data) {
            const buf = zlib.inflateSync(Buffer.from(data));
            return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        }
    },
    log(msg) { console.log(msg); },
};
vm.createContext(sandbox);

const SRC_DIR = path.join(__dirname, '..', 'src');
for (const f of ['model.js', 'reader.js', 'exporter.js', 'parser.js', 'parser_furnace.js']) {
    vm.runInContext(fs.readFileSync(path.join(SRC_DIR, f), 'utf-8'), sandbox, { filename: f });
}

const raw = fs.readFileSync(path.resolve(INPUT));
const ab = new ArrayBuffer(raw.length);
new Uint8Array(ab).set(raw);
const fakeFile = { name: path.basename(INPUT), arrayBuffer() { return Promise.resolve(ab); } };

(async () => {
    const parseFunc = isFUR ? 'parseFUR' : 'parseDMF';
    sandbox.__f = fakeFile;
    const parsed = await vm.runInContext(`${parseFunc}(__f)`, sandbox);

    sandbox.__p = parsed;
    sandbox.__dir = `Assets/Music/${songName}/`;
    const exporter = vm.runInContext('new HuTrackExporter(__p, { includePath: __dir })', sandbox);

    sandbox.__e = exporter;
    sandbox.__sn = songName;
    const files = vm.runInContext('__e.generate(__sn)', sandbox);

    const outDir = path.resolve(OUTPUT_DIR);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    for (const [fn, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(outDir, fn), content, 'utf-8');
        console.log(`  wrote ${fn}`);
    }
    console.log(`Done. ${Object.keys(files).length} files -> ${outDir}`);
})();
