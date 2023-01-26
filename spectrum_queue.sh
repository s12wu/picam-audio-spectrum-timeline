#!/bin/bash

search_dir=/var/www/cam/media

for entry in "$search_dir"/*
do
    if [[ "$entry" == *.wav.gz ]]
    then
        echo "Found sth to do! $entry"
        targetwav=`basename $entry | cut -c 1-27`
        targetwav="/var/www/spectrum/$targetwav"
        echo "Target wav: $targetwav"

        echo "Extracting compressed wav..."
        gzip -d -c $entry > $targetwav

        echo "Starting python to create spectrograms..."
        python /var/www/spectrum/spectrum.py $targetwav

        echo "Python done, renaming compressed archive"
        mv "$entry" "$search_dir/`basename $entry | cut -c 1-27`.done.gz"

        echo "Converting to mono FLAC `echo "$entry.flac" | cut -c 1-42`.flac"
        ffmpeg -i $targetwav -filter_complex '[0:a]channelsplit=channel_layout=stereo:channels=FL[left]' -map '[left]' `echo "$entry.flac" | cut -c 1-42`.flac

        echo "Deleting extracted wav..."
        rm $targetwav

        echo "---"
    fi
done

