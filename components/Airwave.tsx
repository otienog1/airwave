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
    {
        name: 'Ghetto Radio',
        url: 'https://stream-158.zeno.fm/eghcv7h647zuv'
    },
    {
        name: 'Hot 96',
        url: 'https://hot96-atunwadigital.streamguys1.com/hot96'
    },
    {
        name: 'Ramogi FM',
        url: 'https://ramogifm-atunwadigital.streamguys1.com/ramogifm'
    },
]


const Airwave = () => {
    const [currentStation, setCurrentStation] = useState<string | null>(null);
    const [currentStationName, setCurrentStationName] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [metadata, setMetadata] = useState<string | null>(null);
    const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
    const metadataIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Preload audio for each station
        stations.forEach(station => {
            const audio = new Audio(station.url);
            audio.preload = "auto";
            audio.volume = volume;
            audioRefs.current[station.url] = audio;
        });

        // Cleanup function
        return () => {
            Object.values(audioRefs.current).forEach(audio => {
                audio.pause();
                audio.src = "";
                audio.load();
            });
        };
    }, []);

    const fetchMetadata = async (url: string) => {
        try {
            const response = await fetch(url, { method: 'GET' });
            const data = await response.text();

            // Try different metadata formats
            let match = data.match(/StreamTitle='(.+?)';/);
            if (!match) {
                match = data.match(/<title>(.*?)<\/title>/);
            }
            if (!match) {
                match = data.match(/icestats>.*?<title>(.*?)<\/title>/);
            }

            if (match && match[1]) {
                setMetadata(match[1]);
            } else {
                console.log("No metadata found in response");
            }
        } catch (error) {
            console.error("Error fetching metadata:", error);
        }
    };

    const startMetadataInterval = (url: string) => {
        if (metadataIntervalRef.current) {
            clearInterval(metadataIntervalRef.current);
        }
        metadataIntervalRef.current = setInterval(() => fetchMetadata(url), 10000); // Fetch every 10 seconds
    };

    const stopMetadataInterval = () => {
        if (metadataIntervalRef.current) {
            clearInterval(metadataIntervalRef.current);
        }
    };

    const toggleStation = (station: any) => {
        if (currentStation === station.url) {
            handleTogglePlay();
        } else {
            if (currentStation && isPlaying) {
                audioRefs.current[currentStation].pause();
                stopMetadataInterval();
            }
            setCurrentStation(station.url);
            setCurrentStationName(station.name);
            setIsPlaying(true);
            audioRefs.current[station.url].play();
            fetchMetadata(station.url); // Fetch metadata immediately
            startMetadataInterval(station.url); // Start fetching metadata periodically
        }
    }

    const handleTogglePlay = () => {
        if (currentStation) {
            if (isPlaying) {
                audioRefs.current[currentStation].pause();
                stopMetadataInterval();
            } else {
                audioRefs.current[currentStation].play();
                startMetadataInterval(currentStation);
            }
            setIsPlaying(!isPlaying);
        }
    }

    const handleReload = () => {
        if (currentStation) {
            audioRefs.current[currentStation].load();
            audioRefs.current[currentStation].play();
            setIsPlaying(true);
        }
    }

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        if (currentStation) {
            audioRefs.current[currentStation].volume = newVolume;
        }
        setIsMuted(newVolume === 0);
    };

    const handleMuteToggle = () => {
        setIsMuted(!isMuted);
        if (currentStation) {
            audioRefs.current[currentStation].volume = isMuted ? volume : 0;
        }
    };

    useEffect(() => {
        return () => {
            stopMetadataInterval(); // Clean up interval on component unmount
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold text-white text-center mb-8 animate-pulse">
                    AIRWAVE
                </h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stations.map((station, i) => (
                        <div key={i} className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl">
                            <div className="p-6">
                                <h3 className="text-xl font-semibold text-white mb-4">{station.name}</h3>
                                <button
                                    onClick={() => toggleStation(station)}
                                    className={`w-full py-3 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-300 ${currentStation === station.url && isPlaying
                                        ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400 text-white'
                                        : 'bg-green-500 hover:bg-green-600 focus:ring-green-400 text-white'
                                        }`}
                                >
                                    {currentStation === station.url && isPlaying ? 'Pause' : 'Play'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <AudioPlayer
                stationName={currentStationName}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                onReload={handleReload}
                volume={volume}
                onVolumeChange={handleVolumeChange}
                isMuted={isMuted}
                onMuteToggle={handleMuteToggle}
                metadata={metadata}
            />
        </div>
    )
}


export default Airwave