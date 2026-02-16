'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import {
    Plus,
    Trash2,
    Settings,
    Activity,
    Database,
    Zap,
    Play,
    Pause,
    SkipBack,
    BrainCircuit,
    Table,
    Terminal
} from 'lucide-react';
import {
    calculateFCFS,
    calculateSSTF,
    calculateSCAN,
    calculateCSCAN,
    calculateLOOK,
    calculateCLOOK,
    DiskRequest,
    DiskResult
} from '@/lib/algorithms';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { InteractiveParticles } from './InteractiveParticles';
import DiskPlatter from './DiskPlatter';

const ALGORITHMS = ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'];

const COLORS: Record<string, string> = {
    FCFS: '#6366f1',
    SSTF: '#10b981',
    SCAN: '#f59e0b',
    'C-SCAN': '#8b5cf6',
    LOOK: '#ec4899',
    'C-LOOK': '#06b6d4',
};

const PRESETS = [
    { name: "Ping-Pong", requests: [10, 190, 15, 185, 20, 180], desc: "Extreme span test" },
    { name: "Cluster", requests: [50, 52, 48, 55, 45, 51], desc: "High density area" },
    { name: "Sequential", requests: [10, 20, 30, 40, 50, 60], desc: "Burst direction" },
    { name: "Chaos", requests: [190, 10, 150, 40, 120, 30], desc: "Randomized stress" }
];

type StepData = {
    step: number;
    [key: string]: number;
};

const STORAGE_KEY = 'disk-optimizer-v4-pro-stable';

const DEFAULT_REQUESTS: DiskRequest[] = [98, 183, 37, 122, 14, 124, 65, 67].map((c, idx) => ({
    id: `init-${idx}`,
    cylinder: c,
    sector: (idx * 45) % 360
}));

