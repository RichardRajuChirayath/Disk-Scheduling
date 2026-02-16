'use client';

import React, { useEffect, useRef } from 'react';

class Ember {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    opacity: number;
    maxOpacity: number;
    color: string;

    constructor(width: number, height: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.2;
        this.speedY = (Math.random() - 0.5) * 0.2;
        this.maxOpacity = Math.random() * 0.4 + 0.1;
        this.opacity = 0;
        this.color = Math.random() > 0.5 ? '#6366f1' : '#a5b4fc'; // Indigo or Light Blue
    }

    update(width: number, height: number, mouse: { x: number, y: number }) {
        this.x += this.speedX;
        this.y += this.speedY;

        const dx = (mouse.x - width / 2) * 0.01;
        const dy = (mouse.y - height / 2) * 0.01;

        const currentX = this.x + dx;
        const currentY = this.y + dy;

        if (this.x > width) this.x = 0;
        else if (this.x < 0) this.x = width;
        if (this.y > height) this.y = 0;
        else if (this.y < 0) this.y = height;

        if (this.opacity < this.maxOpacity) {
            this.opacity += 0.005;
        }

        return { currentX, currentY };
    }

    draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.size * 4);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.arc(x, y, this.size * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(x, y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export const InteractiveParticles = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let embers: Ember[] = [];
        const mouse = { x: 0, y: 0 };

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const init = () => {
            embers = [];
            const count = (canvas.width * canvas.height) / 20000;
            for (let i = 0; i < Math.min(count, 80); i++) {
                embers.push(new Ember(canvas.width, canvas.height));
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            embers.forEach(ember => {
                const { currentX, currentY } = ember.update(canvas.width, canvas.height, mouse);
                ember.draw(ctx, currentX, currentY);
            });
            requestAnimationFrame(animate);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        handleResize();
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div className="fixed inset-0 -z-10 bg-[#020617]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05),transparent_50%)]" />
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none opacity-60"
            />
            <div className="absolute inset-0 opacity-[0.02] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:60px_60px]" />
        </div>
    );
};
