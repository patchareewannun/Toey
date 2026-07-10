import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gamepad2,
  Play,
  RotateCcw,
  Trophy,
  Sparkles,
  Heart,
  Settings,
  ChevronLeft,
  Flame,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameState, KeyBindings, PlayerStats } from './types';
import { GameCanvas } from './components/GameCanvas';

// --- RETRO SOUND SYNTHESIZER ---
class RetroSynth {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playPunch() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playSkill() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playPickup() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Quick two-tone sparkling arpeggio
    [330, 440, 554, 659].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.08, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.06 + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.12);
    });
  }

  playHit() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    // Exploding noise simulation using low triangle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(20, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playBossSpawn() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [60, 55, 50].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.2);
      osc.frequency.linearRampToValueAtTime(freq - 10, now + idx * 0.2 + 0.35);
      gain.gain.setValueAtTime(0.3, now + idx * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.2 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.2);
      osc.stop(now + idx * 0.2 + 0.35);
    });
  }

  playGameOver() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [220, 196, 174, 146].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.25);
      gain.gain.setValueAtTime(0.15, now + idx * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.25 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.25);
      osc.stop(now + idx * 0.25 + 0.4);
    });
  }

  playVictory() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Radiant arcade fanfare
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.12, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.3);
    });
  }
}

