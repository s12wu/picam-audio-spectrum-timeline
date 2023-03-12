/* play_functions.js
 * Contains functions for video and audio playback.
 */

function play_audio(idx){
    console.log("Play audio " + idx);
    var audiofile = eventlist[idx][2];
    audioplaying_idx = idx;

    audio.src = "/cam/media/" + audiofile + ".flac";
    audio.ontimeupdate = function() {playing_update_legend()};
    audio.onended = function() {
        audioplaying = false;

        audiostop_btn.hide();
        draw();
    }
    audio.play();
    audioplaying = true;
    loading = true;

    audiostop_btn.show();
}

function playing_update_legend(){
    var start_x = pan + center_x + ((eventlist[audioplaying_idx][0] - centertimestamp) / secondsPerTile * imagewidth);
    var legend_x = start_x + (audio.currentTime / secondsPerTile * imagewidth)

    draw_spectrum_legend(legend_x);

    if (audio.currentTime > 0.1) {
        loading = false;
    }
}

function playing_update_time_on_drag(x){
    var start_x = pan + center_x + ((eventlist[audioplaying_idx][0] - centertimestamp) / secondsPerTile * imagewidth);

    var difference_px = x - start_x;
    var difference_sec = difference_px * secondsPerTile / imagewidth;

    audio.currentTime = difference_sec;
}

function play_audio_stop(){
    console.log("audio stop");
    audio.pause();

    audioplaying = false;
    audiostop_btn.hide();

    draw();
}


function play_video(idx){
    modal.style.display = "block";

    var videofile = eventlist[idx][2];
    video.src = "/cam/media/" + videofile + ".mp4";
}
