# the Furnace file format (.fur)

Source: https://github.com/tildearrow/furnace/blob/master/papers/format.md
Fetched: 2026-04-16

This document describes the file format used by Furnace for loading and saving songs.

# information

files may be zlib-compressed, but Furnace accepts uncompressed files as well.

all numbers are little-endian.

the following fields may be found in "size":
- `f` indicates a floating point number.
- `STR` is a UTF-8 zero-terminated string.
- `???` is an array of variable size.
- `S??` is an array of `STR`s.
- `1??` is an array of bytes.
- `2??` is an array of shorts.
- `4??` is an array of ints.

the format has changed several times across versions. a `(>=VER)` indicates this field is only present starting from format version `VER`, and `(<VER)` indicates this field is present only before version `VER`.

furthermore, an `or reserved` indicates this field is always present, but is reserved when the version condition is not met.

the `size of this block` fields represent the size of a block excluding the ID and the aforementioned field. these fields are 0 in format versions prior to 100 (0.6pre1).

# format versions

the format versions are:

- 228: Furnace 0.6.8.1
- 227: Furnace 0.6.8
- 226: Furnace 0.6.8pre2
- 225: Furnace 0.6.8pre1
- 219: Furnace 0.6.7
- 218: Furnace 0.6.6
- 214: Furnace 0.6.5
- 212: Furnace 0.6.4
- 201: Furnace 0.6.3
- 197: Furnace 0.6.2
- 192: Furnace 0.6.1
- 181: Furnace 0.6
- 180: Furnace 0.6pre18
- 179: Furnace 0.6pre17
- 178: Furnace 0.6pre16
- 177: Furnace 0.6pre15
- 175: Furnace 0.6pre14
- 174: Furnace 0.6pre13
- 173: Furnace 0.6pre12
- 172: Furnace 0.6pre11
- 171: Furnace 0.6pre10
- 169: Furnace 0.6pre9
- 166: Furnace 0.6pre8
- 162: Furnace 0.6pre7
- 161: Furnace 0.6pre6
- 158: Furnace 0.6pre5
- 146: Furnace Pro (joke version)
- 143: Furnace 0.6pre4
- 141: Furnace Tournament Edition (for intro tune contest)
- 133: Furnace 0.6pre3
- 132: Furnace 0.6pre2
- 116: Furnace 0.6pre1.5
- 100: Furnace 0.6pre1
- 75: Furnace dev75/April Fools' 0.6pre0
- 54: Furnace 0.5.8
- 53: Furnace 0.5.7
- 52: Furnace 0.5.7pre4
- 51: Furnace 0.5.7pre3
- 50: Furnace 0.5.7pre2
- 49: Furnace 0.5.7pre1
- 48: Furnace 0.5.6
- 47: Furnace 0.5.6pre1
- 46: Furnace 0.5.5
- 45: Furnace 0.5.5pre3
- 44: Furnace 0.5.5pre2
- 43: Furnace 0.5.5pre1
- 42: Furnace 0.5.4
- 41: Furnace 0.5.3
- 40: Furnace 0.5.2
- 39: Furnace 0.5.2pre3
- 38: Furnace 0.5.2pre2
- 37: Furnace 0.5.2pre1
- 36: Furnace 0.5.1
- 35: Furnace 0.5
- 27: Furnace 0.4.6
- 26: Furnace 0.4.6pre1
- 25: Furnace 0.4.5
- 24: Furnace 0.4.4
- 23: Furnace 0.4.3
- 22: Furnace 0.4.2
- 21: Furnace 0.4.1
- 20: Furnace 0.4
- 19: Furnace 0.4pre3
- 18: Furnace 0.4pre2
- 17: Furnace 0.4pre1
- 16: Furnace 0.3.1
- 15: Furnace 0.3
- 14: Furnace 0.2.2
- 13: Furnace 0.2.1
- 12: Furnace 0.2

versions that do not appear in this list are `dev???` ones.

# header

the header is 32 bytes long.

```
size | description
-----|------------------------------------
 16  | "-Furnace module-" format magic
  2  | format version
  2  | reserved
  4  | song info pointer
  8  | reserved
```

