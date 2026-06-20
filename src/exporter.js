// ============== THE EXPORTER ==============
class HuTrackExporter {
    constructor(container, params) {
        this.c = container;
        this.p = params;
    }

    // Format a byte as $hex (no leading zero, lowercase)
    hex(v) {
        return '$' + (v & 0xff).toString(16);
    }

    // Single-line comma-separated .db (decimal)
    fmtDB_Verbose(arr) {
        if (!arr || arr.length === 0) return "";
        return `  .db ${arr.join(', ')}\n`;
    }

    // Single-line comma-separated .db (hex)
    fmtDB_VerboseHex(arr) {
        if (!arr || arr.length === 0) return "";
        return `  .db ${arr.map(v => this.hex(v)).join(', ')}\n`;
    }

    // Chunked 4-per-line .db (decimal)
    fmtDB_Chunked(arr) {
        if (!arr || arr.length === 0) return "";
        let out = "";
        for (let i = 0; i < arr.length; i += 4) {
            let chunk = arr.slice(i, i + 4);
            out += `  .db ${chunk.join(', ')}\n`;
        }
        return out;
    }

    generate(overrideName = null) {
        const files = {};
        const name = (overrideName || this.c.songName).replace(/[^a-z0-9]/gi, '_');
        
        const sepLong = ";###########################################################################\n";
        const sepMid = ";........................................................................\n";
        const sepShort = ";........................\n"; 
        const sepVerbose = ";.....................................................\n";
        const sepShorter = ";.........................\n";

        // =====================================================================
        // 1. Header
        // =====================================================================
        let header = "\n\n\n"; 
        header += `.song\n  .dw .song.tables\n  .dw .song.tables.bank\n`;
        header += `.songname\n  .db "${this.c.songName}",0\n`;
        header += `.author\n  .db "${this.c.authorName}",0\n\n\n`; 
        header += `.song.tables\n  .dw .attributes\n  .dw .patternList.table\n  .dw .instrument.table\n  .dw .waveform.table\n  .dw .pattern.table\n  .dw .samples.table\n\n`;
        header += `.song.tables.bank\n  .db bank(.attributes)\n  .db bank(.patternList.table)\n  .db bank(.instrument.table)\n  .db bank(.waveform.table)\n  .db bank(.pattern.table)\n  .db bank(.samples.table)\n\n\n`;
        header += `.attributes\n\n`;
        header += ` ;NOTE: time base =  ${this.c.timeBase}\n`;
        header += ` ;NOTE: frame mode =  ${this.c.frameMode}\n`;
        header += ` ;NOTE: custom mode =  ${this.c.customMode}\n\n`;
        header += `.attributes.tick1\n  .db ${this.c.tickTime1}\n`;
        header += `.attributes.tick2\n  .db ${this.c.tickTime2}\n`;
        header += `.attributes.rowLength\n  .db ${this.c.rowsPerPattern}\n`;
        header += `.attributes.patternListLen\n  .db ${this.c.PatternMatrixLen}\n`;
        header += `.attributes.instrumentLen\n  .db ${this.c.instrumentsLen}\n`;
        header += `.attributes.waveformsLen\n  .db ${this.c.wavetableLen}\n`;
        header += `.attributes.samplesLen\n  .db ${this.c.samplesLen}\n`;
        header += `\n\n`;
        files[`${name}.header.inc`] = header;

        // =====================================================================
        // 2A. Instrument Matrix
        // =====================================================================
        let iMatrix = `\n\n${sepLong}.instrument.table\n`;
        for (let i = 0; i < this.c.instrumentsLen; i++) iMatrix += `  .dw .instrument.${i}\n`;
        iMatrix += `\n`;
        files[`${name}.instrMatrix.inc`] = iMatrix;

        // =====================================================================
        // 2B. Instrument Data
        // =====================================================================
        let iData = "\n";
        for (let i = 0; i < this.c.instrumentsLen; i++) {
            const inst = this.c.instrumentData[i];
            iData += `\n${sepLong}.instrument.${i}\n`;
            iData += `; name ${inst.name}\n`;
            iData += `; mode ${inst.mode}\n\n`;
            iData += `.instrument.${i}.table\n  .dw .instrument.${i}.volEnv\n  .dw .instrument.${i}.arpEnv\n  .dw .instrument.${i}.waveFormEnv\n\n`;
            
            // Volume envelope
            iData += `${sepShort}.instrument.${i}.volEnv\n\n`;
            iData += `.instrument.${i}.volEnv.size\n  .db ${inst.volumeEnvLength}\n`;
            iData += `.instrument.${i}.volEnv.loop\n  .db ${inst.volumeEnvLoopPosition}\n`;
            iData += `.instrument.${i}.volEnv.data\n`;
            iData += this.fmtDB_Chunked(inst.volumeEnv);
            // Blank lines before next sep: 3 if empty or full last chunk (len%4==0), else 2
            if (inst.volumeEnv.length === 0 || inst.volumeEnv.length % 4 === 0) iData += `\n\n\n`;
            else iData += `\n\n`;
            
            // Arpeggio envelope
            iData += `${sepShort}.instrument.${i}.arpEnv\n\n`;
            iData += `.instrument.${i}.arpEnv.mode\n  .db ${inst.arpeggioEnvMode}\n`;
            iData += `.instrument.${i}.arpEnv.size\n  .db ${inst.arpeggioEnvLength}\n`;
            iData += `.instrument.${i}.arpEnv.loop\n  .db ${inst.arpeggioEnvLoopPosition}\n`;
            iData += `.instrument.${i}.arpEnv.data\n`;
            iData += this.fmtDB_Chunked(inst.arpeggioEnv);
            if (inst.arpeggioEnv.length === 0 || inst.arpeggioEnv.length % 4 === 0) iData += `\n\n\n`;
            else iData += `\n\n`;
            
            // Waveform envelope
            iData += `${sepShort}.instrument.${i}.waveFormEnv\n\n`;
            iData += `.instrument.${i}.waveFormEnv.size\n  .db ${inst.wavetableEnvLength}\n`;
            iData += `.instrument.${i}.waveFormEnv.loop\n  .db ${inst.wavetableEnvLoopPosition}\n`;
            iData += `.instrument.${i}.waveFormEnv.data\n`;
            iData += this.fmtDB_Chunked(inst.wavetableEnv);
            // Waveform is last envelope; always \n\n (the loop's \n handles spacing to next instrument)
            iData += `\n\n`;
        }
        iData += `\n`;
        files[`${name}.instrData.inc`] = iData;

        // =====================================================================
        // 3A. Pattern Matrix
        // =====================================================================
        let pMatrix = `\n\n${sepLong}.patternList.table\n`;
        for (let ch = 0; ch < 6; ch++) pMatrix += `  .dw .patternList.chan${ch}\n`;
        pMatrix += `\n`;
        for (let ch = 0; ch < 6; ch++) {
            pMatrix += `.patternList.chan${ch}\n`;
            // One value per line
            for (const val of this.c.PatternMatrixCompressed[ch]) {
                pMatrix += `  .db ${val}\n`;
            }
        }
        pMatrix += `\n\n`;
        files[`${name}.patternMatrix.inc`] = pMatrix;

        // =====================================================================
        // 3B. Pattern Data
        // =====================================================================
        let pData = `\n\n${sepLong}.pattern.table\n`;
        for (let ch = 0; ch < 6; ch++) pData += `  .dw .pattern.table.chan${ch}\n`;
        pData += `\n\n`;
        for (let ch = 0; ch < 6; ch++) {
            pData += `  .db bank(.pattern.table.chan${ch})\n`;
        }
        pData += `\n`;

        // Channel pointer tables (each channel lists its unique patterns)
        for (let ch = 0; ch < 6; ch++) {
            pData += `\n${sepVerbose}.pattern.table.chan${ch}\n`;
            const uniquePatterns = [...new Set(this.c.PatternMatrixCompressed[ch])];
            for (const pIdx of uniquePatterns) {
                pData += `  .dw .pattern.table.chan${ch}.pattern${pIdx}\n`;
            }
            pData += `\n\n${sepLong}\n`;
        }

        // Actual pattern data per channel
        for (let ch = 0; ch < 6; ch++) {
            pData += `\n${sepMid}${sepMid}\n`;
            const uniquePatterns = [...new Set(this.c.PatternMatrixCompressed[ch])];
            for (let j = 0; j < uniquePatterns.length; j++) {
                const pIdx = uniquePatterns[j];
                pData += `;......................................\n`;
                pData += `.pattern.table.chan${ch}.pattern${pIdx}\n\n`;
                for (let row of this.c.patternData[ch][pIdx].patternData) {
                    pData += `  .db ${row.map(v => this.hex(v)).join(', ')}\n`;
                }
                // Last pattern of each channel: 1 trailing newline (channel boundary adds the extra)
                // Other patterns: 2 trailing newlines (= 2 blank lines before next pattern sep)
                pData += (j === uniquePatterns.length - 1) ? `\n` : `\n\n`;
            }
        }
        pData += `\n\n\n`;
        files[`${name}.patternData.inc`] = pData;

        // =====================================================================
        // 4A. Waveform Matrix
        // =====================================================================
        let wMatrix = `\n\n${sepLong}.waveform.table\n\n`;
        for (let i = 0; i < this.c.wavetableLen; i++) wMatrix += `  .dw .waveform.${i}\n`;
        wMatrix += `\n\n`;
        files[`${name}.wfMatrix.inc`] = wMatrix;

        // =====================================================================
        // 4B. Waveform Data
        // =====================================================================
        let wData = `\n\n${sepLong}`;
        for (let i = 0; i < this.c.wavetableLen; i++) {
            wData += `${sepVerbose}.waveform.${i}\n`;
            wData += this.fmtDB_Chunked(this.c.wavetableData[i]);
            wData += `\n\n`;
        }
        wData += `\n\n`;
        files[`${name}.wfData.inc`] = wData;

        // =====================================================================
        // 5A. PCM Sample Matrix
        // =====================================================================
        let sMatrix = `\n\n${sepLong}\n.samples.table\n\n`;
        sMatrix += `  ; offset to sample bank table.\n`;
        sMatrix += `  .dw $0\n\n`;
        if (this.c.samplesLen === 0) {
            sMatrix += `${sepShorter}\n\n`;
            sMatrix += `${sepShorter}\n\n\n`;
        } else {
            for (let i = 0; i < this.c.samplesLen; i++) sMatrix += `  .dw .sample${i}\n`;
            for (let i = 0; i < this.c.samplesLen; i++) sMatrix += `  .db bank(.sample${i})\n`;
        }
        files[`${name}.pcmMatrix.inc`] = sMatrix;

        // =====================================================================
        // 5B. PCM Sample Data
        // =====================================================================
        let sData = "";
        if (this.c.samplesLen === 0) {
            sData = `\n\n${sepLong}\n\n\n`;
        } else {
            for (let i = 0; i < this.c.samplesLen; i++) {
                const s = this.c.samples[i];
                if (i > 0) sData += `  .bank (bank(.sample${i-1}.end))\n  .org $4000 + (* & $1fff)\n`;
                sData += `\n${sepLong}.sample${i}\n  .dw ${s.samplePCE.length}\n`;
                sData += this.fmtDB_Verbose(s.samplePCE);
                sData += `\n  .db $80\n.sample${i}.end\n\n`;
            }
        }
        files[`${name}.pcmData.inc`] = sData;

        // =====================================================================
        // 6. Master Include File (song.inc)
        // =====================================================================
        const incPath = this.p.includePath || "";
        let master = `  .include "${incPath}${name}.header.inc"\n`;
        master += `  .include "${incPath}${name}.instrMatrix.inc"\n`;
        master += `  .include "${incPath}${name}.instrData.inc"\n`;
        master += `  .include "${incPath}${name}.patternMatrix.inc"\n`;
        master += `  .include "${incPath}${name}.patternData.inc"\n`;
        master += `  .include "${incPath}${name}.wfMatrix.inc"\n`;
        master += `  .include "${incPath}${name}.wfData.inc"\n`;
        master += `  .include "${incPath}${name}.pcmMatrix.inc"\n`;
        master += `  .include "${incPath}${name}.pcmData.inc"\n`;
        files[`${name}.song.inc`] = master;

        return files;
    }
}
