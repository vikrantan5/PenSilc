import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Stage, Layer, Line, Rect, Circle, Text as KonvaText, Arrow, Transformer, Ellipse } from 'react-konva';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Share2,
  Undo,
  Redo,
  Pen,
  Type,
  Square,
  Circle as CircleIcon,
  Triangle,
  ArrowRight,
  Eraser,
  Check,
  Moon,
  Sun,
  Hand,
  ZoomIn,
  ZoomOut,
  Palette,
  Download,
} from 'lucide-react';
import Konva from 'konva';
import {
  convertColorForDarkMode,
  getDefaultDrawingColor,
} from '../utils/colorConversion';

type Tool = 'pen' | 'highlighter' | 'text' | 'shape' | 'eraser' | 'select' | 'pan';
type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'line' | 'square' | 'ellipse';
type TextAlign = 'left' | 'center' | 'right';

interface DrawObject {
  id: string;
  type: 'line' | 'rect' | 'circle' | 'text' | 'arrow' | 'triangle' | 'straightline' | 'ellipse';
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  textDecoration?: string;
  align?: TextAlign;
  opacity?: number;
  draggable?: boolean;
  originalFill?: string;
  originalStroke?: string;
}

interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const CANVAS_WIDTH = 10000;
const CANVAS_HEIGHT = 10000;

