# pce-furnace-rom-builder
Tool to convert a Furnace PC Engine file into a ROM compiled with HuCC

Specifically, it generates a standalone project that you can then compile with HuCC in one go.
(HuCC install not included here, see below)

## Prerequisites

- Install pce-devel HuCC/HuC under `C:\PCEngine\huc` so the generated `Compile.bat` can find `C:\PCEngine\huc\bin\hucc.exe` and the standard includes. Repository: https://github.com/pce-devel/huc

## Notes

- HuTrack/HuCC generated project bank layout: see `docs/hucc_bank_layout.md`.
