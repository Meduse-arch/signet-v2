import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Stage, Layer, Circle, Text, Group, Line, Image, Transformer, Shape } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as KonvaStage } from 'konva/lib/Stage';
import type { Group as KonvaGroup } from 'konva/lib/Group';
import type { Line as KonvaLine } from 'konva/lib/shapes/Line';
import type { Text as KonvaText } from 'konva/lib/shapes/Text';
import type { Transformer as KonvaTransformer } from 'konva/lib/shapes/Transformer';
import type { Context } from 'konva/lib/Context';
import type { Shape as KonvaShape } from 'konva/lib/Shape';
import { coreEventBus } from '../../core/services/EventBus';
import { FileTransferService } from '../../core/services/FileTransferService';

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
  avatarUrl?: string; // Ajout de l'avatar
}

interface VTTCanvasProps {
  tokens: TokenData[];
  onTokenMove: (tokenId: string, x: number, y: number) => void;
  onTokenTransform?: (tokenId: string, x: number, y: number, scaleX: number, scaleY: number, rotation: number) => void;
  gridSize?: number;
  isHost: boolean;
  username: string;
  activeTool?: 'pan' | 'select' | 'duo' | 'ruler';
  showGrid?: boolean;
  snapToGrid?: boolean;
  mapUrl?: string | null;
  onTokenDelete?: (tokenId: string) => void; // Prop pour supprimer
}

// ── Couleurs des tokens ────────────────────────────────────────────────────────
// Tailwind → hex (basique).
const getColor = (twClass: string) => {
  if (twClass.includes('rose')) return { fill: '#4c0519', stroke: '#9f1239' };
  if (twClass.includes('indigo')) return { fill: '#312e81', stroke: '#4f46e5' };
  return { fill: '#27272a', stroke: '#71717a' };
};

// ── Cache d'images d'avatars (par URL) ────────────────────────────────────────
// Évite de recréer/recharger une image à chaque (dé)montage d'un token.
// Les échecs ne sont pas mis en cache : GameBoard réécrit avatarUrl (blob:)
// quand le téléchargement P2P se termine.
const avatarCache = new Map<string, HTMLImageElement>();
const avatarPending = new Map<string, Promise<HTMLImageElement | null>>();

function resolveAvatarSrc(url: string): string {
  if (url.startsWith('blob:')) return url;
  if (window.__TAURI_INTERNALS__) return `http://signet.localhost/library/${url}`;
  if (FileTransferService.hasFile(url)) return FileTransferService.getFileUrl(url) ?? url;
  return url;
}

function loadAvatar(url: string): Promise<HTMLImageElement | null> {
  const pending = avatarPending.get(url);
  if (pending) return pending;
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      avatarCache.set(url, image);
      avatarPending.delete(url);
      resolve(image);
    };
    image.onerror = () => {
      avatarPending.delete(url);
      resolve(null);
    };
    image.src = resolveAvatarSrc(url);
  });
  avatarPending.set(url, promise);
  return promise;
}

function useAvatarImage(url?: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(() => (url ? avatarCache.get(url) ?? null : null));

  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    const cached = avatarCache.get(url);
    if (cached) {
      setImg(cached);
      return;
    }
    setImg(null);
    let cancelled = false;
    loadAvatar(url).then((loaded) => {
      if (!cancelled) setImg(loaded);
    });
    return () => { cancelled = true; };
  }, [url]);

  return img;
}

interface TokenAvatarProps {
  url?: string;
  radius: number;
  name: string;
  colorClass: string;
}

