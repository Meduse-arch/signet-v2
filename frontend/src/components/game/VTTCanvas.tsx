import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Line, Image, Transformer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

export interface TokenData {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  owner?: string; // Nom d'utilisateur du propriétaire
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

interface VTTCanvasProps {
  tokens: TokenData[];
  onTokenMove: (tokenId: string, x: number, y: number) => void;
  onTokenTransform?: (tokenId: string, x: number, y: number, scaleX: number, scaleY: number, rotation: number) => void;
  gridSize?: number;
  isHost: boolean;
  username: string;
  activeTool?: 'pan' | 'select' | 'duo';
  showGrid?: boolean;
  snapToGrid?: boolean;
  mapUrl?: string | null;
}

export function VTTCanvas({ 
  tokens, 
  onTokenMove, 
  onTokenTransform,
  gridSize = 50, 
  isHost, 
  username,
  activeTool = 'pan',
  showGrid = true,
  snapToGrid = true,
  mapUrl = null
}: VTTCanvasProps) {
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [rulerPoints, setRulerPoints] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  // Charger l'image de fond
  useEffect(() => {
    if (!mapUrl) {
      setMapImage(null);
      return;
    }
    const img = new window.Image();
    img.src = mapUrl;
    // On retire crossOrigin = 'Anonymous' car cela bloque le chargement d'images
    // depuis des serveurs ne supportant pas CORS (ex: Pinterest).
    // Le canvas sera "tainted", ce qui empêche toDataURL(), mais c'est acceptable ici.
    img.onload = () => {
      setMapImage(img);
    };
    img.onerror = () => {
      console.error("Impossible de charger l'image (URL invalide ou bloquée par le navigateur).");
    }
  }, [mapUrl]);

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

  // Transformer attach
  useEffect(() => {
    if (selectedTokenId && transformerRef.current && stageRef.current) {
      const node = stageRef.current.findOne(`#${selectedTokenId}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedTokenId]);

  // Grille infinie : on dessine un grand rectangle avec un fillPattern ou on dessine des lignes.
  // Pour plus de performance en Konva, un quadrillage avec des lignes pour l'écran visible.
  const drawGrid = () => {
    if (!showGrid) return null;

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
        draggable={activeTool === 'pan' || activeTool === 'duo'} // Déplacement caméra pour pan et duo
        onPointerDown={(e) => {
          if (activeTool === 'ruler') {
            const pointer = stageRef.current.getPointerPosition();
            if (pointer) {
               const x = (pointer.x - stagePos.x) / stageScale;
               const y = (pointer.y - stagePos.y) / stageScale;
               setRulerPoints({ x1: x, y1: y, x2: x, y2: y });
            }
            return; // On ne fait rien d'autre
          }
          // Deselect token if we click on empty space or the map
          if (e.target === e.target.getStage() || e.target.name() === 'mapImage') {
            setSelectedTokenId(null);
          }
        }}
        onPointerMove={(e) => {
          if (activeTool === 'ruler' && rulerPoints) {
            const pointer = stageRef.current.getPointerPosition();
            if (pointer) {
               const x = (pointer.x - stagePos.x) / stageScale;
               const y = (pointer.y - stagePos.y) / stageScale;
               setRulerPoints(prev => prev ? { ...prev, x2: x, y2: y } : null);
            }
          }
        }}
        onPointerUp={(e) => {
          if (activeTool === 'ruler') {
            setRulerPoints(null);
          }
        }}
        onDragEnd={(e) => {
          // Si on a dragué le stage entier
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer>
          {/* Image de fond (Map) */}
          {mapImage && (
            <Image
              name="mapImage"
              image={mapImage}
              x={0}
              y={0}
              listening={false} // L'image ne doit pas capturer les événements de clic
            />
          )}
          {/* Dessin de la grille */}
          {drawGrid()}
        </Layer>
        
        <Layer>
          {/* Dessin des Tokens */}
          {tokens.map(token => {
            const hasRights = isHost || !token.owner || token.owner === username;
            const canMove = (activeTool === 'select' || activeTool === 'duo') && hasRights;
            
            return (
              <Group
                key={token.id}
                id={token.id}
                x={token.x * gridSize + ((token.scaleX || 1) * gridSize) / 2}
                y={token.y * gridSize + ((token.scaleY || 1) * gridSize) / 2}
                scaleX={token.scaleX || 1}
                scaleY={token.scaleY || 1}
                rotation={token.rotation || 0}
                draggable={canMove}
                onPointerDown={(e) => {
                  if (canMove) {
                    setSelectedTokenId(token.id);
                  }
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  
                  // Récupérer la taille actuelle
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  const rotation = node.rotation();
                  
                  // Arrondir au multiple de la grille le plus proche pour forcer 1x1, 2x2, 3x3...
                  const targetScaleX = Math.max(1, Math.round(scaleX));
                  const targetScaleY = Math.max(1, Math.round(scaleY));
                  
                  // Réinitialiser le scale visuellement (optionnel, on peut le faire via l'état)
                  node.scaleX(targetScaleX);
                  node.scaleY(targetScaleY);
                  
                  if (onTokenTransform) {
                    onTokenTransform(token.id, token.x, token.y, targetScaleX, targetScaleY, rotation);
                  }
                }}
                dragBoundFunc={(pos, evt) => {
                  const isShift = evt && (evt as any).shiftKey;
                  const isFreePlacement = snapToGrid ? isShift : !isShift;
                  if (isFreePlacement) return pos; // Placement libre

                  // Convertir position absolue (écran) -> locale (stage)
                  const localX = (pos.x - stagePos.x) / stageScale;
                  const localY = (pos.y - stagePos.y) / stageScale;

                  const sX = token.scaleX || 1;
                  const sY = token.scaleY || 1;

                  // Calculer la case top-left la plus proche
                  const logicX = Math.max(0, Math.round((localX - (sX * gridSize) / 2) / gridSize));
                  const logicY = Math.max(0, Math.round((localY - (sY * gridSize) / 2) / gridSize));

                  // Position locale aimantée du centre
                  const snappedLocalX = logicX * gridSize + (sX * gridSize) / 2;
                  const snappedLocalY = logicY * gridSize + (sY * gridSize) / 2;

                  // Re-convertir en position absolue (écran)
                  return {
                    x: snappedLocalX * stageScale + stagePos.x,
                    y: snappedLocalY * stageScale + stagePos.y,
                  };
                }}
                onDragStart={(e) => {
                  // Empêcher le drag du Stage quand on attrape un pion
                  e.cancelBubble = true;
                  // Effet visuel (augmenter légèrement)
                  const currentScaleX = token.scaleX || 1;
                  const currentScaleY = token.scaleY || 1;
                  e.target.scale({ x: currentScaleX * 1.1, y: currentScaleY * 1.1 });
                }}
                onDragEnd={(e) => {
                  e.cancelBubble = true;
                  
                  const sX = token.scaleX || 1;
                  const sY = token.scaleY || 1;
                  e.target.scale({ x: sX, y: sY }); // Reset du scale visuel
                  
                  const isShift = e.evt && (e.evt as any).shiftKey;
                  const isFreePlacement = snapToGrid ? isShift : !isShift;
                  const finalX = e.target.x();
                  const finalY = e.target.y();
                  
                  let logicX: number;
                  let logicY: number;

                  if (!isFreePlacement) {
                    logicX = Math.max(0, Math.round((finalX - (sX * gridSize) / 2) / gridSize));
                    logicY = Math.max(0, Math.round((finalY - (sY * gridSize) / 2) / gridSize));
                    
                    e.target.position({
                      x: logicX * gridSize + (sX * gridSize) / 2,
                      y: logicY * gridSize + (sY * gridSize) / 2,
                    });
                  } else {
                    // Placement Libre
                    logicX = (finalX - (sX * gridSize) / 2) / gridSize;
                    logicY = (finalY - (sY * gridSize) / 2) / gridSize;
                  }
                  
                  // Envoyer l'information
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
          {/* Transformer pour le redimensionnement et rotation */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limiter la taille minimale à la moitié d'une case (ex: 25px)
              if (newBox.width < gridSize / 2 || newBox.height < gridSize / 2) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>

        <Layer>
          {/* Dessin de la Règle */}
          {rulerPoints && (() => {
             const dx = rulerPoints.x2 - rulerPoints.x1;
             const dy = rulerPoints.y2 - rulerPoints.y1;
             
             // En D&D 5e standard, on compte le maximum entre X et Y pour la distance (1 case diag = 1 case droite).
             const casesX = Math.abs(dx) / gridSize;
             const casesY = Math.abs(dy) / gridSize;
             const distanceCells = Math.max(casesX, casesY);
             const distanceFt = Math.round(distanceCells) * 5;
             
             const midX = (rulerPoints.x1 + rulerPoints.x2) / 2;
             const midY = (rulerPoints.y1 + rulerPoints.y2) / 2;

             return (
               <Group>
                 <Line 
                   points={[rulerPoints.x1, rulerPoints.y1, rulerPoints.x2, rulerPoints.y2]} 
                   stroke="#e11d48" 
                   strokeWidth={4 / stageScale} 
                   dash={[10 / stageScale, 5 / stageScale]} 
                 />
                 <Text 
                   x={midX} 
                   y={midY - (20 / stageScale)} 
                   text={`${distanceFt} ft`} 
                   fontSize={24 / stageScale} 
                   fill="white" 
                   fontStyle="bold" 
                   shadowColor="black" 
                   shadowBlur={4} 
                   shadowOffset={{x:2/stageScale, y:2/stageScale}} 
                 />
               </Group>
             );
          })()}
        </Layer>
      </Stage>
    </div>
  );
}
