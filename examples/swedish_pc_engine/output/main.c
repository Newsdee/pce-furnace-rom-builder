#include <stdio.h>
#include "HuSFX/HuC_interface/HuVGM_defs.h"
#include "huc.h"
#include "HuTrack/Huc_interface/HuTrack.c"
#include "HuSFX/Huc_interface/HucSFX.c"

#incasmlabel(swedish_little_girl, "Assets/Music/swedish_little_girl/swedish_little_girl.song.inc", 2);

char title_buf[48];
char author_buf[48];

int main() {

	set_screen_size(SCR_SIZE_32x32);
	cls();
	disp_on();
	HuTrack_Init();
    HuTrackEngine_QueueSong(swedish_little_girl);
    vsync(1);
    // Fetch metadata from the song header
    HuTrackEngine_getCurrSongTitle(title_buf);
    HuTrackEngine_getCurrSongAuthor(author_buf);

    // Display song info using VDC escape sequences
	put_string("HuTrack Sound Test", 1, 2);

    printf("%s", 1, 5, title_buf);
	printf("%s", 1, 3, author_buf);

	vsync(10);
	HuTrackEngine_PlaySong(0);

    for(;;) {
    	vsync();
    }
    return 0;
}