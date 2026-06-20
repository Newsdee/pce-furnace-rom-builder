// ============== MAIN UI & GLUE ==============
function log(msg) {
    const el = document.getElementById('log');
    if (typeof msg === 'string' && msg.indexOf('[OK]') === 0) {
        el.innerHTML += `<span class="text-green-400">> ${msg}</span><br>`;
    }
    else {
        el.innerHTML += `> ${msg}<br>`;
    }
    el.scrollTop = el.scrollHeight;
}

let trackerFile = null;
let pcmFile = null;
let pcmData = null;
let parsedDMF = null;        // Note: still called parsedDMF for compatibility with exporter
let currentDMFName = "";     // Store filename without extension

function getParseOptions() {
    const hqPcmResample = document.getElementById('hqPcmResample');
    return { highQualityPcmResample: !hqPcmResample || hqPcmResample.checked };
}

// ============== DRAG & DROP LOGIC ==============
function setupDrop(id, inputId, type) {
    const zone = document.getElementById(id);
    const input = document.getElementById(inputId);
    if (!zone || !input) return;
    zone.onclick = () => input.click();
    input.onchange = e => handleFile(e.target.files[0], type);
    zone.ondragover = e => { e.preventDefault(); zone.classList.add('dragover'); };
    zone.ondragleave = () => zone.classList.remove('dragover');
    zone.ondrop = e => { e.preventDefault(); zone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0], type); };
}

async function handleFile(file, type) {
    if (!file) return;
    log(`Loading ${file.name}...`);

    try {
        if (type === 'tracker') {
            trackerFile = file;
            currentDMFName = file.name.replace(/\.[^/.]+$/, ""); 

            const ext = file.name.toLowerCase().slice(-4);

            if (ext === '.fur') {
                parsedDMF = await parseFUR(file);
                document.getElementById('trackerStatus').innerHTML = 
                    `[OK] ${file.name} <span class="text-green-400">(Furnace .fur)</span>`;
                log('[OK] .fur file parsed successfully');
            } 
            else if (ext === '.dmf') {
                parsedDMF = await parseDMF(file, getParseOptions());
                document.getElementById('trackerStatus').innerHTML = 
                    `[OK] ${file.name} <span class="text-green-400">(DefleMask .dmf)</span>`;
                log('[OK] .dmf file parsed successfully');
            } 
            else {
                throw new Error("Unsupported file type. Only .dmf and .fur are allowed.");
            }
        } 
        else {
            pcmFile = file;
            await convertWAVtoPCE(file);
        }
    } catch (e) {
        log(`[ERR] ERROR: ${e.message}`);
        console.error(e);
        document.getElementById('trackerStatus').innerHTML = 
            `<span class="text-red-400">[ERR] ${e.message}</span>`;
    }
}

setupDrop('trackerDrop', 'trackerInput', 'tracker');
setupDrop('pcmDrop', 'pcmInput', 'pcm');

document.getElementById('hqPcmResample').onchange = () => {
    if (trackerFile) handleFile(trackerFile, 'tracker');
};

