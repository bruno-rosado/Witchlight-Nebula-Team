import React, { useEffect } from "react";

const About = () => {
  useEffect(() => {
  const canvas = document.getElementById("space");
  const context = canvas.getContext("2d");

  let screenH = window.innerHeight;
  let screenW = window.innerWidth;
  canvas.width = screenW;
  canvas.height = screenH;

  // ---------- STARFIELD ----------
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
      this.drawStarShape();
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

    drawStarShape() {
      context.beginPath();
      for (let i = 5; i--;) {
        context.lineTo(0, this.length);
        context.translate(0, this.length);
        context.rotate(Math.PI * 2 / 10);
        context.lineTo(0, -this.length);
        context.translate(0, -this.length);
        context.rotate(-Math.PI * 6 / 10);
      }
      context.closePath();
      context.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
      context.shadowBlur = 5;
      context.shadowColor = "#ff0000";
      context.fill();
    }
  }

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

  // ---------- 🚀 ROCKET ----------
  const rocket = new Image();
  rocket.src = "/rocket_clipart.png"; // from public folder
  const rocketWidth = 100;
  const rocketHeight = 180;
  let rocketX = screenW - rocketWidth - 50;
  let rocketY = screenH - rocketHeight - 50;

  // ---------- SMOKE PARTICLES ----------
  const smokeParticles = [];

  class SmokeParticle {
    constructor(x, y) {
      this.x = x + (Math.random() * 15 - 7.5);
      this.y = y;
      this.size = 10 + Math.random() * 15;
      this.opacity = 0.15 + Math.random() * 0.15; // more transparent
      this.speedY = 0.8 + Math.random() * 1.5;
      this.speedX = Math.random() * 0.6 - 0.3;
      this.life = 10 + Math.random() * 30;
      this.fadeRate = 0.0015 + Math.random() * 0.001; // slower fade for smoother disappearance
    }

    draw() {
      context.save();
      const gradient = context.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.size
      );
      gradient.addColorStop(0, `rgba(220,220,220,${this.opacity})`);
      gradient.addColorStop(1, `rgba(150,150,150,0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      this.opacity -= this.fadeRate;
      this.life--;
    }
  }

  const addSmoke = () => {
    for (let i = 0; i < 3; i++) {
      smokeParticles.push(
        new SmokeParticle(rocketX + rocketWidth / 2, rocketY + rocketHeight)
      );
    }
  };

  // ---------- ANIMATE ----------
  const animate = () => {
    context.clearRect(0, 0, screenW, screenH);

    // Stars in background
    stars.forEach((star) => star.draw());

    // 🚀 Draw rocket FIRST
    context.drawImage(rocket, rocketX, rocketY, rocketWidth, rocketHeight);

    // Smoke on TOP of rocket (visually in front)
    addSmoke();
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
      const p = smokeParticles[i];
      p.update();
      if (p.opacity > 0) {
        p.draw();
      }
      if (p.life <= 0 || p.opacity <= 0) {
        smokeParticles.splice(i, 1);
      }
    }

    requestAnimationFrame(animate);
  };

  // start only after rocket loads (avoids flashing)
  rocket.onload = () => {
    animate();
  };

  // ---------- RESIZE ----------
  const handleResize = () => {
    screenH = window.innerHeight;
    screenW = window.innerWidth;
    canvas.width = screenW;
    canvas.height = screenH;
    rocketX = screenW - rocketWidth - 50;
    rocketY = screenH - rocketHeight - 50;
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);



  return (
  <div style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
    {/* Background canvas */}
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

    {/* --- About Title (top-left) --- */}
    <div
      style={{
        position: "absolute",
        top: "30px",
        left: "30px",
        zIndex: 2,
        color: "white",
        fontSize: "2rem",
        fontWeight: "bold",
      }}
    >
      Project Nebula
    </div>

    {/* --- Bulleted List (separate & moveable) --- */}
<div
  style={{
    position: "absolute",
    top: "80px",
    left: "30px",
    zIndex: 2,
    color: "white",
    fontSize: "1.2rem",
    lineHeight: "3",
    textAlign: "left",
    maxWidth: "380px",
    wordWrap: "break-word",
  }}
>
  <ul
    style={{
      listStyleType: "disc",
      marginLeft: "20px",
      paddingLeft: "10px",
    }}
  >
    <li style={{ marginBottom: "30px" }}>
      Provide launch prep team with important weather info
    </li>
    <li style={{ marginBottom: "30px" }}>
      Cloud cover and visibility monitoring
    </li>
    <li style={{ marginBottom: "30px" }}>
      Rain probability and humidity forecasting
    </li>
    <li style={{ marginBottom: "30px" }}>
      Maximize launch safety through accurate forecasting
    </li>
  </ul>
</div>


    {/* --- Info Box (bottom-left) --- */}
{/* <div
  style={{
    position: "absolute",
    bottom: "50px",
    left: "50px",
    zIndex: 2,
    backgroundColor: "rgba(255, 255, 255, 0.15)", // translucent white
    color: "white",
    padding: "20px 25px",
    borderRadius: "12px",
    maxWidth: "500px",
    fontSize: "1.4rem",
    lineHeight: "1.6",
    backdropFilter: "blur(6px)", // frosted-glass effect
    boxShadow: "0 0 12px rgba(255, 255, 255, 0.1)",
    minHeight: "250px",
  }}
>
  <p>
    Our weather prediction system uses real-time atmospheric data and
    AI-powered forecasting models to evaluate optimal rocket launch windows.
    By analyzing wind patterns, humidity levels, and storm likelihood, it helps
    ensure every launch is safe, efficient, and precisely timed.
  </p>
</div> */}

  </div>
);


};

export default About;