const TokenAvatar = memo(function TokenAvatar({ url, radius, name, colorClass }: TokenAvatarProps) {
  const img = useAvatarImage(url);
  const colors = getColor(colorClass);

  if (img) {
    const scale = Math.max((radius * 2) / img.width, (radius * 2) / img.height);
    return (
      <Circle
        radius={radius}
        fillPatternImage={img}
        fillPatternScale={{ x: scale, y: scale }}
        fillPatternOffset={{ x: img.width / 2, y: img.height / 2 }}
        stroke={colors.stroke}
        strokeWidth={2}
        shadowColor="rgba(0,0,0,0.5)"
        shadowBlur={5}
        shadowOffset={{ x: 2, y: 2 }}
      />
    );
  }

  return (
    <>
      <Circle
        radius={radius}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={2}
        shadowColor="rgba(0,0,0,0.5)"
        shadowBlur={5}
        shadowOffset={{ x: 2, y: 2 }}
      />
      <Text
        text={name}
        fontSize={14}
        fontStyle="bold"
        fill="#fff"
        align="center"
        verticalAlign="middle"
        offsetX={radius}
        offsetY={radius}
        width={radius * 2}
        height={radius * 2}
      />
    </>
  );
});

// ── Token mémoïsé ──────────────────────────────────────────────────────────────
interface TokenNodeProps {
  token: TokenData;
  gridSize: number;
  canMove: boolean;
  snapToGrid: boolean;
  stageRef: React.RefObject<KonvaStage | null>;
  onSelect: (tokenId: string) => void;
  onMove: (tokenId: string, x: number, y: number) => void;
  onTransform: (tokenId: string, x: number, y: number, scaleX: number, scaleY: number, rotation: number) => void;
}

const TokenNode = memo(function TokenNode({
  token, gridSize, canMove, snapToGrid, stageRef, onSelect, onMove, onTransform
}: TokenNodeProps) {
  const sX = token.scaleX || 1;
  const sY = token.scaleY || 1;

  return (
    <Group
      id={token.id}
      x={token.x * gridSize + (sX * gridSize) / 2}
      y={token.y * gridSize + (sY * gridSize) / 2}
      scaleX={sX}
      scaleY={sY}
      rotation={token.rotation || 0}
      draggable={canMove}
      onDblClick={() => {
        coreEventBus.emit('TOKEN_DOUBLE_CLICKED', token.id);
      }}
      onPointerDown={() => {
        if (canMove) onSelect(token.id);
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const rotation = node.rotation();

        // Arrondir au multiple de la grille le plus proche pour forcer 1x1, 2x2, 3x3...
        const targetScaleX = Math.max(1, Math.round(node.scaleX()));
        const targetScaleY = Math.max(1, Math.round(node.scaleY()));

        node.scaleX(targetScaleX);
        node.scaleY(targetScaleY);

        onTransform(token.id, token.x, token.y, targetScaleX, targetScaleY, rotation);
      }}
      dragBoundFunc={(pos, evt) => {
        const isShift = evt instanceof MouseEvent && evt.shiftKey;
        const isFreePlacement = snapToGrid ? isShift : !isShift;
        if (isFreePlacement) return pos; // Placement libre

        const stage = stageRef.current;
        if (!stage) return pos;
        const scale = stage.scaleX();

        // Position absolue (écran) -> locale (stage)
        const localX = (pos.x - stage.x()) / scale;
        const localY = (pos.y - stage.y()) / scale;

        // Case top-left la plus proche
        const logicX = Math.max(0, Math.round((localX - (sX * gridSize) / 2) / gridSize));
        const logicY = Math.max(0, Math.round((localY - (sY * gridSize) / 2) / gridSize));

        // Centre aimanté, reconverti en absolu
        return {
          x: (logicX * gridSize + (sX * gridSize) / 2) * scale + stage.x(),
          y: (logicY * gridSize + (sY * gridSize) / 2) * scale + stage.y(),
        };
      }}
      onDragStart={(e) => {
        // Empêcher le drag du Stage quand on attrape un pion
        e.cancelBubble = true;
        e.target.scale({ x: sX * 1.1, y: sY * 1.1 });
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        e.target.scale({ x: sX, y: sY }); // Reset du scale visuel

        const isShift = e.evt instanceof MouseEvent && e.evt.shiftKey;
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
          logicX = (finalX - (sX * gridSize) / 2) / gridSize;
          logicY = (finalY - (sY * gridSize) / 2) / gridSize;
        }

        onMove(token.id, logicX, logicY);
      }}
    >
      <TokenAvatar
        url={token.avatarUrl}
        radius={gridSize / 2 - 2}
        name={token.name}
        colorClass={token.color}
      />
    </Group>
  );
});

