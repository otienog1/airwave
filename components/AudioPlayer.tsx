'use client'


import { useRef } from 'react'
import {
    MediaController,
    MediaControlBar,
    MediaTimeRange,
    MediaTimeDisplay,
    MediaVolumeRange,
    MediaPlayButton,
    MediaSeekBackwardButton,
    MediaSeekForwardButton,
    MediaMuteButton,
    MediaDurationDisplay,
    MediaLiveButton
} from 'media-chrome/react'



const AudioPlayer = ({ station, player }: any) => {



    return (

        <audio
            preload="auto"
            autoPlay
            controls
            ref={player}
        >
            <source
                src={station}
            ></source>
        </audio>


        // <MediaController>
        //     <audio
        //         slot="media"
        //         // src="https://stream.mux.com/DS00Spx1CV902MCtPj5WknGlR102V5HFkDe/high.mp4"
        //         src="https://atunwadigital.streamguys1.com/homeboyzradio"
        //         preload="auto"
        //         crossOrigin=""
        //         autoPlay={true}
        //     // muted
        //     ></audio>

        //     <MediaControlBar>
        //         {/* <MediaSeekBackwardButton></MediaSeekBackwardButton> */}
        //         <MediaPlayButton></MediaPlayButton>
        //         {/* <MediaSeekForwardButton></MediaSeekForwardButton> */}
        //         <MediaTimeDisplay mediastreamtype="live"></MediaTimeDisplay>
        //         <MediaTimeRange mediastreamtype="live"></MediaTimeRange>
        //         <MediaLiveButton></MediaLiveButton>
        //         <MediaMuteButton></MediaMuteButton>
        //         <MediaVolumeRange></MediaVolumeRange>
        //     </MediaControlBar>
        // </MediaController>

    )
}

export default AudioPlayer