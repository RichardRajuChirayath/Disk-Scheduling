'use client';

import React, { useEffect, useRef } from 'react';

class Particle {
    x: number;
    y: number;
    size: number;
    baseX: number;
    baseY: number;
    density: number;
    speedX: number;
    speedY: number;
    color: string;
    opacity: number;

    constructor(width: number, height: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.baseX = this.x;
        this.baseY = this.y;
        this.size = Math.random() * 2 + 1;
        this.density = (Math.random() * 30) + 1;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;

        // Premium color palette: Indigo, Violet, Cyan
        const colors = ['#6366f1', '#8b5cf6', '#06b6d4'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = Math.random() * 0.5 + 0.2;
    }

    update(width: number, height: number, mouse: { x: number | null, y: number | null, radius: number }) {
        // Drift movement
        this.x += this.speedX;
        this.y += this.speedY;

        // Boundary check
        if (this.x > width || this.x < 0) this.speedX *= -1;
        if (this.y > height || this.y < 0) this.speedY *= -1;

        // Mouse Interactivity
        if (mouse.x !== null && mouse.y !== null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mouse.radius) {
                const force = (mouse.radius - distance) / mouse.radius;
                const directionX = dx / distance;
                const directionY = dy / distance;
                const moveX = directionX * force * this.density * 0.5;
                const moveY = directionY * force * this.density * 0.5;

                this.x -= moveX;
                this.y -= moveY;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.fill();

        // Add subtle glow to each particle
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
    }
}

export const InteractiveParticles = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouse = useRef<{ x: number | null, y: number | null, radius: number }>({
        x: null,
        y: null,
        radius: 150
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: Particle[] = [];
        let animationFrameId: number;

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.current.x = e.clientX;
            mouse.current.y = e.clientY;
        };

        const handleMouseLeave = () => {
            mouse.current.x = null;
            mouse.current.y = null;
        };

        const init = () => {
            particles = [];
            // Desktop vs Mobile density
            const numberOfParticles = (canvas.width * canvas.height) / 15000;
            for (let i = 0; i < Math.min(numberOfParticles, 120); i++) {
                particles.push(new Particle(canvas.width, canvas.height));
            }
        };

        const connect = () => {
            let opacityValue = 1;
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        opacityValue = 1 - (distance / 150);
                        ctx.strokeStyle = `rgba(99, 102, 241, ${opacityValue * 0.2})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Reset shadows for lines to keep them sharp
            ctx.shadowBlur = 0;
            connect();

            for (let i = 0; i < particles.length; i++) {
                particles[i].update(canvas.width, canvas.height, mouse.current);
                particles[i].draw(ctx);
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        handleResize();
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="fixed inset-0 -z-10 bg-[#020617] overflow-hidden">
            {/* Ambient gradients for depth */}
            <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
            />

            {/* Subtle tech grid Overlay */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(to right, #4f46e5 1px, transparent 1px), linear-gradient(to bottom, #4f46e5 1px, transparent 1px)`,
                    backgroundSize: '80px 80px'
                }}
            />

            {/* Noise grain for texture */}
            <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
    );
};
