

;###########################################################################
.instrument.0
; name Arpeggio Lead
; mode 0

.instrument.0.table
  .dw .instrument.0.volEnv
  .dw .instrument.0.arpEnv
  .dw .instrument.0.waveFormEnv

;........................
.instrument.0.volEnv

.instrument.0.volEnv.size
  .db 1
.instrument.0.volEnv.loop
  .db 255
.instrument.0.volEnv.data
  .db 31


;........................
.instrument.0.arpEnv

.instrument.0.arpEnv.mode
  .db 1
.instrument.0.arpEnv.size
  .db 0
.instrument.0.arpEnv.loop
  .db 255
.instrument.0.arpEnv.data



;........................
.instrument.0.waveFormEnv

.instrument.0.waveFormEnv.size
  .db 1
.instrument.0.waveFormEnv.loop
  .db 255
.instrument.0.waveFormEnv.data
  .db 6



;###########################################################################
.instrument.1
; name Arp 1
; mode 0

.instrument.1.table
  .dw .instrument.1.volEnv
  .dw .instrument.1.arpEnv
  .dw .instrument.1.waveFormEnv

;........................
.instrument.1.volEnv

.instrument.1.volEnv.size
  .db 0
.instrument.1.volEnv.loop
  .db 255
.instrument.1.volEnv.data



;........................
.instrument.1.arpEnv

.instrument.1.arpEnv.mode
  .db 1
.instrument.1.arpEnv.size
  .db 0
.instrument.1.arpEnv.loop
  .db 255
.instrument.1.arpEnv.data



;........................
.instrument.1.waveFormEnv

.instrument.1.waveFormEnv.size
  .db 1
.instrument.1.waveFormEnv.loop
  .db 255
.instrument.1.waveFormEnv.data
  .db 7



;###########################################################################
.instrument.2
; name Arp 2
; mode 0

.instrument.2.table
  .dw .instrument.2.volEnv
  .dw .instrument.2.arpEnv
  .dw .instrument.2.waveFormEnv

;........................
.instrument.2.volEnv

.instrument.2.volEnv.size
  .db 0
.instrument.2.volEnv.loop
  .db 255
.instrument.2.volEnv.data



;........................
.instrument.2.arpEnv

.instrument.2.arpEnv.mode
  .db 1
.instrument.2.arpEnv.size
  .db 0
.instrument.2.arpEnv.loop
  .db 255
.instrument.2.arpEnv.data



;........................
.instrument.2.waveFormEnv

.instrument.2.waveFormEnv.size
  .db 1
.instrument.2.waveFormEnv.loop
  .db 255
.instrument.2.waveFormEnv.data
  .db 2



;###########################################################################
.instrument.3
; name Lead1
; mode 0

.instrument.3.table
  .dw .instrument.3.volEnv
  .dw .instrument.3.arpEnv
  .dw .instrument.3.waveFormEnv

;........................
.instrument.3.volEnv

.instrument.3.volEnv.size
  .db 0
.instrument.3.volEnv.loop
  .db 255
.instrument.3.volEnv.data



;........................
.instrument.3.arpEnv

.instrument.3.arpEnv.mode
  .db 1
.instrument.3.arpEnv.size
  .db 0
.instrument.3.arpEnv.loop
  .db 255
.instrument.3.arpEnv.data



;........................
.instrument.3.waveFormEnv

.instrument.3.waveFormEnv.size
  .db 1
.instrument.3.waveFormEnv.loop
  .db 255
.instrument.3.waveFormEnv.data
  .db 3



;###########################################################################
.instrument.4
; name Lead2
; mode 0

.instrument.4.table
  .dw .instrument.4.volEnv
  .dw .instrument.4.arpEnv
  .dw .instrument.4.waveFormEnv

;........................
.instrument.4.volEnv

.instrument.4.volEnv.size
  .db 0
.instrument.4.volEnv.loop
  .db 255
.instrument.4.volEnv.data



;........................
.instrument.4.arpEnv

.instrument.4.arpEnv.mode
  .db 1
.instrument.4.arpEnv.size
  .db 0
.instrument.4.arpEnv.loop
  .db 255
.instrument.4.arpEnv.data



;........................
.instrument.4.waveFormEnv

.instrument.4.waveFormEnv.size
  .db 1
.instrument.4.waveFormEnv.loop
  .db 255
.instrument.4.waveFormEnv.data
  .db 4



;###########################################################################
.instrument.5
; name Bass
; mode 0

