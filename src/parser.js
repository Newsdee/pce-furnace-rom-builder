// ============== THE PARSER ==============
const HUTRACK_RATE_VAL = [1, 8000, 11025, 16000, 22050, 32000];
const HUTRACK_PITCH_VAL = [1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 5];
const HUTRACK_DEFAULT_PCM_PLAYBACK = 6960;

function clamp16(sample) {
    if (sample < -32767) return -32767;
    if (sample > 32767) return 32767;
    return sample;
}

function resampleLinear(samples, sourceRate, targetRate) {
    if (!samples || samples.length === 0 || !sourceRate || !targetRate || sourceRate === targetRate) return samples ? samples.slice() : [];
    const outputLen = Math.max(1, Math.round(samples.length * targetRate / sourceRate));
    const output = [];
    const ratio = sourceRate / targetRate;
    for (let i = 0; i < outputLen; i++) {
        const pos = i * ratio;
        const idx = Math.floor(pos);
        const frac = pos - idx;
        const a = samples[Math.min(idx, samples.length - 1)];
        const b = samples[Math.min(idx + 1, samples.length - 1)];
        output.push(Math.trunc(a + ((b - a) * frac)));
    }
    return output;
}

function besselI0(x) {
    let sum = 1;
    let term = 1;
    const half = x * 0.5;
    for (let k = 1; k <= 24; k++) {
        term *= (half / k) * (half / k);
        sum += term;
        if (term < 1e-12 * sum) break;
    }
    return sum;
}

function sinc(x) {
    if (Math.abs(x) < 1e-8) return 1;
    const pix = Math.PI * x;
    return Math.sin(pix) / pix;
}

function kaiserWindow(x, radius, beta) {
    const ratio = x / radius;
    if (ratio < -1 || ratio > 1) return 0;
    return besselI0(beta * Math.sqrt(1 - ratio * ratio)) / besselI0(beta);
}

function resampleKaiser(samples, sourceRate, targetRate) {
    if (!samples || samples.length === 0 || !sourceRate || !targetRate || sourceRate === targetRate) return samples ? samples.slice() : [];
    const outputLen = Math.max(1, Math.round(samples.length * targetRate / sourceRate));
    const output = [];
    const ratio = sourceRate / targetRate;
    const cutoff = Math.min(1, targetRate / sourceRate);
    const radius = 16;
    const beta = 12.9846;

    for (let i = 0; i < outputLen; i++) {
        const center = i * ratio;
        const left = Math.ceil(center - radius);
        const right = Math.floor(center + radius);
        let acc = 0;
        let weightSum = 0;

        for (let j = left; j <= right; j++) {
            if (j < 0 || j >= samples.length) continue;
            const distance = center - j;
            const weight = cutoff * sinc(distance * cutoff) * kaiserWindow(distance, radius, beta);
            acc += samples[j] * weight;
            weightSum += weight;
        }

        output.push(Math.trunc(weightSum ? acc / weightSum : 0));
    }

    return output;
}

function convertSampleToHuTrackPCE(sample, options = {}) {
    const playbackRate = options.playbackRate || HUTRACK_DEFAULT_PCM_PLAYBACK;
    const highQualityPcmResample = options.highQualityPcmResample !== false;
    let signedData;
    if (sample.sampleDepth === 16) {
        signedData = sample.sampleData.map(v => v > 0x7fff ? v - 0x10000 : v);
    } else if (sample.sampleDepth === 8) {
        signedData = sample.sampleData.map(v => (v - 128) * 256);
    } else {
        return [];
    }

    const boosted = signedData.map(v => clamp16(v * 1.5));
    const sourceRate = (HUTRACK_RATE_VAL[sample.sampleRate] || HUTRACK_RATE_VAL[0]) * (HUTRACK_PITCH_VAL[sample.samplePitch] || 1);
    const resampler = highQualityPcmResample ? resampleKaiser : resampleLinear;
    const resampled = resampler(boosted, sourceRate, playbackRate).map(v => clamp16(v));
    return resampled.map(v => (v + 32767) >> 11);
}

