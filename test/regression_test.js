#!/usr/bin/env node
// Regression test runner for HuTrack Online converter.
// Converts each test song and diffs output against expected/ references.
//
// Usage:  node regression_test.js [--update <song>] [--filter <pattern>]
//   --update <song>  : overwrite expected/ with current output (for baselining)
//   --filter <pat>   : only run tests whose song name contains <pat>
//
// Exit code: 0 = all pass, 1 = any failure, 2 = error

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

// -- Args ---------------------------------------------------------------
const args = process.argv.slice(2);
let updateSong = null;
let filterPat = null;
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--update' && args[i + 1]) updateSong = args[++i];
    if (args[i] === '--filter' && args[i + 1]) filterPat = args[++i];
}

// -- Discover tests -----------------------------------------------------
const TESTS_DIR = path.join(__dirname, 'tests');
const formats = ['fur', 'dmf'];
const tests = [];

for (const fmt of formats) {
    const fmtDir = path.join(TESTS_DIR, fmt);
    if (!fs.existsSync(fmtDir)) continue;
    for (const song of fs.readdirSync(fmtDir).sort()) {
        const songDir = path.join(fmtDir, song);
        if (!fs.statSync(songDir).isDirectory()) continue;
        const srcFiles = fs.readdirSync(songDir).filter(f => f.endsWith(`.${fmt}`));
        if (srcFiles.length === 0) continue;
        const expectedDir = path.join(songDir, 'expected');
        const hasExpected = fs.existsSync(expectedDir) &&
            fs.readdirSync(expectedDir).filter(f => f.endsWith('.inc')).length > 0;
        tests.push({ fmt, song, songDir, srcFile: path.join(songDir, srcFiles[0]), expectedDir, hasExpected });
    }
}

// -- Load converter once -----------------------------------------------
function makeSandbox() {
    const sandbox = {
        console, setTimeout, Uint8Array, DataView, ArrayBuffer, String, JSON,
        Math, Error, Set, parseInt, isNaN,
        pako: {
            inflate(data) {
                const buf = zlib.inflateSync(Buffer.from(data));
                return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
            }
        },
        log() {}, // suppress converter chatter during tests
    };
    vm.createContext(sandbox);
    const SRC_DIR = path.join(__dirname, '..', 'src');
    for (const f of ['model.js', 'reader.js', 'exporter.js', 'parser.js', 'parser_furnace.js']) {
        vm.runInContext(fs.readFileSync(path.join(SRC_DIR, f), 'utf-8'), sandbox, { filename: f });
    }
    return sandbox;
}

// -- Convert a single file ---------------------------------------------
async function convert(sandbox, srcFile, songName, fmt) {
    const raw = fs.readFileSync(srcFile);
    const ab = new ArrayBuffer(raw.length);
    new Uint8Array(ab).set(raw);
    const fakeFile = { name: path.basename(srcFile), arrayBuffer() { return Promise.resolve(ab); } };

    sandbox.__f = fakeFile;
    const parseFunc = fmt === 'fur' ? 'parseFUR' : 'parseDMF';
    const parsed = await vm.runInContext(`${parseFunc}(__f)`, sandbox);

    sandbox.__p = parsed;
    sandbox.__incPath = `Assets/Music/${songName}/`;
    const exporter = vm.runInContext('new HuTrackExporter(__p, { includePath: __incPath })', sandbox);

    sandbox.__e = exporter;
    sandbox.__sn = songName;
    return vm.runInContext('__e.generate(__sn)', sandbox);
}

// -- Diff two sets of .inc files ---------------------------------------
function diffFiles(generatedFiles, expectedDir) {
    const diffs = [];
    const expectedNames = fs.readdirSync(expectedDir).filter(f => f.endsWith('.inc')).sort();

    for (const fn of expectedNames) {
        const expectedContent = fs.readFileSync(path.join(expectedDir, fn), 'utf-8');
        const generatedContent = generatedFiles[fn];
        if (generatedContent === undefined) {
            diffs.push({ file: fn, type: 'missing', detail: 'not generated' });
            continue;
        }
        // Normalize: trim trailing whitespace per line, collapse blank lines
        const norm = s => s.split('\n').map(l => l.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n');
        const expNorm = norm(expectedContent);
        const genNorm = norm(generatedContent);
        if (expNorm !== genNorm) {
            // Find first differing line
            const expLines = expNorm.split('\n');
            const genLines = genNorm.split('\n');
            let firstDiff = -1;
            for (let i = 0; i < Math.max(expLines.length, genLines.length); i++) {
                if (expLines[i] !== genLines[i]) { firstDiff = i + 1; break; }
            }
            diffs.push({ file: fn, type: 'content', line: firstDiff,
                expected: expLines[firstDiff - 1] || '(EOF)',
                got: genLines[firstDiff - 1] || '(EOF)' });
        }
    }
    // Check for extra generated files not in expected
    for (const fn of Object.keys(generatedFiles)) {
        if (!expectedNames.includes(fn)) {
            diffs.push({ file: fn, type: 'extra', detail: 'not in expected/' });
        }
    }
    return diffs;
}

// -- Main ---------------------------------------------------------------
(async () => {
    const sandbox = makeSandbox();
    let passed = 0, failed = 0, skipped = 0;

    console.log(`\nHuTrack regression tests - ${tests.length} songs discovered\n`);

    for (const t of tests) {
        if (filterPat && !t.song.toLowerCase().includes(filterPat.toLowerCase())) {
            continue; // filtered out
        }

        const label = `[${t.fmt.toUpperCase()}] ${t.song}`;

        // --update mode: regenerate expected/
        if (updateSong && (updateSong === t.song || updateSong === 'all')) {
            process.stdout.write(`  ${label} ... updating expected/ ... `);
            try {
                const files = await convert(sandbox, t.srcFile, t.song, t.fmt);
                if (!fs.existsSync(t.expectedDir)) fs.mkdirSync(t.expectedDir, { recursive: true });
                for (const [fn, content] of Object.entries(files)) {
                    fs.writeFileSync(path.join(t.expectedDir, fn), content, 'utf-8');
                }
                console.log(`OK (${Object.keys(files).length} files)`);
            } catch (e) {
                console.log(`ERROR: ${e.message}`);
            }
            continue;
        }

        if (!t.hasExpected) {
            console.log(`  ${label} - SKIP (no expected/ reference)`);
            skipped++;
            continue;
        }

        process.stdout.write(`  ${label} ... `);
        try {
            const files = await convert(sandbox, t.srcFile, t.song, t.fmt);
            const diffs = diffFiles(files, t.expectedDir);
            if (diffs.length === 0) {
                console.log('PASS');
                passed++;
            } else {
                console.log(`FAIL (${diffs.length} diff(s))`);
                for (const d of diffs) {
                    if (d.type === 'content') {
                        console.log(`    ${d.file}:${d.line}  expected: ${d.expected}`);
                        console.log(`    ${' '.repeat(d.file.length)}       got: ${d.got}`);
                    } else {
                        console.log(`    ${d.file}: ${d.detail}`);
                    }
                }
                failed++;
            }
        } catch (e) {
            console.log(`ERROR: ${e.message}`);
            failed++;
        }
    }

    console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped\n`);
    process.exit(failed > 0 ? 1 : 0);
})();