.instrument.5.table
  .dw .instrument.5.volEnv
  .dw .instrument.5.arpEnv
  .dw .instrument.5.waveFormEnv

;........................
.instrument.5.volEnv

.instrument.5.volEnv.size
  .db 0
.instrument.5.volEnv.loop
  .db 255
.instrument.5.volEnv.data



;........................
.instrument.5.arpEnv

.instrument.5.arpEnv.mode
  .db 1
.instrument.5.arpEnv.size
  .db 0
.instrument.5.arpEnv.loop
  .db 255
.instrument.5.arpEnv.data



;........................
.instrument.5.waveFormEnv

.instrument.5.waveFormEnv.size
  .db 1
.instrument.5.waveFormEnv.loop
  .db 255
.instrument.5.waveFormEnv.data
  .db 5



;###########################################################################
.instrument.6
; name Instrument 6
; mode 0

.instrument.6.table
  .dw .instrument.6.volEnv
  .dw .instrument.6.arpEnv
  .dw .instrument.6.waveFormEnv

;........................
.instrument.6.volEnv

.instrument.6.volEnv.size
  .db 0
.instrument.6.volEnv.loop
  .db 255
.instrument.6.volEnv.data



;........................
.instrument.6.arpEnv

.instrument.6.arpEnv.mode
  .db 1
.instrument.6.arpEnv.size
  .db 0
.instrument.6.arpEnv.loop
  .db 255
.instrument.6.arpEnv.data



;........................
.instrument.6.waveFormEnv

.instrument.6.waveFormEnv.size
  .db 1
.instrument.6.waveFormEnv.loop
  .db 255
.instrument.6.waveFormEnv.data
  .db 3



;###########################################################################
.instrument.7
; name Snare Drum
; mode 0

.instrument.7.table
  .dw .instrument.7.volEnv
  .dw .instrument.7.arpEnv
  .dw .instrument.7.waveFormEnv

;........................
.instrument.7.volEnv

.instrument.7.volEnv.size
  .db 4
.instrument.7.volEnv.loop
  .db 255
.instrument.7.volEnv.data
  .db 30, 28, 23, 0



;........................
.instrument.7.arpEnv

.instrument.7.arpEnv.mode
  .db 0
.instrument.7.arpEnv.size
  .db 2
.instrument.7.arpEnv.loop
  .db 255
.instrument.7.arpEnv.data
  .db 0, 0


;........................
.instrument.7.waveFormEnv

.instrument.7.waveFormEnv.size
  .db 1
.instrument.7.waveFormEnv.loop
  .db 255
.instrument.7.waveFormEnv.data
  .db 8



;###########################################################################
.instrument.8
; name Arp Short 00CC
; mode 0

.instrument.8.table
  .dw .instrument.8.volEnv
  .dw .instrument.8.arpEnv
  .dw .instrument.8.waveFormEnv

;........................
.instrument.8.volEnv

.instrument.8.volEnv.size
  .db 0
.instrument.8.volEnv.loop
  .db 255
.instrument.8.volEnv.data



;........................
.instrument.8.arpEnv

.instrument.8.arpEnv.mode
  .db 0
.instrument.8.arpEnv.size
  .db 24
.instrument.8.arpEnv.loop
  .db 255
.instrument.8.arpEnv.data
  .db 0, 12, 12, 0
  .db 12, 12, 0, 12
  .db 12, 0, 12, 12
  .db 0, 12, 12, 0
  .db 12, 12, 0, 12
  .db 12, 0, 12, 12



;........................
.instrument.8.waveFormEnv

.instrument.8.waveFormEnv.size
  .db 1
.instrument.8.waveFormEnv.loop
  .db 255
.instrument.8.waveFormEnv.data
  .db 9



;###########################################################################
.instrument.9
; name Arp 4step 0095
; mode 0

.instrument.9.table
  .dw .instrument.9.volEnv
  .dw .instrument.9.arpEnv
  .dw .instrument.9.waveFormEnv

;........................
.instrument.9.volEnv

.instrument.9.volEnv.size
  .db 25
.instrument.9.volEnv.loop
  .db 255
.instrument.9.volEnv.data
  .db 28, 28, 28, 28
  .db 28, 28, 26, 26
  .db 26, 26, 26, 26
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 0


;........................
.instrument.9.arpEnv

.instrument.9.arpEnv.mode
  .db 0
.instrument.9.arpEnv.size
  .db 24
.instrument.9.arpEnv.loop
  .db 255
