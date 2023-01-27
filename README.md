# PiCam audio spectrum timline

![screenshot](https://user-images.githubusercontent.com/90598549/214926118-ec310b7f-fcae-45c8-82a2-16eeed702809.png)

Creates a HTML/JS timeline of video captured by a Raspberry Pi camera, along with a corresponding audio spectrum.

TODO: Demonstration video

It works in combination with the [RPi Cam Web Interface](https://github.com/silvanmelchior/RPi_Cam_Web_Interface).
Using the `start_vid.sh` and `env_vid.sh` macros, it gets "informed" about video start end end times, which are just stored in the `events.txt` file.

The spectrum is generated using Python and Scipy.
Audio is stored as FLAC to preserve the very high frequencies (above 15kHz). I'm using for my bird box in which the (blue tit) chicks make very high-pitched sounds, which (I hope) will be interesting to analyse.

## Usage
Click and drag to pan.

Mouse wheel to zoom in and out.

Click a videos' rectangle (above the line) to watch the video.

Click the spectrum to play the audio from the clicked timestamp.

When you try to drag over a video, it will play from there and not pan the view. Try doing it in the "safe area" directly over the timeline.

This is absolutely not made for mobile devices, I don't know how it would behave there.

## Installation
Of course, you need a microphone attached to your Pi. I'm using two Adafruit SPH0645 breakout boards for stereo sound.

**Install Raspberry Pi OS lite** & do updates. I'm using Bullseye on a Pi zero w and a 32GB microSD card.

**Connect** your camera and [microphone(s)](https://learn.adafruit.com/adafruit-i2s-mems-microphone-breakout/raspberry-pi-wiring-test).

Install some needed **packages**:
```   
sudo apt install git python3-numpy python3-scipy python3-pil python3-soundfile ffmpeg lame
```

**Install RPi Cam Web Interface** ([long form found on the wiki](https://elinux.org/RPi-Cam-Web-Interface)).

```bash
# Enable Interface Options > legacy camera
sudo raspi-config 

git clone https://github.com/silvanmelchior/RPi_Cam_Web_Interface.git
cd RPi_Cam_Web_Interface
./install.sh
```

install.sh settings: I'm using nginx as webserver, it should work with the others too. Use `cam` as subfolder, as that's what the timeline expects.

**Set up audio recording**
```bash
sudo pip3 install --upgrade adafruit-python-shell
wget https://raw.githubusercontent.com/adafruit/Raspberry-Pi-Installer-Scripts/master/i2smic.py
sudo python3 i2smic.py
```

Answer `y` for the "auto load at boot" question and accept the reboot.

After reboot, check if the microphone is available:
```bash
arecord -l
```
You should see the I²S microphone as `sndrpii2scard`

Now, let's tell the web interface to record an audio file while video recording.
```bash
sudo nano /var/www/cam/macros/start_vid.sh
```
Add the following content:
```bash
#!/bin/bash
echo -n "`date +%s` " >> /var/www/events.txt
AUDIOFILE=$(echo "$1" | cut -c 1-42)
AUDIOFILE="$AUDIOFILE.wav.gz"
arecord -D dsnoop:0,0 -c2 -r 48000 -f S32_LE -t wav -V stereo | gzip -1 > $AUDIOFILE
```
CTRL+X, y, enter to save

Add this to /var/www/cam/macros/end_vid.sh
```bash
#!/bin/bash
pkill arecord
echo -n "`date +%s` `echo "$1" | cut -c 20-42`" >> /var/www/events.txt
echo "" >> /var/www/events.txt
```
Make them executable
```
sudo chmod +x /var/www/cam/macros/start_vid.sh
sudo chmod +x /var/www/cam/macros/end_vid.sh
```

Change the boxing command to decompress the wav, encode it to mp3 and include it in the final mp4 video.

```bash
sudo nano /etc/raspimjpeg
```
Move down to the line starting with `MP4Box_cmd`

Delete (or comment out) the entire long line and replace it with this even longer one: (It has to be in one single line!)
```bash
MP4Box_cmd (set -e;FPS=%i;TNAME='%s';FNAME='%s';TNAME='%s';AUDIOFILE=$(echo "$TNAME" | cut -c 1-42);LOGS="$TNAME.log";rm -f "$FNAME";gzip -d -c "$AUDIOFILE.wav.gz"|lame - "$AUDIOFILE.mp3";if MP4Box -fps $FPS -add "$TNAME" -add "$AUDIOFILE.mp3" -delay 2=-100 "$FNAME" > "$LOGS" 2>&1;then touch -r "$TNAME" "$FNAME"; rm "$TNAME" "$LOGS" "$AUDIOFILE.mp3";else mv "$TNAME" "$TNAME.bad";fi;) &
```
The command was taken from [this issue on RPi_Cam_Web_Interface](https://github.com/silvanmelchior/RPi_Cam_Web_Interface/issues/644#issuecomment-987342770) and changed a bit.
What is does:
* Get the command line arguments
* unzip the .wav.gz file and pipe it into `lame` for mp3 encoding.
* run `MP4Box` to combine the .h264 video recording and the mp3 audio.
* if there was any error in MP4Box, keep the log file and rename the h264 file so it won't try again.

Open /var/www/cam/config.php and add the following two checks to the deleteFile function:
```php
if (file_exists(LBASE_DIR . '/' . MEDIA_PATH . "/$rFile.h264.wav.gz")) {
    $size += filesize_n(LBASE_DIR . '/' . MEDIA_PATH . "/$rFile.wav.gz");
    if ($del) unlink(LBASE_DIR . '/' . MEDIA_PATH . "/$rFile.wav.gz");
}
if (file_exists(LBASE_DIR . '/' . MEDIA_PATH . "/$rFile.flac")) {
    $size += filesize_n(LBASE_DIR . '/' . MEDIA_PATH . "/$rFile.flac");
    if ($del) unlink(LBASE_DIR . '/' . MEDIA_PATH . "/$rFile.flac");
}
```
This will also delete the .wav.gz and .flac files when you delete a video using the web interface.

You can now try to record a video using the web interface. When playing it back, it should have sound in it.

If you encounter any errors here, try running the web interface with `~/RPi_Cam_Web_Interface/debug.sh` and post an issue.

**Set up the timeline**

Install php gd:

```bash
sudo apt install php-gd
```

Download the index.html, imagegen.php and hourglass.png files and put them into `/var/www/`

[Download jquery](https://jquery.com/download/) and save it as `/var/www/jquery.js`

Create a directory called `spectrum` inside `/var/www/` and put the spectrum.py, spectrum_queue.sh and turbo.png (colormap) files there.

Record some videos. They should show up as individual lines in `/var/www/events.txt`

Example events.txt content:
```
1674394076 1674394107 vi_0014_20230122_142756
1674397385 1674397435 vi_0016_20230122_152305
1674662514 1674662590 vi_0017_20230125_170154
```

Now, create the spectrograms for them:
```bash
/var/www/cam/spectrum/spectrum_queue.sh
```
Depending on the Pi generation you're using and the video duration, this may take some time.

I don't want to include the spectrum_queue.sh call in the boxing command because it would (especially on my pi zero w) cause 100% CPU usage for some time and therefore interfere with video recordings that would be captured right after the first one.


## Audio data flow

Audio is directly compressed by gzip (flac encoding doesn't like the S32_LE format and converting would be too expensive on recording time.)

`arecord | gzip -1 > audio.wav.gz`

On boxing time:

`gzip -c -d audio.wav.gz > lame | audio.mp3`

before spectrum generation:

`gzip -d -c audio.wav.gz > audio.wav`

after spectrum generation:

`ffmpeg -i audio.wav -filter_complex '[0:a]channelsplit=channel_layout=stereo:channels=FL[left]' -map '[left]' audio.flac`

Only one channel of the stereo recording is retained, but it is losslessly encoded for further analysis.

## TODO
* When deleting a video using the web interface, it doesn't delete the line from events.txt

## Conclusion
I have programmed this timeline for and directly on my RPi Zero watching a bird nesting box. If there is interest, I can create an automatic, convenient installation script. Feel free to give it a star or create an issue if you are interested.
