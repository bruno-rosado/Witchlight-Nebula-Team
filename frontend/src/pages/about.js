import React, { useEffect } from "react";

const About = () => {
  useEffect(() => {
    // ---- STAR BACKGROUND SCRIPT ----
    const canvas = document.getElementById("space");
    const context = canvas.getContext("2d");
    let screenH = window.innerHeight;
    let screenW = window.innerWidth;
    canvas.width = screenW;
    canvas.height = screenH;

    const numStars = 50;
    const stars = [];

    class Star {
      constructor(x, y, length, opacity) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.opacity = opacity;
        this.factor = 1;
        this.increment = Math.random() * 0.03;
      }

      draw() {
        context.save();
        context.translate(this.x, this.y);
        this.updateOpacity();
        this.drawStarShape(context);
        context.restore();
      }

      updateOpacity() {
        if (this.opacity > 1) this.factor = -1;
        else if (this.opacity <= 0) {
          this.factor = 1;
          this.x = Math.random() * screenW;
          this.y = Math.random() * screenH;
        }
        this.opacity += this.increment * this.factor;
      }

      drawStarShape(ctx) {
        ctx.beginPath();
        for (let i = 5; i--;) {
          ctx.lineTo(0, this.length);
          ctx.translate(0, this.length);
          ctx.rotate(Math.PI * 2 / 10);
          ctx.lineTo(0, -this.length);
          ctx.translate(0, -this.length);
          ctx.rotate(-Math.PI * 6 / 10);
        }
        ctx.lineTo(0, this.length);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.shadowBlur = 5;
        ctx.shadowColor = "#ff0000";
        ctx.fill();
      }
    }

    // Create stars
    for (let i = 0; i < numStars; i++) {
      stars.push(
        new Star(
          Math.random() * screenW,
          Math.random() * screenH,
          1 + Math.random() * 2,
          Math.random()
        )
      );
    }

    const animate = () => {
      context.clearRect(0, 0, screenW, screenH);
      stars.forEach((star) => star.draw());
      requestAnimationFrame(animate);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      screenH = window.innerHeight;
      screenW = window.innerWidth;
      canvas.width = screenW;
      canvas.height = screenH;
    };

    window.addEventListener("resize", handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
      <canvas
        id="space"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          background: "linear-gradient(to bottom, #020111 10%, #3a3a52 100%)",
          zIndex: -1,
        }}
      ></canvas>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          color: "white",
          textAlign: "center",
          paddingTop: "40vh",
          fontSize: "2rem",
        }}
      >
        About Page ✨
      </div>
    </div>
  );
};

export default About;