.instrument.9.arpEnv.data
  .db 0, 9, 5, 0
  .db 9, 5, 0, 9
  .db 5, 0, 9, 5
  .db 0, 9, 5, 0
  .db 9, 5, 0, 9
  .db 5, 0, 9, 5



;........................
.instrument.9.waveFormEnv

.instrument.9.waveFormEnv.size
  .db 1
.instrument.9.waveFormEnv.loop
  .db 255
.instrument.9.waveFormEnv.data
  .db 9



;###########################################################################
.instrument.10
; name Arp 4step 0074
; mode 0

.instrument.10.table
  .dw .instrument.10.volEnv
  .dw .instrument.10.arpEnv
  .dw .instrument.10.waveFormEnv

;........................
.instrument.10.volEnv

.instrument.10.volEnv.size
  .db 25
.instrument.10.volEnv.loop
  .db 255
.instrument.10.volEnv.data
  .db 28, 28, 28, 28
  .db 28, 28, 26, 26
  .db 26, 26, 26, 26
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 0


;........................
.instrument.10.arpEnv

.instrument.10.arpEnv.mode
  .db 0
.instrument.10.arpEnv.size
  .db 24
.instrument.10.arpEnv.loop
  .db 255
.instrument.10.arpEnv.data
  .db 0, 7, 4, 0
  .db 7, 4, 0, 7
  .db 4, 0, 7, 4
  .db 0, 7, 4, 0
  .db 7, 4, 0, 7
  .db 4, 0, 7, 4



;........................
.instrument.10.waveFormEnv

.instrument.10.waveFormEnv.size
  .db 1
.instrument.10.waveFormEnv.loop
  .db 255
.instrument.10.waveFormEnv.data
  .db 9



;###########################################################################
.instrument.11
; name Arp 4step 0085
; mode 0

.instrument.11.table
  .dw .instrument.11.volEnv
  .dw .instrument.11.arpEnv
  .dw .instrument.11.waveFormEnv

;........................
.instrument.11.volEnv

.instrument.11.volEnv.size
  .db 25
.instrument.11.volEnv.loop
  .db 255
.instrument.11.volEnv.data
  .db 28, 28, 28, 28
  .db 28, 28, 26, 26
  .db 26, 26, 26, 26
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 0


;........................
.instrument.11.arpEnv

.instrument.11.arpEnv.mode
  .db 0
.instrument.11.arpEnv.size
  .db 24
.instrument.11.arpEnv.loop
  .db 255
.instrument.11.arpEnv.data
  .db 0, 8, 5, 0
  .db 8, 5, 0, 8
  .db 5, 0, 8, 5
  .db 0, 8, 5, 0
  .db 8, 5, 0, 8
  .db 5, 0, 8, 5



;........................
.instrument.11.waveFormEnv

.instrument.11.waveFormEnv.size
  .db 1
.instrument.11.waveFormEnv.loop
  .db 255
.instrument.11.waveFormEnv.data
  .db 9



;###########################################################################
.instrument.12
; name Arp 4step 0073
; mode 0

.instrument.12.table
  .dw .instrument.12.volEnv
  .dw .instrument.12.arpEnv
  .dw .instrument.12.waveFormEnv

;........................
.instrument.12.volEnv

.instrument.12.volEnv.size
  .db 25
.instrument.12.volEnv.loop
  .db 255
.instrument.12.volEnv.data
  .db 28, 28, 28, 28
  .db 28, 28, 26, 26
  .db 26, 26, 26, 26
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 0


;........................
.instrument.12.arpEnv

.instrument.12.arpEnv.mode
  .db 0
.instrument.12.arpEnv.size
  .db 24
.instrument.12.arpEnv.loop
  .db 255
.instrument.12.arpEnv.data
  .db 0, 7, 3, 0
  .db 7, 3, 0, 7
  .db 3, 0, 7, 3
  .db 0, 7, 3, 0
  .db 7, 3, 0, 7
  .db 3, 0, 7, 3



;........................
.instrument.12.waveFormEnv

.instrument.12.waveFormEnv.size
  .db 1
.instrument.12.waveFormEnv.loop
  .db 255
.instrument.12.waveFormEnv.data
  .db 9



;###########################################################################
.instrument.13
; name Arp 4step 0083
; mode 0

.instrument.13.table
  .dw .instrument.13.volEnv
  .dw .instrument.13.arpEnv
  .dw .instrument.13.waveFormEnv

;........................
.instrument.13.volEnv

