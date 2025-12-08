import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Stage, Layer, Line, Rect, Circle, Text as KonvaText, Arrow, Transformer } from 'react-konva';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Save,
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
} from 'lucide-react';
import Konva from 'konva';

type Tool = 'pen' | 'highlighter' | 'text' | 'shape' | 'eraser' | 'select';
type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'line' | 'square';

interface DrawObject {
  id: string;
  type: 'line' | 'rect' | 'circle' | 'text' | 'arrow' | 'triangle';
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  opacity?: number;
}

export function NoteEditor() {
  const { noteId } = useParams<{ noteId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(16);
  const [objects, setObjects] = useState<DrawObject[]>([]);
  const [history, setHistory] = useState<DrawObject[][]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [textValue, setTextValue] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  const colors = ['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchNote();
  }, [user, noteId, navigate]);

  useEffect(() => {
    if (selectedId && transformerRef.current) {
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
  }, [selectedId]);

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
      }
    } catch (error) {
      console.error('Error fetching note:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!noteId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          content: { objects, background: '#ffffff' },
        })
        .eq('id', noteId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setSaving(false);
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

  const handleMouseDown = (e: any) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (tool === 'text') {
      setTextPosition({ x: point.x, y: point.y });
      setShowTextInput(true);
      return;
    }

    if (tool === 'shape') {
      const newShape: DrawObject = {
        id: `shape-${Date.now()}`,
        type: selectedShape === 'square' || selectedShape === 'rectangle' ? 'rect' :
              selectedShape === 'circle' ? 'circle' :
              selectedShape === 'triangle' ? 'triangle' :
              selectedShape === 'arrow' ? 'arrow' : 'line',
        x: point.x,
        y: point.y,
        width: selectedShape === 'square' ? 100 : selectedShape === 'rectangle' ? 150 : undefined,
        height: selectedShape === 'square' ? 100 : selectedShape === 'rectangle' ? 100 : undefined,
        radius: selectedShape === 'circle' ? 50 : undefined,
        stroke: color,
        strokeWidth,
        fill: selectedShape === 'triangle' ? color : 'transparent',
        points: selectedShape === 'arrow' || selectedShape === 'line' ? [0, 0, 100, 0] :
                selectedShape === 'triangle' ? [0, -50, 50, 50, -50, 50] : undefined,
      };

      const newObjects = [...objects, newShape];
      setObjects(newObjects);
      addToHistory(newObjects);
      return;
    }

    setIsDrawing(true);

    const newLine: DrawObject = {
      id: `line-${Date.now()}`,
      type: 'line',
      points: [point.x, point.y],
      stroke: tool === 'eraser' ? '#ffffff' : color,
      strokeWidth: tool === 'eraser' ? 20 : strokeWidth,
      opacity: tool === 'highlighter' ? 0.5 : 1,
    };

    setObjects([...objects, newLine]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || tool === 'shape' || tool === 'text' || tool === 'select') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastLine = objects[objects.length - 1];

    if (lastLine && lastLine.points) {
      const updatedLine = {
        ...lastLine,
        points: [...lastLine.points, point.x, point.y],
      };

      const newObjects = [...objects.slice(0, -1), updatedLine];
      setObjects(newObjects);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      addToHistory(objects);
    }
    setIsDrawing(false);
  };

  const handleTextSubmit = () => {
    if (!textValue.trim()) {
      setShowTextInput(false);
      setTextValue('');
      return;
    }

    const newText: DrawObject = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: textPosition.x,
      y: textPosition.y,
      text: textValue,
      fontSize,
      fill: color,
    };

    const newObjects = [...objects, newText];
    setObjects(newObjects);
    addToHistory(newObjects);
    setShowTextInput(false);
    setTextValue('');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h1 className="text-lg font-semibold text-gray-900">{note?.title}</h1>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={undo}
                disabled={historyStep === 0}
                className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo"
              >
                <Undo className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={redo}
                disabled={historyStep === history.length - 1}
                className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo"
              >
                <Redo className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={saveNote}
                disabled={saving}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
              >
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Tools</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setTool('pen')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    tool === 'pen' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Pen className="w-5 h-5" />
                  <span>Pen</span>
                </button>
                <button
                  onClick={() => setTool('highlighter')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    tool === 'highlighter' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Pen className="w-5 h-5" />
                  <span>Highlighter</span>
                </button>
                <button
                  onClick={() => setTool('text')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    tool === 'text' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Type className="w-5 h-5" />
                  <span>Text</span>
                </button>
                <button
                  onClick={() => setTool('shape')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    tool === 'shape' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Square className="w-5 h-5" />
                  <span>Shapes</span>
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    tool === 'eraser' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Eraser className="w-5 h-5" />
                  <span>Eraser</span>
                </button>
              </div>
            </div>

            {tool === 'shape' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Shapes</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedShape('square')}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedShape === 'square'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Square className="w-6 h-6 mx-auto" />
                  </button>
                  <button
                    onClick={() => setSelectedShape('rectangle')}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedShape === 'rectangle'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-8 h-5 border-2 border-current mx-auto" />
                  </button>
                  <button
                    onClick={() => setSelectedShape('circle')}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedShape === 'circle'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CircleIcon className="w-6 h-6 mx-auto" />
                  </button>
                  <button
                    onClick={() => setSelectedShape('triangle')}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedShape === 'triangle'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Triangle className="w-6 h-6 mx-auto" />
                  </button>
                  <button
                    onClick={() => setSelectedShape('arrow')}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedShape === 'arrow'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <ArrowRight className="w-6 h-6 mx-auto" />
                  </button>
                  <button
                    onClick={() => setSelectedShape('line')}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedShape === 'line'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-8 h-0 border-t-2 border-current mx-auto mt-3" />
                  </button>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Colors</h3>
              <div className="grid grid-cols-4 gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-10 h-10 rounded-lg border-2 transition ${
                      color === c ? 'border-gray-900 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {(tool === 'pen' || tool === 'highlighter') && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Thickness: {strokeWidth}px
                </h3>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {tool === 'text' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Font Size: {fontSize}px
                </h3>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100 p-8">
          <div className="bg-white shadow-lg mx-auto" style={{ width: '1200px', height: '1600px' }}>
            <Stage
              ref={stageRef}
              width={1200}
              height={1600}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <Layer>
                <Rect x={0} y={0} width={1200} height={1600} fill="#ffffff" />
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
                        draggable={tool === 'select'}
                        onClick={() => tool === 'select' && setSelectedId(obj.id)}
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
                        draggable={tool === 'select'}
                        onClick={() => tool === 'select' && setSelectedId(obj.id)}
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
                        fill={obj.fill}
                        draggable={tool === 'select'}
                        onClick={() => tool === 'select' && setSelectedId(obj.id)}
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
                        draggable={tool === 'select'}
                        onClick={() => tool === 'select' && setSelectedId(obj.id)}
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
                        draggable={tool === 'select'}
                        onClick={() => tool === 'select' && setSelectedId(obj.id)}
                      />
                    );
                  }
                  return null;
                })}
                {tool === 'select' && <Transformer ref={transformerRef} />}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      {showTextInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Text</h3>
            <textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Enter your text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 h-32 resize-none"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowTextInput(false);
                  setTextValue('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTextSubmit}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Share Note</h3>
            <p className="text-gray-600 mb-4">Anyone with this link can view your note</p>
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
              <button
                onClick={copyShareLink}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center space-x-2"
              >
                <Check className="w-5 h-5" />
                <span>Copy</span>
              </button>
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
