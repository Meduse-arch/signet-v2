import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

export interface TokenData {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  owner?: string; // Nom d'utilisateur du propriétaire
}

interface VTTCanvasProps {
  tokens: TokenData[];
  onTokenMove: (tokenId: string, x: number, y: number) => void;
  gridSize?: number;
  isHost: boolean;
  username: string;
}

export function VTTCanvas({ tokens, onTokenMove, gridSize = 50, isHost, username }: VTTCanvasProps) {
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const stageRef = useRef<any>(null);

  // Resize dynamique
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Zoom avec la molette
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // Zoomer ou dézoomer
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    // Limiter le zoom
    if (newScale < 0.2 || newScale > 5) return;

    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // Grille infinie : on dessine un grand rectangle avec un fillPattern ou on dessine des lignes.
  // Pour plus de performance en Konva, un quadrillage avec des lignes pour l'écran visible.
  const drawGrid = () => {
    const startX = Math.floor((-stagePos.x / stageScale) / gridSize) * gridSize;
    const endX = startX + (windowSize.width / stageScale) + gridSize * 2;
    
    const startY = Math.floor((-stagePos.y / stageScale) / gridSize) * gridSize;
    const endY = startY + (windowSize.height / stageScale) + gridSize * 2;

    const lines = [];
    
    // Lignes verticales
    for (let x = startX; x < endX; x += gridSize) {
      lines.push(
        <Line key={`v-${x}`} points={[x, startY, x, endY]} stroke="rgba(225,29,72,0.15)" strokeWidth={1 / stageScale} />
      );
    }
    // Lignes horizontales
    for (let y = startY; y < endY; y += gridSize) {
      lines.push(
        <Line key={`h-${y}`} points={[startX, y, endX, y]} stroke="rgba(225,29,72,0.15)" strokeWidth={1 / stageScale} />
      );
    }

    return lines;
  };

  // Convertir des classes tailwind en couleurs valides pour le canvas temporairement
  // ex: 'bg-zinc-800' -> '#27272a', 'bg-rose-950' -> '#4c0519'
  const getColor = (twClass: string) => {
    if (twClass.includes('zinc-800')) return '#27272a';
    if (twClass.includes('rose-950')) return '#4c0519';
    return '#333';
  };

  return (
    <div className="absolute inset-0 bg-[#050508] touch-none">
      <Stage
        ref={stageRef}
        width={windowSize.width}
        height={windowSize.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        draggable // Permet le Pan de la caméra (clic + glisser)
        onDragEnd={(e) => {
          // Si on a dragué le stage entier
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer>
          {/* Dessin de la grille */}
          {drawGrid()}
        </Layer>
        
        <Layer>
          {/* Dessin des Tokens */}
          {tokens.map(token => {
            const canMove = isHost || !token.owner || token.owner === username;
            
            return (
              <Group
                key={token.id}
                x={token.x * gridSize + gridSize / 2}
                y={token.y * gridSize + gridSize / 2}
                draggable={canMove}
                dragBoundFunc={(pos, evt) => {
                const isShift = evt && (evt as any).shiftKey;
                if (isShift) return pos; // Placement libre

                // Convertir position absolue (écran) -> locale (stage)
                const localX = (pos.x - stagePos.x) / stageScale;
                const localY = (pos.y - stagePos.y) / stageScale;

                // Calculer la case
                const logicX = Math.max(0, Math.floor(localX / gridSize));
                const logicY = Math.max(0, Math.floor(localY / gridSize));

                // Position locale aimantée
                const snappedLocalX = logicX * gridSize + gridSize / 2;
                const snappedLocalY = logicY * gridSize + gridSize / 2;

                // Re-convertir en position absolue (écran)
                return {
                  x: snappedLocalX * stageScale + stagePos.x,
                  y: snappedLocalY * stageScale + stagePos.y,
                };
              }}
              onDragStart={(e) => {
                // Empêcher le drag du Stage quand on attrape un pion
                e.cancelBubble = true;
                // Effet visuel
                e.target.scale({ x: 1.1, y: 1.1 });
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                e.target.scale({ x: 1, y: 1 });
                
                const isShift = e.evt && (e.evt as any).shiftKey;
                const finalX = e.target.x();
                const finalY = e.target.y();
                
                let logicX: number;
                let logicY: number;

                if (!isShift) {
                  // Snapping final (déjà géré par dragBoundFunc, on le confirme)
                  logicX = Math.max(0, Math.floor(finalX / gridSize));
                  logicY = Math.max(0, Math.floor(finalY / gridSize));
                  
                  e.target.position({
                    x: logicX * gridSize + gridSize / 2,
                    y: logicY * gridSize + gridSize / 2,
                  });
                } else {
                  // Placement Libre (Shift maintenu)
                  logicX = (finalX - gridSize / 2) / gridSize;
                  logicY = (finalY - gridSize / 2) / gridSize;
                }
                
                // Envoyer l'information (unités de grille, entières ou décimales)
                onTokenMove(token.id, logicX, logicY);
              }}
            >
              <Circle
                radius={gridSize / 2 - 2}
                fill={getColor(token.color)}
                stroke="#fff"
                strokeWidth={2}
                shadowColor="rgba(0,0,0,0.5)"
                shadowBlur={5}
                shadowOffset={{ x: 2, y: 2 }}
              />
              <Text
                text={token.name}
                fontSize={14}
                fontStyle="bold"
                fill="#fff"
                align="center"
                verticalAlign="middle"
                offsetX={gridSize / 2}
                offsetY={gridSize / 2}
                width={gridSize}
                height={gridSize}
              />
            </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
