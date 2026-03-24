import { useEffect, useRef } from 'react';
import { Renderer, Transform, Vec3, Color, Polyline } from 'ogl';
import './Ribbons.css';

const Ribbons = ({
  colors = ['#FC8EAC'],
  baseSpring = 0.03,
  baseFriction = 0.9,
  baseThickness = 30,
  offsetFactor = 0.05,
  maxAge = 500,
  pointCount = 50,
  speedMultiplier = 0.6,
  enableFade = false,
  enableShaderEffect = false,
  effectAmplitude = 2,
  backgroundColor = [0, 0, 0, 0]
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ dpr: window.devicePixelRatio || 2, alpha: true });
    const gl = renderer.gl;

    gl.clearColor(...backgroundColor);

    gl.canvas.style.position = 'absolute';
    gl.canvas.style.top = '0';
    gl.canvas.style.left = '0';
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    container.appendChild(gl.canvas);

    const scene = new Transform();
    const lines = [];

    const vertex = `
      precision highp float;
      attribute vec3 position;
      attribute vec3 next;
      attribute vec3 prev;
      attribute vec2 uv;
      attribute float side;

      uniform vec2 uResolution;
      uniform float uDPR;
      uniform float uThickness;

      varying vec2 vUV;

      vec4 getPosition() {
          vec4 current = vec4(position, 1.0);
          vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
          vec2 nextScreen = next.xy * aspect;
          vec2 prevScreen = prev.xy * aspect;
          vec2 tangent = normalize(nextScreen - prevScreen);
          vec2 normal = vec2(-tangent.y, tangent.x);
          normal /= aspect;
          normal *= mix(1.0, 0.1, pow(abs(uv.y - 0.5) * 2.0, 2.0));
          float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);
          float pixelWidth = current.w * pixelWidthRatio;
          normal *= pixelWidth * uThickness;
          current.xy -= normal * side;
          return current;
      }

      void main() {
          vUV = uv;
          gl_Position = getPosition();
      }
    `;

    const fragment = `
      precision highp float;
      uniform vec3 uColor;
      varying vec2 vUV;

      void main() {
          gl_FragColor = vec4(uColor, 1.0);
      }
    `;

    function resize() {
      renderer.setSize(container.clientWidth, container.clientHeight);
      lines.forEach(line => line.polyline.resize());
    }
    window.addEventListener('resize', resize);

    colors.forEach((color) => {
      const points = Array.from({ length: pointCount }, () => new Vec3());

      const polyline = new Polyline(gl, {
        points,
        vertex,
        fragment,
        uniforms: {
          uColor: { value: new Color(color) },
          uThickness: { value: baseThickness }
        }
      });

      polyline.mesh.setParent(scene);

      lines.push({
        points,
        polyline,
        mouseVelocity: new Vec3(),
        mouseOffset: new Vec3()
      });
    });

    resize();

    const mouse = new Vec3();

    function updateMouse(e) {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * 2 - 1;
      const y = -(e.clientY - rect.top) / rect.height * 2 + 1;
      mouse.set(x, y, 0);
    }

    container.addEventListener('mousemove', updateMouse);

    function update() {
      requestAnimationFrame(update);

      lines.forEach(line => {
        line.points[0].lerp(mouse, 0.2);
        for (let i = 1; i < line.points.length; i++) {
          line.points[i].lerp(line.points[i - 1], 0.9);
        }
        line.polyline.updateGeometry();
      });

      renderer.render({ scene });
    }

    update();

    return () => {
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', updateMouse);
      if (gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
    };
  }, [colors]);

  return <div ref={containerRef} className="ribbons-container" />;
};

export default Ribbons;