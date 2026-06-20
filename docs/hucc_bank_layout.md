# HuCC Bank Layout Notes

## HuTrack SOUND_BANK collision guard

HuTrack projects reserve bank 1 as `SOUND_BANK`. The HuTrack engine and parser live there, so generated game code must not be relocated into that bank.

PCEAS may relocate `.proc` blocks into any free ROM bank when the current bank is full. In small generated ROM projects, that can put `core_main`, `read_joypads`, or other procedures into bank 1. When this happens, HuTrack's parser can fail during assembly even though HuCC reports no C errors.

Observed failure:

```text
HuTrack_parser.asm
HuTrackEngine.Parser:
  Error: Symbol's bank or address changed in final pass!
  Error: Undefined symbol in operand field!
  Error: Branch label mismatch!
  Error: Branch address out of range!
```

The generated rom-builder project avoids this by placing a 4096-byte data padding include before the real song include:

```c
#incasmlabel(hutrack_bank_padding, "Assets/Music/hutrack_bank_padding.inc", 2);
#incasmlabel(song_name, "Assets/Music/song_name/song_name.song.inc", 2);
```

With this include file:

```asm
; Keeps PCEAS proc relocation out of HuTrack SOUND_BANK.
; 4096 bytes is enough to avoid the parser collision without changing ROM size late.
hutrack_bank_padding_start:
  .ds 4096
hutrack_bank_padding_end:
```

This was verified against `examples/fun_fact/output`: the failing project compiles after the padding is added, and the segment usage keeps bank 1 pure HuTrack.

Do not use `.ds 8192` for this guard. A full bank of padding fixed the collision but caused PCEAS to fail later with `Cannot change ROM size in LAST_PASS`. The tested value is `.ds 4096`.

Keep `HUC_RESERVE_BANKS = 8` in `hucc-config.inc` and place music `#incasmlabel` directives before graphics/data asset directives.