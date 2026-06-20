#!/usr/bin/env node
// CLI test runner - runs the same src/*.js pipeline outside the browser.
// Usage: node test_cli.js [input.dmf]
// Output: writes .inc files to new/ directory

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const DMF_FILE = process.argv[2] || 'swedish_little_girl.dmf';
const isFUR = /\.fur$/i.test(DMF_FILE);
const OUTPUT_DIR = path.join(__dirname, 'new');

// ---------- Shims for browser globals ----------
const sandbox = {
    console,
    setTimeout,
    Uint8Array,
    DataView,
    ArrayBuffer,
    String,
    JSON,
    Math,
    Error,
    Set,
    parseInt,
    isNaN,
    // pako shim - inflate returns Uint8Array (not Buffer) to keep DataView happy
    pako: {
        inflate(data) {
            const buf = zlib.inflateSync(Buffer.from(data));
            return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        }
    },
    // log() mirrors the browser UI logger
    log(msg) { console.log(msg); },
};
vm.createContext(sandbox);

// ---------- Load source modules in build order ----------
const SRC_DIR = path.join(__dirname, '..', 'src');
const SRC_FILES = ['model.js', 'reader.js', 'exporter.js', 'parser.js', 'parser_furnace.js'];

for (const file of SRC_FILES) {
    const code = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8');
    vm.runInContext(code, sandbox, { filename: file });
}

// ---------- Fake File object wrapping a local .dmf ----------
function makeFakeFile(filePath) {
    const raw = fs.readFileSync(filePath);
    return {
        name: path.basename(filePath),
        arrayBuffer() {
            const ab = new ArrayBuffer(raw.length);
            const view = new Uint8Array(ab);
            view.set(raw);
            return Promise.resolve(ab);
        }
    };
}

// ---------- Main ----------
(async () => {
    let dmfPath = path.isAbsolute(DMF_FILE) ? DMF_FILE : path.resolve(process.cwd(), DMF_FILE);
    if (!fs.existsSync(dmfPath)) dmfPath = path.resolve(__dirname, DMF_FILE);
    if (!fs.existsSync(dmfPath)) {
        console.error(`File not found: ${dmfPath}`);
        process.exit(1);
    }

    console.log(`Parsing ${DMF_FILE} ...`);
    const fakeFile = makeFakeFile(dmfPath);

    // Choose parser based on extension
    const parseFunc = isFUR ? 'parseFUR' : 'parseDMF';
    const parsed = await vm.runInContext(
        `${parseFunc}(__fakeFile)`,
        Object.assign(sandbox, { __fakeFile: fakeFile })
    );

    // Generate .inc files (Assets/Music/<song>/ path to match reference output)
    const songName = path.basename(DMF_FILE).replace(/\.[^/.]+$/, '');
    const songDir = `Assets/Music/${songName}`;
    const exporter = vm.runInContext(
        `new HuTrackExporter(__parsed, { includePath: __songDir + "/" })`,
        Object.assign(sandbox, { __parsed: parsed, __songDir: songDir })
    );
    const files = vm.runInContext(
        `__exporter.generate(__songName)`,
        Object.assign(sandbox, { __exporter: exporter, __songName: songName })
    );

    // Write to new/
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    for (const [filename, content] of Object.entries(files)) {
        const outPath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(outPath, content, 'utf-8');
        console.log(`  wrote ${filename}`);
    }
    console.log(`\nDone. ${Object.keys(files).length} files written to new/`);
})();