// ── Grille : une seule Shape, dessinée pour la zone visible ───────────────────
// sceneFunc lit position/zoom directement sur le stage : pas de state React.
// strokeScaleEnabled={false} garde 1px d'épaisseur à l'écran quel que soit le zoom.
function GridShape({ gridSize }: { gridSize: number }) {
  const sceneFunc = useCallback((ctx: Context, shape: KonvaShape) => {
    const stage = shape.getStage();
    if (!stage) return;
    const scale = stage.scaleX();
    const startX = Math.floor((-stage.x() / scale) / gridSize) * gridSize;
    const endX = startX + stage.width() / scale + gridSize * 2;
    const startY = Math.floor((-stage.y() / scale) / gridSize) * gridSize;
    const endY = startY + stage.height() / scale + gridSize * 2;

    ctx.beginPath();
    for (let x = startX; x < endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y < endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.strokeShape(shape);
  }, [gridSize]);

  return (
    <Shape
      sceneFunc={sceneFunc}
      stroke="rgba(225,29,72,0.15)"
      strokeWidth={1}
      strokeScaleEnabled={false}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

export const VTTCanvas: React.FC<VTTCanvasProps> = ({
  tokens,
  onTokenMove,
  onTokenTransform,
  onTokenDelete,
  gridSize = 50,
  isHost,
  username,
  activeTool = 'pan',
  showGrid = true,
  snapToGrid = true,
  mapUrl = null
}) => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  const stageRef = useRef<KonvaStage | null>(null);
  const transformerRef = useRef<KonvaTransformer | null>(null);

  // Règle : points en ref + nœuds Konva mis à jour impérativement (pas de setState au pointermove)
  const rulerPointsRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const rulerGroupRef = useRef<KonvaGroup | null>(null);
  const rulerLineRef = useRef<KonvaLine | null>(null);
  const rulerTextRef = useRef<KonvaText | null>(null);

  // Callbacks parents derrière des refs → handlers stables pour React.memo(TokenNode)
  const onTokenMoveRef = useRef(onTokenMove);
  const onTokenTransformRef = useRef(onTokenTransform);
  onTokenMoveRef.current = onTokenMove;
  onTokenTransformRef.current = onTokenTransform;

  const handleSelect = useCallback((id: string) => setSelectedTokenId(id), []);
  const handleMove = useCallback((id: string, x: number, y: number) => {
    onTokenMoveRef.current(id, x, y);
  }, []);
  const handleTransform = useCallback((id: string, x: number, y: number, sx: number, sy: number, rot: number) => {
    onTokenTransformRef.current?.(id, x, y, sx, sy, rot);
  }, []);

  // Charger l'image de fond
  useEffect(() => {
    if (!mapUrl) {
      setMapImage(null);
      return;
    }
    const img = new window.Image();
    img.src = mapUrl;
    // Pas de crossOrigin = 'Anonymous' : cela bloque les serveurs sans CORS.
    // Le canvas sera "tainted" (pas de toDataURL), acceptable ici.
    img.onload = () => {
      setMapImage(img);
    };
    img.onerror = () => {
      console.error("Impossible de charger l'image (URL invalide ou bloquée par le navigateur).");
    };
  }, [mapUrl]);

  // Resize dynamique
  useEffect(() => {
    const handleResize = () => {
      // Annule un drag Konva resté actif (pointerup perdu pendant le redimensionnement F11)
      stageRef.current?.stopDrag();
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Zoom avec la molette : impératif, aucun setState
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

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    if (newScale < 0.2 || newScale > 5) return;

    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    stage.batchDraw();
  };

  // Règle : met à jour les nœuds Konva directement
  const updateRuler = () => {
    const stage = stageRef.current;
    const group = rulerGroupRef.current;
    const line = rulerLineRef.current;
    const text = rulerTextRef.current;
    if (!stage || !group || !line || !text) return;

    const pts = rulerPointsRef.current;
    if (!pts) {
      group.visible(false);
    } else {
      const s = stage.scaleX();
      // D&D 5e : max(X, Y) pour la distance (diagonale = 1 case)
      const distanceCells = Math.max(Math.abs(pts.x2 - pts.x1), Math.abs(pts.y2 - pts.y1)) / gridSize;
      const distanceFt = Math.round(distanceCells) * 5;

      line.points([pts.x1, pts.y1, pts.x2, pts.y2]);
      line.strokeWidth(4 / s);
      line.dash([10 / s, 5 / s]);
      text.text(`${distanceFt} ft`);
      text.fontSize(24 / s);
      text.shadowOffset({ x: 2 / s, y: 2 / s });
      text.position({ x: (pts.x1 + pts.x2) / 2, y: (pts.y1 + pts.y2) / 2 - 20 / s });
      group.visible(true);
    }
    group.getLayer()?.batchDraw();
  };

  // Transformer attach
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr) return;
    if (selectedTokenId && stage) {
      const node = stage.findOne(`#${selectedTokenId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
      }
    } else {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedTokenId]);

  return (
    <div
      className="absolute inset-0 bg-void touch-none outline-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTokenId && onTokenDelete) {
          onTokenDelete(selectedTokenId);
          setSelectedTokenId(null);
        }
      }}
    >
      <Stage
        ref={stageRef}
        width={windowSize.width}
        height={windowSize.height}
        onWheel={handleWheel}
        draggable={activeTool === 'pan' || activeTool === 'duo'} // Déplacement caméra pour pan et duo
        onPointerDown={(e) => {
          if (activeTool === 'ruler') {
            const p = stageRef.current?.getRelativePointerPosition();
            if (p) {
              rulerPointsRef.current = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
              updateRuler();
            }
            return;
          }
          // Désélection si clic sur le vide (les calques décor ne reçoivent pas d'événements)
          if (e.target === e.target.getStage()) {
            setSelectedTokenId(null);
          }
        }}
        onPointerMove={() => {
          const pts = rulerPointsRef.current;
          if (activeTool === 'ruler' && pts) {
            const p = stageRef.current?.getRelativePointerPosition();
            if (p) {
              pts.x2 = p.x;
              pts.y2 = p.y;
              updateRuler();
            }
          }
        }}
        onPointerUp={() => {
          if (activeTool === 'ruler') {
            rulerPointsRef.current = null;
            updateRuler();
          }
        }}
      >
        {/* Décor : carte + grille, jamais interactif */}
        <Layer listening={false}>
          {mapImage && (
            <Image
              name="mapImage"
              image={mapImage}
              x={0}
              y={0}
              listening={false}
            />
          )}
          {showGrid && <GridShape gridSize={gridSize} />}
        </Layer>

        <Layer>
          {tokens.map(token => {
            const hasRights = isHost || !token.owner || token.owner === username;
            const canMove = (activeTool === 'select' || activeTool === 'duo') && hasRights;
            return (
              <TokenNode
                key={token.id}
                token={token}
                gridSize={gridSize}
                canMove={canMove}
                snapToGrid={snapToGrid}
                stageRef={stageRef}
                onSelect={handleSelect}
                onMove={handleMove}
                onTransform={handleTransform}
              />
            );
          })}
          {/* Transformer pour le redimensionnement et rotation */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Taille minimale : moitié d'une case
              if (newBox.width < gridSize / 2 || newBox.height < gridSize / 2) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>

        {/* Règle : nœuds mis à jour impérativement */}
        <Layer listening={false}>
          <Group ref={rulerGroupRef} visible={false}>
            <Line ref={rulerLineRef} points={[0, 0, 0, 0]} stroke="#e11d48" strokeWidth={4} dash={[10, 5]} />
            <Text
              ref={rulerTextRef}
              text=""
              fontSize={24}
              fill="white"
              fontStyle="bold"
              shadowColor="black"
              shadowBlur={4}
              shadowOffset={{ x: 2, y: 2 }}
            />
          </Group>
        </Layer>
      </Stage>
    </div>
  );
};
