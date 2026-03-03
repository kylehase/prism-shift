/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, 
  Trophy, 
  Info, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Zap
} from 'lucide-react';
import { Tile, Color, Direction, MIX_RULES, COLOR_MAP, NUMERIC_MAP } from './types';

const GRID_SIZE = 4;

const App: React.FC = () => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const nextId = useRef(0);

  // Initialize game
  const initGame = useCallback(() => {
    const initialTiles: Tile[] = [];
    nextId.current = 0;
    
    // Add two random tiles
    addRandomTile(initialTiles);
    addRandomTile(initialTiles);
    
    setTiles(initialTiles);
    setScore(0);
    setGameOver(false);
  }, []);

  useEffect(() => {
    const savedBest = localStorage.getItem('prism-shift-best');
    if (savedBest) setBestScore(parseInt(savedBest));
    initGame();
  }, [initGame]);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('prism-shift-best', score.toString());
    }
  }, [score, bestScore]);

  const addRandomTile = (currentTiles: Tile[]) => {
    const occupied = new Set(currentTiles.map(t => `${t.x},${t.y}`));
    const emptySpots: {x: number, y: number}[] = [];
    
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!occupied.has(`${x},${y}`)) {
          emptySpots.push({ x, y });
        }
      }
    }

    if (emptySpots.length === 0) return;

    const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
    const colors: Color[] = ['red', 'blue', 'yellow'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    currentTiles.push({
      id: `tile-${nextId.current++}`,
      color,
      value: NUMERIC_MAP[color],
      x: spot.x,
      y: spot.y,
      isNew: true
    });
  };

  const move = useCallback((direction: Direction) => {
    if (gameOver) return;

    setTiles(prevTiles => {
      const newTiles: Tile[] = prevTiles.map(t => ({ ...t, isNew: false, isMerged: false }));
      let moved = false;

      const isVertical = direction === 'UP' || direction === 'DOWN';
      const isForward = direction === 'RIGHT' || direction === 'DOWN';

      for (let i = 0; i < GRID_SIZE; i++) {
        // Get tiles in current row/column
        const line = newTiles.filter(t => (isVertical ? t.x === i : t.y === i));
        
        // Sort line based on direction
        line.sort((a, b) => {
          const valA = isVertical ? a.y : a.x;
          const valB = isVertical ? b.y : b.x;
          return isForward ? valB - valA : valA - valB;
        });

        const processedLine: Tile[] = [];
        
        for (let j = 0; j < line.length; j++) {
          const current = line[j];
          const last = processedLine[processedLine.length - 1];

          // Check for merge
          if (last && !last.isMerged) {
            const mixKey = `${last.color}+${current.color}`;
            const reverseMixKey = `${current.color}+${last.color}`;
            const resultColor = MIX_RULES[mixKey] || MIX_RULES[reverseMixKey];

            // Same color merge (only for white)
            const isBothWhite = last.color === 'white' && current.color === 'white';
            
            if (resultColor || isBothWhite) {
              // Merge!
              const newColor = resultColor || 'white';
              last.color = newColor;
              last.value = resultColor ? NUMERIC_MAP[newColor] : (last.value + current.value);
              last.isMerged = true;
              
              // Remove current tile
              const index = newTiles.findIndex(t => t.id === current.id);
              if (index !== -1) newTiles.splice(index, 1);
              
              setScore(s => s + last.value * 10);
              moved = true;
              continue;
            }
          }

          // Move tile to furthest possible spot
          const targetPos = processedLine.length;
          const currentPos = isVertical ? current.y : current.x;
          const finalPos = isForward ? (GRID_SIZE - 1 - targetPos) : targetPos;

          if (currentPos !== finalPos) {
            if (isVertical) current.y = finalPos;
            else current.x = finalPos;
            moved = true;
          }

          processedLine.push(current);
        }
      }

      if (moved) {
        addRandomTile(newTiles);
        // Check game over
        if (newTiles.length === GRID_SIZE * GRID_SIZE) {
          // Check if any merges are possible
          // (Simplified for now: if board is full, game over)
          // Real 2048 checks adjacent tiles
          setGameOver(true);
        }
      }

      return [...newTiles];
    });
  }, [gameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': move('UP'); break;
        case 'ArrowDown': move('DOWN'); break;
        case 'ArrowLeft': move('LEFT'); break;
        case 'ArrowRight': move('RIGHT'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Touch controls
  const touchStart = useRef<{x: number, y: number} | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 30) {
      if (absX > absY) {
        move(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        move(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    touchStart.current = null;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 select-none">
      {/* Header */}
      <div className="w-full max-w-[400px] flex justify-between items-end mb-8">
        <div>
          <h1 className="text-5xl font-extrabold font-display tracking-tighter text-white">
            PRISM<span className="text-white/40">SHIFT</span> 30
          </h1>
          <p className="text-white/50 text-sm font-medium uppercase tracking-widest mt-1">
            Mix to reach the light
          </p>
        </div>
        <div className="flex gap-2">
          <div className="glass-panel px-4 py-2 flex flex-col items-center min-w-[80px]">
            <span className="text-[10px] uppercase tracking-tighter text-white/40 font-bold">Score</span>
            <span className="text-xl font-bold font-display">{score}</span>
          </div>
          <div className="glass-panel px-4 py-2 flex flex-col items-center min-w-[80px]">
            <span className="text-[10px] uppercase tracking-tighter text-white/40 font-bold">Best</span>
            <span className="text-xl font-bold font-display">{bestScore}</span>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div 
        className="relative glass-panel p-1.5 w-full max-w-[400px] aspect-square shadow-2xl overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid Background */}
        <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="p-1.5 w-full h-full">
              <div className="bg-white/5 rounded-lg w-full h-full" />
            </div>
          ))}
        </div>

        {/* Tiles */}
        <AnimatePresence>
          {tiles.map(tile => (
            <motion.div
              key={tile.id}
              initial={tile.isNew ? { scale: 0, opacity: 0 } : false}
              animate={{ 
                x: tile.x * 100 + '%', 
                y: tile.y * 100 + '%',
                scale: 1,
                opacity: 1
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute p-1.5"
              style={{ 
                width: `${100 / GRID_SIZE}%`, 
                height: `${100 / GRID_SIZE}%`,
                left: 0,
                top: 0
              }}
            >
              <div 
                className="w-full h-full rounded-lg flex items-center justify-center relative overflow-hidden tile-shadow"
                style={{ 
                  backgroundColor: COLOR_MAP[tile.color],
                  boxShadow: `0 0 20px ${COLOR_MAP[tile.color]}44`
                }}
              >
                <span className={`font-black text-2xl font-display ${tile.color === 'white' ? 'text-black' : 'text-white/90'}`}>
                  {tile.value}
                </span>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <h2 className="text-4xl font-black font-display mb-2">SPECTRUM FULL</h2>
              <p className="text-white/60 mb-8">The colors have settled. Your journey ends here.</p>
              <button 
                onClick={initGame}
                className="bg-white text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <RotateCcw size={20} />
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls & Info */}
      <div className="w-full max-w-[400px] mt-8 flex justify-between items-center">
        <div className="flex gap-2">
          <button 
            onClick={initGame}
            className="glass-panel p-3 hover:bg-white/10 transition-colors"
            title="Restart"
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="glass-panel p-3 hover:bg-white/10 transition-colors"
            title="Rules"
          >
            <Info size={20} />
          </button>
        </div>
        
        <div className="flex items-center gap-0.5 text-white/20">
          <ChevronLeft size={20} />
          <div className="flex flex-col items-center">
            <ChevronUp size={20} className="mb-[-2px]" />
            <ChevronDown size={20} className="mt-[-2px]" />
          </div>
          <ChevronRight size={20} />
        </div>
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowInfo(false)}
          >
            <div 
              className="glass-panel p-8 max-w-md w-full bg-[#111] border-white/20"
              onClick={e => e.stopPropagation()}
            >
              <div className="space-y-6 text-white/80">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <Zap className="text-yellow-400" size={24} />
                    <h3 className="text-2xl font-bold font-display">How to Play</h3>
                  </div>
                  <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                    <span>Swipe</span>
                    <span className="opacity-50">•</span>
                    <span>Arrows</span>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* Prime Colors Section */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase text-white/40 tracking-wider">The Prime Elements</p>
                    <p className="text-sm leading-relaxed">
                      Red, Blue, and Yellow are your <span className="text-white font-semibold">Prime Colors</span>. Each is assigned a <span className="text-white font-semibold">Prime Number</span>. 
                      Colors and numbers work the same; they are just different representations of primes.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/5">
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                        <span className="text-xs font-medium">Red = 2</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/5">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                        <span className="text-xs font-medium">Blue = 3</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/5">
                        <div className="w-3.5 h-3.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                        <span className="text-xs font-medium">Yellow = 5</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mixes Section */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase text-white/40 tracking-wider">Mixing Rules</p>
                      <p className="text-[13px] leading-snug mb-2">Mixing tiles <span className="italic">multiplies</span> their numbers, but you can only mix <span className="text-white font-semibold">factors of 30</span>.</p>
                      <ul className="text-xs space-y-3 bg-white/5 rounded-xl p-4 border border-white/5">
                        <li className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500" /> 2 × <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> 3 = <div className="w-2.5 h-2.5 rounded-full bg-purple-500" /> 6
                        </li>
                        <li className="flex items-center gap-2 opacity-40 grayscale">
                           2 ×  6 = <span className="text-red-400 font-bold">Invalid (12)</span>
                        </li>
                      </ul>
                    </div>

                    {/* Goal Section */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase text-white/40 tracking-wider">The Ultimate Goal</p>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            <span className="text-black font-bold text-sm">30</span>
                          </div>
                          <p className="text-sm font-semibold">Reach White Light</p>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">
                          Once you achieve <span className="text-white font-bold">30</span>, merge White tiles to sum their values and maximize your score.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowInfo(false)}
                className="w-full mt-8 bg-white text-black py-3 rounded-xl font-bold hover:bg-white/90 transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-12 text-white/20 text-[10px] uppercase tracking-[0.2em] font-bold">
        A Kinetic Color Experiment
      </div>
    </div>
  );
};

export default App;