.instrument.13.volEnv.size
  .db 25
.instrument.13.volEnv.loop
  .db 255
.instrument.13.volEnv.data
  .db 28, 28, 28, 28
  .db 28, 28, 26, 26
  .db 26, 26, 26, 26
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 0


;........................
.instrument.13.arpEnv

.instrument.13.arpEnv.mode
  .db 0
.instrument.13.arpEnv.size
  .db 24
.instrument.13.arpEnv.loop
  .db 255
.instrument.13.arpEnv.data
  .db 0, 8, 3, 0
  .db 8, 3, 0, 8
  .db 3, 0, 8, 3
  .db 0, 8, 3, 0
  .db 8, 3, 0, 8
  .db 3, 0, 8, 3



;........................
.instrument.13.waveFormEnv

.instrument.13.waveFormEnv.size
  .db 1
.instrument.13.waveFormEnv.loop
  .db 255
.instrument.13.waveFormEnv.data
  .db 9



;###########################################################################
.instrument.14
; name Arp 4step 0083/95
; mode 0

.instrument.14.table
  .dw .instrument.14.volEnv
  .dw .instrument.14.arpEnv
  .dw .instrument.14.waveFormEnv

;........................
.instrument.14.volEnv

.instrument.14.volEnv.size
  .db 25
.instrument.14.volEnv.loop
  .db 255
.instrument.14.volEnv.data
  .db 28, 28, 28, 28
  .db 28, 28, 26, 26
  .db 26, 26, 26, 26
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 0


;........................
.instrument.14.arpEnv

.instrument.14.arpEnv.mode
  .db 0
.instrument.14.arpEnv.size
  .db 24
.instrument.14.arpEnv.loop
  .db 255
.instrument.14.arpEnv.data
  .db 0, 8, 3, 0
  .db 8, 3, 0, 8
  .db 3, 0, 9, 5
  .db 0, 9, 5, 0
  .db 9, 5, 0, 9
  .db 5, 0, 9, 5



;........................
.instrument.14.waveFormEnv

.instrument.14.waveFormEnv.size
  .db 1
.instrument.14.waveFormEnv.loop
  .db 255
.instrument.14.waveFormEnv.data
  .db 9



;###########################################################################
.instrument.15
; name Arp 4step 0074/73
; mode 0

.instrument.15.table
  .dw .instrument.15.volEnv
  .dw .instrument.15.arpEnv
  .dw .instrument.15.waveFormEnv

;........................
.instrument.15.volEnv

.instrument.15.volEnv.size
  .db 25
.instrument.15.volEnv.loop
  .db 255
.instrument.15.volEnv.data
  .db 28, 28, 28, 28
  .db 28, 28, 26, 26
  .db 26, 26, 26, 26
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 23, 23, 23, 23
  .db 0


;........................
.instrument.15.arpEnv

.instrument.15.arpEnv.mode
  .db 0
.instrument.15.arpEnv.size
  .db 24
.instrument.15.arpEnv.loop
  .db 255
.instrument.15.arpEnv.data
  .db 0, 7, 4, 0
  .db 7, 4, 0, 7
  .db 3, 0, 7, 3
  .db 0, 7, 3, 0
  .db 7, 3, 0, 7
  .db 3, 0, 7, 3



;........................
.instrument.15.waveFormEnv

.instrument.15.waveFormEnv.size
  .db 1
.instrument.15.waveFormEnv.loop
  .db 255
.instrument.15.waveFormEnv.data
  .db 9



;###########################################################################
.instrument.16
; name Lead Decay
; mode 0

.instrument.16.table
  .dw .instrument.16.volEnv
  .dw .instrument.16.arpEnv
  .dw .instrument.16.waveFormEnv

;........................
.instrument.16.volEnv

.instrument.16.volEnv.size
  .db 13
.instrument.16.volEnv.loop
  .db 255
.instrument.16.volEnv.data
  .db 31, 31, 31, 31
  .db 31, 31, 29, 29
  .db 29, 29, 29, 29
  .db 0


;........................
.instrument.16.arpEnv

.instrument.16.arpEnv.mode
  .db 1
.instrument.16.arpEnv.size
  .db 0
.instrument.16.arpEnv.loop
  .db 255
.instrument.16.arpEnv.data



;........................
.instrument.16.waveFormEnv

.instrument.16.waveFormEnv.size
  .db 1
.instrument.16.waveFormEnv.loop
  .db 255
.instrument.16.waveFormEnv.data
  .db 3