# song info (>=240)

```
size | description
-----|------------------------------------
  4  | "INF2" block ID
  4  | size of this block
 --- | **song information**
 STR | song name
 STR | song author
 STR | system name
 STR | album/category/game name
 STR | song name (Japanese)
 STR | song author (Japanese)
 STR | system name (Japanese)
 STR | album/category/game name (Japanese)
  4f | A-4 tuning
  1  | automatic system name
 --- | **system definition**
  4f | master volume, 1.0f=100%
  2  | total number of channels
  2  | number of chips
 --- | **chip definition (x numChips)**
  2  | chip ID
  2  | chip channel count
  4f | chip volume
  4f | chip panning
  4f | chip front/rear balance
 --- | **patchbay**
  4  | patchbay connection count
 4?? | patchbay connections (x numConnections)
     | - see the patchbay section for more details.
  1  | automatic patchbay
 --- | **song elements (repeated until element type is 0)**
  1  | element type
  4  | number of elements
 4?? | pointers to elements (x numElements)
```

## list of sound chips

this is a list of sound chips, and their nominal channel count.

- 0x00: invalid (end of chips in previous versions)
- 0x01: YMU759 - 17 channels
- 0x03: SN76489/Sega PSG - 4 channels
- 0x04: Game Boy - 4 channels
- **0x05: PC Engine - 6 channels**
- 0x06: NES - 5 channels
- 0x07: C64 (8580) - 3 channels
- 0x47: C64 (6581) - 3 channels
- 0x80: AY-3-8910 - 3 channels
- 0x81: Amiga - 4 channels
- 0x82: YM2151 - 8 channels
- 0x83: YM2612 - 6 channels
- 0x84: TIA - 2 channels
- 0x85: VIC-20 - 4 channels
- 0x86: PET - 1 channel
- 0x87: SNES - 8 channels
- 0x88: VRC6 - 3 channels
- 0x89: OPLL (YM2413) - 9 channels
- 0x8a: FDS - 1 channel
- 0x8b: MMC5 - 3 channels
- 0x8c: Namco 163 - 8 channels
- 0x8d: YM2203 - 6 channels
- 0x8e: YM2608 - 16 channels
- 0x8f: OPL (YM3526) - 9 channels
- 0x90: OPL2 (YM3812) - 9 channels
- 0x91: OPL3 (YMF262) - 18 channels
- 0x92: MultiPCM - 28 channels
- 0x93: Intel 8253 (beeper) - 1 channel
- 0x94: POKEY - 4 channels
- 0x95: RF5C68 - 8 channels
- 0x96: WonderSwan - 4 channels
- 0x97: Philips SAA1099 - 6 channels
- 0x98: OPZ (YM2414) - 8 channels
- 0x99: Pokemon Mini - 1 channel
- 0x9a: AY8930 - 3 channels
- 0x9b: SegaPCM - 16 channels
- 0x9c: Virtual Boy - 6 channels
- 0x9d: VRC7 - 6 channels
- 0x9e: YM2610B - 16 channels
- 0x9f: ZX Spectrum (beeper) - 6 channels
- 0xa0: YM2612 extended - 9 channels
- 0xa1: Konami SCC - 5 channels
- 0xa2: OPL drums (YM3526) - 11 channels
- 0xa3: OPL2 drums (YM3812) - 11 channels
- 0xa4: OPL3 drums (YMF262) - 20 channels
- 0xa5: Neo Geo (YM2610) - 14 channels
- 0xa6: Neo Geo extended (YM2610) - 17 channels
- 0xa7: OPLL drums (YM2413) - 11 channels
- 0xa8: Atari Lynx - 4 channels
- 0xaa: MSM6295 - 4 channels
- 0xab: MSM6258 - 1 channel
- 0xac: Commander X16 (VERA) - 17 channels
- 0xad: Bubble System WSG - 2 channels
- 0xae: OPL4 (YMF278B) - 42 channels
- 0xaf: OPL4 drums (YMF278B) - 44 channels
- 0xb0: Seta/Allumer X1-010 - 16 channels
- 0xb1: Ensoniq ES5506 - 32 channels
- 0xb2: Yamaha Y8950 - 10 channels
- 0xb3: Yamaha Y8950 drums - 12 channels
- 0xb4: Konami SCC+ - 5 channels
- 0xb5: tildearrow Sound Unit - 8 channels
- 0xb6: YM2203 extended - 9 channels
- 0xb7: YM2608 extended - 19 channels
- 0xb8: YMZ280B - 8 channels
- 0xb9: Namco WSG - 3 channels
- 0xba: Namco C15 - 8 channels
- 0xbb: Namco C30 - 8 channels
- 0xbc: MSM5232 - 8 channels
- 0xbd: YM2612 DualPCM extended - 11 channels
- 0xbe: YM2612 DualPCM - 7 channels
- 0xbf: T6W28 - 4 channels
- 0xc0: PCM DAC - 1 channel
- 0xc1: YM2612 CSM - 10 channels
- 0xc2: Neo Geo CSM (YM2610) - 18 channels
- 0xc3: YM2203 CSM - 10 channels
- 0xc4: YM2608 CSM - 20 channels
- 0xc5: YM2610B CSM - 20 channels
- 0xc6: K007232 - 2 channels
- 0xc7: GA20 - 4 channels
- 0xc8: SM8521 - 3 channels
- 0xc9: M114S - 16 channels (UNAVAILABLE)
- 0xca: ZX Spectrum (beeper, QuadTone engine) - 5 channels
- 0xcb: Casio PV-1000 - 3 channels
- 0xcc: K053260 - 4 channels
- 0xcd: TED - 2 channels
- 0xce: Namco C140 - 24 channels
- 0xcf: Namco C219 - 16 channels
- 0xd0: Namco C352 - 32 channels (UNAVAILABLE)
- 0xd1: ESFM - 18 channels
- 0xd2: Ensoniq ES5503 (hard pan) - 32 channels (UNAVAILABLE)
- 0xd4: PowerNoise - 4 channels
- 0xd5: Dave - 6 channels
- 0xd6: NDS - 16 channels
- 0xd7: Game Boy Advance (direct) - 2 channels
- 0xd8: Game Boy Advance (MinMod) - 16 channels
- 0xd9: Bifurcator - 4 channels
- 0xe0: QSound - 19 channels
- 0xf0: SID2 - 3 channels
- 0xf1: 5E01 - 5 channels
- 0xf5: SID3 - 7 channels
- 0xfc: Pong - 1 channel
- 0xfd: Dummy System - 8 channels
- 0xfe: reserved for development
- 0xff: reserved for development

