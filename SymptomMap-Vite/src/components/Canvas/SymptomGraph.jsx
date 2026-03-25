// src/components/Canvas/SymptomGraph.jsx
import { useEffect, useRef, useState } from 'react';
import { CANVAS_CONFIG, GRAPH_PHYSICS } from '../../utils/constants';

export default function SymptomGraph({ nodes, diagMap, onNodeClick }) {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = useState(null);
  const [panning, setPanning] = useState(null);

  // Physics state
  const velocitiesRef = useRef(new Map());

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current?.parentElement) {
        const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initialize layout for new nodes
  useEffect(() => {
    nodes.forEach(node => {
      if (!node._placed) {
        // Place hubs in a circle
        if (node.hub) {
          const hubNodes = nodes.filter(n => n.hub);
          const index = hubNodes.findIndex(n => n.id === node.id);
          const angle = (index / hubNodes.length) * Math.PI * 2;
          const radius = 250;
          node.x = Math.cos(angle) * radius;
          node.y = Math.sin(angle) * radius;
        } else {
          // Place symptoms near their primary diagnosis hub
          const primaryDiag = node.conds?.[0];
          const hub = nodes.find(n => n.hub && n.id === `hub-${primaryDiag}`);
          
          if (hub) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 150 + Math.random() * 100;
            node.x = (hub.x || 0) + Math.cos(angle) * distance;
            node.y = (hub.y || 0) + Math.sin(angle) * distance;
          } else {
            node.x = (Math.random() - 0.5) * 400;
            node.y = (Math.random() - 0.5) * 400;
          }
        }
        node._placed = true;
      }

      // Initialize velocity
      if (!velocitiesRef.current.has(node.id)) {
        velocitiesRef.current.set(node.id, { vx: 0, vy: 0 });
      }
    });
  }, [nodes]);

  // Physics simulation
  useEffect(() => {
    let animationId;

    const simulate = () => {
      nodes.forEach(node => {
        if (dragging?.id === node.id) return;

        const vel = velocitiesRef.current.get(node.id) || { vx: 0, vy: 0 };
        let fx = 0, fy = 0;

        // Repulsion from all other nodes
        nodes.forEach(other => {
          if (other.id === node.id) return;
          
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < GRAPH_PHYSICS.MIN_DISTANCE * 2) {
            const force = GRAPH_PHYSICS.REPULSION / (dist * dist);
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        });

        // Attraction to connected nodes
        nodes.forEach(other => {
          if (other.id === node.id) return;
          
          // Check if connected
          const isConnected = 
            (!node.hub && !other.hub && 
             node.conds?.some(c => other.conds?.includes(c))) ||
            (node.hub && !other.hub && other.conds?.includes(node.conds?.[0])) ||
            (!node.hub && other.hub && node.conds?.includes(other.conds?.[0]));

          if (isConnected) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const force = dist * GRAPH_PHYSICS.ATTRACTION;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        });

        // Pull toward center (weak)
        fx -= node.x * GRAPH_PHYSICS.CENTER_PULL;
        fy -= node.y * GRAPH_PHYSICS.CENTER_PULL;

        // Update velocity with damping
        vel.vx = (vel.vx + fx) * GRAPH_PHYSICS.DAMPING;
        vel.vy = (vel.vy + fy) * GRAPH_PHYSICS.DAMPING;

        // Update position
        node.x += vel.vx;
        node.y += vel.vy;

        velocitiesRef.current.set(node.id, vel);
      });

      draw();
      animationId = requestAnimationFrame(simulate);
    };

    if (nodes.length > 0) {
      simulate();
    }

    return () => cancelAnimationFrame(animationId);
  }, [nodes, dragging, camera]);

  // Draw function
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    // Clear
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Apply camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(camera.x, camera.y);

    // Draw edges first
    nodes.forEach(node => {
      if (node.hub) return;

      node.conds?.forEach(condId => {
        const hub = nodes.find(n => n.hub && n.id === `hub-${condId}`);
        if (!hub) return;

        const diag = diagMap[condId];
        if (!diag) return;

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(hub.x, hub.y);
        ctx.strokeStyle = diag.color + '40';
        ctx.lineWidth = node.conds.length > 1 ? 2 : 1;
        ctx.stroke();
      });
    });

    // Draw nodes
    nodes.forEach(node => {
      const isHub = node.hub;
      const radius = isHub ? CANVAS_CONFIG.HUB_RADIUS : CANVAS_CONFIG.NODE_RADIUS;

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

      if (isHub) {
        const diagId = node.conds?.[0];
        const diag = diagMap[diagId];
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = diag?.color || '#ccc';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        // Multi-diagnosis gradient
        if (node.conds?.length > 1) {
          const colors = node.conds.map(c => diagMap[c]?.color).filter(Boolean);
          const gradient = ctx.createLinearGradient(
            node.x - radius, node.y - radius,
            node.x + radius, node.y + radius
          );
          colors.forEach((color, i) => {
            gradient.addColorStop(i / (colors.length - 1), color);
          });
          ctx.fillStyle = gradient;
        } else {
          const diagId = node.conds?.[0];
          const diag = diagMap[diagId];
          ctx.fillStyle = diag?.color || '#ccc';
        }
        ctx.fill();
      }

      // Text
      ctx.fillStyle = isHub ? '#1e293b' : 'white';
      ctx.font = `${isHub ? 'bold ' : ''}${isHub ? CANVAS_CONFIG.HUB_FONT_SIZE : CANVAS_CONFIG.FONT_SIZE}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = node.name || node.label;
      const maxWidth = radius * 1.6;
      const words = text.split(' ');
      const lines = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      const lineHeight = (isHub ? CANVAS_CONFIG.HUB_FONT_SIZE : CANVAS_CONFIG.FONT_SIZE) * 1.3;
      const totalHeight = lines.length * lineHeight;
      const startY = node.y - totalHeight / 2 + lineHeight / 2;

      lines.forEach((line, i) => {
        ctx.fillText(line, node.x, startY + i * lineHeight);
      });
    });

    ctx.restore();
  };

  // Mouse handlers
  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Transform to world coordinates
    const worldX = (x - dimensions.width / 2) / camera.zoom - camera.x;
    const worldY = (y - dimensions.height / 2) / camera.zoom - camera.y;

    return { x: worldX, y: worldY };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);

    // Check if clicking a node
    const clickedNode = nodes.find(node => {
      const radius = node.hub ? CANVAS_CONFIG.HUB_RADIUS : CANVAS_CONFIG.NODE_RADIUS;
      const dist = Math.sqrt((node.x - pos.x) ** 2 + (node.y - pos.y) ** 2);
      return dist < radius;
    });

    if (clickedNode) {
      setDragging({ id: clickedNode.id, startX: pos.x, startY: pos.y, nodeX: clickedNode.x, nodeY: clickedNode.y });
      onNodeClick?.(clickedNode);
    } else {
      setPanning({ startX: e.clientX, startY: e.clientY, cameraX: camera.x, cameraY: camera.y });
    }
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      const pos = getMousePos(e);
      const node = nodes.find(n => n.id === dragging.id);
      if (node) {
        node.x = dragging.nodeX + (pos.x - dragging.startX);
        node.y = dragging.nodeY + (pos.y - dragging.startY);
        draw();
      }
    } else if (panning) {
      const dx = (e.clientX - panning.startX) / camera.zoom;
      const dy = (e.clientY - panning.startY) / camera.zoom;
      setCamera({ ...camera, x: panning.cameraX + dx, y: panning.cameraY + dy });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setPanning(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.3, Math.min(2, prev.zoom * delta))
    }));
  };

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="cursor-grab active:cursor-grabbing"
    />
  );
}
