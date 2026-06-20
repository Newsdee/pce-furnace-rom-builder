#!/usr/bin/env node
// Targeted PCM compatibility checks against the original HuTrack converter behavior.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

function makeSandbox() {
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
        pako: {
            inflate(data) {
                const buf = zlib.inflateSync(Buffer.from(data));
                return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
            }
        },
        log() {}
    };
    vm.createContext(sandbox);
    const srcDir = path.join(__dirname, '..', 'src');
    for (const file of ['model.js', 'reader.js', 'exporter.js', 'parser.js', 'parser_furnace.js']) {
        vm.runInContext(fs.readFileSync(path.join(srcDir, file), 'utf-8'), sandbox, { filename: file });
    }
    return sandbox;
}

function makeFakeFile(filePath) {
    const raw = fs.readFileSync(filePath);
    return {
        name: path.basename(filePath),
        arrayBuffer() {
            const ab = new ArrayBuffer(raw.length);
            new Uint8Array(ab).set(raw);
            return Promise.resolve(ab);
        }
    };
}

function firstDw(content) {
    const match = content.match(/^\s*\.dw\s+([^\s;]+)/m);
    return match ? match[1] : null;
}

function fail(message) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
}

(async () => {
    const sandbox = makeSandbox();
    const input = path.join(__dirname, '..', 'examples', 'fun_fact', 'fun_fact_one_pattern.dmf');
    sandbox.__file = makeFakeFile(input);
    const parsed = await vm.runInContext('parseDMF(__file)', sandbox);
    sandbox.__fileLinear = makeFakeFile(input);
    const parsedLinear = await vm.runInContext('parseDMF(__fileLinear, { highQualityPcmResample: false })', sandbox);

    if (!parsed.samples || parsed.samples.length !== 1) fail(`expected one sample, got ${parsed.samples ? parsed.samples.length : 0}`);
    if (parsed.samples[0].sampleSize !== 11776) fail(`expected source sample size 11776, got ${parsed.samples[0].sampleSize}`);
    if (parsed.samples[0].samplePCE.length !== 7434) fail(`expected PCE sample length 7434, got ${parsed.samples[0].samplePCE.length}`);
    if (parsedLinear.samples[0].samplePCE.length !== 7434) fail(`expected linear PCE sample length 7434, got ${parsedLinear.samples[0].samplePCE.length}`);
    if (parsed.samples[0].samplePCE.join(',') === parsedLinear.samples[0].samplePCE.join(',')) fail('expected high-quality PCM output to differ from linear fallback');

    sandbox.__parsed = parsed;
    sandbox.__exporter = vm.runInContext('new HuTrackExporter(__parsed, { includePath: "Assets/Music/fun_fact_one_pattern/" })', sandbox);
    const files = vm.runInContext('__exporter.generate("fun_fact_one_pattern")', sandbox);

    const pcmMatrixDw = firstDw(files['fun_fact_one_pattern.pcmMatrix.inc']);
    const pcmDataDw = firstDw(files['fun_fact_one_pattern.pcmData.inc']);

    if (pcmMatrixDw !== '$2') fail(`expected pcmMatrix offset .dw $2, got ${pcmMatrixDw}`);
    if (pcmDataDw !== '7434') fail(`expected pcmData size .dw 7434, got ${pcmDataDw}`);
    if (!files['fun_fact_one_pattern.pcmData.inc'].includes('.db $80')) fail('expected PCM terminator .db $80');

    const furInput = path.join(__dirname, '..', 'examples', 'fun_fact', 'FunFact_sample_short_new.fur');
    sandbox.__furFile = makeFakeFile(furInput);
    const parsedFur = await vm.runInContext('parseFUR(__furFile)', sandbox);
    sandbox.__furFileLinear = makeFakeFile(furInput);
    const parsedFurLinear = await vm.runInContext('parseFUR(__furFileLinear, { highQualityPcmResample: false })', sandbox);

    if (!parsedFur.samples || parsedFur.samples.length !== 1) fail(`expected one FUR sample, got ${parsedFur.samples ? parsedFur.samples.length : 0}`);
    if (parsedFur.samples[0].sampleSize !== 11776) fail(`expected FUR source sample size 11776, got ${parsedFur.samples[0].sampleSize}`);
    if (parsedFur.samples[0].sampleRate !== 11025) fail(`expected FUR sample C-4 rate 11025, got ${parsedFur.samples[0].sampleRate}`);
    if (parsedFur.samples[0].samplePCE.length !== 7434) fail(`expected FUR PCE sample length 7434, got ${parsedFur.samples[0].samplePCE.length}`);
    if (parsedFurLinear.samples[0].samplePCE.length !== 7434) fail(`expected FUR linear PCE sample length 7434, got ${parsedFurLinear.samples[0].samplePCE.length}`);
    if (parsedFur.samples[0].samplePCE.join(',') === parsedFurLinear.samples[0].samplePCE.join(',')) fail('expected FUR compatible PCM output to differ from Trashy PCM fallback');

    console.log('PASS: PCM compatibility regression');
})();
