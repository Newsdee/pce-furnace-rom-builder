// ============== DMF READER TOOL ==============
class DMFReader {
    constructor(data) { this.data = data; this.view = new DataView(data.buffer); this.index = 0; }
    getNextByte() { return this.data[this.index++]; }
    getNextWord() { const v = this.view.getUint16(this.index, true); this.index += 2; return v; }
    getNextDword() { const v = this.view.getUint32(this.index, true); this.index += 4; return v; }
    getNextIntDword() { const v = this.view.getInt32(this.index, true); this.index += 4; return v; }
    getNextByteFromDword() { return this.getNextDword() & 0xff; }
    readString(len) { let s = ""; for (let i = 0; i < len; i++) s += String.fromCharCode(this.getNextByte()); return s; }
}

// ============== FURNACE READER TOOL ==============
class FurnaceReader {
    constructor(data) {
        this.data = data;
        this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        this.index = 0;
    }
    getNextByte() { return this.data[this.index++]; }
    getNextWord() { const v = this.view.getUint16(this.index, true); this.index += 2; return v; }
    getNextDword() { const v = this.view.getUint32(this.index, true); this.index += 4; return v; }
    getNextIntDword() { const v = this.view.getInt32(this.index, true); this.index += 4; return v; }
    getNextByteFromDword() { return this.getNextDword() & 0xff; }
    getNextFloat() { const v = this.view.getFloat32(this.index, true); this.index += 4; return v; }
    skip(n) { this.index += n; }
    // Furnace zero-terminated UTF-8 string
    readSTR() {
        let s = "";
        while (this.index < this.data.length) {
            const b = this.data[this.index++];
            if (b === 0) break;
            s += String.fromCharCode(b);
        }
        return s;
    }
    // Read 4-char block ID
    readBlockID() {
        return String.fromCharCode(
            this.data[this.index++], this.data[this.index++],
            this.data[this.index++], this.data[this.index++]
        );
    }
}