const synth = new RetroSynth();

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [keyBindings, setKeyBindings] = useState<KeyBindings>({
    moveUp: 'KeyW',
    moveDown: 'KeyS',
    moveLeft: 'KeyA',
    moveRight: 'KeyD',
    attack: 'KeyP',
    skill: 'KeyO',
  });
  
  // Custom Rebinding State
  const [activeRebindAction, setActiveRebindAction] = useState<keyof KeyBindings | null>(null);
  
  // Player Real-time HUD stats
  const [stats, setStats] = useState<PlayerStats>({
    health: 5,
    maxHealth: 5,
    score: 0,
    kills: 0,
    skillCooldown: 0,
    skillReady: true,
    attackCooldown: 0,
  });

  // Boss Health Bar Status
  const [bossActive, setBossActive] = useState(false);
  const [bossHP, setBossHP] = useState({ current: 12, max: 12 });
  const [showBossWarning, setShowBossWarning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // Synchronize sound state
  useEffect(() => {
    synth.enabled = soundOn;
  }, [soundOn]);

  const handleStatsUpdate = (newStats: PlayerStats) => {
    // Sound alerts for status changes
    setStats((prev) => {
      if (newStats.health < prev.health) {
        synth.playHit();
      } else if (newStats.health > prev.health) {
        synth.playPickup();
      }
      return newStats;
    });
  };

  const handleBossSpawned = (spawned: boolean) => {
    if (spawned) {
      synth.playBossSpawn();
      setBossActive(true);
      setShowBossWarning(true);
      // Fade out warning marquee after 3.5s
      setTimeout(() => {
        setShowBossWarning(false);
      }, 3500);
    } else {
      setBossActive(false);
    }
  };

  const handleBossHealthUpdate = (current: number, max: number) => {
    setBossHP({ current, max });
    if (current <= 0) {
      setBossActive(false);
    }
  };

  const handleGameOver = () => {
    synth.playGameOver();
    setGameState(GameState.GAMEOVER);
  };

  const handleGameClear = () => {
    synth.playVictory();
    setGameState(GameState.GAMECLEAR);
  };

  const toggleSound = () => {
    synth.playClick();
    setSoundOn(!soundOn);
  };

  // Convert raw javascript key codes to pretty visual letters
  const getFriendlyKeyName = (code: string) => {
    if (!code) return 'UNBOUND';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code === 'ArrowUp') return '↑';
    if (code === 'ArrowDown') return '↓';
    if (code === 'ArrowLeft') return '←';
    if (code === 'ArrowRight') return '→';
    if (code === 'Space') return 'SPACE';
    return code;
  };

  // Bind new action key
  useEffect(() => {
    if (!activeRebindAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const code = e.code;
      
      // Prevent duplicate mappings if desired, but allow it for freedom
      setKeyBindings((prev) => ({
        ...prev,
        [activeRebindAction]: code,
      }));
      setActiveRebindAction(null);
      synth.playClick();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRebindAction]);

  const startGame = () => {
    synth.playClick();
    setGameState(GameState.PLAYING);
    // Reset stats
    setStats({
      health: 5,
      maxHealth: 5,
      score: 0,
      kills: 0,
      skillCooldown: 0,
      skillReady: true,
      attackCooldown: 0,
    });
    setBossActive(false);
  };

  return (
    <div id="game-viewport-container" className="relative w-screen h-screen bg-[#050505] text-white overflow-hidden font-sans">
      
      {/* Sound Toggle HUD Overlay in Corner */}
      <button
        onClick={toggleSound}
        className="absolute top-4 right-4 z-50 p-3 rounded-lg border border-white/10 bg-black/85 hover:bg-[#ff4e00]/20 hover:border-[#ff4e00] active:scale-95 transition-all text-neutral-400 hover:text-white cursor-pointer"
        title="Toggle Audio Effects"
        id="btn-sound-toggle"
      >
        {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      <AnimatePresence mode="wait">
        
        {/* --- MAIN MENU SCREEN --- */}
        {gameState === GameState.MENU && (
          <motion.div
            key="menu-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6 z-40"
            style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.9) 100%)' }}
            id="menu-screen"
          >
            <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
              {/* Game Logo */}
              <motion.img
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 90 }}
                src="https://res.cloudinary.com/dsucg33fv/image/upload/v1782709347/logo_i8827v.png"
                alt="8-Way RPG Game Logo"
                className="w-full h-auto object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] mb-10"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              
              {/* Fallback Header if image has issues */}
              <h1 className="text-3xl font-black tracking-widest text-center text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 to-neutral-400 font-sans uppercase mb-6 block md:hidden">
                CHRONO BURST
              </h1>

              {/* Sub-header */}
              <div className="mb-10 text-center">
                <p className="text-[#888888] text-[10px] tracking-[4px] uppercase mb-1 font-mono">
                  RETRO 3D SPRITE ARENA
                </p>
                <div className="h-[2px] w-12 bg-[#ff4e00] mx-auto" />
              </div>

              {/* Menu Buttons styled with Sophisticated Dark specifications */}
              <div className="flex flex-col gap-4 w-full">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startGame}
                  className="sophisticated-btn flex items-center justify-center gap-3 w-full cursor-pointer font-sans"
                  style={{ letterSpacing: '4px' }}
                  id="btn-start-game"
                >
                  <Play size={16} className="fill-white stroke-none" />
                  Enter Realm
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    synth.playClick();
                    setGameState(GameState.OPTIONS);
                  }}
                  className="sophisticated-btn flex items-center justify-center gap-3 w-full cursor-pointer font-sans"
                  style={{ letterSpacing: '4px' }}
                  id="btn-options"
                >
                  <Settings size={16} />
                  Control Mapping
                </motion.button>

                <div
                  className="sophisticated-btn flex items-center justify-center gap-3 w-full opacity-40 cursor-not-allowed select-none font-sans"
                  style={{ letterSpacing: '4px' }}
                >
                  Exit Game
                </div>
              </div>

              {/* Control Mappings Layout with Sophisticated Dark styling */}
              <div className="options-subtext mt-12 flex flex-col items-center gap-3 text-xs text-[#888888]">
                <div className="flex items-center gap-2">
                  <span>
                    <span className="sophisticated-key-hint">W</span>
                    <span className="sophisticated-key-hint">A</span>
                    <span className="sophisticated-key-hint">S</span>
                    <span className="sophisticated-key-hint">D</span>
                  </span>
                  <span className="uppercase tracking-wider text-[10px]">Move</span>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <span className="sophisticated-key-hint">P</span>
                    <span className="uppercase tracking-wider text-[10px]">Attack</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="sophisticated-key-hint">O</span>
                    <span className="uppercase tracking-wider text-[10px]">Burst Skill</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Version watermark in bottom margin */}
            <div className="absolute bottom-5 left-5 text-[9px] text-[#888888] tracking-widest uppercase font-mono select-none pointer-events-none">
              BUILD V1.0.4 - EXPERIMENTAL RENDERER
            </div>
          </motion.div>
        )}

        {/* --- OPTIONS / CONTROLS REBINDING SCREEN --- */}
        {gameState === GameState.OPTIONS && (
          <motion.div
            key="options-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6 z-40"
            style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.9) 100%)' }}
            id="options-screen"
          >
            <div className="relative z-10 max-w-lg w-full bg-[#121212]/90 border border-white/10 rounded-lg p-8 shadow-2xl">
              {/* Back button */}
              <button
                onClick={() => {
                  synth.playClick();
                  setGameState(GameState.MENU);
                }}
                className="flex items-center gap-1.5 text-neutral-400 hover:text-[#ff4e00] transition-colors mb-8 text-[11px] uppercase tracking-widest font-mono"
                id="btn-back-menu"
              >
                <ChevronLeft size={14} />
                Back to Menu
              </button>

              <div className="text-center mb-8 font-sans">
                <Gamepad2 size={32} className="text-[#ff4e00] mx-auto mb-3" />
                <h2 className="text-xl font-bold tracking-[4px] uppercase text-neutral-100">
                  Controls Configuration
                </h2>
                <div className="h-[2px] w-12 bg-[#ff4e00] mx-auto mt-2 mb-3" />
                <p className="text-[#888888] text-xs font-mono">
                  CLICK ANY ACTION FIELD BELOW TO REBIND KEY MAPPING
                </p>
              </div>

              {/* Binding list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {[
                  { label: 'Move Up', action: 'moveUp' as keyof KeyBindings },
                  { label: 'Move Down', action: 'moveDown' as keyof KeyBindings },
                  { label: 'Move Left', action: 'moveLeft' as keyof KeyBindings },
                  { label: 'Move Right', action: 'moveRight' as keyof KeyBindings },
                  { label: 'Normal Punch', action: 'attack' as keyof KeyBindings },
                  { label: 'Burst Skill', action: 'skill' as keyof KeyBindings },
                ].map(({ label, action }) => {
                  const isRebinding = activeRebindAction === action;
                  return (
                    <div
                      key={action}
                      className={`flex items-center justify-between p-3.5 rounded border transition-all ${
                        isRebinding
                          ? 'border-[#ff4e00] bg-[#ff4e00]/15 shadow-[0_0_15px_rgba(255,78,0,0.25)]'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
                      }`}
                    >
                      <span className="text-sm text-neutral-300 font-sans font-medium tracking-wide uppercase text-[11px]">{label}</span>
                      <button
                        onClick={() => {
                          synth.playClick();
                          setActiveRebindAction(action);
                        }}
                        className={`min-w-[5.5rem] py-1.5 px-3 rounded font-mono text-xs font-semibold uppercase tracking-wider text-center border active:scale-95 transition-all ${
                          isRebinding
                            ? 'bg-[#ff4e00] border-transparent text-white animate-pulse'
                            : 'bg-black/50 border-white/10 text-[#ff4e00] hover:border-[#ff4e00] hover:text-white'
                        }`}
                        id={`btn-rebind-${action}`}
                      >
                        {isRebinding ? 'Press Key...' : getFriendlyKeyName(keyBindings[action])}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Instructions */}
              <div className="p-4 bg-black/40 border border-white/5 rounded text-center">
                <p className="text-[11px] text-[#888888] uppercase tracking-wider leading-relaxed font-mono">
                  * ALL CHANGES ARE SAVED INSTANTLY. CONFIG KEYS DRIVE CHARACTER ACTIONS ON THE RETRO ARENA.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- ACTIVE GAMEPLAY SCREEN (Contains 3D Game + HUD) --- */}
        {gameState === GameState.PLAYING && (
          <div key="playing-screen" className="absolute inset-0 w-full h-full" id="playing-viewport">
            
            {/* The 3D Three.js Context Layer */}
            <GameCanvas
              gameState={gameState}
              keyBindings={keyBindings}
              onGameOver={handleGameOver}
              onGameClear={handleGameClear}
              onStatsUpdate={handleStatsUpdate}
              onBossHealthUpdate={handleBossHealthUpdate}
              onBossSpawned={handleBossSpawned}
            />

            {/* --- SOPHISTICATED HUD INTERFACE OVERLAY --- */}
            <div className="absolute top-8 left-8 right-8 z-30 pointer-events-none select-none flex justify-between items-start">
              
              {/* Left Side: Health Vitality and Burst Skill */}
              <div className="flex flex-col gap-5">
                <div className="health-container pointer-events-auto">
                  <div className="text-[10px] uppercase tracking-[2px] text-[#888888] font-mono mb-1.5 font-bold">
                    Player Vitality
                  </div>
                  <div className="flex gap-2" id="hud-hp-hearts">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: idx < stats.health ? 1 : 0.85 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                      >
                        {idx < stats.health ? (
                          <div
                            className="w-8 h-8 bg-contain bg-no-repeat filter drop-shadow-[0_0_5px_#ff4e00]"
                            style={{ backgroundImage: "url('https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/potion.png')" }}
                          />
                        ) : (
                          <div
                            className="w-8 h-8 bg-contain bg-no-repeat opacity-20 grayscale"
                            style={{ backgroundImage: "url('https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/potion.png')" }}
                          />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Skill Cooldown display */}
                <div className="pointer-events-auto">
                  <div className="text-[10px] uppercase tracking-[2px] text-[#888888] font-mono mb-1 font-bold">
                    Burst Skill
                  </div>
                  <div className="flex items-center justify-between w-48 bg-[#121212]/85 border border-white/10 px-3.5 py-2 rounded">
                    <div className="flex items-center gap-1.5">
                      <Flame size={14} className={stats.skillCooldown > 0 ? 'text-[#888888]' : 'text-[#ff4e00] animate-pulse'} />
                      <span className="text-[10px] font-bold font-mono text-neutral-300">BURST</span>
                    </div>
                    
                    {stats.skillCooldown > 0 ? (
                      <span className="text-[11px] font-mono font-bold text-[#ffaa00]">
                        {stats.skillCooldown.toFixed(1)}s
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-extrabold text-[#ff4e00] uppercase tracking-wider animate-pulse">
                        READY ({getFriendlyKeyName(keyBindings.skill)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Score, Enemies Defeated, and Boss Status */}
              <div className="stats-panel flex flex-col items-end pointer-events-auto text-right font-mono">
                <div className="text-[10px] uppercase tracking-[2px] text-[#888888] font-bold mb-0.5">Score</div>
                <div className="text-2xl font-bold text-[#ff4e00] mb-3 leading-none">
                  {stats.score.toString().padStart(5, '0')}
                </div>

                <div className="text-[10px] uppercase tracking-[2px] text-[#888888] font-bold mb-0.5">Enemies Defeated</div>
                <div className="text-2xl font-bold text-[#ff4e00] mb-3 leading-none" id="hud-kills">
                  {stats.kills.toString().padStart(2, '0')} / 10
                </div>

                <div className="text-[10px] uppercase tracking-[2px] text-[#888888] font-bold mb-0.5">Boss Status</div>
                <div className="text-2xl font-bold leading-none" style={{ color: bossActive ? '#ffaa00' : '#888888' }}>
                  {bossActive ? 'ACTIVE' : (stats.kills >= 8 ? 'SPAWNING' : 'AWAITING')}
                </div>
              </div>

            </div>

            {/* 2. Boss Marquee Warnings */}
            <AnimatePresence>
              {showBossWarning && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.1, opacity: 0 }}
                  className="absolute inset-x-0 top-1/4 mx-auto z-40 max-w-sm bg-[#121212]/95 border border-[#ff4e00]/50 rounded p-6 text-center shadow-[0_0_30px_rgba(255,78,0,0.3)] pointer-events-none select-none"
                  id="boss-warning-hud"
                >
                  <Flame size={32} className="text-[#ff4e00] mx-auto animate-bounce mb-3" />
                  <h3 className="text-2xl font-extrabold tracking-[4px] text-[#ff4e00] font-sans uppercase animate-pulse">
                    Boss Approaching!
                  </h3>
                  <p className="text-neutral-300 text-[11px] mt-2 font-mono uppercase tracking-wider">
                    DEFEAT THE GIANT MONSTER! BEWARE THE FALLING FIREBALLS!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3. Boss Health Status Bar */}
            <AnimatePresence>
              {bossActive && (
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -50, opacity: 0 }}
                  className="absolute top-32 inset-x-0 mx-auto max-w-sm z-30 pointer-events-none select-none px-4"
                  id="boss-hp-bar"
                >
                  <div className="bg-[#121212]/95 border border-white/10 rounded p-3 shadow-2xl">
                    <div className="flex items-center justify-between mb-1.5 font-mono">
                      <span className="text-[10px] font-bold text-[#ff4e00] tracking-wider uppercase flex items-center gap-1">
                        <Flame size={12} className="text-[#ff4e00] animate-pulse" />
                        ANCIENT DEMONIC OVERLORD
                      </span>
                      <span className="text-[10px] font-bold text-neutral-300">
                        {bossHP.current} / {bossHP.max} HP
                      </span>
                    </div>

                    {/* Outer Bar */}
                    <div className="h-2 w-full bg-black/60 border border-white/5 rounded-sm overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#ff4e00] to-orange-500 shadow-[0_0_8px_rgba(255,78,0,0.5)]"
                        initial={{ width: '100%' }}
                        animate={{ width: `${(bossHP.current / bossHP.max) * 100}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick in-game controller reference at bottom right */}
            <div className="absolute bottom-6 right-6 z-30 bg-black/85 border border-white/10 px-3 py-1.5 rounded text-[9px] font-mono text-[#888888] tracking-widest uppercase">
              PUNCH: <span className="text-white">{getFriendlyKeyName(keyBindings.attack)}</span> | SKILL: <span className="text-white">{getFriendlyKeyName(keyBindings.skill)}</span>
            </div>

          </div>
        )}

        {/* --- GAME OVER OUTCOME SCREEN --- */}
        {gameState === GameState.GAMEOVER && (
          <motion.div
            key="gameover-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6 z-40 bg-[#050505]"
            id="game-over-screen"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,78,0,0.1)_0%,rgba(0,0,0,0.95)_100%)] pointer-events-none" />

            <div className="relative z-10 text-center max-w-sm w-full font-sans">
              <div className="h-16 w-16 bg-[#ff4e00]/10 border border-[#ff4e00]/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart size={28} className="text-[#ff4e00] animate-pulse fill-[#ff4e00]/30" />
              </div>

              <h2 className="text-3xl font-black tracking-[6px] text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 to-[#ff4e00] uppercase mb-3 font-sans">
                GAME OVER
              </h2>
              <p className="text-[#888888] text-[11px] mb-8 leading-relaxed font-mono uppercase tracking-wider">
                YOUR LITALITY HAS BEEN DRAINED BY THE BEAST SWARM.
              </p>

              {/* Stats Review Card */}
              <div className="bg-[#121212]/90 border border-white/10 rounded p-5 mb-8 grid grid-cols-2 gap-4 text-center font-mono">
                <div>
                  <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-bold mb-1">FINAL SCORE</span>
                  <span className="text-2xl font-extrabold text-[#ff4e00]">
                    {stats.score}
                  </span>
                </div>
                <div className="border-l border-white/5">
                  <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-bold mb-1">TOTAL KILLS</span>
                  <span className="text-2xl font-extrabold text-neutral-100">
                    {stats.kills}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startGame}
                  className="sophisticated-btn flex items-center justify-center gap-2.5 w-full cursor-pointer"
                  style={{ letterSpacing: '4px' }}
                  id="btn-retry-game"
                >
                  <RotateCcw size={14} />
                  Try Again
                </motion.button>

                <button
                  onClick={() => {
                    synth.playClick();
                    setGameState(GameState.MENU);
                  }}
                  className="w-full py-4 rounded bg-[#121212] hover:bg-[#ff4e00]/10 border border-white/10 hover:border-[#ff4e00] text-xs font-mono tracking-widest text-[#888888] hover:text-white transition-all uppercase cursor-pointer"
                  id="btn-quit-game"
                >
                  Back to Main Menu
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- GAME CLEAR / VICTORY ENDING SCREEN --- */}
        {gameState === GameState.GAMECLEAR && (
          <motion.div
            key="gameclear-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6 z-40 bg-[#050505]"
            id="game-clear-screen"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,215,0,0.05)_0%,rgba(0,0,0,0.95)_100%)] pointer-events-none" />

            <div className="relative z-10 text-center max-w-md w-full bg-[#121212]/90 border border-white/10 rounded p-8 shadow-2xl font-sans">
              <div className="h-16 w-16 bg-[#ff4e00]/10 border border-[#ff4e00]/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy size={28} className="text-[#ff4e00] animate-bounce" />
              </div>

              <h2 className="text-2xl font-black tracking-[6px] text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 to-[#ff4e00] uppercase mb-3 font-sans">
                VICTORY CLEAR
              </h2>
              <p className="text-neutral-400 text-xs mb-8 leading-relaxed font-mono uppercase tracking-wider">
                DEMONIC OVERLORD DEFEATED. PORTAL EXITED. RETRO COLOSEUM ESCAPED.
              </p>

              {/* Stats Review Card */}
              <div className="bg-black/50 border border-white/5 rounded p-5 mb-8 grid grid-cols-3 gap-2 text-center font-mono">
                <div>
                  <span className="text-[9px] text-[#888888] uppercase tracking-wider block font-bold mb-1">FINAL SCORE</span>
                  <span className="text-xl font-black text-[#ff4e00]">
                    {stats.score}
                  </span>
                </div>
                <div className="border-l border-white/5">
                  <span className="text-[9px] text-[#888888] uppercase tracking-wider block font-bold mb-1">FOES SLAIN</span>
                  <span className="text-xl font-black text-neutral-100">
                    {stats.kills}
                  </span>
                </div>
                <div className="border-l border-white/5">
                  <span className="text-[9px] text-[#888888] uppercase tracking-wider block font-bold mb-1">HP LEFT</span>
                  <span className="text-xl font-black text-rose-500 flex items-center justify-center gap-0.5">
                    <Heart size={12} className="fill-[#ff4e00] text-transparent" />
                    {stats.health}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-black/30 border border-white/5 rounded mb-8 flex items-center gap-3 text-left">
                <Sparkles size={20} className="text-[#ff4e00] shrink-0" />
                <p className="text-[10px] text-[#888888] leading-normal font-mono uppercase tracking-wide">
                  THANK YOU FOR PLAYING! REBOOT TO RE-ENTER THE REALM OR CUSTOMIZE CONFIGS IN OPTIONS.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startGame}
                  className="sophisticated-btn flex items-center justify-center gap-2.5 w-full cursor-pointer"
                  style={{ letterSpacing: '4px' }}
                  id="btn-play-again"
                >
                  <RotateCcw size={14} />
                  Play Again
                </motion.button>

                <button
                  onClick={() => {
                    synth.playClick();
                    setGameState(GameState.MENU);
                  }}
                  className="w-full py-4 rounded bg-[#121212] hover:bg-[#ff4e00]/10 border border-white/10 hover:border-[#ff4e00] text-xs font-mono tracking-widest text-[#888888] hover:text-white transition-all uppercase cursor-pointer"
                  id="btn-victory-back-menu"
                >
                  Return to Main Menu
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
