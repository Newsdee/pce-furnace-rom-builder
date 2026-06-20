; ***************************************************************************
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

		; Get the sound driver's configuration settings, this will
		; be read from the current directory, if it exists, or the
		; "../include/" directory if not.

		include	"hucc-sound.inc"

;
; Add optional debugging code?
;

	.ifndef	HUCC_DEBUG_SP
	.ifdef	_DEBUG		; HuCC sets _DEBUG when called with "-g" flag.
HUCC_DEBUG_SP	=	1	; (0 or 1)
	.else
HUCC_DEBUG_SP	=	0	; (0 or 1)
	.endif
	.endif

;
; Is the last track of the CD a duplicate of the main ISO data track?
;

	.ifndef	SUPPORT_2ISO
SUPPORT_2ISO	=	0	; (0 or 1)
	.endif

;
; Maximum number of directory entries to use from the ISO.
;

	.ifndef	MAX_DIRSIZE
MAX_DIRSIZE	=	64	; (4..256)
	.endif

;
; Use the System Card's PSG driver code instead of a modern alternative
; sound driver like a DefleMask or Furnace player?
;

	.ifndef	USING_PSGDRIVER
USING_PSGDRIVER	=	0	; (0 or 1)
	.endif

;
; Support development for the Turbo EverDrive v2?
;

	.ifndef	SUPPORT_TED2
	.ifdef	_TED2		; HuCC sets _TED2 when called with "-ted2" flag.
SUPPORT_TED2	=	1	; (0 or 1)
	.else
SUPPORT_TED2	=	0	; (0 or 1)
	.endif
	.endif

;
; Support development for the SuperGrafx?
;

	.ifndef	SUPPORT_SGX
	.ifdef	_SGX		; HuCC sets _SGX when called with "-sgx" flag.
SUPPORT_SGX	=	1	; (0 or 1)
	.else
SUPPORT_SGX	=	0	; (0 or 1)
	.endif
	.endif

;
; Support development for the ArcadeCard?
;

	.ifndef	SUPPORT_ACD
	.ifdef	_ACD		; HuCC sets _ACD when called with "-acd" flag.
SUPPORT_ACD	=	1	; (0 or 1)
	.else
SUPPORT_ACD	=	0	; (0 or 1)
	.endif
	.endif

;
; Support development for the IFU's ADPCM hardware?
;

	.ifndef	SUPPORT_ADPCM
SUPPORT_ADPCM	=	0	; (0 or 1)
	.endif

;
; Select which version of the joystick library code to include.
;

	.ifndef	SUPPORT_6BUTTON
	.ifndef	SUPPORT_MOUSE
SUPPORT_2BUTTON	=	1	; (0 or 1)
SUPPORT_6BUTTON	=	0	; (0 or 1)
SUPPORT_MOUSE	=	0	; (0 or 1)
	.endif
	.endif

;
; How many joypad/mouse devices should be supported?
;

	.ifndef	MAX_PADS
MAX_PADS	=	3	; (1..5)
	.endif

;
; Choose how much zero-page memory to allocate for the HuCC stack.
;

	.ifndef HUCC_STACK_SZ
HUCC_STACK_SZ	=	96			; (16 .. 128)
	.endif

;
; Choose how many split-screen scrolling regions to allow (old HuC library).
;

	.ifndef	HUC_NUM_SCROLLS
HUC_NUM_SCROLLS	=	8			; (4 .. 8)
	.endif	HUC_NUM_SCROLLS

;
; Choose how many split-screen scrolling regions to allow (new HuCC library).
;

	.ifndef	HUCC_VDC_SPLITS
HUCC_VDC_SPLITS =	8			; (4 .. 128)
	.endif

	.ifndef	HUCC_SGX_SPLITS
HUCC_SGX_SPLITS =	8			; (4 .. 128)
	.endif

;
; Support ZX0 decompression ring-buffer?
;

	.ifndef ZX0_WINBUF
ZX0_WINBUF	=	($3800)			; Default to a 2KB window in
ZX0_WINMSK	=	($0800 - 1)		; RAM, located at $3800.
	.endif

;
; Reserve banks for code overflow.
;

	.ifndef	HUC_RESERVE_BANKS
HUC_RESERVE_BANKS =	8
	.endif	HUC_RESERVE_BANKS
