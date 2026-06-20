@echo off
set HUCC_HOME=C:\PCEngine\huc
set HUTRACK_HOME=C:\PCEngine\HuTrack

set PATH=%HUCC_HOME%\bin;%PATH%
set PCE_INCLUDE=%HUTRACK_HOME%\lib;%HUCC_HOME%\include\hucc;%CD%

@del HuTrack_swedish_little_girl.pce 2>nul
@del HuTrack_swedish_little_girl.sym 2>nul

hucc -s -v -v -msmall -fno-recursive main.c -gC
pceas -S -l 3 -o HuTrack_swedish_little_girl.pce --raw --hucc main.s

pause
