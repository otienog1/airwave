import React, { useState, useEffect, useRef } from 'react';

interface EqualizerProps {
    gainNode: GainNode;
}

const Equalizer: React.FC<EqualizerProps> = ({ gainNode }) => {
    const [low, setLow] = useState(0);
    const [mid, setMid] = useState(0);
    const [high, setHigh] = useState(0);

    const lowFilterRef = useRef<BiquadFilterNode | null>(null);
    const midFilterRef = useRef<BiquadFilterNode | null>(null);
    const highFilterRef = useRef<BiquadFilterNode | null>(null);

    useEffect(() => {
        const audioContext = gainNode.context;

        lowFilterRef.current = audioContext.createBiquadFilter();
        lowFilterRef.current.type = 'lowshelf';
        lowFilterRef.current.frequency.value = 320;
        lowFilterRef.current.gain.value = low;

        midFilterRef.current = audioContext.createBiquadFilter();
        midFilterRef.current.type = 'peaking';
        midFilterRef.current.frequency.value = 1000;
        midFilterRef.current.Q.value = 0.5;
        midFilterRef.current.gain.value = mid;

        highFilterRef.current = audioContext.createBiquadFilter();
        highFilterRef.current.type = 'highshelf';
        highFilterRef.current.frequency.value = 3200;
        highFilterRef.current.gain.value = high;

        gainNode.disconnect();
        gainNode
            .connect(lowFilterRef.current)
            .connect(midFilterRef.current)
            .connect(highFilterRef.current)
            .connect(audioContext.destination);

        return () => {
            if (lowFilterRef.current && midFilterRef.current && highFilterRef.current) {
                lowFilterRef.current.disconnect();
                midFilterRef.current.disconnect();
                highFilterRef.current.disconnect();
            }
            gainNode.disconnect();
            gainNode.connect(audioContext.destination);
        };
    }, [gainNode]);

    useEffect(() => {
        if (lowFilterRef.current) {
            lowFilterRef.current.gain.setValueAtTime(low, gainNode.context.currentTime);
        }
        if (midFilterRef.current) {
            midFilterRef.current.gain.setValueAtTime(mid, gainNode.context.currentTime);
        }
        if (highFilterRef.current) {
            highFilterRef.current.gain.setValueAtTime(high, gainNode.context.currentTime);
        }
    }, [low, mid, high, gainNode]);

    const handleChange = (setValue: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(Number(e.target.value));
    };

    return (
        <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-4 mt-4">
            <h3 className="text-white text-lg font-semibold mb-4">Equalizer</h3>
            <div className="flex justify-between items-end space-x-4">
                {[
                    { label: 'Low', value: low, setValue: setLow },
                    { label: 'Mid', value: mid, setValue: setMid },
                    { label: 'High', value: high, setValue: setHigh },
                ].map(({ label, value, setValue }) => (
                    <div key={label} className="flex flex-col items-center">
                        <input
                            type="range"
                            min="-12"
                            max="12"
                            value={value}
                            onChange={handleChange(setValue)}
                            className="w-6 h-32 appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:w-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gray-300"
                            style={{ writingMode: 'vertical-lr' }}
                        />
                        <span className="text-white mt-2">{label}</span>
                        <span className="text-white text-sm">{value}dB</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Equalizer;