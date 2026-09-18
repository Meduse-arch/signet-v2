import React, { useState, useEffect, useRef } from 'react';
import { ModManager } from '../../core/services/ModManager';
import type { RegisteredWindow } from '../../core/services/ModManager';
import { coreEventBus } from '../../core/services/EventBus';
import { DraggableWindow } from './DraggableWindow';

export function DockManager() {
  const [windows, setWindows] = useState<RegisteredWindow[]>([]);
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  const [zOrder, setZOrder] = useState<string[]>([]);
  const [dockStates, setDockStates] = useState<Record<string, WindowPosition>>({});

  const openWindowsRef = useRef<string[]>([]);

  useEffect(() => {
    openWindowsRef.current = openWindows;
  }, [openWindows]);

  const bringToFront = (windowId: string) => {
    setZOrder(prev => {
      const filtered = prev.filter(id => id !== windowId);
      return [...filtered, windowId];
    });
  };

  useEffect(() => {
    // Initial load
    setWindows(ModManager.getWindows());

    const handleUpdate = () => {
      setWindows([...ModManager.getWindows()]);
    };

    const handleToggle = (windowId: string) => {
      const isOpen = openWindowsRef.current.includes(windowId);
      if (!isOpen) {
        bringToFront(windowId);
      }
      setOpenWindows(prev => isOpen ? prev.filter(id => id !== windowId) : [...prev, windowId]);
      coreEventBus.emit('SYSTEM_UI_ACTION_STATE_CHANGED', { actionId: windowId, isActive: !isOpen });
    };

    const handleOpen = (windowId: string) => {
      const isOpen = openWindowsRef.current.includes(windowId);
      if (!isOpen) {
        bringToFront(windowId);
        setOpenWindows(prev => [...prev, windowId]);
        coreEventBus.emit('SYSTEM_UI_ACTION_STATE_CHANGED', { actionId: windowId, isActive: true });
      } else {
        bringToFront(windowId);
      }
    };

    const handleClose = (windowId: string) => {
      const isOpen = openWindowsRef.current.includes(windowId);
      if (isOpen) {
        setOpenWindows(prev => prev.filter(id => id !== windowId));
        coreEventBus.emit('SYSTEM_UI_ACTION_STATE_CHANGED', { actionId: windowId, isActive: false });
      }
    };



    const handleDockChange = ({ windowId, state }: { windowId: string, state: WindowPosition }) => {
      setDockStates(prev => ({ ...prev, [windowId]: state }));
    };

    coreEventBus.on('SYSTEM_UI_UPDATED', handleUpdate);
    coreEventBus.on('WINDOW_TOGGLE', handleToggle);
    coreEventBus.on('WINDOW_OPEN', handleOpen);
    coreEventBus.on('WINDOW_CLOSE', handleClose);
    coreEventBus.on('WINDOW_FOCUS', bringToFront);
    coreEventBus.on('WINDOW_DOCK_CHANGE', handleDockChange);

    return () => {
      coreEventBus.off('SYSTEM_UI_UPDATED', handleUpdate);
      coreEventBus.off('WINDOW_TOGGLE', handleToggle);
      coreEventBus.off('WINDOW_OPEN', handleOpen);
      coreEventBus.off('WINDOW_CLOSE', handleClose);
      coreEventBus.off('WINDOW_FOCUS', bringToFront);
      coreEventBus.off('WINDOW_DOCK_CHANGE', handleDockChange);
    };
  }, []);

  if (windows.length === 0) return null;

  // Calculer les zones actuellement occupées par des fenêtres OUVERTES
  const occupiedZones = Object.entries(dockStates)
    .filter(([id, state]) => openWindows.includes(id) && ['left', 'right', 'top', 'bottom'].includes(state))
    .map(([id, state]) => state);

  return (
    <div className="absolute inset-0 pointer-events-none z-[55]">
      {windows.map((win) => {
        const isOpen = openWindows.includes(win.windowId);
        const zIndex = 60 + zOrder.indexOf(win.windowId);
        
        return (
          <DraggableWindow
            key={`${win.modId}:${win.windowId}`}
            windowId={win.windowId}
            title={win.title}
            icon={win.icon}
            defaultPosition={win.defaultPosition}
            isOpen={isOpen}
            onFocus={() => bringToFront(win.windowId)}
            zIndex={zIndex}
            occupiedZones={occupiedZones}
          >
            {win.component}
          </DraggableWindow>
        );
      })}
    </div>
  );
}

