


.song
  .dw .song.tables
  .dw .song.tables.bank
.songname
  .db "Swedish Little PC Engine",0
.author
  .db "Newsdee 2025 - original by Rez 1991",0


.song.tables
  .dw .attributes
  .dw .patternList.table
  .dw .instrument.table
  .dw .waveform.table
  .dw .pattern.table
  .dw .samples.table

.song.tables.bank
  .db bank(.attributes)
  .db bank(.patternList.table)
  .db bank(.instrument.table)
  .db bank(.waveform.table)
  .db bank(.pattern.table)
  .db bank(.samples.table)


.attributes

 ;NOTE: time base =  1
 ;NOTE: frame mode =  1
 ;NOTE: custom mode =  0

.attributes.tick1
  .db 5
.attributes.tick2
  .db 4
.attributes.rowLength
  .db 64
.attributes.patternListLen
  .db 8
.attributes.instrumentLen
  .db 17
.attributes.waveformsLen
  .db 10
.attributes.samplesLen
  .db 0


