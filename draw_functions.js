/* draw_functions.js
 * Responsible for drawing the timeline
 */

function draw(){
    ctx.fillStyle = bg_color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    _draw_images(1);
    _draw_videoboxes();
    _draw_timeline();
}

function zoomindraw(){
    ctx.fillStyle = bg_color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    _draw_videoboxes();
    _draw_timeline();
    _draw_images(2);
}
function zoomoutdraw(){
    ctx.fillStyle = bg_color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    _draw_videoboxes();
    _draw_timeline();
    _draw_images(0.5);
}

function _draw_timeline(){
    ctx.lineWidth = "2";
    ctx.strokeStyle = fg_color;
    ctx.fillStyle = fg_color;
    ctx.textAlign = "center";

    ctx.font = "25px sans-serif"
    var d = new Date(centertimestamp * 1000);
    var month = d.getMonth() + 1;
    var day = d.getDate();
    ctx.fillText((day < 10 ? "0" : "") + day + "." + (month < 10 ? "0" : "") + month + "." + d.getFullYear(), canvas.width/2, 40);

    ctx.font = "20px sans-serif";

    ctx.beginPath();
    ctx.moveTo(0, timeline_x);
    ctx.lineTo(canvas.width, timeline_x);

    var x = center_x + pan;
    while(x > 0 - imagewidth) {
        ctx.moveTo(x, timeline_x - 10);
        ctx.lineTo(x, timeline_x + 10);

        var hour = d.getHours();
        var min = d.getMinutes();
        var sec = d.getSeconds();
        var str = (hour < 10 ? "0" : "") + hour + ":" + (min < 10 ? "0" : "") + min

        if (secondsPerTile < 60) { // Zoomed in far enough to show seconds
            str += ":" + (sec < 10 ? "0" : "") + sec;
        }
        ctx.fillText(str, x, timeline_x + 40);

        d.setSeconds(d.getSeconds() - secondsPerTile);
        x -= imagewidth;
    }

    x = center_x + pan;
    d = new Date(centertimestamp * 1000);
    while (x < canvas.width + imagewidth) {
        ctx.moveTo(x, timeline_x - 10);
        ctx.lineTo(x, timeline_x + 10);

        var hour = d.getHours();
        var min = d.getMinutes();
        var sec = d.getSeconds();
        var str = (hour < 10 ? "0" : "") + hour + ":" + (min < 10 ? "0" : "") + min

        if (secondsPerTile < 60) { // Zoomed in far enough to show seconds
            str += ":" + (sec < 10 ? "0" : "") + sec;
        }
        ctx.fillText(str, x, timeline_x + 40);

        d.setSeconds(d.getSeconds() + secondsPerTile);
        x += imagewidth;
    }

    ctx.stroke();
}

function _draw_videoboxes(){
    ctx.fillStyle = fg_color;
    ctx.textAlign = "left";
    ctx.font = "20px sans-serif";
    ctx.beginPath();
    for (var idx=0; idx<eventlist.length; idx++) {
        var start = eventlist[idx][0];
        var end = eventlist[idx][1];
        var image = eventlist[idx][2];

        //calculate x position on screen for start and end

        var start_x = pan + center_x + ((start - centertimestamp) / secondsPerTile * imagewidth);
        var end_x = pan + center_x + ((end - centertimestamp) / secondsPerTile * imagewidth);

        var width = end_x - start_x;

        var y = timeline_x - 120;

        ctx.rect(start_x, y, width, 80);

        try {
            if (!thumbnaillist[idx].complete) {
                ctx.drawImage(hourglass_icon, start_x, y, 106, 80);
            } else {
                ctx.drawImage(thumbnaillist[idx], start_x, y, 106, 80);
            }
        }
        catch(err) {
            console.log(err.message);
        }

        ctx.fillText(eventlist[idx][2], start_x + 120, y+40);
    }
    ctx.stroke();
}

function _draw_images(scale){
    //draw from center to left
    var x = center_x;
    images_to_the_left.forEach(function(image, i) {
        try {
            if (!image.complete) {
                ctx.drawImage(hourglass_icon, x + pan*scale, canvas.height - imageheight, imagewidth*scale, imageheight);
            }
            else {
                ctx.drawImage(image, x + pan*scale, canvas.height - imageheight, imagewidth*scale, imageheight);
            }
        }
        catch(err) {
            console.log(err.message);
        }

        x -= imagewidth*scale;
    });

    //draw from center to right
    var x = center_x;
    images_to_the_right.forEach(function(image, i) {
        try {
            if (!image.complete) {
                ctx.drawImage(hourglass_icon, x + pan*scale, canvas.height - imageheight, imagewidth*scale, imageheight);
            }
            else {
                ctx.drawImage(image, x + pan*scale, canvas.height - imageheight, imagewidth*scale, imageheight);
            }

            x += imagewidth*scale;
        }
        catch(err) {
            console.log(err.message);
        }
    });
}

function draw_spectrum_legend(x, y=0){
    draw();

    ctx.beginPath();
    ctx.moveTo(x, canvas.height - imageheight);
    ctx.lineTo(x, canvas.height);

    ctx.textAlign = "left";
    ctx.font = "20px sans-serif";
    ctx.fillText("24 kHz", x+10, canvas.height - imageheight + 10); // Depends on sample rate, here 48000 samples per second
    ctx.fillText("12 kHz", x+10, canvas.height - imageheight/2);
    ctx.fillText("0 kHz", x+10, canvas.height - 10);

    // label current cursor position
    if(y > canvas.height - imageheight){
        var cursorfreq = Math.round((canvas.height-y) / imageheight * 24);
        ctx.fillText(cursorfreq + " kHz", x+10, y);
    }

    if (loading) {
        ctx.textAlign = "center";
        ctx.font = "50px monospace";
        ctx.fillText("Loading...", canvas.width/2, canvas.height - imageheight/2);
    }

    ctx.stroke();
}