async function generateProject() {
    if (!parsedDMF) { 
        alert('Please drop a .dmf or .fur file first!'); 
        return; 
    }
    
    const fileNameOverride = currentDMFName;
    const zip = new JSZip();
    const finalName = fileNameOverride.replace(/[^a-z0-9]/gi, '_');
    const songDir = `Assets/Music/${finalName}`;
    const params = { includePath: `${songDir}/` };
    
    const exporter = new HuTrackExporter(parsedDMF, params);
    const files = exporter.generate(fileNameOverride);

    // 1. Pack the music assets into song subfolder
    for (const [filename, content] of Object.entries(files)) {
        zip.file(`${songDir}/${filename}`, content);
    }

    // 2. Pack debug state
    zip.file(`${songDir}/debug_state.json`, JSON.stringify(parsedDMF, null, 2));

    // 3. Pack HuTrack bank collision guard
    zip.file('Assets/Music/hutrack_bank_padding.inc', `; Keeps PCEAS proc relocation out of HuTrack SOUND_BANK.
; 4096 bytes is enough to avoid the parser collision without changing ROM size late.
hutrack_bank_padding_start:
  .ds 4096
hutrack_bank_padding_end:
`);

    // 4. Generate the C source 
    const mainC = `#include <stdio.h>
#include "HuSFX/HuC_interface/HuVGM_defs.h"
#include "huc.h"
#include "HuTrack/Huc_interface/HuTrack.c"
#include "HuSFX/Huc_interface/HucSFX.c"

#incasmlabel(hutrack_bank_padding, "Assets/Music/hutrack_bank_padding.inc", 2);
#incasmlabel(${finalName}, "${songDir}/${finalName}.song.inc", 2);

char title_buf[48];
char author_buf[48];

int main() {

\tset_screen_size(SCR_SIZE_32x32);
\tcls();
\tdisp_on();
\tHuTrack_Init();
    HuTrackEngine_QueueSong(${finalName});
    vsync(1);
    // Fetch metadata from the song header
    HuTrackEngine_getCurrSongTitle(title_buf);
    HuTrackEngine_getCurrSongAuthor(author_buf);

    // Display song info using VDC escape sequences
\tput_string("HuTrack Sound Test", 1, 2);

    printf("%s", 1, 5, title_buf);
\tprintf("%s", 1, 3, author_buf);

\tvsync(10);
\tHuTrackEngine_PlaySong(0);

    for(;;) {
    \tvsync();
    }
    return 0;
}`;
    zip.file('main.c', mainC);

    // 5. Generate the Compile.bat file
    const compileBat = `@echo off
set HUCC_HOME=C:\\PCEngine\\huc
set HUTRACK_HOME=C:\\PCEngine\\HuTrack

set PATH=%HUCC_HOME%\\bin;%PATH%
set PCE_INCLUDE=%HUTRACK_HOME%\\lib;%HUCC_HOME%\\include\\hucc;%CD%

@del HuTrack_${finalName}.pce 2>nul
@del HuTrack_${finalName}.sym 2>nul

hucc -s -v -v -msmall -fno-recursive main.c -gC
pceas -S -l 3 -o HuTrack_${finalName}.pce --raw --hucc main.s

pause
`;
    zip.file('Compile.bat', compileBat);

    // 6. HuCC config files (exact copies from working test project)
    zip.file('hucc-final-extra.asm', `; ***************************************************************************
; ***************************************************************************
;
; hucc-final-extra.asm
;
; hucc-final.asm includes this file at the end of every pass in HuCC or SDCC.
;
; Copyright John Brandwood 2024.
;
; Distributed under the Boost Software License, Version 1.0.
; (See accompanying file LICENSE_1_0.txt or copy at
;  http://www.boost.org/LICENSE_1_0.txt)
;
; ***************************************************************************
; ***************************************************************************
;
; This is used to select which assembly-language library files to include in
; a HuCC project, using labels defined in the compiler's header files.
;
; ***************************************************************************
; ***************************************************************************

\t\t.data
\t\tinclude\t"HuTrack/hutrack.inc"
\t\tinclude "HuTrack/HuTrack_vars.inc"
\t\tinclude "HuSFX/HuSFX_vars.inc"
\t\t.code
\t\tinclude "HuTrack/Huc_interface/HuTrackEngine.asm"
`);

    zip.file('hucc-config.inc', `; ***************************************************************************
; ***************************************************************************
;
; hucc-config.inc
;
; Configuration settings for the HuCC projects"CORE(not TM)" PC Engine library code.
;
; Copyright John Brandwood 2021-2024.
;
; Distributed under the Boost Software License, Version 1.0.
; (See accompanying file LICENSE_1_0.txt or copy at
;  http://www.boost.org/LICENSE_1_0.txt)
;
; ***************************************************************************
; ***************************************************************************
;
; The idea is that you, a PCE developer, copy this file from the ../include/
; directory and into your project's directory, and then customize the values
; to suit your particular project.
;
; Because PCEAS searches the current (i.e. project) directory for an include
; file first, then it will find your customized copy of the file rather than
; the original copy in the ../include/ directory.
;
; That means that all of the different overlay programs in your project will
; share the same overall library configuration for your game.
;
; ***************************************************************************
; ***************************************************************************

\t\t; Get the sound driver's configuration settings, this will
\t\t; be read from the current directory, if it exists, or the
\t\t; "../include/" directory if not.

\t\tinclude\t"hucc-sound.inc"

;
; Add optional debugging code?
;

\t.ifndef\tHUCC_DEBUG_SP
\t.ifdef\t_DEBUG\t\t; HuCC sets _DEBUG when called with "-g" flag.
HUCC_DEBUG_SP\t=\t1\t; (0 or 1)
\t.else
HUCC_DEBUG_SP\t=\t0\t; (0 or 1)
\t.endif
\t.endif

;
; Is the last track of the CD a duplicate of the main ISO data track?
;

\t.ifndef\tSUPPORT_2ISO
SUPPORT_2ISO\t=\t0\t; (0 or 1)
\t.endif

;
; Maximum number of directory entries to use from the ISO.
;

\t.ifndef\tMAX_DIRSIZE
MAX_DIRSIZE\t=\t64\t; (4..256)
\t.endif

;
; Use the System Card's PSG driver code instead of a modern alternative
; sound driver like a DefleMask or Furnace player?
;

\t.ifndef\tUSING_PSGDRIVER
USING_PSGDRIVER\t=\t0\t; (0 or 1)
\t.endif

;
; Support development for the Turbo EverDrive v2?
;

\t.ifndef\tSUPPORT_TED2
\t.ifdef\t_TED2\t\t; HuCC sets _TED2 when called with "-ted2" flag.
SUPPORT_TED2\t=\t1\t; (0 or 1)
\t.else
SUPPORT_TED2\t=\t0\t; (0 or 1)
\t.endif
\t.endif

;
; Support development for the SuperGrafx?
;

\t.ifndef\tSUPPORT_SGX
\t.ifdef\t_SGX\t\t; HuCC sets _SGX when called with "-sgx" flag.
SUPPORT_SGX\t=\t1\t; (0 or 1)
\t.else
SUPPORT_SGX\t=\t0\t; (0 or 1)
\t.endif
\t.endif

;
; Support development for the ArcadeCard?
;

\t.ifndef\tSUPPORT_ACD
\t.ifdef\t_ACD\t\t; HuCC sets _ACD when called with "-acd" flag.
SUPPORT_ACD\t=\t1\t; (0 or 1)
\t.else
SUPPORT_ACD\t=\t0\t; (0 or 1)
\t.endif
\t.endif

;
; Support development for the IFU's ADPCM hardware?
;

\t.ifndef\tSUPPORT_ADPCM
SUPPORT_ADPCM\t=\t0\t; (0 or 1)
\t.endif

;
; Select which version of the joystick library code to include.
;

\t.ifndef\tSUPPORT_6BUTTON
\t.ifndef\tSUPPORT_MOUSE
SUPPORT_2BUTTON\t=\t1\t; (0 or 1)
SUPPORT_6BUTTON\t=\t0\t; (0 or 1)
SUPPORT_MOUSE\t=\t0\t; (0 or 1)
\t.endif
\t.endif

;
; How many joypad/mouse devices should be supported?
;

\t.ifndef\tMAX_PADS
MAX_PADS\t=\t3\t; (1..5)
\t.endif

;
; Choose how much zero-page memory to allocate for the HuCC stack.
;

\t.ifndef HUCC_STACK_SZ
HUCC_STACK_SZ\t=\t96\t\t\t; (16 .. 128)
\t.endif

;
; Choose how many split-screen scrolling regions to allow (old HuC library).
;

\t.ifndef\tHUC_NUM_SCROLLS
HUC_NUM_SCROLLS\t=\t8\t\t\t; (4 .. 8)
\t.endif\tHUC_NUM_SCROLLS

;
; Choose how many split-screen scrolling regions to allow (new HuCC library).
;

\t.ifndef\tHUCC_VDC_SPLITS
HUCC_VDC_SPLITS =\t8\t\t\t; (4 .. 128)
\t.endif

\t.ifndef\tHUCC_SGX_SPLITS
HUCC_SGX_SPLITS =\t8\t\t\t; (4 .. 128)
\t.endif

;
; Support ZX0 decompression ring-buffer?
;

\t.ifndef ZX0_WINBUF
ZX0_WINBUF\t=\t($3800)\t\t\t; Default to a 2KB window in
ZX0_WINMSK\t=\t($0800 - 1)\t\t; RAM, located at $3800.
\t.endif

;
; Reserve banks for code overflow.
;

\t.ifndef\tHUC_RESERVE_BANKS
HUC_RESERVE_BANKS =\t8
\t.endif\tHUC_RESERVE_BANKS
`);

    zip.file('hucc-sound.inc', `; ***************************************************************************
; ***************************************************************************
;
; hucc-sound.inc
;
; Included by STARTUP.ASM to customize the sound driver.
;
; Copyright John Brandwood 2024.
;
; Distributed under the Boost Software License, Version 1.0.
; (See accompanying file LICENSE_1_0.txt or copy at
;  http://www.boost.org/LICENSE_1_0.txt)
;
; ***************************************************************************
; ***************************************************************************
;
; A customized sound driver for HuCard or CDROM usage can create a
; version of this file, and then have startup.asm use the new
; definitions just by including the new sound driver's path
; in the PCE_INCLUDE environment variable BEFORE the standard
; "include/hucc" path.
;
; ***************************************************************************
; ***************************************************************************



; ***************************************************************************
; ***************************************************************************
;
; Tell startup.asm that we need the SOUND_BANK and to include sound.asm

NEED_SOUND_BANK\t= 1



; ***************************************************************************
; ***************************************************************************
;
; The driver might wish to reserve some extra banks, or it can just let the
; actual project do it in hucc-config.inc

; RESERVE_BANKS\t= 0



; ***************************************************************************
; ***************************************************************************
;
; This macro is invoked in hucc.asm just after the RAM is cleared, and before
; interrupts are enabled.

;\t\t.data
;\t\tinclude\t"audio/tools/HuTrack/lib/HuTrack/hutrack.inc"
;\t\t.code

HUTRACK_BENCHMARK = 0

__sound_init\t.macro
\t\tstz\t<HuTrack.Status
\t\t; Stop parsing songs
\t\tsmb6\t<HuTrack.Status
\t\t; Stop parsing sfx
\t\tsmb5\t<HuTrack.Status
\t\t.endm
`);

    const blob = await zip.generateAsync({type: 'blob'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${finalName}_HuTrack_Project.zip`;
    a.click();

    log('[OK] FULL PROJECT GENERATED!');
}