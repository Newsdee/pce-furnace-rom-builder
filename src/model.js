// ============== DATA MODEL ==============
class HuTrackContainer {
    constructor(totalPatterns, totalInstruments, totalRows) {
        this.songName = '';
        this.authorName = '';
        this.timeBase = 0;
        this.tickTime1 = 0;
        this.tickTime2 = 0;
        this.frameMode = 1;
        this.customMode = 0;
        this.rowsPerPattern = totalRows;
        this.PatternMatrixLen = totalPatterns;
        this.PatternMatrix = [];
        this.PatternMatrixCompressed = [];
        this.instrumentsLen = totalInstruments;
        this.instrumentData = [];
        this.patternData = [];
        this.uncompPatternData = [];
        this.wavetableLen = 0;
        this.wavetableData = [];
        this.samples = [];
        this.samplesLen = 0;
    }

    static Instrument = class {
        constructor() {
            this.name = ''; this.mode = 0;
            this.volumeEnvLength = 0; this.volumeEnv = []; this.volumeEnvLoopPosition = -1;
            this.arpeggioEnvLength = 0; this.arpeggioEnv = []; this.arpeggioEnvLoopPosition = -1; this.arpeggioEnvMode = 0;
            this.noiseEnvLength = 0; this.noiseEnv = []; this.noiseEnvLoopPosition = -1;
            this.wavetableEnvLength = 0; this.wavetableEnv = []; this.wavetableEnvLoopPosition = -1;
        }
    }

    static Pattern = class {
        constructor() { this.fxLen = 0; this.rowLen = 0; this.patternData = []; }
        compare(other) {
            if (this.rowLen !== other.rowLen || this.fxLen !== other.fxLen) return false;
            if (this.patternData.length !== other.patternData.length) return false;
            for (let i = 0; i < this.patternData.length; i++) {
                if (JSON.stringify(this.patternData[i]) !== JSON.stringify(other.patternData[i])) return false;
            }
            return true;
        }
    }

    static Sample = class {
        constructor() {
            this.sampleSize = 0; this.sampleName = ''; this.sampleRate = 0;
            this.samplePitch = 0; this.sampleAmp = 0; this.sampleDepth = 0;
            this.sampleData = []; this.samplePCE = [];
        }
    }
}
