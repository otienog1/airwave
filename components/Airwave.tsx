'use client'

import { useState, useRef, useEffect } from "react";
import AudioPlayer from "./AudioPlayer";
import Equalizer from "./Equalizer";


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
    const [currentStationName, setCurrentStationName] = useState<string>("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [metadata, setMetadata] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [playedStations, setPlayedStations] = useState<Set<string>>(new Set());
    const [internetSpeed, setInternetSpeed] = useState<number | null>(null);
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
    const metadataIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [gainNode, setGainNode] = useState<GainNode | null>(null);

    useEffect(() => {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const gain = context.createGain();
        gain.connect(context.destination);
        setAudioContext(context);
        setGainNode(gain);

        return () => {
            context.close();
        };
    }, []);

    useEffect(() => {
        checkInternetSpeed();
    }, []);

    useEffect(() => {
        if (internetSpeed && internetSpeed >= 2048) {
            preloadAllStations();
        }
    }, [internetSpeed]);

    const checkInternetSpeed = () => {
        const imageAddr = "https://upload.wikimedia.org/wikipedia/commons/2/2d/Snake_River_%285mb%29.jpg";
        const downloadSize = 5245329; // bytes

        let startTime: number, endTime: number;
        const download = new Image();
        download.onload = function () {
            endTime = (new Date()).getTime();
            const duration = (endTime - startTime) / 1000;
            const bitsLoaded = downloadSize * 8;
            const speedBps = (bitsLoaded / duration).toFixed(2);
            const speedKbps = (parseInt(speedBps) / 1024).toFixed(2);
            console.log(`Internet Speed: ${speedKbps} Kbps`);
            setInternetSpeed(parseFloat(speedKbps));
        }
        startTime = (new Date()).getTime();
        download.src = imageAddr;
    }

    const preloadAllStations = () => {
        stations.forEach(station => {
            if (!audioRefs.current[station.url]) {
                const audio = new Audio(station.url);
                audio.crossOrigin = "anonymous";
                audio.preload = "auto";
                audioRefs.current[station.url] = audio;
                audio.load();
            }
        });
    }

    const toggleStation = (station: any) => {
        if (currentStation === station.url) {
            handleTogglePlay();
        } else {
            if (currentStation && isPlaying) {
                audioRefs.current[currentStation]?.pause();
                stopMetadataInterval();
            }
            setCurrentStation(station.url);
            setCurrentStationName(station.name);
            setIsPlaying(true);
            setIsLoading(true);

            if (!audioRefs.current[station.url]) {
                loadAudio(station.url);
            } else {
                // If the audio was preloaded, just play it
                const audio = audioRefs.current[station.url];
                audio.play().then(() => {
                    setIsLoading(false);
                    setCurrentAudio(audio);
                }).catch(error => {
                    console.error("Error playing audio:", error);
                    setIsPlaying(false);
                    setIsLoading(false);
                });
            }

            fetchMetadata(station.url);
            startMetadataInterval(station.url);

            // Add the station to the played stations set
            setPlayedStations(prev => new Set(prev).add(station.url));
        }
    }

    const loadAudio = (url: string) => {
        if (!audioRefs.current[url]) {
            const audio = new Audio(url);
            audio.crossOrigin = "anonymous";
            audioRefs.current[url] = audio;
        }
        const audio = audioRefs.current[url];

        audio.addEventListener('canplay', () => {
            setIsLoading(false);
            setIsPlaying(true);
            setCurrentAudio(audio);
            if (audioContext && gainNode) {
                const source = audioContext.createMediaElementSource(audio);
                source.connect(gainNode);
            }
            audio.play().catch(error => {
                console.error("Error playing audio:", error);
                setIsPlaying(false);
            });
        }, { once: true });

        audio.addEventListener('error', () => {
            console.error("Error loading audio:", audio.error);
            setIsLoading(false);
            setIsPlaying(false);
        }, { once: true });

        audio.load();
    }

    const handleTogglePlay = () => {
        if (currentStation) {
            if (isPlaying) {
                audioRefs.current[currentStation]?.pause();
                stopMetadataInterval();
                setIsPlaying(false);
            } else if (!isLoading) {
                audioRefs.current[currentStation]?.play();
                startMetadataInterval(currentStation);
                setIsPlaying(true);
            }
        }
    }

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        if (gainNode) {
            gainNode.gain.setValueAtTime(newVolume, audioContext?.currentTime || 0);
        }
        Object.values(audioRefs.current).forEach(audio => {
            audio.volume = newVolume;
        });
        setIsMuted(newVolume === 0);
    };

    const handleMuteToggle = () => {
        setIsMuted(!isMuted);
        if (currentStation) {
            audioRefs.current[currentStation].volume = isMuted ? volume : 0;
        }
    };

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

    const handleReload = () => {
        if (currentStation) {
            setIsLoading(true);
            setIsPlaying(false);

            const audio = audioRefs.current[currentStation];
            if (audio) {
                audio.pause();
                audio.currentTime = 0;

                audio.load();
                audio.play().then(() => {
                    setIsLoading(false);
                    setIsPlaying(true);
                }).catch(error => {
                    console.error("Error reloading audio:", error);
                    setIsLoading(false);
                    setIsPlaying(false);
                });
            } else {
                console.error("Audio element not found for current station");
                setIsLoading(false);
            }

            fetchMetadata(currentStation);
            startMetadataInterval(currentStation);
        }
    };

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
                                    disabled={isLoading && currentStation === station.url}
                                >
                                    {isLoading && currentStation === station.url ? 'Loading...' :
                                        currentStation === station.url && isPlaying ? 'Pause' : 'Play'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                {gainNode && <Equalizer gainNode={gainNode} />}
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
                isLoading={isLoading}
            />
        </div>
    )
}

export default Airwave