### special IDs

Legacy chip/system IDs that must be flattened or converted. These will never be present in new song files (with INF2 header).

- 0x02: Genesis - 10 channels (compound!) -> 0x83 + 0x03
- 0x08: Arcade (YM2151+SegaPCM) - 13 channels (compound!) -> 0x82 + 0x9b
- 0x09: Neo Geo CD (YM2610) -> 0xa5
- 0x42: Genesis extended (compound!) -> 0xa0 + 0x03
- 0x43: SMS + OPLL (compound!) -> 0x03 + 0x89
- 0x46: NES + VRC7 (compound!) -> 0x06 + 0x9d
- 0x49: Neo Geo CD extended -> 0xa6
- 0xa9: SegaPCM (DefleMask compat) -> 0x9b

## song elements

the following element types are available:

```
 ## |  ID  | description
----|------|-----------------------------
 00 | ---- | end of element list (end of info header)
 01 | SNG2 | sub-song
 02 | FLAG | chip flags
 03 | ADIR | asset directory**
 04 | INS2 | instrument
 05 | WAVE | wavetable
 06 | SMP2 | sample
 07 | PATN | pattern
 08 | CFLG | compatibility flags*
 09 | CMNT | song comments*
 0a | GROV | groove pattern
```

* element is unique (number of elements shall be 1)
** first pointer is for instruments, second for wavetables and third for samples

# patchbay

a connection is represented as an unsigned int:
- bit 16-31: source port
- bit 0-15: destination port

