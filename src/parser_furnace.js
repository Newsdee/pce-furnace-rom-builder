// ============== FULL .fur PARSER (Furnace format >=240) ==============
// Spec: https://github.com/tildearrow/furnace/blob/master/papers/format.md
// Instrument spec: https://github.com/tildearrow/furnace/blob/master/papers/newIns.md

function warnUnsupportedVirtualTempo(numerator, denominator) {
    if ((numerator === 0 && denominator === 0) || (numerator === 1 && denominator === 1)) return;
    log(`Warning: Virtual tempo ${numerator}/${denominator} is not supported by DMF or HuTrack. Export will use tick1/tick2 timing only.`);
}

async function parseFUR(file) {
    let buffer = await file.arrayBuffer();
    let data = new Uint8Array(buffer);

    // 1. Decompress if needed, then validate magic
    // Furnace files may be entirely zlib-compressed (magic is inside the stream)
    if (data[0] === 0x78) {
        try {
            data = pako.inflate(data);
            log('zlib decompressed');
        } catch(e) { throw new Error("Zlib decompression failed"); }
    }

    const magic = String.fromCharCode(...data.slice(0, 16));
    if (magic !== "-Furnace module-") throw new Error("Not a valid .fur file");
    data = data.slice(16);

    const reader = new FurnaceReader(data);

    // 2. Read remaining 16-byte header after magic
    const formatVersion = reader.getNextWord();
    reader.skip(2); // reserved
    const songInfoPtr = reader.getNextDword();
    reader.skip(8); // reserved

    if (formatVersion < 157) throw new Error(`Format version ${formatVersion} (<157) not supported. Block-based format required.`);
    log(`Format version: ${formatVersion}`);

    // 3. Collect all blocks
    const blocks = {};
    while (reader.index + 8 <= data.length) {
        const blockID = reader.readBlockID();
        const blockSize = reader.getNextDword();
        const offset = reader.index;
        if (!blocks[blockID]) blocks[blockID] = [];
        blocks[blockID].push({ offset, size: blockSize });
        reader.index = offset + blockSize;
    }

    log(`Blocks found: ${Object.keys(blocks).join(', ')}`);

    // ===================== Song Info & Subsong - version-dependent =====================
    let songName, author, totalChans, tickTime1, tickTime2, timeBase, frameMode;
    let rowsPerPattern, ordersLen, patternMatrix, effectColumnsPerChannel;
    let instrumentCount = 0, wavetableCount = 0, sampleCount = 0;

    if (blocks["INF2"]) {
        // =================== NEW FORMAT (>=240): INF2 + SNG2 ===================
        reader.index = blocks["INF2"][0].offset;

        songName = reader.readSTR();
        author   = reader.readSTR();
        reader.readSTR(); reader.readSTR(); // system, album
        reader.readSTR(); reader.readSTR(); reader.readSTR(); reader.readSTR(); // JP strings

        reader.getNextFloat(); // A-4 tuning
        reader.skip(1);        // automatic system name
        reader.getNextFloat(); // master volume

        totalChans = reader.getNextWord();
        const chipCount = reader.getNextWord();
        if (chipCount !== 1) throw new Error(`Only single-chip supported. Found ${chipCount} chips.`);

        const chipID = reader.getNextWord();
        reader.getNextWord(); // chip channel count
        reader.getNextFloat(); reader.getNextFloat(); reader.getNextFloat(); // vol/pan/balance

        if (chipID !== 0x05) throw new Error(`Only PC Engine (0x05) supported. Found chip 0x${chipID.toString(16)}.`);

        // Patchbay
        const patchbayCount = reader.getNextDword();
        reader.skip(patchbayCount * 4);
        reader.skip(1);

        // Element list
        while (reader.index < data.length) {
            const elemType = reader.getNextByte();
            if (elemType === 0) break;
            const numElements = reader.getNextDword();
            reader.skip(numElements * 4);
            if (elemType === 0x04) instrumentCount = numElements;
            if (elemType === 0x05) wavetableCount = numElements;
            if (elemType === 0x06) sampleCount = numElements;
        }

        // SNG2
        if (!blocks["SNG2"]) throw new Error("No SNG2 block");
        reader.index = blocks["SNG2"][0].offset;

        const ticksPerSec = reader.getNextFloat();
        reader.getNextByte(); // arp speed
        reader.getNextByte(); // fx divider
        rowsPerPattern = reader.getNextWord();
        ordersLen      = reader.getNextWord();
        reader.skip(2); // highlights
        const virtualTempoNumerator = reader.getNextWord();
        const virtualTempoDenominator = reader.getNextWord();
        warnUnsupportedVirtualTempo(virtualTempoNumerator, virtualTempoDenominator);

        const speedPatLen = reader.getNextByte();
        const speedPattern = [];
        for (let i = 0; i < 16; i++) speedPattern.push(reader.getNextWord());

        reader.readSTR(); reader.readSTR(); // subsong name/comment

        // Order table - ORDER-MAJOR for SNG2
        patternMatrix = [];
        for (let ch = 0; ch < totalChans; ch++) patternMatrix.push([]);
        for (let ord = 0; ord < ordersLen; ord++) {
            for (let ch = 0; ch < totalChans; ch++) {
                patternMatrix[ch].push(reader.getNextByte());
            }
        }

        effectColumnsPerChannel = [];
        for (let ch = 0; ch < totalChans; ch++) effectColumnsPerChannel.push(reader.getNextByte());

        timeBase = 1;
        tickTime1 = speedPattern[0] * timeBase;
        tickTime2 = (speedPatLen >= 2 ? speedPattern[1] : speedPattern[0]) * timeBase;
        frameMode = (ticksPerSec >= 55) ? 1 : 0;

        if (speedPatLen > 2) log(`Warning: Speed pattern has ${speedPatLen} entries - only first 2 used.`);

    } else if (blocks["INFO"]) {
        // =================== OLD FORMAT (<240): INFO block ===================
        reader.index = blocks["INFO"][0].offset;

        const timeBase_raw = reader.getNextByte(); // stored as timeBase-1 in old format
        const speed1 = reader.getNextByte();
        const speed2 = reader.getNextByte();
        reader.getNextByte(); // arp time
        const ticksPerSec = reader.getNextFloat();
        rowsPerPattern = reader.getNextWord();
        ordersLen      = reader.getNextWord();
        reader.skip(2); // highlights
        instrumentCount = reader.getNextWord();
        wavetableCount  = reader.getNextWord();
        sampleCount     = reader.getNextWord();
        const patternCount = reader.getNextDword();

        // Chip IDs (32 bytes) - find PC Engine
        const chipIDs = [];
        for (let i = 0; i < 32; i++) chipIDs.push(reader.getNextByte());
        let chipCount = 0;
        let foundPCE = false;
        for (let i = 0; i < 32; i++) {
            if (chipIDs[i] === 0) break;
            chipCount++;
            if (chipIDs[i] === 0x05) foundPCE = true;
        }
        if (!foundPCE) throw new Error(`No PC Engine chip found. Chip IDs: ${chipIDs.slice(0,chipCount).map(c=>'0x'+c.toString(16)).join(',')}`);
        if (chipCount !== 1) throw new Error(`Only single-chip supported. Found ${chipCount} chips.`);
        totalChans = 6; // PCE = 6 channels

        reader.skip(32); // chip volumes (reserved)
        reader.skip(32); // chip panning (reserved)

        // Chip flag pointers (128 bytes for >=119, 32x4=128 bytes for older)
        reader.skip(128);

        songName = reader.readSTR();
        author   = reader.readSTR();
        reader.getNextFloat(); // A-4 tuning

        // Compat flags - count depends on version (each 1 byte)
        // >=36: 3 flags (limit slides, linear pitch, loop modality)
        if (formatVersion >= 36) reader.skip(3);
        // >=42: 2 flags (proper noise, wave duty)
        if (formatVersion >= 42) reader.skip(2);
        // >=45: 5 flags (reset macro, legacy vol, compat arp, note off slides, target slides)
        if (formatVersion >= 45) reader.skip(5);
        // >=47: 2 flags (arp inhibits porta, wack algo)
        if (formatVersion >= 47) reader.skip(2);
        // >=49: 1 flag (broken shortcut slides)
        if (formatVersion >= 49) reader.skip(1);
        // >=50: 1 flag (ignore duplicate slides)
        if (formatVersion >= 50) reader.skip(1);
        // >=62: 2 flags (stop porta on note off, continuous vibrato)
        if (formatVersion >= 62) reader.skip(2);
        // >=64: 1 flag (broken DAC mode)
        if (formatVersion >= 64) reader.skip(1);
        // >=65: 1 flag (one tick cut)
        if (formatVersion >= 65) reader.skip(1);
        // >=66: 1 flag (instrument change during porta)
        if (formatVersion >= 66) reader.skip(1);
        // >=69: 1 flag (reset note base on arp stop)
        if (formatVersion >= 69) reader.skip(1);

        // Pointers to assets
        reader.skip(instrumentCount * 4);
        reader.skip(wavetableCount * 4);
        reader.skip(sampleCount * 4);
        reader.skip(patternCount * 4);

        // Orders - CHANNEL-MAJOR for old INFO: for each channel, read ordLen bytes
        patternMatrix = [];
        for (let ch = 0; ch < totalChans; ch++) {
            const chOrder = [];
            for (let ord = 0; ord < ordersLen; ord++) chOrder.push(reader.getNextByte());
            patternMatrix.push(chOrder);
        }

        effectColumnsPerChannel = [];
        for (let ch = 0; ch < totalChans; ch++) effectColumnsPerChannel.push(reader.getNextByte());

        // Skip: hide (ch), collapse (ch), names (chxSTR), short names (chxSTR)
        reader.skip(totalChans); // hide
        reader.skip(totalChans); // collapse
        for (let ch = 0; ch < totalChans; ch++) reader.readSTR(); // names
        for (let ch = 0; ch < totalChans; ch++) reader.readSTR(); // short names

        // Song comment
        reader.readSTR();

        // Master volume (>=59)
        if (formatVersion >= 59) reader.getNextFloat();

        // Extended compat flags (>=70)
        if (formatVersion >= 70) reader.skip(1); // broken speed selection
        if (formatVersion >= 71) reader.skip(3); // no slides first tick, next row reset arp, ignore jump
        if (formatVersion >= 72) reader.skip(2); // buggy porta, new ins envelope
        if (formatVersion >= 78) reader.skip(1); // ExtCh shared
        if (formatVersion >= 83) reader.skip(2); // ignore DAC, E1xy priority
        if (formatVersion >= 84) reader.skip(1); // new Sega PCM
        if (formatVersion >= 85) reader.skip(1); // weird f-num
        if (formatVersion >= 86) reader.skip(1); // SN duty reset
        if (formatVersion >= 90) reader.skip(1); // pitch macro linear
        if (formatVersion >= 94) reader.skip(1); // pitch slide speed
        if (formatVersion >= 97) reader.skip(1); // old octave boundary
        if (formatVersion >= 98) reader.skip(1); // disable OPN2 DAC vol
        if (formatVersion >= 99) reader.skip(3); // new vol scaling, vol after end, broken outVol
        if (formatVersion >= 100) reader.skip(1); // E1xy stop same note
        if (formatVersion >= 101) reader.skip(1); // broken initial porta
        if (formatVersion >= 108) reader.skip(1); // SN periods
        if (formatVersion >= 110) reader.skip(1); // cut/delay policy
        if (formatVersion >= 113) reader.skip(1); // 0B/0D treatment
        if (formatVersion >= 115) reader.skip(1); // auto system name
        if (formatVersion >= 117) reader.skip(1); // disable sample macro
        if (formatVersion >= 121) reader.skip(1); // broken outVol ep2
        if (formatVersion >= 130) reader.skip(1); // old arpeggio strategy

        // Virtual tempo (>=96)
        if (formatVersion >= 96) {
            const virtualTempoNumerator = reader.getNextWord();
            const virtualTempoDenominator = reader.getNextWord();
            warnUnsupportedVirtualTempo(virtualTempoNumerator, virtualTempoDenominator);
        }

        // Additional subsongs (>=95)
        if (formatVersion >= 95) {
            reader.readSTR(); // first subsong name
            reader.readSTR(); // first subsong comment
            const numAdditionalSubsongs = reader.getNextByte();
            reader.skip(3); // reserved
            reader.skip(numAdditionalSubsongs * 4);
        }

        // Additional metadata (>=103)
        if (formatVersion >= 103) {
            reader.readSTR(); // system name
            reader.readSTR(); // album
            reader.readSTR(); reader.readSTR(); reader.readSTR(); reader.readSTR(); // JP strings
        }

        // Extra chip output (>=135)
        if (formatVersion >= 135) {
            for (let c = 0; c < chipCount; c++) {
                reader.getNextFloat(); reader.getNextFloat(); reader.getNextFloat(); // vol/pan/balance
            }
            // Patchbay
            const patchbayCount = reader.getNextDword();
            reader.skip(patchbayCount * 4);
        }
        if (formatVersion >= 136) reader.skip(1); // auto patchbay

        // More compat flags (>=138+)
        if (formatVersion >= 138) reader.skip(1); // broken porta during legato
        if (formatVersion >= 155) reader.skip(1); // broken macro during note off
        if (formatVersion >= 168) reader.skip(1); // pre note no compensate
        if (formatVersion >= 183) reader.skip(1); // disable NES DPCM
        if (formatVersion >= 184) reader.skip(1); // reset arp phase
        if (formatVersion >= 188) reader.skip(1); // linear vol rounds up
        if (formatVersion >= 191) reader.skip(1); // legacy always set vol
        if (formatVersion >= 200) reader.skip(1); // legacy sample offset

        // Speed pattern (>=139) - overrides speed1/speed2
        let speedPatLen = 0;
        const speedPattern = [];
        if (formatVersion >= 139) {
            speedPatLen = reader.getNextByte();
            for (let i = 0; i < 16; i++) speedPattern.push(reader.getNextByte());
        }

        // Timing
        timeBase = timeBase_raw + 1;
        if (speedPatLen >= 1) {
            tickTime1 = speedPattern[0] * timeBase;
            tickTime2 = (speedPatLen >= 2 ? speedPattern[1] : speedPattern[0]) * timeBase;
        } else {
            tickTime1 = speed1 * timeBase;
            tickTime2 = speed2 * timeBase;
        }
        frameMode = (ticksPerSec >= 55) ? 1 : 0;

        if (speedPatLen > 2) log(`Warning: Speed pattern has ${speedPatLen} entries - only first 2 used.`);
    } else {
        throw new Error("No INFO or INF2 block found");
    }

    log(`"${songName}" by "${author}" - ${totalChans}ch, tick1=${tickTime1}, tick2=${tickTime2}, timeBase=${timeBase}, frameMode=${frameMode}, rows=${rowsPerPattern}, orders=${ordersLen}`);

    // ===================== INS2 - Instruments =====================
    const ins2Blocks = blocks["INS2"] || [];
    const instrumentsLen = ins2Blocks.length;
    const instrumentData = [];

    for (let i = 0; i < instrumentsLen; i++) {
        reader.index = ins2Blocks[i].offset;
        const insEnd = ins2Blocks[i].offset + ins2Blocks[i].size;

        const insVersion = reader.getNextWord();
        const insType    = reader.getNextWord();

        const inst = new HuTrackContainer.Instrument();
        inst.name = `Instrument ${i}`;
        inst.mode = 0;
        // Defaults (will be overwritten if MA features exist)
        inst.volumeEnvLength = 0; inst.volumeEnv = []; inst.volumeEnvLoopPosition = 0xff;
        inst.arpeggioEnvLength = 0; inst.arpeggioEnv = []; inst.arpeggioEnvLoopPosition = 0xff; inst.arpeggioEnvMode = 1; // default 1 = fixed (matches Furnace DMF export for empty arp)
        inst.noiseEnvLength = 0; inst.noiseEnv = []; inst.noiseEnvLoopPosition = 0xff;
        inst.wavetableEnvLength = 0; inst.wavetableEnv = []; inst.wavetableEnvLoopPosition = 0xff;

        if (insType !== 5) log(`Warning: Instrument ${i} type=${insType} (not PC Engine=5)`);

        // Feature loop
        while (reader.index + 4 <= insEnd) {
            const featureCode = String.fromCharCode(reader.getNextByte(), reader.getNextByte());
            const featureLen  = reader.getNextWord();
            const featureEnd  = reader.index + featureLen;

            if (featureCode === 'EN') break; // end of features

            if (featureCode === 'NA') {
                inst.name = reader.readSTR();
            } else if (featureCode === 'MA') {
                // MA starts with 2-byte header length (bytes per macro header)
                const macroHeaderLen = reader.getNextWord();
                // Parse macros until code 255
                while (reader.index < featureEnd) {
                    const macroCode = reader.getNextByte();
                    if (macroCode === 255) break;

                    const macroLen     = reader.getNextByte();
                    const macroLoop    = reader.getNextByte();
                    const macroRelease = reader.getNextByte();
                    const macroMode    = reader.getNextByte();
                    const macroOTW     = reader.getNextByte(); // open/type/wordsize
                    const macroDelay   = reader.getNextByte();
                    const macroSpeed   = reader.getNextByte();

                    // Skip extra header bytes if header is larger than expected 8
                    if (macroHeaderLen > 8) reader.skip(macroHeaderLen - 8);

                    const wordSize = (macroOTW >> 6) & 3;
                    const macroType = (macroOTW >> 1) & 3; // 0=seq, 1=ADSR, 2=LFO

                    if (macroType !== 0) log(`Warning: Instrument ${i} macro ${macroCode}: ADSR/LFO mode not supported, treating as sequence`);

                    // Read macro data based on word size
                    const macroData = [];
                    for (let d = 0; d < macroLen; d++) {
                        if (wordSize === 0) macroData.push(reader.getNextByte()); // u8
                        else if (wordSize === 1) { // s8
                            let v = reader.getNextByte();
                            if (v > 127) v -= 256;
                            macroData.push(v);
                        } else if (wordSize === 2) { // s16
                            let v = reader.getNextWord();
                            if (v > 32767) v -= 65536;
                            macroData.push(v);
                        } else { // s32
                            macroData.push(reader.getNextIntDword());
                        }
                    }

                    // Furnace DMF export caps envelopes at 127 entries
                    const clippedLen  = Math.min(macroLen, 127);
                    // Preserve 255 = no loop; otherwise clamp to clipped range
                    const clippedLoop = macroLoop === 255 ? 255
                        : (macroLoop >= clippedLen ? clippedLen - 1 : macroLoop);
                    const clippedData = macroData.slice(0, clippedLen);

                    // Map to HuTrack envelope slots
                    if (macroCode === 0) { // Volume
                        inst.volumeEnvLength = clippedLen;
                        inst.volumeEnv = clippedData;
                        inst.volumeEnvLoopPosition = clippedLen > 0 ? clippedLoop : 0xff;
                    } else if (macroCode === 1) { // Arpeggio
                        inst.arpeggioEnvLength = clippedLen;
                        // Fixed/absolute mode: for 32-bit data, bit 30 is Furnace's fixed flag.
                        // For 8/16-bit data, bit 30 doesn't exist - use macroMode header byte.
                        const isFixed = wordSize === 3
                            ? macroData.some(v => (v & 0x40000000) !== 0)
                            : macroMode === 1;
                        inst.arpeggioEnvMode = isFixed ? 1 : 0;
                        inst.arpeggioEnv = clippedData.map(val => {
                            const raw = val & 0x3FFFFFFF;
                            return raw & 0xff;
                        });
                        inst.arpeggioEnvLoopPosition = clippedLen > 0 ? clippedLoop : 0xff;
                    } else if (macroCode === 3) { // Wave
                        inst.wavetableEnvLength = clippedLen;
                        inst.wavetableEnv = clippedData;
                        inst.wavetableEnvLoopPosition = clippedLen > 0 ? clippedLoop : 0xff;
                    } else if (macroCode === 5) { // ex1 = Noise (PCE)
                        inst.noiseEnvLength = clippedLen;
                        inst.noiseEnv = clippedData;
                        inst.noiseEnvLoopPosition = clippedLen > 0 ? clippedLoop : 0xff;
                    }
                    // Other macro codes: skip (already consumed data)
                }
            } else {
                // Skip unknown feature
                reader.index = featureEnd;
            }
        }

        instrumentData.push(inst);
    }

    // ===================== WAVE - Wavetables =====================
    const waveBlocks = blocks["WAVE"] || [];
    const wavetableLen = waveBlocks.length;
    const wavetableData = [];

    for (let i = 0; i < wavetableLen; i++) {
        reader.index = waveBlocks[i].offset;
        reader.readSTR(); // name
        const width  = reader.getNextDword();
        reader.skip(4); // reserved
        const height = reader.getNextDword();
        const table = [];
        for (let s = 0; s < width && s < 32; s++) table.push(reader.getNextByteFromDword());
        wavetableData.push(table);
    }

    // ===================== SMP2 - Samples =====================
    const smp2Blocks = blocks["SMP2"] || [];
    const samplesLen = smp2Blocks.length;
    const samples = [];

    for (let i = 0; i < samplesLen; i++) {
        reader.index = smp2Blocks[i].offset;
        const s = new HuTrackContainer.Sample();
        s.sampleName = reader.readSTR();
        s.sampleSize = reader.getNextDword();
        const compatRate = reader.getNextDword();
        s.sampleRate = reader.getNextDword(); // C-4 rate
        const depth = reader.getNextByte();
        s.sampleDepth = depth;
        reader.skip(1); // loop direction
        reader.skip(1); // flags
        reader.skip(1); // flags 2
        const loopStart = reader.getNextIntDword();
        const loopEnd   = reader.getNextIntDword();
        reader.skip(16); // sample presence bitfields

        // Read sample data
        const rawData = [];
        if (depth === 16) {
            for (let d = 0; d < s.sampleSize; d++) rawData.push(reader.getNextWord());
        } else if (depth === 8) {
            for (let d = 0; d < s.sampleSize; d++) rawData.push(reader.getNextByte());
        } else {
            log(`Warning: Sample ${i} depth=${depth} not supported, skipping data`);
            reader.skip(s.sampleSize);
        }
        s.sampleData = rawData;

        // Convert to PCE 8-bit unsigned (same as DMF parser)
        if (depth === 16) {
            s.samplePCE = rawData.map(v => {
                let signed = v > 0x7FFF ? v - 0x10000 : v;
                return (signed + 32767) >> 11;
            });
        } else if (depth === 8) {
            s.samplePCE = rawData.map(v => v >> 3);
        } else {
            s.samplePCE = [];
        }
        samples.push(s);
    }

    // ===================== Build Container =====================
    const container = new HuTrackContainer(ordersLen, instrumentsLen, rowsPerPattern);
    container.songName = songName ?? "Untitled";
    container.authorName = author ?? "Unknown";
    container.timeBase = timeBase;
    container.tickTime1 = tickTime1;
    container.tickTime2 = tickTime2;
    container.frameMode = frameMode;
    container.customMode = 0;
    container.PatternMatrix = patternMatrix;
    container.instrumentData = instrumentData;
    container.wavetableLen = wavetableLen;
    container.wavetableData = wavetableData;
    container.samplesLen = samplesLen;
    container.samples = samples;

    container.patternData = [];
    container.uncompPatternData = [];
    container.PatternMatrixCompressed = [];

    // ===================== PATN - Patterns =====================
    // Index PATN blocks by (subsong, channel, patternID) for fast lookup
    const patnBlocks = blocks["PATN"] || [];
    const patnIndex = {};
    for (const patn of patnBlocks) {
        reader.index = patn.offset;
        const subsong = reader.getNextByte();
        const patnCh  = (formatVersion >= 240) ? reader.getNextWord() : reader.getNextByte();
        const patnID  = reader.getNextWord();
        const key = `${subsong}_${patnCh}_${patnID}`;
        patnIndex[key] = { offset: reader.index, endOffset: patn.offset + patn.size };
    }

    for (let ch = 0; ch < 6; ch++) {
        container.patternData[ch] = [];
        container.uncompPatternData[ch] = [];
        container.PatternMatrixCompressed[ch] = [];

        const numFX = effectColumnsPerChannel[ch];
        let uniquePatternCount = 0;

        for (let pIdx = 0; pIdx < ordersLen; pIdx++) {
            const patternID = patternMatrix[ch][pIdx];

            // Decompress Furnace PATN data into row array
            const rawRows = new Array(rowsPerPattern);
            for (let r = 0; r < rowsPerPattern; r++) {
                rawRows[r] = { note: 0, octave: 0, instr: 0xFFFF, volume: 0xFFFF, effects: [] };
            }

            const key = `0_${ch}_${patternID}`;
            if (patnIndex[key]) {
                reader.index = patnIndex[key].offset;
                const endOffset = patnIndex[key].endOffset;

                reader.readSTR(); // pattern name

                let row = 0;
                while (row < rowsPerPattern && reader.index < endOffset) {
                    const ctrl = reader.getNextByte();
                    if (ctrl === 0xFF) break;

                    if (ctrl & 0x80) {
                        // Skip N+2 rows
                        row += (ctrl & 0x7F) + 2;
                        continue;
                    }

                    if (ctrl === 0x00) {
                        // No bits set = skip 1 row
                        row++;
                        continue;
                    }

                    const hasNote    = ctrl & 0x01;
                    const hasIns     = ctrl & 0x02;
                    const hasVol     = ctrl & 0x04;
                    const hasEff0    = ctrl & 0x08;
                    const hasEff0Val = ctrl & 0x10;
                    const hasExtLow  = ctrl & 0x20;
                    const hasExtHigh = ctrl & 0x40;

                    // Read ext bytes BEFORE data fields
                    let extLow = 0, extHigh = 0;
                    if (hasExtLow) extLow = reader.getNextByte();
                    if (hasExtHigh) extHigh = reader.getNextByte();

                    // Note: single byte. 0-179=note, 180=off, 181=release, 182=macro release
                    let furNote = -1; // -1 = no note
                    if (hasNote) furNote = reader.getNextByte();

                    let instr = hasIns ? reader.getNextByte() : 0xFFFF;
                    let volume = hasVol ? reader.getNextByte() : 0xFFFF;

                    // Effects
                    const effects = [];
                    if (hasEff0) {
                        const fxCode = reader.getNextByte();
                        const fxVal  = hasEff0Val ? reader.getNextByte() : 0xFFFF;
                        effects.push({ code: fxCode, val: fxVal });
                    } else if (hasEff0Val) {
                        // Value without code (unlikely, but spec allows)
                        const fxVal = reader.getNextByte();
                        effects.push({ code: 0, val: fxVal });
                    }
                    // Ext low: effects 1-4 (pairs of code/value bits)
                    if (hasExtLow) {
                        for (let e = 0; e < 4; e++) {
                            const hasCode = extLow & (1 << (e * 2));
                            const hasVal  = extLow & (1 << (e * 2 + 1));
                            if (hasCode) {
                                const fxCode = reader.getNextByte();
                                const fxVal  = hasVal ? reader.getNextByte() : 0xFFFF;
                                effects.push({ code: fxCode, val: fxVal });
                            } else if (hasVal) {
                                const fxVal = reader.getNextByte();
                                effects.push({ code: 0, val: fxVal });
                            }
                        }
                    }
                    // Ext high: effects 5-8
                    if (hasExtHigh) {
                        for (let e = 0; e < 4; e++) {
                            const hasCode = extHigh & (1 << (e * 2));
                            const hasVal  = extHigh & (1 << (e * 2 + 1));
                            if (hasCode) {
                                const fxCode = reader.getNextByte();
                                const fxVal  = hasVal ? reader.getNextByte() : 0xFFFF;
                                effects.push({ code: fxCode, val: fxVal });
                            } else if (hasVal) {
                                const fxVal = reader.getNextByte();
                                effects.push({ code: 0, val: fxVal });
                            }
                        }
                    }

                    // Convert Furnace single-byte note to DMF-style note + octave
                    let dmfNote = 0, dmfOctave = 0;
                    if (furNote >= 0 && furNote <= 179) {
                        // Furnace: 0 = C at octave -5 ... 179 = B9
                        // DMF:     note 1=C#, 2=D ... 12=B, 0=empty; octave is separate
                        // semitone 0=C, 1=C#, ..., 11=B
                        const semitone = furNote % 12;
                        const octave   = Math.floor(furNote / 12); // 0-based from octave -5
                        // DMF note: 1=C#(in DMF), but actually DMF maps 1=C#,2=D...12=B,13=C(next oct)
                        // Wait - DMF note mapping (from parser.js):
                        //   raw 0 = empty, raw 1=C#, 2=D, ...12=B
                        //   Then processedNote = raw+1 for raw 1..12, and if ==13 -> 1 with octaveDelta
                        // So to produce correct DMF-style: semitone 0=C -> raw note 12 (C of "current" octave in DMF is 12)
                        // Actually let me re-examine parser.js logic:
                        //   DMF raw byte: 0=none, 1=C#, 2=D, 3=D#, 4=E, 5=F, 6=F#, 7=G, 8=G#, 9=A, 10=A#, 11=B, 12=C(next)
                        //   processedNote = raw + 1 (for raw 1..12)
                        //   if processedNote==13 -> processedNote=1, octaveDelta=1
                        //   The exporter then uses (processedNote-1) + octave*12 as compressedNote
                        // So the exporter sees: processedNote 1=C# (sem 1), 2=D (sem 2), ...
                        //   processedNote 1 with octaveDelta means "C of next octave"
                        //   Wait, that doesn't make sense. Let me look more carefully.
                        //
                        // DMF raw note byte meaning:
                        //   1 = C#  -> processed = 2 -> compressedNote = (2-1) + oct*12 = 1 + oct*12
                        //   2 = D   -> processed = 3 -> compressedNote = 2 + oct*12
                        //  ...
                        //  11 = B   -> processed = 12 -> compressedNote = 11 + oct*12
                        //  12 = C   -> processed = 13 -> 1, octaveDelta=1 -> compressedNote = 0 + (oct+1)*12
                        //
                        // So in DMF compressed note space:
                        //   C  = 0 + octave*12
                        //   C# = 1 + octave*12
                        //   D  = 2 + octave*12
                        //   ...
                        //   B  = 11 + octave*12
                        //
                        // In Furnace: note 0=C at octave -5, so:
                        //   Furnace note N -> semitone = N%12, furnace_octave = floor(N/12)
                        //   DMF compressed note should be = semitone + dmf_octave*12
                        //   where dmf_octave = furnace_octave (both 0-based at the same C)
                        //
                        // BUT DMF octaves are offset. Let me check reference:
                        //   Furnace octave -5 maps to... well, DMF uses octaves 0-7 typically.
                        //   In the DMF file the octave byte represents the octave directly.
                        //   The DMF raw data has note + octave as separate bytes.
                        //   In Furnace, note=60 = C at octave 0 (middle), which is
                        //     semitone 0, furnace_oct = 5 (floor(60/12)=5)
                        //   The DMF file would store this as note=12 (C), octave=5
                        //   After processing: processedNote=13->1, octaveDelta=1, so (1-1)+(5+1)*12 = 72
                        //   But using semitone directly: 0 + 5*12 = 60.
                        //   Hmm, but in DMF format octave byte for "middle C" might not be 5.
                        //
                        // Let me just produce the same rowEntry format as parseDMF,
                        // then the compression code will handle it identically.
                        // In parseDMF: rowEntry = [processedNote, octave+octaveDelta, volume, fx..., instr]
                        // processedNote comes from DMF raw note which has that weird mapping.
                        //
                        // To replicate: I need to produce the DMF raw note from Furnace semitone, then apply the +1 shift.
                        // DMF raw note for a given semitone:
                        //   C(sem 0) -> raw 12
                        //   C#(sem 1) -> raw 1
                        //   D(sem 2) -> raw 2
                        //   ...
                        //   B(sem 11) -> raw 11
                        //
                        // So: if semitone == 0 -> dmfRaw = 12; else dmfRaw = semitone
                        // Then apply the +1 shift and octave carry as parseDMF does.

                        let dmfRaw;
                        if (semitone === 0) dmfRaw = 12;
                        else dmfRaw = semitone;

                        let processedNote = dmfRaw + 1;
                        let octaveDelta = 0;
                        if (processedNote === 13) { processedNote = 1; octaveDelta = 1; }

                        dmfNote = processedNote;
                        // Furnace internal octave = floor(note/12). Display octave = internal - 5.
                        // DMF files store C with raw_octave = display-1, and the DMF parser adds
                        // octaveDelta to compensate. Furnace already stores C at the correct
                        // internal octave, so we must NOT add octaveDelta here - processedNote
                        // wrapping handles the C encoding, the octave is already right.
                        dmfOctave = octave - 5;
                    } else if (furNote === 180) {
                        dmfNote = 100; // note off
                        dmfOctave = 0;
                    } else if (furNote === 181 || furNote === 182) {
                        dmfNote = 100; // treat release as note off for HuTrack
                        dmfOctave = 0;
                    }
                    // furNote === -1 means no note -> dmfNote=0, dmfOctave=0

                    rawRows[row] = { note: dmfNote, octave: dmfOctave, instr: instr, volume: volume,
                        effects: effects.map(e => e.code | (e.val << 8)) };
                    row++;
                }
            }

            // ============= HuTrack Compression (identical to parseDMF) =============
            const newPattern = new HuTrackContainer.Pattern();
            const rawPattern = new HuTrackContainer.Pattern();
            newPattern.fxLen = numFX; rawPattern.fxLen = numFX;
            newPattern.rowLen = 3 + (numFX * 2) + 1;
            rawPattern.rowLen = newPattern.rowLen;

            let emptyRowCount = 0;
            for (let row = 0; row < rowsPerPattern; row++) {
                const rd = rawRows[row];
                const rowEntry = [];
                const rawRowEntry = [];

                // Note & Octave
                rowEntry.push(rd.note);
                rawRowEntry.push(rd.note);
                rowEntry.push(rd.octave);
                rawRowEntry.push(rd.octave);

                // Volume
                rowEntry.push(rd.volume);
                rawRowEntry.push(rd.volume);

                // Effects (pad to numFX)
                for (let fx = 0; fx < numFX; fx++) {
                    let fxCode = (fx < rd.effects.length) ? (rd.effects[fx] & 0xFF) : 0xffff;
                    let fxArg  = (fx < rd.effects.length) ? (rd.effects[fx] >> 8) : 0xffff;
                    // For empty effects, both code and arg must be 0xffff to match DMF behavior
                    if (fx >= rd.effects.length) {
                        fxCode = 0xffff; fxArg = 0xffff;
                    } else {
                        // Apply timeBase multiplication for speed effects (same as DMF parser)
                        if ((fxCode === 0x09 || fxCode === 0x0f) && fxArg !== 0xffff) fxArg *= timeBase;
                        if (fxCode === 0x08 && fxArg === 0xffff) fxArg = 0xff;
                    }
                    rowEntry.push(fxCode);
                    rawRowEntry.push(fxCode);
                    rawRowEntry.push(fxArg);
                    rowEntry.push(fxArg);
                }

                // Instrument (last element in rowEntry)
                rowEntry.push(rd.instr);
                rawRowEntry.splice(3, 0, rd.instr); // match DMF position in rawRowEntry

                // --- Compression Logic (exact match with parseDMF) ---
                const isRowEmpty = rowEntry[0] === 0 && rowEntry[1] === 0 && rowEntry.slice(2).every(val => val === 0xffff);
                if (isRowEmpty) {
                    emptyRowCount++;
                    if (emptyRowCount === 30) { newPattern.patternData.push([emptyRowCount + 224]); emptyRowCount = 0; }
                    else if (emptyRowCount > 0 && row + 1 >= rowsPerPattern) { newPattern.patternData.push([emptyRowCount + 224]); emptyRowCount = 0; }
                } else {
                    if (emptyRowCount > 0) { newPattern.patternData.push([emptyRowCount + 224]); emptyRowCount = 0; }

                    // Calculate mask
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

            // Deduplicate patterns
            let patternMatchIdx = -1;
            for (let i = 0; i < container.patternData[ch].length; i++) {
                if (newPattern.compare(container.patternData[ch][i])) { patternMatchIdx = i; break; }
            }
            if (patternMatchIdx === -1) {
                container.PatternMatrixCompressed[ch].push(uniquePatternCount);
                container.patternData[ch].push(newPattern);
                container.uncompPatternData[ch].push(rawPattern);
                uniquePatternCount++;
            } else {
                container.PatternMatrixCompressed[ch].push(patternMatchIdx);
            }
        }
    }

    log(`Parsed: ${instrumentsLen} instruments, ${wavetableLen} wavetables, ${samplesLen} samples, ${ordersLen} orders x ${rowsPerPattern} rows`);
    return container;
}