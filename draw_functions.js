/* draw_functions.js
 * Responsible for drawing the timeline
 */

const thumbnail_width = 107; //coming from video box height 80px and aspect ratio 4:3

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

var cluster = true;

// Clustering of video boxes to clean up the mess when zoomed out
function _cluster_videoboxes(){
    clustered_eventlist = []
    for (let i = 0; i < eventlist.length; i++) {
        let innerArray = [];
        for (let j = 0; j < eventlist[i].length; j++) {
            innerArray.push(eventlist[i][j]);
        }
        clustered_eventlist.push(innerArray);
    }


    // Clustering is done using two conditions, both must be fulfilled to merge two video boxes
    // 1. Width of the video box smaller than threshold (pixels)
    // 2. Distance to next video box smaller than threshold
    const width_threshold = 350;
    const distance_threshold = 100;

    var changed = true;

    while(changed){ //Repeat while we still have something to cluster.
        changed = false;

        for (var idx = 0; idx < clustered_eventlist.length - 1; idx++) {
            var start = clustered_eventlist[idx][0];
            var end = clustered_eventlist[idx][1];

            var next_start = clustered_eventlist[idx+1][0];

            //calculate x position on screen for start and end
            var start_x = pan + center_x + ((start - centertimestamp) / secondsPerTile * imagewidth);
            var end_x = pan + center_x + ((end - centertimestamp) / secondsPerTile * imagewidth);

            //calculate x position of start of the next event (to check distance later)
            var next_start_x = pan + center_x + ((next_start - centertimestamp) / secondsPerTile * imagewidth);


            var on_screen = start_x > -400 && next_start_x < canvas.width;

            var width_condition = end_x - start_x < width_threshold;
            var distance_condition = next_start_x - end_x < distance_threshold;

            if (on_screen && width_condition && distance_condition) {
                // Reuse element idx as the cluster
                clustered_eventlist[idx][1] = clustered_eventlist[idx + 1][1]; // set the cluster end to the next element's end

                // Update the text

                var idx_is_cluster = clustered_eventlist[idx][2].length < 15; // are they already clusters? 15 as magic number treshold: "2 videos" is shorter than 15 chars, "vi_0127_20230312_104739" is longer
                var idxp1_is_cluster = clustered_eventlist[idx+1][2].length < 15;

                // parse string to see how many items each cluster had
                var idx_len = 1; // default value it it was a video instead
                var idxp1_len = 1;

                if(idx_is_cluster) idx_len = parseInt(clustered_eventlist[idx][2]);
                if(idxp1_is_cluster) idxp1_len = parseInt(clustered_eventlist[idx+1][2]);

                // set new text with the sum of the two parts
                clustered_eventlist[idx][2] = (idx_len + idxp1_len).toString() + " videos";

                // remove the next element because it was merged with the current one
                clustered_eventlist.splice(idx+1, 1);
                clustered_thumbnaillist.splice(idx+1, 1);

                changed = true;
            }
        }
    }
}


function _draw_videoboxes(){
    //cluster the video boxes
    _cluster_videoboxes();


    ctx.fillStyle = fg_color;
    ctx.font = "20px sans-serif";
    ctx.beginPath();
    for (var idx = 0; idx < clustered_eventlist.length; idx++) {
        var start = clustered_eventlist[idx][0];
        var end = clustered_eventlist[idx][1];
        var image = clustered_eventlist[idx][2];

        //calculate x position on screen for start and end

        var start_x = pan + center_x + ((start - centertimestamp) / secondsPerTile * imagewidth);
        var end_x = pan + center_x + ((end - centertimestamp) / secondsPerTile * imagewidth);

        var width = end_x - start_x;

        var y = timeline_x - 120;

        ctx.rect(start_x, y, width, 80);

        ctx.textAlign = "center";

        if (clustered_eventlist[idx][2].length >= 13) { //only draw thumbnail if its a video, not a cluster.
            //because we removed items from the eventlist while clustering, the index of our video in the original eventlist
            //and therefore the index in the thumbnaillist differs.
            //we find it by just searching for the video name in the original list.
            // https://stackoverflow.com/questions/64735255/javascripct-2d-array-indexof

            var thumbnail_idx = eventlist.findIndex(([starttime, endtime, label]) => label == clustered_eventlist[idx][2]);

            //calculate thumbnail position.
            //thumbnail size is 106x80
            //thumbnail is aligned left inside its box, but sticks to the left of the screen if video start is outside of the visible area.
            var thumbnailpos_x = start_x;
            if (start_x < 0 && start_x + width > thumbnail_width) thumbnailpos_x = 0;
            else if (start_x < 0 && start_x + width > 0) thumbnailpos_x = start_x + width - thumbnail_width;

            var this_thumbnail_width = Math.min(width, thumbnail_width);

            try {
                ctx.drawImage(thumbnaillist[thumbnail_idx].complete ? thumbnaillist[thumbnail_idx] : hourglass_icon,
                              thumbnailpos_x,
                              y,
                              this_thumbnail_width,
                              80);
            }
            catch(err) {
                //console.log(err.message); (many logs when images aren't loaded yet)
            }

            ctx.fillText(clustered_eventlist[idx][2].substring(0, 7), (start_x + end_x) / 2, y-10);
        } else {
            ctx.fillText(clustered_eventlist[idx][2], (start_x + end_x) / 2, y-10);
        }


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
            //console.log(err.message);
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
            //console.log(err.message);
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
