# Technical Specification: DefleMask (.dmf) to HuTrack (PCE) Conversion

This document serves as a comprehensive implementation guide for porting the DefleMask to HuTrack conversion pipeline. The goal is to ensure bit-perfect consistency across different language implementations.

## 1. Input & Initial Processing

### 1A. DefleMask Legacy (`.dmf`)
*   **Decompression**: The file is typically compressed using **Zlib**. The first step must be a full decompression to a raw byte array.
*   **Header Validation**:
    *   **Magic String**: Must start with `.DelekDefleMask.` (16 bytes).
    *   **Version**: Target version is `0x18`.
    *   **System**: Must be `0x05` (PC Engine).
*   **Metadata**: Extract Song Name and Author (length-prefixed strings).

### 1B. Furnace Tracker (`.fur`)
*   **Decompression**: The **entire file** may be zlib-compressed (bytes start with `0x78 0x9C`). Must attempt decompression first, then check magic. The magic string is inside the compressed payload, not at the file start.
*   **Header Validation**:
    *   **Magic String**: `-Furnace module-` (16 bytes, after decompression).
    *   **Format Version**: 2 bytes LE after magic. Supported range: ≥157.
    *   **Chip validation**: Inside INFO block, chip ID `0x47` = PC Engine.
*   **Block-based architecture**: After the 20-byte header, the file is a sequence of blocks. Each block has a 4-byte ASCII ID and a 4-byte LE size. Blocks may appear in any order.
*   **Two format eras**:
    *   **Version ≥240 (new)**: Uses `INF2` + `SNG2` blocks for song structure.
    *   **Version <240 (old/legacy)**: Uses a single monolithic `INFO` block containing all song metadata, compat flags, order table, effect columns, and speed pattern inline.

## 2. The Instrument Model
Instruments are parsed sequentially. Each instrument consists of:
1.  **Name & Mode**: Length-prefixed name and a mode byte (only Mode 0 is supported).
2.  **Volume Envelope**: `[Length] -> [Data (Bytes)] -> [Loop Position]`.
3.  **Arpeggio Envelope**: `[Length] -> [Data (Signed Dwords)] -> [Loop Position] -> [Mode]`.
    *   **Critical Quirk**: In normal mode (mode=0), arpeggio values are offset by 12. The converted value is `(signed_int - 12) & 0xff`. In fixed/absolute mode (mode=1), values are used directly: `value & 0xff`.
4.  **Noise Envelope**: `[Length] -> [Data (Bytes)] -> [Loop Position]`.
5.  **Waveform Envelope**: `[Length] -> [Data (Bytes)] -> [Loop Position]`.

### 2.1 Furnace Instrument Parsing (INS2 Block)
Furnace instruments use a feature-code architecture inside each INS2 block:
*   Block starts with instrument type byte (must be `5` = PC Engine) and feature sub-blocks.
*   **MA (Macro) feature**: Contains all envelope data.
    *   Starts with a 2-byte **header length** prefix (bytes per macro header, typically 8).
    *   Then repeating macro entries until code=255 (stop sentinel).
    *   Each macro: `[code:1] [len:1] [loop:1] [release:1] [mode:1] [otw:1] [delay:1] [speed:1]`
    *   `otw` encodes wordSize (bits 7-6), macroType (bits 2-1): wordSize 0=u8, 1=s8, 2=s16, 3=s32.
    *   Macro codes: 0=Volume, 1=Arpeggio, 2=Duty, 3=Wave, 4=Pitch, 5=ex1(Noise).
