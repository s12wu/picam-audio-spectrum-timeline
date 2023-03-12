/* timeline.js
 * Main timeline javascript code, including event listeners for pan and zoom user interactions.
 */


function roundNumber(number, multiple) {return Math.round(number / multiple) * multiple;}

// Set up modal pop-up
var modal = document.getElementById("modal");
var closebtn = document.getElementsByClassName("close")[0];
var video = document.getElementById("video");

//Get stop audio playback button (hidden at beginning)
var audiostop_btn = $("#audiostop_btn"); //using jQuery for simple .show() and .hide() functions

// Set up the canvas
var canvas = document.querySelector('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var ctx = canvas.getContext('2d');

var center_x = Math.floor(canvas.width / 2); // helper to save the x coordinate of screen center

var timeline_x = 200;

var imageheight = (canvas.height - timeline_x) - 60;
var imagewidth = 300;

var images_to_the_left = []; //[0] is center, higher idx = more left
var images_to_the_right = []; //[0] is center (yes, duplicate), higher idx = more right

//Default Zoom level: 120 seconds per 300px tile.
var secondsPerTile = 120;

var fg_color = "white";
var bg_color = "black";

var centertimestamp = Date.now() / 1000;
centertimestamp = roundNumber(centertimestamp, secondsPerTile);

var imgloadts = Math.floor(Date.now() / 1000); //unique id generated from timestamp.
//The ID is added as an argument (not used by the PHP script) to img.src
//When changed, the browser won't use the old cached images anymore

var pan=0; //shift inside the center [0] image, 0 means center of image is in center of screen,
// -imagewidth/2 to +imagewidth/2
var panning = false;
var startX = 0;
var startPan = 0;

var audio = new Audio();
var audioplaying = false;
var audioplaying_idx = 0;
var loading = false;

//preload hourglass loading icon
var hourglass_icon = new Image();
hourglass_icon.src = 'hourglass.png';

var eventlist = [];
var thumbnaillist = [];
function refresh_eventlist(){
    $.ajax({
        url:'events.txt?id=' + imgloadts,
        success: function (data){
            var lines = data.split('\n');
            eventlist = [];
            thumbnaillist = [];

            for (line of lines) {
                if (!line == "") { //empty line?
                    var parts = line.split(' ');
                    eventlist.push(parts);

                    var thumbnail = new Image();
                    thumbnail.src = "cam/media/" + parts[2] + ".mp4.v" + parts[2].substring(3, 7) + ".th.jpg";
                    console.log("cam/media/" + parts[2] + ".mp4.v" + parts[2].substring(3, 7) + ".th.jpg");
                    thumbnaillist.push(thumbnail);
                }
            }
        }
    });
}


function loadImages_left(){
    images_to_the_left = [];
    var x = center_x;
    var idx = 0;
    while (x > 0 - imagewidth){
        //We need to add another image
        var img_timestamp = centertimestamp - idx*secondsPerTile;
        var image = new Image();
        image.src = 'imagegen.php?ts=' + img_timestamp + '&h=' + imageheight + '&zoom=' + secondsPerTile/2 + '&imgid=' + imgloadts;
        console.log('imagegen.php?ts=' + img_timestamp + '&h=' + imageheight + '&zoom=' + secondsPerTile/2 + '&imgid=' + imgloadts);
        image.onload = draw; //schedule canvas redraw when this image is loaded

        images_to_the_left.push(image);

        idx++;
        x -= imagewidth;
    }
}

function loadImages_right(){
    images_to_the_right = [];
    var x = center_x;
    var idx = 0;
    while (x < canvas.width + imagewidth){
        //We need to add another image
        var img_timestamp = centertimestamp + idx*secondsPerTile;
        var image = new Image();
        image.src = 'imagegen.php?ts=' + img_timestamp + '&h=' + imageheight + '&zoom=' + secondsPerTile/2 + '&imgid=' + imgloadts;
        console.log('imagegen.php?ts=' + img_timestamp + '&h=' + imageheight + '&zoom=' + secondsPerTile/2 + '&imgid=' + imgloadts);
        image.onload = draw; //schedule canvas redraw when this image is loaded

        images_to_the_right.push(image);

        idx++;
        x += imagewidth;
    }
}

function tilerefresh(){
    imgloadts = Math.floor(Date.now() / 1000);
    refresh_eventlist();
    loadImages_left();
    loadImages_right();
}

tilerefresh();

function tocurrent(){
    centertimestamp = Date.now() / 1000;
    centertimestamp = roundNumber(centertimestamp, secondsPerTile);
    tilerefresh();
}


// checks if the given position is over a video spectrum and returns its index in the eventlist. -1 if not over any.
function over_video_spectrum(x, y){
    if (y > canvas.height - imageheight) {
        for (var idx=0; idx<eventlist.length; idx++) {
            var start = eventlist[idx][0];
            var end = eventlist[idx][1];

            //calculate x position on screen for start and end

            var start_x = pan + center_x + ((start - centertimestamp) / secondsPerTile * imagewidth);
            var end_x = pan + center_x + ((end - centertimestamp) / secondsPerTile * imagewidth);

            if (x > start_x && x < end_x) {
                return idx;
            }
        }
    }

    return -1;
}

function over_video_box(x, y){
    if (y > timeline_x - 120 && y < timeline_x - 40) {
        for (var idx=0; idx<eventlist.length; idx++) {
            var start = eventlist[idx][0];
            var end = eventlist[idx][1];

            //calculate x position on screen for start and end

            var start_x = pan + center_x + ((start - centertimestamp) / secondsPerTile * imagewidth);
            var end_x = pan + center_x + ((end - centertimestamp) / secondsPerTile * imagewidth);

            if (x > start_x && x < end_x) {
                return idx;
            }
        }
    }

    return -1;
}

canvas.addEventListener('mousedown', function(e) {
    panning = true;
    startX = e.clientX;
    startPan = -pan;

    var videoidx = over_video_spectrum(e.clientX, e.clientY)
    if (videoidx > -1 && !audioplaying){
        play_audio(videoidx);
    }
    if(videoidx == audioplaying_idx && audioplaying) { // move playing playhead
        playing_update_time_on_drag(e.clientX);
    }

    videoidx = over_video_box(e.clientX, e.clientY)
    if (videoidx > -1){
        play_video(videoidx);
    }
});

canvas.addEventListener('mouseup', function() {
    panning = false;
});

canvas.addEventListener('mousemove', function(e) {
    if (panning) {
        pan = (e.clientX - startX) - startPan;

        if(pan < -(imagewidth/2)){
            // We moved more than one image, it's time to load another one to fill in the hole at the very right
            centertimestamp += secondsPerTile;
            pan = pan + imagewidth;
            startPan = startPan - imagewidth;

            var img_timestamp = centertimestamp + (images_to_the_right.length-1) * secondsPerTile;
            var image = new Image();
            image.src = 'imagegen.php?ts=' + img_timestamp + '&h=' + imageheight + '&zoom=' + secondsPerTile/2 + '&imgid=' + imgloadts;
            console.log('imagegen.php?ts=' + img_timestamp + '&h=' + imageheight + '&zoom=' + secondsPerTile/2 + '&imgid=' + imgloadts);
            image.onload = draw; //schedule canvas redraw when this image is loaded


            images_to_the_right.push(image);
            images_to_the_right.shift();

            var newcenter = images_to_the_right[0];

            images_to_the_left.unshift(newcenter);
            images_to_the_left.pop();
        }
        if(pan > (imagewidth/2)){
            // We moved more than one image, it's time to load another one to fill in the hole at the very left
            centertimestamp -= secondsPerTile;
            pan = pan - imagewidth;
            startPan = startPan + imagewidth;

            var img_timestamp = centertimestamp - (images_to_the_left.length-1) * secondsPerTile;
            var image = new Image();
            image.src = 'imagegen.php?ts=' + img_timestamp + '&h=' + imageheight + '&zoom=' + secondsPerTile/2 + '&imgid=' + imgloadts;
            console.log('imagegen.php?ts=' + img_timestamp + '&h=' + imageheight + '&zoom=' + secondsPerTile/2 + '&imgid=' + imgloadts);
            image.onload = draw; //schedule canvas redraw when this image is loaded


            images_to_the_left.push(image);
            images_to_the_left.shift();

            var newcenter = images_to_the_left[0];

            images_to_the_right.unshift(newcenter);
            images_to_the_right.pop();
        }

        draw();
    }
    else if (over_video_spectrum(e.clientX, e.clientY) > -1){
        draw_spectrum_legend(e.clientX, e.clientY);
    }
});

canvas.addEventListener('wheel', function(e) {
    console.log(e.deltaY);
    if(e.deltaY < 0){ //scroll up = zoom in
        secondsPerTile = Math.floor(secondsPerTile / 2);
        if(secondsPerTile < 1.875){
            secondsPerTile = 1.875;
        }
        else zoomindraw();
        loadImages_left();
        loadImages_right();
    }
    if(e.deltaY > 0){ //scroll down = zoom out
        secondsPerTile = Math.floor(secondsPerTile * 2);
        if(secondsPerTile > 245760){
            secondsPerTile = 245760;
        }
        else zoomoutdraw();
        centertimestamp = roundNumber(centertimestamp, secondsPerTile);
        loadImages_left();
        loadImages_right();
    }
});

closebtn.onclick = function() {
    modal.style.display = "none";
    panning = false; // close btn click sometimes starts panning
}

function sizechange(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    center_x = Math.floor(canvas.width / 2);
    imageheight = (canvas.height - timeline_x) - 60;
    loadImages_left();
    loadImages_right();
}

setTimeout(draw, 2000);
