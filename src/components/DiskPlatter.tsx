'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface DiskPlatterProps {
    headPos: number;
    diskSize: number;
    active: boolean;
    requests: { cylinder: number; sector: number }[];
    onTrackClick?: (track: number) => void;
    themeColor: string;
}

export default function DiskPlatter({ headPos, diskSize, active, requests, onTrackClick, themeColor }: DiskPlatterProps) {
    const [hoverTrack, setHoverTrack] = useState<number | null>(null);
    const platterRef = useRef<HTMLDivElement>(null);

    // Calculate normalized position (0 to 1)
    const normalizedPos = headPos / diskSize;
    const armRotation = (normalizedPos * 40) - 20; // -20 to 20 degree swing

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!platterRef.current) return;

        const rect = platterRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // This is a rough approximation for the isometric tilt
        // We'll calculate distance from center and map it to track (0-diskSize)
        const dx = e.clientX - centerX;
        const dy = (e.clientY - centerY) * 1.8; // Compensate for X-tilt (55deg)
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Map the distance to a track number
        // The platter has a margin, we assume the actual disk is between 15% and 85% of center-to-edge
        const maxDist = rect.width / 2;
        const innerBound = maxDist * 0.1;
        const outerBound = maxDist * 0.9;

        if (distance >= innerBound && distance <= outerBound) {
            const track = Math.round(((distance - innerBound) / (outerBound - innerBound)) * diskSize);
            setHoverTrack(Math.min(diskSize, Math.max(0, track)));
        } else {
            setHoverTrack(null);
        }
    };

    const [ripples, setRipples] = useState<{ id: number, x: number, y: number }[]>([]);

    const handleClick = (e: React.MouseEvent) => {
        if (hoverTrack !== null && onTrackClick && platterRef.current) {
            onTrackClick(hoverTrack);

            const rect = platterRef.current.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;

            // Add ripple
            const id = Date.now();
            setRipples(prev => [...prev, { id, x: relX, y: relY }]);
            setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 1000);
        }
    };

    return (
        <div
            className="relative w-full aspect-square max-w-[400px] flex items-center justify-center p-4 overflow-visible cursor-crosshair group"
            style={{ perspective: '1200px' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverTrack(null)}
            onClick={handleClick}
        >
            {/* Click Ripples */}
            {ripples.map(r => (
                <motion.div
                    key={r.id}
                    initial={{ opacity: 0.8, scale: 0 }}
                    animate={{ opacity: 0, scale: 4 }}
                    className="absolute w-20 h-20 rounded-full border-2 border-white/50 pointer-events-none z-50 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    style={{ left: r.x - 40, top: r.y - 40 }}
                />
            ))}
            {/* Dynamic Ambient Atmos Glow */}
            <div
                className="absolute inset-0 rounded-full blur-[100px] opacity-20 transition-colors duration-1000"
                style={{ backgroundColor: themeColor }}
            />

            {/* 3D Isometric Container */}
            <div
                ref={platterRef}
                className="relative w-full h-full pointer-events-none"
                style={{ transformStyle: 'preserve-3d', transform: 'rotateX(55deg) rotateZ(-35deg)' }}
            >

                {/* Central Spindle Hub */}
                <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[120px] bg-slate-700 rounded-full border border-white/10"
                    style={{ transform: 'translateZ(0px)', transformStyle: 'preserve-3d' }}
                />

                {/* THE PLATTER STACK - 4 Layers */}
                {[0, 1, 2, 3].map((layer) => (
                    <div
                        key={layer}
                        className="absolute inset-0 flex items-center justify-center pointer-events-auto"
                        style={{ transform: `translateZ(${layer * 25}px)` }}
                    >
                        {/* Shadow for deeper layers */}
                        <div className="absolute inset-2 rounded-full bg-black/40 blur-md pointer-events-none" />

                        {/* Metallic Platter Body */}
                        <motion.div
                            animate={active ? { rotate: 360 } : {}}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="relative w-full h-full rounded-full border-[10px] border-slate-800 bg-slate-900 overflow-hidden"
                            style={{
                                background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
                                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)'
                            }}
                        >
                            {/* Surface Texture */}
                            <div className="absolute inset-0 bg-[repeating-conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.03)_10deg,transparent_20deg,rgba(255,255,255,0.03)_30deg)]" />

                            {/* Track Grooves */}
                            {[...Array(8)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute inset-0 border border-white/5 rounded-full"
                                    style={{ margin: `${(i + 1) * 10}%` }}
                                />
                            ))}

                            {/* "Digital Twin" Data Density Pixels */}
                            {requests.map((req, i) => (
                                <div
                                    key={i}
                                    className="absolute w-1 h-1 bg-indigo-500 rounded-full blur-[1px] shadow-[0_0_5px_rgba(99,102,241,0.8)]"
                                    style={{
                                        left: `${50 + (10 + (req.cylinder / diskSize) * 35) * Math.cos(req.sector * Math.PI / 180)}%`,
                                        top: `${50 + (10 + (req.cylinder / diskSize) * 35) * Math.sin(req.sector * Math.PI / 180)}%`,
                                    }}
                                />
                            ))}

                            {/* Center Hub */}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-slate-800 rounded-full border border-white/10 shadow-xl flex items-center justify-center">
                                <div className="w-4 h-4 bg-slate-700 rounded-full border border-white/5" />
                            </div>
                        </motion.div>
                    </div>
                ))}

                {/* Interactive Track Hover Ring */}
                {hoverTrack !== null && (
                    <div
                        className="absolute inset-0 border border-white/30 rounded-full pointer-events-none"
                        style={{
                            margin: `${(hoverTrack / diskSize) * 40 + 5}%`,
                            transform: 'translateZ(95px)',
                            boxShadow: '0 0 10px rgba(255,255,255,0.3)'
                        }}
                    />
                )}

                {/* THE SYNCED HEAD STACK - 4 Arms */}
                {[0, 1, 2, 3].map((layer) => (
                    <div
                        key={`arm-${layer}`}
                        className="absolute right-[5%] top-[15%] h-px bg-transparent origin-right"
                        style={{
                            width: '45%',
                            transform: `translateZ(${layer * 25 + 5}px) rotate(${armRotation}deg)`,
                            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <div className="absolute right-0 top-[-6px] w-full h-3 flex items-center">
                            <div
                                className="w-full h-full bg-gradient-to-l rounded-full shadow-lg relative transition-colors duration-500"
                                style={{
                                    backgroundImage: `linear-gradient(to left, ${themeColor}, #4f46e5)`,
                                    boxShadow: `0 0 15px ${themeColor}66`
                                }}
                            >
                                <div className="absolute left-0 top-[-2px] w-4 h-5 bg-slate-300 rounded-sm shadow-md flex items-center justify-center">
                                    <div
                                        className="w-1.5 h-1.5 rounded-full animate-pulse transition-colors duration-500"
                                        style={{ backgroundColor: themeColor }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Active Data Flash Ring */}
                <motion.div
                    animate={active ? { opacity: [0, 0.8, 0], scale: [0.95, 1.02, 0.95] } : { opacity: 0 }}
                    transition={{ duration: 0.3, repeat: Infinity }}
                    className="absolute inset-0 border-2 rounded-full blur-[2px] pointer-events-none"
                    style={{
                        margin: `${(normalizedPos * 40) + 5}%`,
                        transform: 'translateZ(105px)',
                        borderColor: themeColor
                    }}
                />
            </div>

            {/* Interactive Overlay Info */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between py-10">
                <div className="flex flex-col items-center gap-1">
                    <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{hoverTrack !== null ? `Inject: Track ${hoverTrack}` : 'Hover Disk to Map'}</span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-slate-500 uppercase">Live Sensor</span>
                        <span className="text-xs font-mono font-bold" style={{ color: themeColor }}>{headPos} Cyl</span>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-slate-500 uppercase">Storage Cluster</span>
                        <span className="text-xs font-mono font-bold text-slate-200">{requests.length} NODES</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
