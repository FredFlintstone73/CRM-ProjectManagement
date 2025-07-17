import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
  life: number;
}

interface CelebrationParticlesProps {
  isActive: boolean;
  duration?: number;
}

export function CelebrationParticles({ isActive, duration = 3000 }: CelebrationParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    // Create initial particles
    const initialParticles: Particle[] = [];
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    
    for (let i = 0; i < 30; i++) {
      initialParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        velocity: {
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 10 - 5,
        },
        life: 1,
      });
    }

    setParticles(initialParticles);

    // Animate particles
    const interval = setInterval(() => {
      setParticles(prevParticles => 
        prevParticles.map(particle => ({
          ...particle,
          x: particle.x + particle.velocity.x,
          y: particle.y + particle.velocity.y,
          velocity: {
            ...particle.velocity,
            y: particle.velocity.y + 0.3, // gravity
          },
          life: particle.life - 0.02,
        })).filter(particle => particle.life > 0)
      );
    }, 16);

    // Clear after duration
    const timeout = setTimeout(() => {
      setParticles([]);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isActive, duration]);

  if (!isActive || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          style={{
            position: 'absolute',
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: '50%',
            opacity: particle.life,
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
        />
      ))}
    </div>
  );
}

// Confetti component for more celebration
export function Confetti({ isActive }: { isActive: boolean }) {
  const [confettiPieces, setConfettiPieces] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isActive) {
      setConfettiPieces([]);
      return;
    }

    const pieces: Particle[] = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    
    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        velocity: {
          x: (Math.random() - 0.5) * 4,
          y: Math.random() * 3 + 2,
        },
        life: 1,
      });
    }

    setConfettiPieces(pieces);

    const interval = setInterval(() => {
      setConfettiPieces(prevPieces => 
        prevPieces.map(piece => ({
          ...piece,
          x: piece.x + piece.velocity.x,
          y: piece.y + piece.velocity.y,
          velocity: {
            ...piece.velocity,
            y: piece.velocity.y + 0.1,
          },
          life: piece.y > window.innerHeight ? 0 : piece.life,
        })).filter(piece => piece.life > 0)
      );
    }, 16);

    const timeout = setTimeout(() => {
      setConfettiPieces([]);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isActive]);

  if (!isActive || confettiPieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          style={{
            position: 'absolute',
            left: piece.x,
            top: piece.y,
            width: piece.size,
            height: piece.size * 0.6,
            backgroundColor: piece.color,
            borderRadius: '2px',
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}