a port format (hex): `xxxy`
- `xxx` (bit 4-15): portset
- `y` (bit 0-3): port in that portset

reserved input portsets:
- `000`: system outputs
- `FFF`: "null" portset

reserved output portsets:
- `000` through `chipCount`: chip outputs
- `FFC`: reference file/music player (>=238)
- `FFD`: wave/sample preview
- `FFE`: metronome
- `FFF`: "null" portset

# subsong (>=240)

```
size | description
-----|------------------------------------
  4  | "SNG2" block ID
  4  | size of this block
  4f | ticks per second
     | - 60 is NTSC
     | - 50 is PAL
  1  | initial arpeggio speed
  1  | effect speed divider
  2  | pattern length
     | - the limit is 256.
  2  | orders length
     | - the limit is 256.
  1  | highlight A (rows per beat)
  1  | highlight B (rows per bar)
  2  | virtual tempo numerator
  2  | virtual tempo denominator
  1  | length of speed pattern in entries (fail if <1 or >16)
 2?? | speed pattern (always 16 entries)
     | - each speed is an unsigned short
 STR | subsong name
 STR | subsong comment
 ??? | orders
     | - a table of bytes
     | - size=channels*ordLen
     | - **read orders then channels**
     | - the maximum value of a cell is FF.
 ??? | effect columns
     | - size=channels
 1?? | channel hide status
     | - size=channels
 1?? | channel collapse status
     | - size=channels
 S?? | channel names
     | - a list of channelCount C strings
 S?? | channel short names
     | - same as above
 4?? | channel colors
     | - read 4 values per color (ABGR)
     | - if 0, use default color
```

**CRITICAL**: Order table is ORDER-MAJOR. For each order index, read one byte per channel. NOT channel-major.

# groove pattern (>=240)

```
size | description
-----|------------------------------------
  4  | "GROV" block ID
  4  | size of this block
  1  | length of groove in entries (fail if <1 or >16)
 2?? | groove pattern (always 16 entries)
     | - each speed is an unsigned short
```

# chip flags

```
size | description
-----|------------------------------------
  4  | "FLAG" block ID
  4  | size of this block
 STR | data
```

flags are stored in text (`key=value`) format.

# asset directories (>=156)

```
size | description
-----|------------------------------------
  4  | "ADIR" block ID
  4  | size of this block
  4  | number of directories
 --- | **asset directory** (x numberOfDirs)
 STR | name (if empty, this is the uncategorized directory)
  2  | number of assets
 1?? | assets in this directory
```

# instrument (>=127)

Furnace dev127 and higher use the new instrument format.

```
size | description
-----|------------------------------------
  4  | "INS2" block ID
  4  | size of this block
  2  | format version
  2  | instrument type
 ??? | features...
```

see furnace_newIns.md for more information.

# wavetable

```
size | description
-----|------------------------------------
  4  | "WAVE" block ID
  4  | size of this block
 STR | wavetable name
  4  | wavetable width
  4  | reserved
  4  | wavetable height
 4?? | wavetable data
```

# sample (>=102)

```
size | description
-----|------------------------------------
  4  | "SMP2" block ID
  4  | size of this block
 STR | sample name
  4  | length
  4  | compatibility rate
  4  | C-4 rate
  1  | depth
     | - 0: ZX Spectrum overlay drum (1-bit)
     | - 1: 1-bit NES DPCM (1-bit)
     | - 3: YMZ ADPCM
     | - 4: QSound ADPCM
     | - 5: ADPCM-A
     | - 6: ADPCM-B
     | - 7: K05 ADPCM
     | - 8: 8-bit PCM
     | - 9: BRR (SNES)
     | - 10: VOX
     | - 11: 8-bit u-law PCM
     | - 12: C219 PCM
     | - 13: IMA ADPCM
     | - 14: 12-bit PCM (MultiPCM)
     | - 16: 16-bit PCM
  1  | loop direction (>=123) or reserved
     | - 0: forward
     | - 1: backward
     | - 2: ping-pong
  1  | flags (>=129) or reserved
     | - 0: BRR emphasis
  1  | flags 2 (>=159) or reserved
     | - 0: dither
     | - 1: no BRR filters (>=213)
  4  | loop start
     | - -1 means no loop
  4  | loop end
     | - -1 means no loop
 16  | sample presence bitfields
     | - for future use.
     | - indicates whether the sample should be present in the memory of a system.
     | - read 4 32-bit numbers (for 4 memory banks per system)
 ??? | sample data
     | - size is length
```