async function parseDMF(file, options = {}) {
    let buffer = await file.arrayBuffer();
    let data = new Uint8Array(buffer);
    
    // Handle DMF compression if present
    try { data = pako.inflate(data); log('DMF decompressed'); } catch(e) { log('No compression'); }

    const reader = new DMFReader(data);
    
    // 1. Header Validation
    const magic = String.fromCharCode(...data.slice(0, 16));
    if (!magic.startsWith('.DelekDefleMask.')) throw new Error('Not a valid DMF file');
    reader.index = 16;

    const version = reader.getNextByte();
    const system = reader.getNextByte();
    if (system !== 0x05) throw new Error('Only PC Engine (0x05) supported');

    // 2. Song Metadata
    const songName = reader.readString(reader.getNextByte());
    const author = reader.readString(reader.getNextByte());
    reader.getNextByte(); reader.getNextByte(); 

    const timeBase = reader.getNextByte();
    const tick1 = reader.getNextByte();
    const tick2 = reader.getNextByte();
    const mode = reader.getNextByte();
    const customHZ = reader.getNextByte();
    reader.getNextByte(); reader.getNextByte(); reader.getNextByte();

    const rowLen = reader.getNextByteFromDword();
    const patternLen = reader.getNextByte();

    // 3. Pattern Matrix (The sequence of patterns played per channel)
    const patternMatrix = [];
    for (let ch = 0; ch < 6; ch++) {
        const chOrder = [];
        for (let r = 0; r < patternLen; r++) chOrder.push(reader.getNextByte());
        patternMatrix.push(chOrder);
    }

    // 4. Instrument Definitions
    const instrumentsLen = reader.getNextByte();
    const container = new HuTrackContainer(patternLen, instrumentsLen, rowLen);
    container.songName = songName;
    container.authorName = author;
    container.timeBase = timeBase + 1;
    container.tickTime1 = tick1 * container.timeBase;
    container.tickTime2 = tick2 * container.timeBase;
    container.frameMode = mode;
    container.customMode = customHZ;
    container.PatternMatrix = patternMatrix;

    for (let i = 0; i < container.instrumentsLen; i++) {
        const inst = new HuTrackContainer.Instrument();
        
        // Instrument Name
        const nameLen = reader.getNextByte();
        inst.name = reader.readString(nameLen);
        inst.mode = reader.getNextByte();
        
        // Volume Envelope
        const volSize = reader.getNextByte();
        const volEnv = [];
        for (let v = 0; v < volSize; v++) volEnv.push(reader.getNextByteFromDword());
        inst.volumeEnv = volEnv;
        inst.volumeEnvLength = volSize;
        const volLoop = volSize > 0 ? reader.getNextByte() : 0xff;
        inst.volumeEnvLoopPosition = (volLoop !== 0xff && volLoop >= volSize) ? volSize - 1 : volLoop;
        
        // Arpeggio Envelope
        const arpSize = reader.getNextByte();
        const arpEnv = [];
        for (let a = 0; a < arpSize; a++) arpEnv.push(reader.getNextIntDword());
        inst.arpeggioEnvLength = arpSize;
        const arpLoop = arpSize > 0 ? reader.getNextByte() : 0xff;
        inst.arpeggioEnvLoopPosition = (arpLoop !== 0xff && arpLoop >= arpSize) ? arpSize - 1 : arpLoop;
        inst.arpeggioEnvMode = reader.getNextByte();
        inst.arpeggioEnv = arpEnv.map(val => (inst.arpeggioEnvMode ? val : val - 12) & 0xff);
        
        // Noise Envelope (Skipped in HuTrack, but must be read from DMF)
        const noiseSize = reader.getNextByte();
        for (let n = 0; n < noiseSize; n++) reader.getNextByteFromDword();
        const noiseLoop = noiseSize > 0 ? reader.getNextByte() : 0xff;
        
        // Wavetable Envelope
        const waveSize = reader.getNextByte();
        const waveEnv = [];
        for (let w = 0; w < waveSize; w++) waveEnv.push(reader.getNextByteFromDword());
        inst.wavetableEnv = waveEnv;
        inst.wavetableEnvLength = waveSize;
        const waveLoop = waveSize > 0 ? reader.getNextByte() : 0xff;
        inst.wavetableEnvLoopPosition = (waveLoop !== 0xff && waveLoop >= waveSize) ? waveSize - 1 : waveLoop;
        
        container.instrumentData.push(inst);
    }

    // 5. Waveform Tables
    const wavetableEntries = reader.getNextByte();
    container.wavetableLen = wavetableEntries;
    for (let i = 0; i < wavetableEntries; i++) {
        const size = reader.getNextByteFromDword();
        const table = [];
        for (let s = 0; s < size; s++) table.push(reader.getNextByteFromDword());
        container.wavetableData.push(table);
    }

    // 6. Pattern Data & Compression
    container.patternData = [];
    container.uncompPatternData = [];
    container.PatternMatrixCompressed = [];
    for (let channel = 0; channel < 6; channel++) {
        container.patternData[channel] = [];
        container.uncompPatternData[channel] = [];
        container.PatternMatrixCompressed[channel] = [];
        const numFX = reader.getNextByte();
        let uniquePatternCount = 0;
        
        for (let pIdx = 0; pIdx < container.PatternMatrixLen; pIdx++) {
            const newPattern = new HuTrackContainer.Pattern();
            const rawPattern = new HuTrackContainer.Pattern();
            newPattern.fxLen = numFX; rawPattern.fxLen = numFX;
            newPattern.rowLen = 3 + (numFX * 2) + 1; rawPattern.rowLen = 3 + (numFX * 2) + 1;
            
            let emptyRowCount = 0;
            for (let row = 0; row < container.rowsPerPattern; row++) {
                const rowEntry = []; const rawRowEntry = [];
                
                // Note & Octave
                let note = reader.getNextByte();
                rawRowEntry.push(note);
                let octaveDelta = 0; let processedNote = note;
                if (note > 0 && note < 13) processedNote = note + 1;
                if (processedNote === 13) { processedNote = 1; octaveDelta = 1; }
                rowEntry.push(processedNote);
                reader.getNextByte();
                let octave = reader.getNextByte();
                rawRowEntry.push(octave);
                rowEntry.push(octave + octaveDelta);
                reader.getNextByte();
                
                // Volume
                let volume = reader.getNextWord();
                rowEntry.push(volume); rawRowEntry.push(volume);
                
                // Effects
                for (let fx = 0; fx < numFX; fx++) {
                    let fxCode = reader.getNextByte() | (reader.getNextByte() << 8);
                    let fxArg = reader.getNextByte() | (reader.getNextByte() << 8);
                    rowEntry.push(fxCode); rawRowEntry.push(fxCode); rawRowEntry.push(fxArg);
                    if ((fxCode === 0x09 || fxCode === 0x0f) && fxArg !== 0xffff) fxArg *= container.timeBase;
                    if (fxCode === 0x08 && fxArg === 0xffff) fxArg = 0xff;
                    rowEntry.push(fxArg);
                }
                
                // Instrument
                let instr = reader.getNextWord();
                rowEntry.push(instr);
                rawRowEntry.splice(3, 0, instr);
                
                // --- Compression Logic ---
                const isRowEmpty = rowEntry[0] === 0 && rowEntry[1] === 0 && rowEntry.slice(2).every(val => val === 0xffff);
                if (isRowEmpty) {
                    emptyRowCount++;
                    if (emptyRowCount === 30) { newPattern.patternData.push([emptyRowCount + 224]); emptyRowCount = 0; }
                    else if (emptyRowCount > 0 && row + 1 >= container.rowsPerPattern) { newPattern.patternData.push([emptyRowCount + 224]); emptyRowCount = 0; }
                } else {
                    if (emptyRowCount > 0) { newPattern.patternData.push([emptyRowCount + 224]); emptyRowCount = 0; }
                    
                    // Calculate Mask
                    let mask = 0;
                    if (rowEntry[0] > 0 || rowEntry[1] > 0) mask |= (1 << 0);
                    if (rowEntry[rowEntry.length - 1] !== 0xffff) mask |= (1 << 2);
                    if (rowEntry[2] !== 0xffff) mask |= (1 << 3);
                    if (rowEntry[3] !== 0xffff) mask |= (1 << 4);
                    if (rowEntry[4] !== 0xffff) mask |= (1 << 5);
                    const fxPart = rowEntry.slice(5, -1);
                    if (fxPart.length > 0 && fxPart.some(fx => fx !== 0xffff)) mask |= (1 << 6);
                    
                    let compressedNote = (rowEntry[0] - 1) + (rowEntry[1] * 12);
                    if (mask <= 1 && rowEntry[0] !== 0) compressedNote += 128;
                    if (rowEntry[0] === 100) compressedNote = 224;
                    
                    const finalRow = [];
                    if (mask === 1) finalRow.push(compressedNote);
                    else {
                        finalRow.push(mask);
                        if (mask & 0x01) finalRow.push(compressedNote);
                        if (mask & 0x04) finalRow.push(rowEntry[rowEntry.length - 1] & 0xff);
                        if (mask & 0x08) finalRow.push(rowEntry[2] & 0xff);
                        if (mask & 0x10) finalRow.push(rowEntry[3] & 0xff);
                        if (mask & 0x20) finalRow.push(rowEntry[4] & 0xff);
                        if (mask & 0x40) {
                            let maskExtFX = 0; const extFX = [];
                            for (let i = 0; i < fxPart.length; i++) { if (fxPart[i] !== 0xffff) { maskExtFX |= (1 << i); extFX.push(fxPart[i]); } }
                            finalRow.push(maskExtFX); finalRow.push(...extFX);
                        }
                    }
                    newPattern.patternData.push(finalRow);
                }
                rawPattern.patternData.push(rawRowEntry);
            }
            
            // Deduplicate patterns to save ROM space
            let patternMatchIdx = -1;
            for (let i = 0; i < container.patternData[channel].length; i++) {
                if (newPattern.compare(container.patternData[channel][i])) { patternMatchIdx = i; break; }
            }
            if (patternMatchIdx === -1) {
                container.PatternMatrixCompressed[channel].push(uniquePatternCount);
                container.patternData[channel].push(newPattern);
                container.uncompPatternData[channel].push(rawPattern);
                uniquePatternCount++;
            } else {
                container.PatternMatrixCompressed[channel].push(patternMatchIdx);
            }
        }
    }

    // 7. PCM Samples
    const samplesLen = reader.getNextByte();
    container.samplesLen = samplesLen;
    for (let i = 0; i < samplesLen; i++) {
        const s = new HuTrackContainer.Sample();
        s.sampleSize = reader.getNextDword();
        s.sampleName = reader.readString(reader.getNextByte());
        s.sampleRate = reader.getNextByte();
        s.samplePitch = reader.getNextByte();
        s.sampleAmp = reader.getNextByte();
        s.sampleDepth = reader.getNextByte();
        
        const rawData = [];
        for (let d = 0; d < s.sampleSize; d++) rawData.push(reader.getNextWord());
        s.sampleData = rawData;
        
        s.samplePCE = convertSampleToHuTrackPCE(s, options);
        container.samples.push(s);
    }

    log(`Parsed: ${container.instrumentsLen} instruments, ${container.wavetableLen} waveforms, ${container.samplesLen} samples.`);
    return container;
}
