import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBackgroundProps {
  className?: string;
  variant?: 'matrix' | 'particles' | 'waves' | 'neural';
  color?: string;
}

export function AnimatedBackground({ 
  className,
  variant = 'matrix',
  color = 'rgb(16, 185, 129)'
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation variants
    const animations = {
      matrix: () => {
        // Matrix rain effect
        const fontSize = 14;
        const columns = Math.floor(canvas.width / fontSize);
        const drops: number[] = new Array(columns).fill(1);
        const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

        const draw = () => {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = color;
          ctx.font = `${fontSize}px monospace`;

          for (let i = 0; i < drops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
              drops[i] = 0;
            }
            drops[i]++;
          }
        };

        const animate = () => {
          draw();
          animationRef.current = requestAnimationFrame(animate);
        };
        animate();
      },

      particles: () => {
        // Floating particles effect
        interface Particle {
          x: number;
          y: number;
          vx: number;
          vy: number;
          radius: number;
          opacity: number;
        }

        const particles: Particle[] = [];
        const particleCount = 100;

        for (let i = 0; i < particleCount; i++) {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.2
          });
        }

        const draw = () => {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          particles.forEach(particle => {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', `, ${particle.opacity})`);
            ctx.fill();

            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Wrap around edges
            if (particle.x < 0) particle.x = canvas.width;
            if (particle.x > canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = canvas.height;
            if (particle.y > canvas.height) particle.y = 0;

            // Connect nearby particles
            particles.forEach(other => {
              const dx = particle.x - other.x;
              const dy = particle.y - other.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < 100) {
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(other.x, other.y);
                ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', `, ${0.1 * (1 - distance / 100)})`);
                ctx.stroke();
              }
            });
          });
        };

        const animate = () => {
          draw();
          animationRef.current = requestAnimationFrame(animate);
        };
        animate();
      },

      waves: () => {
        // Wave animation
        let time = 0;

        const draw = () => {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const waveCount = 3;
          const waveHeight = 50;

          for (let i = 0; i < waveCount; i++) {
            ctx.beginPath();
            ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', `, ${0.3 - i * 0.1})`);
            ctx.lineWidth = 2;

            for (let x = 0; x < canvas.width; x++) {
              const y = canvas.height / 2 + 
                Math.sin((x * 0.01) + time + (i * Math.PI / 3)) * waveHeight +
                Math.sin((x * 0.02) + time * 1.5 + (i * Math.PI / 2)) * waveHeight / 2;
              
              if (x === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.stroke();
          }

          time += 0.02;
        };

        const animate = () => {
          draw();
          animationRef.current = requestAnimationFrame(animate);
        };
        animate();
      },

      neural: () => {
        // Neural network visualization
        interface Node {
          x: number;
          y: number;
          vx: number;
          vy: number;
          connections: number[];
        }

        const nodes: Node[] = [];
        const nodeCount = 50;

        for (let i = 0; i < nodeCount; i++) {
          nodes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            connections: []
          });
        }

        // Create connections
        nodes.forEach((node, i) => {
          const connectionCount = Math.floor(Math.random() * 3) + 1;
          for (let j = 0; j < connectionCount; j++) {
            const target = Math.floor(Math.random() * nodeCount);
            if (target !== i) {
              node.connections.push(target);
            }
          }
        });

        const draw = () => {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw connections
          nodes.forEach((node, i) => {
            node.connections.forEach(targetIndex => {
              const target = nodes[targetIndex];
              const distance = Math.sqrt(
                Math.pow(node.x - target.x, 2) + 
                Math.pow(node.y - target.y, 2)
              );

              if (distance < 200) {
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(target.x, target.y);
                ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', `, ${0.2 * (1 - distance / 200)})`);
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            });
          });

          // Draw nodes
          nodes.forEach((node, i) => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            // Pulse effect
            const pulseRadius = 4 + Math.sin(Date.now() * 0.003 + i) * 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, pulseRadius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', ', 0.3)');
            ctx.stroke();

            // Update position
            node.x += node.vx;
            node.y += node.vy;

            // Bounce off edges
            if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

            // Keep in bounds
            node.x = Math.max(0, Math.min(canvas.width, node.x));
            node.y = Math.max(0, Math.min(canvas.height, node.y));
          });
        };

        const animate = () => {
          draw();
          animationRef.current = requestAnimationFrame(animate);
        };
        animate();
      }
    };

    // Start the selected animation
    animations[variant]();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [variant, color]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'fixed inset-0 pointer-events-none opacity-30',
        className
      )}
      style={{ zIndex: -1 }}
    />
  );
}