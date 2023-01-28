<?php
function LoadJpeg($imgname)
{
    /* Attempt to open */
    $im = @imagecreatefromjpeg($imgname);

    /* See if it failed */
    if(!$im)
    {
        /* Create a black image */
        $im  = imagecreatetruecolor(150, 30);
        $bgc = imagecolorallocate($im, 255, 255, 255);
        $tc  = imagecolorallocate($im, 0, 0, 0);

        imagefilledrectangle($im, 0, 0, 150, 30, $bgc);

        /* Output an error message */
        imagestring($im, 1, 5, 5, 'Error loading ' . $imgname, $tc);
    }

    return $im;
}

$timestamp = $_GET["ts"];

$range = $_GET["zoom"];

// Set the size of the image tiles generated
$width = 300;
$height = $_GET["h"];

//calculate target image width in pixels to fulfill the range of the tile generated
$duration_of_spectrum_img = 10; //seconds
$spectrum_img_width = 744;
$spectrum_img_width_at_current_range = ($duration_of_spectrum_img * $width) / (2 * $range);

// Create the image
$image = imagecreatetruecolor($width, $height);

// Allocate colors for the image
$bg_color = imagecolorallocate($image, 0, 0, 0);
$red = imagecolorallocate($image, 255, 0, 128);
$transparentblack = imagecolorallocatealpha($image, 0, 0, 0, 100);

// create background
imagefill($image, 0, 0, $bg_color);

// Open the events.txt file for reading
$file = fopen("events.txt", "r");


while (($line = fgets($file)) !== false) {
    // Split the line into start and end timestamps and the image filename
    $parts = explode(" ", $line);
    $start = $parts[0];
    $end = $parts[1];
    $videoid = substr($parts[2], 0, -1); //removing \n

    if($range >= 60){
        $videoid = $videoid . "_s";
    }


    // Check if the given timestamp falls within the range (don't know why, but it works with 2*$range)
    if (!($timestamp + 2*$range <= $start || $timestamp - 2*$range > $end)) {

        // Convert the start and end timestamps to pixels
        $start_x = ($start - $timestamp + $range) * ($width / (2 * $range)) - $width/2;

        $spectrum_img_list = scandir("spectrum/$videoid/");
        $spectrum_img_list_idx = 2; //ignoring . and ..

        $addmore = 1;
        while ($addmore == 1) {
            $x = $start_x + ($spectrum_img_list_idx-2) * $spectrum_img_width_at_current_range;

            if (x + $spectrum_img_width_at_current_range > 0) { //would this image even be visible?
                $spectrum_img = LoadJpeg("spectrum/$videoid/" . $spectrum_img_list[$spectrum_img_list_idx]);
                imagecopyresized($image, $spectrum_img, $x, 0, 0, 0, $spectrum_img_width_at_current_range, $height, imagesx($spectrum_img), imagesy($spectrum_img));

                $spectrum_img_list_idx++;

                if ($x > $width || $spectrum_img_list_idx >= count($spectrum_img_list)) {
                    $addmore = 0;
                }
            }

        }
    }

}

// If necessary, draw a vertical line for the current time and gray out the area behind it

$currenttime = time();
$currenttime_line_x = ($currenttime - $timestamp + $range) * ($width / (2 * $range));

// check if the line is in the current frame
if($currenttime_line_x >= 0 && $currenttime_line_x < $width){
    imageline($image, $currenttime_line_x, 0, $currenttime_line_x, $height, $red);
    imagefilledrectangle($image, $currenttime_line_x, 0, $width, $height, $transparentblack);
}

// check if the tile is completely in the future, then we have to gray it out completely
if($currenttime_line_x <0){
    imagefilledrectangle($image, 0, 0, $width, $height, $transparentblack);
}

// Close the file
fclose($file);

// Output the image
header("Content-type: image/jpg");
imagejpeg($image);

// Destroy the image to free up memory
imagedestroy($image);

?>