# pattern (>=157)

```
size | description
-----|------------------------------------
  4  | "PATN" block ID
  4  | size of this block
  1  | subsong
  1  | channel (<240)
  2  | channel (>=240)
     | - the channel index was 8-bit in previous versions.
     | - extended to 16-bit for higher channel counts.
  2  | pattern index
 STR | pattern name (>=51)
 ??? | pattern data
     | - read a byte per row.
     | - if it is 0xff, end of data. the rest of the pattern is empty.
     | - if bit 7 is set, then skip N+2 rows. N is bits 0-6.
     |   - $80 = skip 2 rows, $81 = skip 3, $82 = skip 4, etc.
     | - if bit 7 is clear, then:
     |   - bit 0: note present
     |   - bit 1: ins present
     |   - bit 2: volume present
     |   - bit 3: effect 0 code present
     |   - bit 4: effect 0 value present
     |   - bit 5: other effects (0-3) present [ext byte low]
     |   - bit 6: other effects (4-7) present [ext byte high]
     |   - if none of these bits are set, then skip 1 row.
     | - if bit 5 is set, read another byte:
     |   - bit 0: effect 1 code present
     |   - bit 1: effect 1 value present
     |   - bit 2: effect 2 code present
     |   - bit 3: effect 2 value present
     |   - bit 4: effect 3 code present
     |   - bit 5: effect 3 value present
     |   - bit 6: effect 4 code present
     |   - bit 7: effect 4 value present
     | - if bit 6 is set, read another byte:
     |   - bit 0: effect 5 code present
     |   - bit 1: effect 5 value present
     |   - bit 2: effect 6 code present
     |   - bit 3: effect 6 value present
     |   - bit 4: effect 7 code present
     |   - bit 5: effect 7 value present
     |   - bit 6: effect 8 code present
     |   - bit 7: effect 8 value present
     | - then read note, ins, volume, effects and effect values
     |   depending on what is present.
     | - for note:
     |   - 0 is C-(-5)
     |   - 179 is B-9
     |   - 180 is note off
     |   - 181 is note release
     |   - 182 is macro release
```

**CRITICAL PATTERN NOTES**:
- Note is a SINGLE BYTE (not 2 bytes like old format)
- Note 0 = C at octave -5. To get semitone: `note % 12`, octave: `Math.floor(note / 12) - 5`
- Effects in ext byte use PAIR numbering: bit0=code, bit1=value for each effect
- The main ctrl byte bits 3-4 are effect 0 code and value (NOT effects 0-3)
- ext low byte (bit5) covers effects 1-4 (NOT 0-3)
- ext high byte (bit6) covers effects 5-8 (NOT 4-7)

---

# old format blocks

These were present in previous versions of the Furnace file format (<240).

## old song info (<240)

Uses "INFO" block ID instead of "INF2". Contains all compatibility flags inline.

## old subsong (<240)

Uses "SONG" block ID instead of "SNG2".

## old instrument (<127)

Instruments in older versions used a different format. See oldIns.md.

## old sample (<102)

Uses "SMPL" block ID instead of "SMP2".

## old pattern (<157)

Uses "PATR" block ID instead of "PATN". Pattern data uses SHORT (2-byte) values per field instead of the compact bit-packed format.

```
     | - note (short):
     |   - 0: empty/invalid
     |   - 1: C#
     |   - 2: D ... 11: B
     |   - 12: C (of next octave) -- leftover of .dmf format
     |   - 100: note off
     |   - 101: note release
     |   - 102: macro release
     | - octave (short):
     |   - signed char stored in short (255 = octave -1)
     | - instrument (short): -1 = empty
     | - volume (short): -1 = empty
     | - effect and effect data (x effect columns): -1 = empty
```
