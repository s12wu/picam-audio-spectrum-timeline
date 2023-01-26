print("Python: importing...")
import numpy as np
from scipy import signal
import soundfile as sf
from PIL import Image
import sys
import os

# update resolution when changed!
nfft = 512
frame_seconds = 10
computed_resolution = (2142, 257)
save_resolution = [(714, 257), (30, 257)] # medium and small save resolution

wavfilename = sys.argv[1]

outputdir = wavfilename[:-4] #without .wav

print("outputdir:", outputdir)
print("wavfilename:", wavfilename)

try:
    os.mkdir(outputdir)
except:
    print("Directory exists, skipping")

try:
    os.mkdir(outputdir + "_s")
except:
    print("Directory exists, skipping")

aud, Fs = sf.read(wavfilename)
if len(aud.shape) == 2: # 2d array = stereo recording
    aud = aud[:,0] # only use left signal

frame_duration = Fs*frame_seconds
num_frames = len(aud) // frame_duration

#num of samples cut off at the end
end_samples = len(aud) % frame_duration

vmin=100000 #-200
vmax=-100000  #100
cmap='viridis'

images = []

for fnr in range(num_frames + 1):
    print("creating image", fnr, "of", num_frames)
    if fnr == num_frames: #we are in the last cut off part
        audio = aud[-end_samples:]
    else:
        audio = aud[fnr*frame_duration : (fnr+1)*frame_duration]


    f, t, Sxx = signal.spectrogram(audio, Fs, nfft=nfft)

    image = 10. * np.log10(Sxx)
    image = np.flipud(image)
    images.append(image)


global_min = 100000
global_max = -100000

for image in images:
    mi = np.min(image)
    if mi < global_min: global_min = mi

    ma = np.max(image)
    if ma > global_max: global_max = ma

fnr = 0
for image in images:
    image = (image-global_min)/(global_max-global_min)
    image *= 255.0
    image = image.astype(np.uint8)

    cmap = Image.open('/var/www/spectrum/turbo.png').convert('RGB')

    result = np.zeros((*image.shape,3), dtype=np.uint8)
    np.take(cmap.getdata(), image, axis=0, out=result)


    out_image = Image.new("RGB", computed_resolution, (0, 0, 0)) # Prepeare black image
    out_image.paste(Image.fromarray(result), (0, 0))

    out_image_medium = out_image.resize(save_resolution[0])
    out_image_small = out_image.resize(save_resolution[1])

    out_image_medium.save(outputdir + '/img_' + str(fnr) + '.jpg')
    out_image_small.save(outputdir + '_s/img_' + str(fnr) + '.jpg')

    fnr += 1