export default function DiskScheduler() {
    // Basic state with safe defaults for SSR
    const [initialHead, setInitialHead] = useState<number>(50);
    const [diskSize, setDiskSize] = useState<number>(200);
    const [requests, setRequests] = useState<DiskRequest[]>(DEFAULT_REQUESTS);
    const [direction, setDirection] = useState<'left' | 'right'>('right');
    const [isMounted, setIsMounted] = useState(false);

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    // UI State
    const [newCyl, setNewCyl] = useState<string>('');
    const [soloAlgo, setSoloAlgo] = useState<string | null>(null);
    const [logs, setLogs] = useState<{ msg: string, type: 'info' | 'warn' | 'success', time: string }[]>([]);

    const addLog = (msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
        const time = new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [{ msg, type, time }, ...prev].slice(0, 10));
    };

    // Hydration & Initial Load
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsMounted(true);
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if (data.initialHead !== undefined) setInitialHead(data.initialHead);
                    if (data.diskSize !== undefined) setDiskSize(data.diskSize);
                    if (data.requests !== undefined) setRequests(data.requests);
                    if (data.direction !== undefined) setDirection(data.direction);
                } catch (e) {
                    console.error("Hydration load failed", e);
                }
            }
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    // Persistence: Save only
    useEffect(() => {
        if (isMounted) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ initialHead, diskSize, requests, direction }));
        }
    }, [initialHead, diskSize, requests, direction, isMounted]);

    const results: Record<string, DiskResult> = useMemo(() => {
        return {
            FCFS: calculateFCFS(initialHead, requests),
            SSTF: calculateSSTF(initialHead, requests),
            SCAN: calculateSCAN(initialHead, requests, diskSize, direction),
            'C-SCAN': calculateCSCAN(initialHead, requests, diskSize, direction),
            LOOK: calculateLOOK(initialHead, requests, direction),
            'C-LOOK': calculateCLOOK(initialHead, requests, direction),
        };
    }, [initialHead, requests, diskSize, direction]);

    useEffect(() => {
        setTimeout(() => {
            if (soloAlgo) addLog(`Switched focus to ${soloAlgo}`, 'info');
            else addLog('Switched to multi-track view', 'info');
        }, 0);
    }, [soloAlgo]);

    const maxSteps = useMemo(() => {
        return Math.max(...Object.values(results).map(r => r.sequence.length));
    }, [results]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isPlaying && currentStep < maxSteps - 1) {
            timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, 800 / playbackSpeed);
        } else if (isPlaying && currentStep >= maxSteps - 1) {
            timer = setTimeout(() => setIsPlaying(false), 0);
        }
        return () => clearTimeout(timer);
    }, [isPlaying, currentStep, maxSteps, playbackSpeed]);

    const chartData = useMemo(() => {
        return Array.from({ length: maxSteps }, (_, i) => {
            const entry: StepData = { step: i + 1 };
            Object.entries(results).forEach(([name, res]) => {
                const isVisible = (soloAlgo === null || soloAlgo === name);
                if (isVisible && i <= currentStep) {
                    // If the algorithm's sequence is finished, keep showing its last position
                    // to prevent the line from disappearing or "getting stuck" abruptly.
                    const dataIndex = Math.min(i, res.sequence.length - 1);
                    entry[name] = res.sequence[dataIndex];
                }
            });
            return entry;
        });
    }, [results, currentStep, maxSteps, soloAlgo]);

    const handlePlayPause = () => {
        if (currentStep >= maxSteps - 1) {
            setCurrentStep(0);
        }
        const newState = !isPlaying;
        setIsPlaying(newState);
        addLog(newState ? 'Playback started' : 'Playback paused', newState ? 'info' : 'warn');
    };

    const metricsData = useMemo(() => {
        return Object.entries(results).map(([name, res]) => ({
            name,
            seekCount: res.totalSeekCount,
            operationalTime: res.totalOperationalTime,
            color: COLORS[name]
        })).sort((a, b) => a.operationalTime - b.operationalTime);
    }, [results]);

    const observation = useMemo(() => {
        if (requests.length === 0) return "Awaiting configuration...";
        const best = metricsData[0];
        const worst = metricsData[metricsData.length - 1];

        let text = `Simulation identifies ${best.name} as peak efficiency, clocking ${best.operationalTime.toFixed(1)}ms total Op-Time. `;
        if (worst.name === 'FCFS') text += "FCFS shows heavy mechanical penalty due to drive-head distance. ";
        return text;
    }, [metricsData, requests]);

    const handleAddRequest = (manualVal?: number) => {
        const val = manualVal !== undefined ? manualVal : parseInt(newCyl);
        if (!isNaN(val) && val >= 0 && val < diskSize) {
            const timestamp = Date.now();
            setRequests(prev => [...prev, { id: `req-${timestamp}`, cylinder: val, sector: (prev.length * 40) % 360 }]);
            setNewCyl('');
            setIsPlaying(false);
            setCurrentStep(0);
            addLog(`Request queued: Track ${val}`, 'success');
        }
    };

    const applyPreset = (preset: typeof PRESETS[0]) => {
        const pReqs: DiskRequest[] = preset.requests.map((c, i) => ({ id: `p-${i}-${Date.now()}`, cylinder: c, sector: (i * 30) % 360 }));
        setRequests(pReqs);
        setIsPlaying(false);
        setCurrentStep(0);
    };
    // ANIMATION VARIANTS
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.98 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.6, ease: "easeOut" }
        }
    };

    const headerVariants: Variants = {
        hidden: { opacity: 0, y: -40 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: "circOut" }
        }
    };

    return (
        <div className="relative min-h-screen text-slate-200 selection:bg-indigo-500/30 overflow-x-hidden">
            <InteractiveParticles />

            <motion.div
                initial="hidden"
                animate={isMounted ? "visible" : "hidden"}
                variants={containerVariants}
                className="max-w-[1700px] mx-auto px-6 py-8 space-y-10"
            >
                <motion.header
                    variants={headerVariants}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8"
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-500" style={{ color: COLORS[soloAlgo || 'FCFS'] }}>
                            <BrainCircuit className="w-4 h-4" />
                            Expert Simulation Environment
                        </div>
                        <h1 className="text-4xl font-black gradient-text tracking-tight">
                            Disk Optimization Suite <span className="text-indigo-500/50 text-2xl font-light italic">v4.2 Pro</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <motion.div whileHover={{ scale: 1.02 }} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase text-slate-500">Target Track</span>
                            <span className="text-xl font-black font-mono text-indigo-400">
                                {results[soloAlgo || 'FCFS'].sequence[currentStep] ?? 'NULL'}
                            </span>
                        </motion.div>
                    </div>
                </motion.header>

                <main className="grid grid-cols-12 gap-8">
                    {/* LEFT PANEL */}
                    <motion.div variants={itemVariants} className="col-span-12 lg:col-span-3 space-y-6">
                        <section className="glass-card p-6 space-y-8">
                            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <Settings className="w-4 h-4" /> Machine State
                            </h3>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Head Origin</label>
                                    <input type="number" value={initialHead} onChange={(e) => { setInitialHead(parseInt(e.target.value) || 0); setCurrentStep(0); setIsPlaying(false); }}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-all font-mono text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Track Count</label>
                                    <input type="number" value={diskSize} onChange={(e) => setDiskSize(parseInt(e.target.value) || 200)}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-all font-mono text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Mechanical Direction</label>
                                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/40 border border-white/5 rounded-xl">
                                        {(['left', 'right'] as const).map((dir) => (
                                            <button key={dir} onClick={() => { setDirection(dir); setCurrentStep(0); setIsPlaying(false); }}
                                                className={`py-2 text-[10px] font-black rounded-lg transition-all ${direction === dir ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-400'}`}>
                                                {dir.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Load Architecture Presets</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {PRESETS.map(p => (
                                        <button key={p.name} onClick={() => applyPreset(p)} className="text-left p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition-all">
                                            <p className="text-[10px] font-bold text-slate-300">{p.name}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Database className="w-3.5 h-3.5" /> Pipeline
                                    </h3>
                                    <button onClick={() => { setRequests([]); setCurrentStep(0); setIsPlaying(false); }} className="text-[9px] text-rose-500 font-bold uppercase">Purge</button>
                                </div>
                                <div className="relative">
                                    <input type="number" placeholder="Track num..." value={newCyl} onChange={(e) => setNewCyl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddRequest()}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl pl-4 pr-10 py-3 outline-none focus:border-indigo-500/50 transition-all font-mono text-sm" />
                                    <button onClick={() => handleAddRequest()} className="absolute right-2 top-2 p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500 transition-all hover:text-white">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-[150px] overflow-y-auto custom-scrollbar">
                                    {requests.map((r, i) => (
                                        <div key={r.id} className="group flex items-center gap-2 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                                            <span className="text-[9px] font-mono font-bold">{r.cylinder}</span>
                                            <button onClick={() => { setRequests(requests.filter((_, idx) => idx !== i)); setCurrentStep(0); setIsPlaying(false); }} className="opacity-0 group-hover:opacity-100 text-rose-500 transition-all">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </motion.div>

                    <motion.div variants={itemVariants} className="col-span-12 lg:col-span-9 space-y-8">
                        <section className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><SkipBack className="w-5 h-5" /></button>
                                <button onClick={handlePlayPause} className={`p-5 rounded-[2rem] transition-all shadow-xl ${isPlaying ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-indigo-600 text-white'}`}>
                                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                                </button>
                                <div className="hidden sm:block h-10 w-px bg-white/10" />
                                <div className="flex items-center gap-2 p-1 bg-black/40 rounded-2xl">
                                    {[0.5, 1, 2, 4].map(s => (
                                        <button key={s} onClick={() => setPlaybackSpeed(s)} className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all ${playbackSpeed === s ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{s}x</button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mr-2">Focus Mode:</span>
                                <button onClick={() => setSoloAlgo(null)} className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${soloAlgo === null ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-transparent border-white/5 text-slate-500'}`}>MULTI-TRACK</button>
                                {ALGORITHMS.map(a => (
                                    <button key={a} onClick={() => setSoloAlgo(a)} className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${soloAlgo === a ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-slate-500'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[a] }} /> {a}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="grid grid-cols-12 gap-8">
                            <div className="col-span-12 xl:col-span-8 space-y-8">
                                <section className="glass-card overflow-hidden">
                                    <div className="px-8 py-5 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                            <Activity className="w-4 h-4 text-indigo-500" /> Trajectory Feed
                                        </h3>
                                        <div className="text-[10px] font-bold text-indigo-400/50 font-mono">STEP {currentStep + 1} / {maxSteps}</div>
                                    </div>
                                    <div className="p-8 h-[450px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="10 10" stroke="rgba(255,255,255,0.02)" vertical={false} />
                                                <XAxis dataKey="step" hide />
                                                <YAxis domain={[0, diskSize]} stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                                                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
                                                {Object.entries(COLORS).map(([name, color]) => (
                                                    (soloAlgo === null || soloAlgo === name) && (
                                                        <Line key={name} type="monotone" dataKey={name} stroke={color} strokeWidth={soloAlgo === name ? 4 : 2} dot={{ r: 3, fill: color }} isAnimationActive={false} />
                                                    )
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </section>

                                <section className="glass-card p-6 bg-indigo-500/[0.03] border-indigo-500/10 flex items-start gap-5">
                                    <div className="p-3 bg-indigo-500/10 rounded-2xl"><BrainCircuit className="w-6 h-6 text-indigo-400" /></div>
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Heuristic Intelligence Node</h4>
                                        <p className="text-sm text-slate-400 leading-relaxed font-medium italic">&quot;{observation}&quot;</p>
                                    </div>
                                </section>
                            </div>

                            <div className="col-span-12 xl:col-span-4 space-y-8">
                                <section className="glass-card p-8 flex flex-col items-center">
                                    <DiskPlatter
                                        headPos={results[soloAlgo || 'FCFS'].sequence[currentStep] || initialHead}
                                        diskSize={diskSize}
                                        active={isPlaying}
                                        requests={requests}
                                        onTrackClick={handleAddRequest}
                                        themeColor={COLORS[soloAlgo || 'FCFS']}
                                    />
                                </section>

                                <section className="glass-card p-6 space-y-5">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                                        Performance Delta <Zap className="w-4 h-4 text-emerald-500" />
                                    </h3>
                                    <div className="space-y-3">
                                        {metricsData.map((item, idx) => (
                                            <div key={item.name} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-200">{item.name}</span>
                                                    <span className="text-[9px] font-bold text-slate-600 uppercase">RANK: {idx + 1}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black font-mono leading-none">{item.operationalTime.toFixed(1)}ms</p>
                                                    <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">Total Ops Time</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>
                        <section className="glass-card overflow-hidden mb-8">
                            <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                    <Terminal className="w-4 h-4 text-indigo-500" /> Kernel Audit Console
                                </h3>
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-rose-500/50" />
                                    <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                                    <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                                </div>
                            </div>
                            <div className="p-4 bg-black/40 font-mono text-[10px] h-[160px] overflow-y-auto custom-scrollbar space-y-1.5">
                                {logs.length === 0 ? (
                                    <div className="text-slate-600 italic">Static link established. Awaiting hardware interrupts...</div>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="flex gap-3">
                                            <span className="text-slate-600">[{log.time}]</span>
                                            <span className={
                                                log.type === 'success' ? 'text-emerald-400' :
                                                    log.type === 'warn' ? 'text-rose-400' : 'text-indigo-400'
                                            }>
                                                {log.type.toUpperCase()}:
                                            </span>
                                            <span className="text-slate-300">{log.msg}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="glass-card overflow-hidden">
                            <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                    <Table className="w-4 h-4 text-slate-400" /> Audit Trail & Metadata
                                </h3>
                            </div>
                            <div className="p-0 overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white/[0.02]">
                                        <tr>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Algorithm</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 text-center">Seek Trace</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 text-right">Raw Units</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03]">
                                        {Object.entries(results).map(([name, res]) => (
                                            <tr key={name} className="hover:bg-white/[0.01] transition-colors">
                                                <td className="px-8 py-5 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[name] }} />
                                                        <span className="text-xs font-black text-slate-200">{name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                                                        {res.sequence.map((cyl, i) => (
                                                            <div key={i} className={`flex items-center gap-1 text-[10px] font-mono ${i <= currentStep ? 'text-indigo-400 font-bold' : 'text-slate-700'}`}>
                                                                {cyl} {i < res.sequence.length - 1 && <span className="text-slate-800 opacity-50 px-1">→</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right align-top">
                                                    <span className="text-xs font-bold font-mono text-slate-400">{res.totalSeekCount}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </motion.div>
                </main>

                <motion.footer variants={itemVariants} className="pt-20 pb-10 flex flex-col items-center gap-4 opacity-40">
                    <div className="h-px w-24 border-t border-indigo-500/20" />
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.8em] text-center">High-Fidelity Virtual Mechanical Disk Resource • CIA-3 OS RESOURCE</p>
                </motion.footer>
            </motion.div>
        </div>
    );
}
