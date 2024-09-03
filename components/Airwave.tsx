'use client'

import { useState, useRef, useEffect } from "react";
import AudioPlayer from "./AudioPlayer";


let stations = [
    {
        name: 'Homeboyz Radio',
        url: 'https://atunwadigital.streamguys1.com/homeboyzradio'
    },
    {
        name: 'Classic 105',
        url: 'https://atunwadigital.streamguys1.com/classic105'
    },
    {
        name: 'Capital FM',
        url: 'https://atunwadigital.streamguys1.com/capitalfm'
    },
    {
        name: 'Kiss 100',
        url: 'https://atunwadigital.streamguys1.com/kiss100fm'
    },
]


const Airwave = () => {
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const [station, setStation] = useState<string | null>(null);

    const changeStation = (newStation: any) => {
        if (currentAudio) {
            currentAudio.pause();
        }

        const radio = new Audio(newStation.url);
        radio.play();

        setCurrentAudio(radio);
        setStation(newStation.url);
    }

    const pauseAudio = () => {
        if (currentAudio) {
            currentAudio.pause();
            setCurrentAudio(null);
            setStation(null);
        }
    }

    return (
        <>
            <div>
                {stations.map((station, i) => (
                    <div key={i}>
                        <div
                            onClick={() => changeStation(station)}
                            className="py-4 cursor-pointer"
                        >
                            {station.name}
                        </div>
                        <div onClick={pauseAudio}>Pause</div>
                    </div>
                ))}
            </div>
            <AudioPlayer station={station} />
        </>
    )
}

export default Airwave