*   **Arpeggio mode detection**: Furnace encodes fixed/absolute mode via **bit 30 (0x40000000)** in each arpeggio data value, NOT in the header `macroMode` field. Detect with: `hasFixed = data.some(v => (v & 0x40000000) !== 0)`. Strip bit 30 from values before conversion. Also accept `macroMode === 1` from the header. Default `arpeggioEnvMode = 1` for instruments with no arp macro (matches Furnace's DMF export convention).
*   **Envelope size cap**: Furnace DMF export caps all envelopes at 127 entries. Apply `Math.min(macroLen, 127)` and adjust loop position accordingly.
*   **Loop=255 preservation**: A loop value of 255 means "no loop". When clipping envelope length, do NOT convert 255 to `clippedLen - 1` — preserve it as 255.

## 3. The Pattern Engine (The "Squeeze")
This is the most complex part of the pipeline. It transforms raw tracker data into a memory-optimized format.

### 3.1 Note & Octave Correction
Before processing, notes must be normalized:
*   If $0 < \text{note} < 13$, then $\text{note} = \text{note} + 1$.
*   If the resulting $\text{note} = 13$, then $\text{note} = 1$ and $\text{octave} = \text{octave} + 1$.

### 3.2 Empty Row Optimization
To save ROM, sequences of empty rows (where note, octave, and all FX are null/default) are collapsed:
*   If 30 or more consecutive rows are empty: Store a single byte `(count + 224)`.
*   If the pattern ends with empty rows: Store a single byte `(count + 224)`.

### 3.3 Bit-Mask Compression
Each non-empty row is compressed into a mask-based format. A mask byte is generated where bits indicate the presence of data:
*   **Bit 0**: Note/Octave present.
*   **Bit 2**: Instrument present.
*   **Bit 3**: Volume present.
*   **Bit 4**: FX 1 present.
*   **Bit 5**: FX 2 present.
*   **Bit 6**: Any subsequent FX present.

**Note Compression**: If only the note is present (Mask = 1), the note and octave are packed into a single byte: `(note - 1) + (octave * 12)`. If it is a "Note Cut," the value is `224`.

### 3.4 Pattern Deduplication
To minimize the `.patternData` file:
1.  Generate the compressed version of a pattern.
2.  Compare it against a list of already processed unique patterns for that channel.
3.  If a match is found, store the **index** of the existing pattern in the `PatternMatrix`.
4.  If no match is found, add it to the unique list and store the new index.

## 4. PCM Sample Processing
Samples are converted from high-fidelity raw data to the PC Engine's specific constraints.
*   **Normalization**: All input samples must be promoted to 16-bit signed integers.
*   **5-Bit Conversion**: The HuTrack engine uses a specific 5-bit unsigned format.
    *   **Formula**: `(signed_sample + 32767) >> 11`
*   **Metadata**: Store sample size, name, rate, pitch, and amplitude.

## 5. HuTrack Assembly Specification (The "Quirks")
The output must be a set of `.inc` files. Consistency in formatting is mandatory for readability and tool-chain compatibility.

### 5.1 Formatting Rules
*   **Hexadecimal**: Use lowercase, no leading zeros, and a `$` prefix (e.g., `$3d`, not `$0x3D` or `$0D`).
*   **Linearity**: All data for a single row or envelope must be on **one single line**. Do not wrap lines.
*   **Separators**: Use the following comment blocks to delineate sections:
    *   `sepLong`: `;###########################################################################`
    *   `sepMid`: `;........................................................................`
    *   `sepShort`: `;......................................`

### 5.2 File Structure & Requirements
*   **Header**: Must include the `.song.tables` and `.song.tables.bank` pointers.
*   **Bank Instructions**: The `.patternData.inc` file **must** contain bank declarations for each channel:
    `.db bank(.pattern.table.chan0)` ... through `chan5`.
*   **Spacing**:
    *   Add one blank line after a pattern name (e.g., `.pattern.table.chan0.pattern0`).
    *   Add two blank lines after a pattern ends before the next block.
    *   Place a newline before every `sepLong` block.
    *   Do **not** place newlines between `sepMid` lines when they appear together.

### 5.3 Project Hierarchy
The final output should be structured as:
*   `/main.c` (Root)
*   `/Assets/Music/` (All `.inc` files)

## 6. Furnace-Specific Parsing Details

### 6.1 Old INFO Block (version <240) — Compat Flag Minefield
The old INFO block packs ~30 version-conditional fields inline. Each field is skipped or read depending on the format version at time of save. Key hazards:
*   Compat flags from v36 through v200 must be read/skipped in exact version order.
*   The order table immediately follows the compat flags — any miscount desynchronizes all subsequent reads.
*   Order table is **CHANNEL-MAJOR**: all orders for ch0, then ch1, etc.
*   Speed pattern entries are 1 byte each for version ≥139, versus 2-byte shorts in SNG2 (≥240).
*   PATN channel index is 1 byte (<240) vs 2 bytes LE (≥240).

### 6.2 Furnace Note Encoding
Furnace stores a **single byte** per note (0-179, 180=off, 181/182=release):
```
semitone = furNote % 12        // 0=C, 1=C#, ..., 11=B
octave   = floor(furNote / 12) // internal 0-based; display = internal - 5
dmfRaw   = (semitone === 0) ? 12 : semitone
processedNote = dmfRaw + 1
if processedNote === 13: processedNote = 1, octaveDelta = 1
dmfOctave = octave - 5         // DO NOT add octaveDelta
```
**Critical**: Unlike DMF (which stores C with `raw_octave = display-1` and relies on the parser's octaveDelta to fix it), Furnace stores C at the correct internal octave. Adding octaveDelta double-counts the C-note octave bump. The `processedNote = 1` wrapping alone handles C encoding in the compressed note formula.

### 6.3 Furnace Block Parsing Order
Blocks may appear in any order in the file. Collect all block offsets in a first pass, then process semantically:
1.  **INFO** or **INF2**: Song metadata, timing, chip validation.
2.  **SNG2** (≥240 only): Rows, orders, effect columns, speed pattern.
3.  **INS2**: Instruments (may have multiple blocks, one per instrument via ADIR index).
4.  **WAVE**: Wavetables.
5.  **PATN**: Pattern data (may appear many times, one per pattern per channel).

## 7. Binary Reader Classes

**DMFReader (reader.js)** - Used for .dmf files:
*   `getNextByte()`, `getNextWord()`, `getNextDword()`, `getNextIntDword()`
*   `getNextByteFromDword()`: Read dword, return low byte.
*   `readString(len)`: Fixed-length ASCII string.

**FurnaceReader (reader.js)** - Extends DMFReader for .fur files:
*   `getNextFloat()`: Little-endian IEEE 754 float.
*   `readSTR()`: Furnace short-string (2-byte LE length prefix + data).
*   `readBlockID()`: Read 4 ASCII bytes as block ID.
*   `skip(n)`: Advance index by n bytes.

## 8. Testing & Validation

### Environment Setup
Node.js v18.15.0 (bundled with VS2022): `env.bat` sets `NODE_EXE` path.
```batch
cmd /V /C "call env.bat && cd /d <dir> && ""!NODE_EXE!"" test_cli.js <input>"
```

### CLI Test Harness (test_cli.js)
Detects file extension: `.dmf` → `parseDMF()`, `.fur` → `parseFUR()`.
Output directory: `./new/`

### Diff Tool (diff_inc.js)
Compares generated .inc files against reference output:
```batch
node diff_inc.js [refDir] [genDir] [refPrefix] [genPrefix]
```
Defaults: `test_dmfs/py_exporter/` vs `new/`. Ignores CRLF. Shows first 10 diff lines per file.

### Verified Test Case
**ScapeStage1.fur** (format v232, old INFO block): 16 instruments, 12 wavetables, 0 samples, 7 orders × 64 rows. All 9 data files match Python reference output (ignoring cosmetic blank-line spacing in instrData).

## 9. Known Issues & TODOs
1.  Sample data handling incomplete (samplesLen always 0 in current output).
2.  **JS exporter blank-line formatting**: Different blank-line spacing between envelope sections vs Python exporter. All non-blank content matches. Cosmetic only.
3.  Furnace format ≥240 (INF2+SNG2 path) not yet tested with a real file — only the old INFO path (v232) is verified.