export function NoteEditorEnhanced() {
  const { noteId } = useParams<{ noteId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [tool, setTool] = useState<Tool>('pen');
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const [color, setColor] = useState('#000000');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily] = useState('Arial');
  const [objects, setObjects] = useState<DrawObject[]>([]);
  const [history, setHistory] = useState<DrawObject[][]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [textBox, setTextBox] = useState<TextBox | null>(null);
  const [textValue, setTextValue] = useState('');
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [tempLineStart, setTempLineStart] = useState<{ x: number; y: number } | null>(null);
  
  // New states for drag-to-draw shapes and text
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [tempShapeStart, setTempShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [isDrawingTextBox, setIsDrawingTextBox] = useState(false);
  const [tempTextBoxStart, setTempTextBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(null);
  
  // New states for infinite canvas and pan
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointerPos, setLastPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [doubleClickTimer, setDoubleClickTimer] = useState<number | null>(null);
  const [clickCount, setClickCount] = useState(0);
  
  // UI states
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('notesAppDarkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchNote();
  }, [user, noteId, navigate]);

  useEffect(() => {
    if (selectedId && transformerRef.current && tool === 'select') {
      const stage = stageRef.current;
      const selectedNode = stage?.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, tool]);

  // Auto-save every 3 seconds
  useEffect(() => {
    if (objects.length === 0 || !noteId) return;

    const currentState = JSON.stringify(objects);
    if (currentState === lastSavedRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveNote();
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [objects, noteId]);

  const fetchNote = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/dashboard');
        return;
      }

      setNote(data);
      if (data.content && data.content.objects) {
        setObjects(data.content.objects);
        setHistory([data.content.objects]);
        lastSavedRef.current = JSON.stringify(data.content.objects);
      }
    } catch (error) {
      console.error('Error fetching note:', error);
    } finally {
      setLoading(false);
    }
  };

  const autoSaveNote = async () => {
    if (!noteId) return;

    setAutoSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          content: { objects, background: darkMode ? '#0f0f0f' : '#ffffff' },
        })
        .eq('id', noteId);

      if (error) throw error;
      
      lastSavedRef.current = JSON.stringify(objects);
      setAutoSaveStatus('saved');
      
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error auto-saving note:', error);
      setAutoSaveStatus('idle');
    }
  };

  const addToHistory = (newObjects: DrawObject[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newObjects);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setObjects(history[historyStep - 1]);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setObjects(history[historyStep + 1]);
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    
    // Convert all object colors
    const convertedObjects = objects.map(obj => {
      const newObj = { ...obj };
      
      if (newDarkMode) {
        // Entering dark mode
        if (obj.fill) {
          newObj.originalFill = obj.fill;
          newObj.fill = convertColorForDarkMode(obj.fill);
        }
        if (obj.stroke) {
          newObj.originalStroke = obj.stroke;
          newObj.stroke = convertColorForDarkMode(obj.stroke);
        }
      } else {
        // Exiting dark mode - restore original colors
        if (obj.originalFill) {
          newObj.fill = obj.originalFill;
          delete newObj.originalFill;
        }
        if (obj.originalStroke) {
          newObj.stroke = obj.originalStroke;
          delete newObj.originalStroke;
        }
      }
      
      return newObj;
    });
    
    setObjects(convertedObjects);
    setDarkMode(newDarkMode);
    localStorage.setItem('notesAppDarkMode', newDarkMode.toString());
    
    // Update color picker to use appropriate default
    setColor(getDefaultDrawingColor(newDarkMode));
    setStrokeColor(getDefaultDrawingColor(newDarkMode));
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.05;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.1, Math.min(3, newScale));

    setZoom(clampedScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };
    
    setStagePos(newPos);
  };

  // Helper function to check if a point is near an object (for eraser)
  const isPointNearObject = (point: { x: number; y: number }, obj: DrawObject, eraserWidth: number): boolean => {
    const threshold = eraserWidth / 2;

    if (obj.type === 'line' && obj.points) {
      // Check if point is near any line segment
      for (let i = 0; i < obj.points.length - 2; i += 2) {
        const x1 = obj.points[i];
        const y1 = obj.points[i + 1];
        const x2 = obj.points[i + 2];
        const y2 = obj.points[i + 3];
        
        const distance = distanceToLineSegment(point, { x: x1, y: y1 }, { x: x2, y: y2 });
        if (distance < threshold) return true;
      }
      return false;
    }

    if (obj.type === 'rect' && obj.x !== undefined && obj.y !== undefined && obj.width && obj.height) {
      return (
        point.x >= obj.x - threshold &&
        point.x <= obj.x + obj.width + threshold &&
        point.y >= obj.y - threshold &&
        point.y <= obj.y + obj.height + threshold
      );
    }

    if (obj.type === 'circle' && obj.x !== undefined && obj.y !== undefined && obj.radius) {
      const distance = Math.sqrt(Math.pow(point.x - obj.x, 2) + Math.pow(point.y - obj.y, 2));
      return distance <= obj.radius + threshold;
    }

    if (obj.type === 'ellipse' && obj.x !== undefined && obj.y !== undefined && obj.radiusX && obj.radiusY) {
      const dx = point.x - obj.x;
      const dy = point.y - obj.y;
      const distance = Math.sqrt(Math.pow(dx / obj.radiusX, 2) + Math.pow(dy / obj.radiusY, 2));
      return distance <= 1 + threshold / Math.max(obj.radiusX, obj.radiusY);
    }

    if (obj.type === 'text' && obj.x !== undefined && obj.y !== undefined && obj.width) {
      const estimatedHeight = (obj.fontSize || 16) * 1.2;
      return (
        point.x >= obj.x - threshold &&
        point.x <= obj.x + obj.width + threshold &&
        point.y >= obj.y - threshold &&
        point.y <= obj.y + estimatedHeight + threshold
      );
    }

    if ((obj.type === 'arrow' || obj.type === 'triangle' || obj.type === 'straightline') && obj.x !== undefined && obj.y !== undefined && obj.points) {
      // Check if point is near the shape bounds
      const minX = Math.min(...obj.points.filter((_, i) => i % 2 === 0)) + obj.x;
      const maxX = Math.max(...obj.points.filter((_, i) => i % 2 === 0)) + obj.x;
      const minY = Math.min(...obj.points.filter((_, i) => i % 2 === 1)) + obj.y;
      const maxY = Math.max(...obj.points.filter((_, i) => i % 2 === 1)) + obj.y;
      
      return (
        point.x >= minX - threshold &&
        point.x <= maxX + threshold &&
        point.y >= minY - threshold &&
        point.y <= maxY + threshold
      );
    }

    return false;
  };

  // Helper function to calculate distance from point to line segment
  const distanceToLineSegment = (
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
  ): number => {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) {
      return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2));
    }
    
    let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length);
    t = Math.max(0, Math.min(1, t));
    
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    
    return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
  };

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const relativePoint = {
      x: (point.x - stagePos.x) / zoom,
      y: (point.y - stagePos.y) / zoom,
    };

    // Handle middle mouse button for panning
    if (e.evt.button === 1) {
      setIsPanning(true);
      setLastPointerPos(point);
      stage.container().style.cursor = 'grabbing';
      return;
    }

    // Handle double-click for panning
    if (e.evt.button === 0 && tool !== 'pan') {
      const newClickCount = clickCount + 1;
      
      if (doubleClickTimer) {
        clearTimeout(doubleClickTimer);
      }
      
      if (newClickCount === 2) {
        // Double click detected
        setIsPanning(true);
        setLastPointerPos(point);
        stage.container().style.cursor = 'grabbing';
        setClickCount(0);
        setDoubleClickTimer(null);
        return;
      } else {
        setClickCount(newClickCount);
        const timer = window.setTimeout(() => {
          setClickCount(0);
        }, 300);
        setDoubleClickTimer(timer);
      }
    }

    // If in pan mode, start panning
    if (tool === 'pan') {
      setIsPanning(true);
      setLastPointerPos(point);
      stage.container().style.cursor = 'grabbing';
      return;
    }

    // If clicking on text box, don't do anything
    if (textBox) {
      return;
    }

    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.attrs.id === 'background';
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    if (tool === 'text') {
      // Start drag-to-create text box
      setIsDrawingTextBox(true);
      setTempTextBoxStart(relativePoint);
      return;
    }

    if (tool === 'shape') {
      if (selectedShape === 'line') {
        setIsDrawingLine(true);
        setTempLineStart(relativePoint);
        return;
      }

      // Start drag-to-draw shape
      setIsDrawingShape(true);
      setTempShapeStart(relativePoint);
      return;
    }

    // Handle eraser - object-level erasing
    if (tool === 'eraser') {
      const eraserWidth = 20;
      const objectsToRemove = objects.filter(obj => 
        isPointNearObject(relativePoint, obj, eraserWidth)
      );
      
      if (objectsToRemove.length > 0) {
        const remainingObjects = objects.filter(obj => 
          !objectsToRemove.some(removeObj => removeObj.id === obj.id)
        );
        setObjects(remainingObjects);
      }
      
      setIsDrawing(true);
      return;
    }

    setIsDrawing(true);

    const drawColor = color;

    const newLine: DrawObject = {
      id: `line-${Date.now()}`,
      type: 'line',
      points: [relativePoint.x, relativePoint.y],
      stroke: drawColor,
      strokeWidth: strokeWidth,
      opacity: tool === 'highlighter' ? 0.5 : 1,
    };

    setObjects([...objects, newLine]);
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    // Handle panning
    if (isPanning && lastPointerPos) {
      const dx = point.x - lastPointerPos.x;
      const dy = point.y - lastPointerPos.y;
      
      setStagePos({
        x: stagePos.x + dx,
        y: stagePos.y + dy,
      });
      
      setLastPointerPos(point);
      return;
    }

    const relativePoint = {
      x: (point.x - stagePos.x) / zoom,
      y: (point.y - stagePos.y) / zoom,
    };

    // Update eraser cursor position
    if (tool === 'eraser') {
      setEraserCursor(relativePoint);
    } else {
      setEraserCursor(null);
    }

    // Handle text box drag-to-create
    if (isDrawingTextBox && tempTextBoxStart) {
      const width = Math.abs(relativePoint.x - tempTextBoxStart.x);
      const height = Math.abs(relativePoint.y - tempTextBoxStart.y);
      const x = Math.min(tempTextBoxStart.x, relativePoint.x);
      const y = Math.min(tempTextBoxStart.y, relativePoint.y);
      
      setTextBox({
        id: `textbox-${Date.now()}`,
        x,
        y,
        width: Math.max(width, 50),
        height: Math.max(height, 30),
      });
      return;
    }

    // Handle shape drag-to-draw
    if (isDrawingShape && tempShapeStart) {
      const tempShapeId = 'temp-shape-preview';
      const existingTempShape = objects.find(obj => obj.id === tempShapeId);
      
      const width = Math.abs(relativePoint.x - tempShapeStart.x);
      const height = Math.abs(relativePoint.y - tempShapeStart.y);
      const x = Math.min(tempShapeStart.x, relativePoint.x);
      const y = Math.min(tempShapeStart.y, relativePoint.y);

      let tempShape: DrawObject;

      if (selectedShape === 'square') {
        const size = Math.max(width, height);
        tempShape = {
          id: tempShapeId,
          type: 'rect',
          x,
          y,
          width: size,
          height: size,
          stroke: strokeColor,
          strokeWidth,
          fill: fillColor,
          draggable: false,
        };
      } else if (selectedShape === 'rectangle') {
        tempShape = {
          id: tempShapeId,
          type: 'rect',
          x,
          y,
          width,
          height,
          stroke: strokeColor,
          strokeWidth,
          fill: fillColor,
          draggable: false,
        };
      } else if (selectedShape === 'circle') {
        const radius = Math.max(width, height) / 2;
        tempShape = {
          id: tempShapeId,
          type: 'circle',
          x: tempShapeStart.x + (relativePoint.x > tempShapeStart.x ? radius : -radius),
          y: tempShapeStart.y + (relativePoint.y > tempShapeStart.y ? radius : -radius),
          radius,
          stroke: strokeColor,
          strokeWidth,
          fill: fillColor,
          draggable: false,
        };
      } else if (selectedShape === 'ellipse') {
        tempShape = {
          id: tempShapeId,
          type: 'ellipse',
          x: tempShapeStart.x + (relativePoint.x - tempShapeStart.x) / 2,
          y: tempShapeStart.y + (relativePoint.y - tempShapeStart.y) / 2,
          radiusX: Math.abs(relativePoint.x - tempShapeStart.x) / 2,
          radiusY: Math.abs(relativePoint.y - tempShapeStart.y) / 2,
          stroke: strokeColor,
          strokeWidth,
          fill: fillColor,
          draggable: false,
        };
      } else if (selectedShape === 'triangle') {
        const centerX = (tempShapeStart.x + relativePoint.x) / 2;
        tempShape = {
          id: tempShapeId,
          type: 'triangle',
          x: centerX,
          y: tempShapeStart.y,
          points: [
            0, 0,
            (relativePoint.x - tempShapeStart.x) / 2, relativePoint.y - tempShapeStart.y,
            -(relativePoint.x - tempShapeStart.x) / 2, relativePoint.y - tempShapeStart.y
          ],
          stroke: strokeColor,
          strokeWidth,
          fill: fillColor,
          draggable: false,
        };
      } else if (selectedShape === 'arrow') {
        tempShape = {
          id: tempShapeId,
          type: 'arrow',
          x: tempShapeStart.x,
          y: tempShapeStart.y,
          points: [0, 0, relativePoint.x - tempShapeStart.x, relativePoint.y - tempShapeStart.y],
          stroke: strokeColor,
          strokeWidth,
          fill: strokeColor,
          draggable: false,
        };
      } else {
        return;
      }

      if (existingTempShape) {
        setObjects(objects.map(obj => obj.id === tempShapeId ? tempShape : obj));
      } else {
        setObjects([...objects, tempShape]);
      }
      return;
    }

    // Handle line drawing in shape mode
    if (isDrawingLine && tempLineStart) {
      const tempLineId = 'temp-line-preview';
      const existingTempLine = objects.find(obj => obj.id === tempLineId);
      
      const tempLine: DrawObject = {
        id: tempLineId,
        type: 'straightline',
        x: tempLineStart.x,
        y: tempLineStart.y,
        points: [0, 0, relativePoint.x - tempLineStart.x, relativePoint.y - tempLineStart.y],
        stroke: strokeColor,
        strokeWidth,
        draggable: false,
      };

      if (existingTempLine) {
        setObjects(objects.map(obj => obj.id === tempLineId ? tempLine : obj));
      } else {
        setObjects([...objects, tempLine]);
      }
      return;
    }

    // Handle eraser movement
    if (isDrawing && tool === 'eraser') {
      const eraserWidth = 20;
      const objectsToRemove = objects.filter(obj => 
        isPointNearObject(relativePoint, obj, eraserWidth)
      );
      
      if (objectsToRemove.length > 0) {
        const remainingObjects = objects.filter(obj => 
          !objectsToRemove.some(removeObj => removeObj.id === obj.id)
        );
        setObjects(remainingObjects);
      }
      return;
    }

    if (!isDrawing || tool === 'shape' || tool === 'text' || tool === 'select' || tool === 'pan') return;

    const lastLine = objects[objects.length - 1];

    if (lastLine && lastLine.points) {
      const updatedLine = {
        ...lastLine,
        points: [...lastLine.points, relativePoint.x, relativePoint.y],
      };

      const newObjects = [...objects.slice(0, -1), updatedLine];
      setObjects(newObjects);
    }
  };

  const handleMouseUp = (e: any) => {
    const stage = e.target.getStage();
    
    // Stop panning
    if (isPanning) {
      setIsPanning(false);
      setLastPointerPos(null);
      if (tool === 'pan') {
        stage.container().style.cursor = 'grab';
      } else {
        stage.container().style.cursor = 'default';
      }
      return;
    }

    const point = stage.getPointerPosition();
    const relativePoint = {
      x: (point.x - stagePos.x) / zoom,
      y: (point.y - stagePos.y) / zoom,
    };

    // Complete text box creation
    if (isDrawingTextBox && tempTextBoxStart) {
      setIsDrawingTextBox(false);
      setTempTextBoxStart(null);
      
      if (textBox) {
        setTextValue('');
        setTimeout(() => textInputRef.current?.focus(), 100);
      }
      return;
    }

    // Complete shape drawing
    if (isDrawingShape && tempShapeStart) {
      const filteredObjects = objects.filter(obj => obj.id !== 'temp-shape-preview');
      
      const width = Math.abs(relativePoint.x - tempShapeStart.x);
      const height = Math.abs(relativePoint.y - tempShapeStart.y);
      const x = Math.min(tempShapeStart.x, relativePoint.x);
      const y = Math.min(tempShapeStart.y, relativePoint.y);

      // Only create shape if dragged enough (min 10 pixels)
      if (width < 10 && height < 10) {
        setObjects(filteredObjects);
        setIsDrawingShape(false);
        setTempShapeStart(null);
        return;
      }

      let newShape: DrawObject;

      if (selectedShape === 'square') {
        const size = Math.max(width, height);
        newShape = {
          id: `shape-${Date.now()}`,
          type: 'rect',
          x,
          y,
          width: size,
          height: size,
          stroke: strokeColor,
          strokeWidth,
          fill: fillColor,
          draggable: true,
        };
      } else if (selectedShape === 'rectangle') {
        newShape = {
          id: `shape-${Date.now()}`,
          type: 'rect',
          x,
          y,
          width,
          height,
          stroke: strokeColor,
          strokeWidth,
          fill: fillColor,
          draggable: true,
        };
      } else if (selectedShape === 'circle') {
        const radius = Math.max(width, height) / 2;
        newShape = {
          id: `shape-${Date.now()}`,
          type: 'circle',
          x: tempShapeStart.x + (relativePoint.x > tempShapeStart.x ? radius : -radius),
          y: tempShapeStart.y + (relativePoint.y > tempShapeStart.y ? radius : -radius),
          radius,
          stroke: strokeColor,
          strokeWidth,
          fill: fillColor,
          draggable: true,
        };
      } else if (selectedShape === 'ellipse') {
        newShape = {
          id: `shape-${Date.now()}`,
          type: 'ellipse',
          x: tempShapeStart.x + (relativePoint.x - tempShapeStart.x) / 2,
          y: tempShapeStart.y + (relativePoint.y - tempShapeStart.y) / 2,
          radiusX: Math.abs(relativePoint.x - tempShapeStart.x) / 2,
          radiusY: Math.abs(relativePoint.y - tempShapeStart.y) / 2,
          stroke: strokeColor,
          strokeWidth,
          fill: fillColor,
          draggable: true,
        };
      } else if (selectedShape === 'triangle') {
        const centerX = (tempShapeStart.x + relativePoint.x) / 2;
        newShape = {
          id: `shape-${Date.now()}`,
          type: 'triangle',
          x: centerX,
          y: tempShapeStart.y,
          points: [
            0, 0,
            (relativePoint.x - tempShapeStart.x) / 2, relativePoint.y - tempShapeStart.y,
            -(relativePoint.x - tempShapeStart.x) / 2, relativePoint.y - tempShapeStart.y
          ],
          stroke: strokeColor,
          strokeWidth,
          fill: fillColor,
          draggable: true,
        };
      } else if (selectedShape === 'arrow') {
        newShape = {
          id: `shape-${Date.now()}`,
          type: 'arrow',
          x: tempShapeStart.x,
          y: tempShapeStart.y,
          points: [0, 0, relativePoint.x - tempShapeStart.x, relativePoint.y - tempShapeStart.y],
          stroke: strokeColor,
          strokeWidth,
          fill: strokeColor,
          draggable: true,
        };
      } else {
        setIsDrawingShape(false);
        setTempShapeStart(null);
        return;
      }

      const newObjects = [...filteredObjects, newShape];
      setObjects(newObjects);
      addToHistory(newObjects);
      setIsDrawingShape(false);
      setTempShapeStart(null);
      setSelectedId(newShape.id);
      setTool('select');
      return;
    }

    // Complete line drawing
    if (isDrawingLine && tempLineStart) {
      const filteredObjects = objects.filter(obj => obj.id !== 'temp-line-preview');
      
      const newLine: DrawObject = {
        id: `line-${Date.now()}`,
        type: 'straightline',
        x: tempLineStart.x,
        y: tempLineStart.y,
        points: [0, 0, relativePoint.x - tempLineStart.x, relativePoint.y - tempLineStart.y],
        stroke: strokeColor,
        strokeWidth,
        draggable: true,
      };

      const newObjects = [...filteredObjects, newLine];
      setObjects(newObjects);
      addToHistory(newObjects);
      setIsDrawingLine(false);
      setTempLineStart(null);
      setSelectedId(newLine.id);
      setTool('select');
      return;
    }

    if (isDrawing) {
      if (tool === 'eraser') {
        // For eraser, save to history when done
        addToHistory(objects);
      } else {
        addToHistory(objects);
      }
    }
    setIsDrawing(false);
  };

  const handleTextBoxComplete = () => {
    if (!textBox || !textValue.trim()) {
      setTextBox(null);
      setTextValue('');
      return;
    }

    const newText: DrawObject = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: textBox.x,
      y: textBox.y,
      text: textValue,
      fontSize,
      fontFamily,
      fontStyle: 'normal',
      textDecoration: '',
      fill: color,
      width: textBox.width,
      align: 'left',
      draggable: true,
    };

    const newObjects = [...objects, newText];
    setObjects(newObjects);
    addToHistory(newObjects);
    setTextBox(null);
    setTextValue('');
    setTool('select');
  };

  const handleShare = async () => {
    try {
      const { data: existingShare } = await supabase
        .from('shared_notes')
        .select('id')
        .eq('note_id', noteId)
        .maybeSingle();

      if (existingShare) {
        const url = `${window.location.origin}/shared/${existingShare.id}`;
        setShareUrl(url);
      } else {
        const { data, error } = await supabase
          .from('shared_notes')
          .insert({ note_id: noteId })
          .select()
          .single();

        if (error) throw error;

        const url = `${window.location.origin}/shared/${data.id}`;
        setShareUrl(url);
      }

      setShowShareModal(true);
    } catch (error) {
      console.error('Error creating share link:', error);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const handleDownload = () => {
    if (!stageRef.current) return;
    
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = `${note?.title || 'note'}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (tool === 'pan' && stageRef.current) {
      stageRef.current.container().style.cursor = 'grab';
    } else if (tool === 'eraser' && stageRef.current) {
      stageRef.current.container().style.cursor = 'crosshair';
    } else if (stageRef.current) {
      stageRef.current.container().style.cursor = 'default';
    }
  }, [tool]);

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-900';
  const secondaryText = darkMode ? 'text-gray-300' : 'text-gray-600';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const hoverBg = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const canvasBg = darkMode ? '#0f0f0f' : '#ffffff';

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className={secondaryText}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col ${bgColor}`}>
      {/* Top Navigation */}
      <nav className={`${cardBg} border-b ${borderColor} flex-shrink-0`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className={`flex items-center space-x-2 ${secondaryText} hover:${textColor} px-3 py-2 rounded-lg ${hoverBg} transition`}
                data-testid="back-button"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h1 className={`text-lg font-semibold ${textColor}`}>{note?.title}</h1>
            </div>

            <div className="flex items-center space-x-2">
              {/* Auto-save indicator */}
              {autoSaveStatus === 'saving' && (
                <span className={`text-sm ${secondaryText}`}>Saving...</span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="text-sm text-green-600 flex items-center space-x-1">
                  <Check className="w-4 h-4" />
                  <span>Saved</span>
                </span>
              )}
              
              <button
                onClick={toggleDarkMode}
                className={`p-2 ${hoverBg} rounded-lg transition`}
                title={darkMode ? 'Light Mode' : 'Dark Mode'}
                data-testid="dark-mode-toggle"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-700" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Canvas Area */}
      <div className={`flex-1 overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} relative`}>
        <Stage
          ref={stageRef}
          width={window.innerWidth}
          height={window.innerHeight - 64 - 80}
          scaleX={zoom}
          scaleY={zoom}
          x={stagePos.x}
          y={stagePos.y}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          <Layer>
            <Rect id="background" x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={canvasBg} />
            {objects.map((obj) => {
              if (obj.type === 'line' && obj.points) {
                return (
                  <Line
                    key={obj.id}
                    id={obj.id}
                    points={obj.points}
                    stroke={obj.stroke}
                    strokeWidth={obj.strokeWidth}
                    opacity={obj.opacity}
                    lineCap="round"
                    lineJoin="round"
                    tension={0.5}
                  />
                );
              }
              if (obj.type === 'rect') {
                return (
                  <Rect
                    key={obj.id}
                    id={obj.id}
                    x={obj.x}
                    y={obj.y}
                    width={obj.width}
                    height={obj.height}
                    stroke={obj.stroke}
                    strokeWidth={obj.strokeWidth}
                    fill={obj.fill}
                    draggable={obj.draggable || tool === 'select'}
                    onClick={() => tool === 'select' && setSelectedId(obj.id)}
                    onDragEnd={(e) => {
                      const newObjects = objects.map(o => {
                        if (o.id === obj.id) {
                          return { ...o, x: e.target.x(), y: e.target.y() };
                        }
                        return o;
                      });
                      setObjects(newObjects);
                      addToHistory(newObjects);
                    }}
                  />
                );
              }
              if (obj.type === 'circle') {
                return (
                  <Circle
                    key={obj.id}
                    id={obj.id}
                    x={obj.x}
                    y={obj.y}
                    radius={obj.radius}
                    stroke={obj.stroke}
                    strokeWidth={obj.strokeWidth}
                    fill={obj.fill}
                    draggable={obj.draggable || tool === 'select'}
                    onClick={() => tool === 'select' && setSelectedId(obj.id)}
                    onDragEnd={(e) => {
                      const newObjects = objects.map(o => {
                        if (o.id === obj.id) {
                          return { ...o, x: e.target.x(), y: e.target.y() };
                        }
                        return o;
                      });
                      setObjects(newObjects);
                      addToHistory(newObjects);
                    }}
                  />
                );
              }
              if (obj.type === 'text') {
                return (
                  <KonvaText
                    key={obj.id}
                    id={obj.id}
                    x={obj.x}
                    y={obj.y}
                    text={obj.text}
                    fontSize={obj.fontSize}
                    fontFamily={obj.fontFamily}
                    fontStyle={obj.fontStyle}
                    textDecoration={obj.textDecoration}
                    fill={obj.fill}
                    width={obj.width}
                    align={obj.align}
                    draggable={obj.draggable || tool === 'select'}
                    onClick={() => tool === 'select' && setSelectedId(obj.id)}
                    onDragEnd={(e) => {
                      const newObjects = objects.map(o => {
                        if (o.id === obj.id) {
                          return { ...o, x: e.target.x(), y: e.target.y() };
                        }
                        return o;
                      });
                      setObjects(newObjects);
                      addToHistory(newObjects);
                    }}
                  />
                );
              }
              if (obj.type === 'arrow' && obj.points) {
                return (
                  <Arrow
                    key={obj.id}
                    id={obj.id}
                    x={obj.x}
                    y={obj.y}
                    points={obj.points}
                    stroke={obj.stroke}
                    strokeWidth={obj.strokeWidth}
                    fill={obj.stroke}
                    pointerLength={10}
                    pointerWidth={10}
                    draggable={obj.draggable || tool === 'select'}
                    onClick={() => tool === 'select' && setSelectedId(obj.id)}
                    onDragEnd={(e) => {
                      const newObjects = objects.map(o => {
                        if (o.id === obj.id) {
                          return { ...o, x: e.target.x(), y: e.target.y() };
                        }
                        return o;
                      });
                      setObjects(newObjects);
                      addToHistory(newObjects);
                    }}
                  />
                );
              }
              if (obj.type === 'triangle' && obj.points) {
                return (
                  <Line
                    key={obj.id}
                    id={obj.id}
                    x={obj.x}
                    y={obj.y}
                    points={obj.points}
                    stroke={obj.stroke}
                    strokeWidth={obj.strokeWidth}
                    fill={obj.fill}
                    closed
                    draggable={obj.draggable || tool === 'select'}
                    onClick={() => tool === 'select' && setSelectedId(obj.id)}
                    onDragEnd={(e) => {
                      const newObjects = objects.map(o => {
                        if (o.id === obj.id) {
                          return { ...o, x: e.target.x(), y: e.target.y() };
                        }
                        return o;
                      });
                      setObjects(newObjects);
                      addToHistory(newObjects);
                    }}
                  />
                );
              }
              if (obj.type === 'straightline' && obj.points) {
                return (
                  <Line
                    key={obj.id}
                    id={obj.id}
                    x={obj.x}
                    y={obj.y}
                    points={obj.points}
                    stroke={obj.stroke}
                    strokeWidth={obj.strokeWidth}
                    lineCap="round"
                    draggable={obj.draggable || tool === 'select'}
                    onClick={() => tool === 'select' && setSelectedId(obj.id)}
                    onDragEnd={(e) => {
                      const newObjects = objects.map(o => {
                        if (o.id === obj.id) {
                          return { ...o, x: e.target.x(), y: e.target.y() };
                        }
                        return o;
                      });
                      setObjects(newObjects);
                      addToHistory(newObjects);
                    }}
                  />
                );
              }
              if (obj.type === 'ellipse') {
                return (
                  <Ellipse
                    key={obj.id}
                    id={obj.id}
                    x={obj.x}
                    y={obj.y}
                    radiusX={obj.radiusX || 75}
                    radiusY={obj.radiusY || 50}
                    stroke={obj.stroke}
                    strokeWidth={obj.strokeWidth}
                    fill={obj.fill}
                    draggable={obj.draggable || tool === 'select'}
                    onClick={() => tool === 'select' && setSelectedId(obj.id)}
                    onDragEnd={(e) => {
                      const newObjects = objects.map(o => {
                        if (o.id === obj.id) {
                          return { ...o, x: e.target.x(), y: e.target.y() };
                        }
                        return o;
                      });
                      setObjects(newObjects);
                      addToHistory(newObjects);
                    }}
                  />
                );
              }
              return null;
            })}
            {tool === 'select' && <Transformer ref={transformerRef} />}
            
            {/* Eraser cursor */}
            {tool === 'eraser' && eraserCursor && (
              <Circle
                x={eraserCursor.x}
                y={eraserCursor.y}
                radius={10}
                stroke={darkMode ? '#ffffff' : '#000000'}
                strokeWidth={2}
                dash={[5, 5]}
                listening={false}
              />
            )}
          </Layer>
        </Stage>

        {/* Dotted Text Box Overlay */}
        {textBox && (
          <div
            className="absolute border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-20 p-2"
            style={{
              left: textBox.x * zoom + stagePos.x,
              top: textBox.y * zoom + stagePos.y + 64,
              width: textBox.width * zoom,
              height: textBox.height * zoom,
              cursor: 'text',
            }}
          >
            <textarea
              ref={textInputRef}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              className="w-full h-full bg-transparent border-none outline-none resize-none text-black"
              style={{
                fontSize: `${fontSize}px`,
                fontFamily,
                color,
              }}
              placeholder="Type your text here..."
              data-testid="text-input"
            />
            <div className="absolute bottom-0 right-0 flex space-x-2 p-2 bg-white rounded-tl shadow">
              <button
                onClick={() => {
                  setTextBox(null);
                  setTextValue('');
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                data-testid="text-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleTextBoxComplete}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                data-testid="text-done"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className={`${cardBg} rounded-full shadow-2xl px-4 py-3 flex items-center space-x-3 border ${borderColor} backdrop-blur-sm bg-opacity-95`}>
          {/* Pan Tool */}
          <button
            onClick={() => setTool(tool === 'pan' ? 'select' : 'pan')}
            className={`p-2 rounded-lg transition ${
              tool === 'pan' ? 'bg-blue-500 text-white' : `${hoverBg} ${secondaryText}`
            }`}
            title="Pan Tool"
            data-testid="pan-tool"
          >
            <Hand className="w-5 h-5" />
          </button>

          <div className={`w-px h-8 ${borderColor} bg-gray-300`} />

          {/* Pen */}
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition ${
              tool === 'pen' ? 'bg-blue-500 text-white' : `${hoverBg} ${secondaryText}`
            }`}
            title="Pen"
            data-testid="pen-tool"
          >
            <Pen className="w-5 h-5" />
          </button>

          {/* Eraser */}
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition ${
              tool === 'eraser' ? 'bg-blue-500 text-white' : `${hoverBg} ${secondaryText}`
            }`}
            title="Eraser"
            data-testid="eraser-tool"
          >
            <Eraser className="w-5 h-5" />
          </button>

          {/* Text Tool */}
          <button
            onClick={() => setTool('text')}
            className={`p-2 rounded-lg transition ${
              tool === 'text' ? 'bg-blue-500 text-white' : `${hoverBg} ${secondaryText}`
            }`}
            title="Text"
            data-testid="text-tool"
          >
            <Type className="w-5 h-5" />
          </button>

          {/* Shapes */}
          <div className="relative">
            <button
              onClick={() => {
                setShowShapeMenu(!showShapeMenu);
                setShowColorPicker(false);
              }}
              className={`p-2 rounded-lg transition ${
                tool === 'shape' ? 'bg-blue-500 text-white' : `${hoverBg} ${secondaryText}`
              }`}
              title="Shapes"
              data-testid="shapes-tool"
            >
              <Square className="w-5 h-5" />
            </button>
            
            {showShapeMenu && (
              <div className={`absolute bottom-14 left-1/2 transform -translate-x-1/2 ${cardBg} rounded-lg shadow-xl p-3 border ${borderColor} z-50`}>
                <div className="grid grid-cols-4 gap-2" style={{ minWidth: '200px' }}>
                  <button
                    onClick={() => {
                      setSelectedShape('square');
                      setTool('shape');
                      setShowShapeMenu(false);
                    }}
                    className={`p-3 rounded-lg border-2 ${borderColor} hover:bg-blue-100 hover:border-blue-500 transition flex items-center justify-center`}
                    title="Square"
                  >
                    <Square className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedShape('rectangle');
                      setTool('shape');
                      setShowShapeMenu(false);
                    }}
                    className={`p-3 rounded-lg border-2 ${borderColor} hover:bg-blue-100 hover:border-blue-500 transition flex items-center justify-center`}
                    title="Rectangle"
                  >
                    <div className="w-8 h-5 border-2 border-current" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedShape('circle');
                      setTool('shape');
                      setShowShapeMenu(false);
                    }}
                    className={`p-3 rounded-lg border-2 ${borderColor} hover:bg-blue-100 hover:border-blue-500 transition flex items-center justify-center`}
                    title="Circle"
                  >
                    <CircleIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedShape('ellipse');
                      setTool('shape');
                      setShowShapeMenu(false);
                    }}
                    className={`p-3 rounded-lg border-2 ${borderColor} hover:bg-blue-100 hover:border-blue-500 transition flex items-center justify-center`}
                    title="Ellipse"
                  >
                    <div className="w-8 h-5 border-2 border-current rounded-full" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedShape('triangle');
                      setTool('shape');
                      setShowShapeMenu(false);
                    }}
                    className={`p-3 rounded-lg border-2 ${borderColor} hover:bg-blue-100 hover:border-blue-500 transition flex items-center justify-center`}
                    title="Triangle"
                  >
                    <Triangle className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedShape('arrow');
                      setTool('shape');
                      setShowShapeMenu(false);
                    }}
                    className={`p-3 rounded-lg border-2 ${borderColor} hover:bg-blue-100 hover:border-blue-500 transition flex items-center justify-center`}
                    title="Arrow"
                  >
                    <ArrowRight className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedShape('line');
                      setTool('shape');
                      setShowShapeMenu(false);
                    }}
                    className={`p-3 rounded-lg border-2 ${borderColor} hover:bg-blue-100 hover:border-blue-500 transition flex items-center justify-center`}
                    title="Line"
                  >
                    <div className="w-8 h-0 border-t-2 border-current" style={{ marginTop: '12px' }} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowShapeMenu(false);
              }}
              className={`p-2 rounded-lg transition ${hoverBg} ${secondaryText}`}
              title="Color Picker"
              data-testid="color-picker"
            >
              <Palette className="w-5 h-5" />
            </button>
            
            {showColorPicker && (
              <div className={`absolute bottom-14 left-1/2 transform -translate-x-1/2 ${cardBg} rounded-lg shadow-xl p-4 border ${borderColor} z-50`}>
                <div className="space-y-3 w-56">
                  <div>
                    <label className={`text-xs ${secondaryText} mb-1 block`}>Drawing Color</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${secondaryText} mb-1 block`}>Stroke Width</label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className={`text-xs ${secondaryText}`}>{strokeWidth}px</span>
                  </div>
                  {tool === 'shape' && (
                    <>
                      <div>
                        <label className={`text-xs ${secondaryText} mb-1 block`}>Border Color</label>
                        <input
                          type="color"
                          value={strokeColor}
                          onChange={(e) => setStrokeColor(e.target.value)}
                          className="w-full h-8 rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${secondaryText} mb-1 block`}>Fill Color</label>
                        <div className="flex space-x-2">
                          <input
                            type="color"
                            value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                            onChange={(e) => setFillColor(e.target.value)}
                            className="flex-1 h-8 rounded cursor-pointer"
                          />
                          <button
                            onClick={() => setFillColor('transparent')}
                            className={`px-2 text-xs rounded ${
                              fillColor === 'transparent' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                            }`}
                          >
                            None
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  {tool === 'text' && (
                    <div>
                      <label className={`text-xs ${secondaryText} mb-1 block`}>Font Size</label>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full"
                      />
                      <span className={`text-xs ${secondaryText}`}>{fontSize}px</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={`w-px h-8 ${borderColor} bg-gray-300`} />

          {/* Undo */}
          <button
            onClick={undo}
            disabled={historyStep === 0}
            className={`p-2 rounded-lg transition ${hoverBg} ${secondaryText} disabled:opacity-30`}
            title="Undo"
            data-testid="undo-button"
          >
            <Undo className="w-5 h-5" />
          </button>

          {/* Redo */}
          <button
            onClick={redo}
            disabled={historyStep === history.length - 1}
            className={`p-2 rounded-lg transition ${hoverBg} ${secondaryText} disabled:opacity-30`}
            title="Redo"
            data-testid="redo-button"
          >
            <Redo className="w-5 h-5" />
          </button>

          <div className={`w-px h-8 ${borderColor} bg-gray-300`} />

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleZoomChange(Math.max(0.1, zoom - 0.1))}
              className={`p-2 rounded-lg transition ${hoverBg} ${secondaryText}`}
              title="Zoom Out"
              data-testid="zoom-out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="10"
              max="300"
              value={zoom * 100}
              onChange={(e) => handleZoomChange(Number(e.target.value) / 100)}
              className="w-24"
              title={`Zoom: ${Math.round(zoom * 100)}%`}
              data-testid="zoom-slider"
            />
            <span className={`text-xs ${secondaryText} w-12`}>{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => handleZoomChange(Math.min(3, zoom + 0.1))}
              className={`p-2 rounded-lg transition ${hoverBg} ${secondaryText}`}
              title="Zoom In"
              data-testid="zoom-in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className={`w-px h-8 ${borderColor} bg-gray-300`} />

          {/* Share */}
          <button
            onClick={handleShare}
            className={`p-2 rounded-lg transition ${hoverBg} ${secondaryText}`}
            title="Share"
            data-testid="share-button"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className={`p-2 rounded-lg transition ${hoverBg} ${secondaryText}`}
            title="Download"
            data-testid="download-button"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${cardBg} rounded-xl shadow-xl max-w-md w-full p-6 m-4`}>
            <h3 className={`text-xl font-bold ${textColor} mb-4`}>Share Note</h3>
            <p className={`${secondaryText} mb-4`}>Anyone with this link can view your note</p>
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className={`flex-1 px-4 py-2 border ${borderColor} rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} ${textColor}`}
                data-testid="share-url-input"
              />
              <button
                onClick={copyShareLink}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center space-x-2"
                data-testid="copy-share-link"
              >
                <Check className="w-5 h-5" />
                <span>Copy</span>
              </button>
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition`}
              data-testid="close-share-modal"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
