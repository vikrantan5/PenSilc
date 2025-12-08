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
  Moon,
  Sun,
  Move,
  Plus,
  Minus,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import Konva from 'konva';

type Tool = 'pen' | 'highlighter' | 'text' | 'shape' | 'eraser' | 'select';
type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'line' | 'square';
type TextAlign = 'left' | 'center' | 'right';

interface DrawObject {
  id: string;
  type: 'line' | 'rect' | 'circle' | 'text' | 'arrow' | 'triangle' | 'straightline';
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
  fontFamily?: string;
  fontStyle?: string;
  textDecoration?: string;
  align?: TextAlign;
  opacity?: number;
  draggable?: boolean;
}

interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Comic Sans MS'];

export function NoteEditorEnhanced() {
  const { noteId } = useParams<{ noteId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const [color, setColor] = useState('#000000');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<TextAlign>('left');
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
  const [isResizingText, setIsResizingText] = useState(false);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const colors = ['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#FFFFFF'];

  useEffect(() => {
    // Load dark mode from localStorage
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
          content: { objects, background: darkMode ? '#1e1e1e' : '#ffffff' },
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

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('notesAppDarkMode', newDarkMode.toString());
  };

  const updateSelectedObject = (property: string, value: any) => {
    if (!selectedId) return;

    const newObjects = objects.map(obj => {
      if (obj.id === selectedId) {
        return { ...obj, [property]: value };
      }
      return obj;
    });

    setObjects(newObjects);
    addToHistory(newObjects);
  };

  const getSelectedObject = () => {
    return objects.find(obj => obj.id === selectedId);
  };

  const handleMouseDown = (e: any) => {
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

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (tool === 'text') {
      // Create dotted text box
      setTextBox({
        id: `textbox-${Date.now()}`,
        x: point.x,
        y: point.y,
        width: 200,
        height: 100,
      });
      setTextValue('');
      setTimeout(() => textInputRef.current?.focus(), 100);
      return;
    }

    if (tool === 'shape') {
      const newShape: DrawObject = {
        id: `shape-${Date.now()}`,
        type: selectedShape === 'square' || selectedShape === 'rectangle' ? 'rect' :
              selectedShape === 'circle' ? 'circle' :
              selectedShape === 'triangle' ? 'triangle' :
              selectedShape === 'arrow' ? 'arrow' : 
              selectedShape === 'line' ? 'straightline' : 'line',
        x: point.x,
        y: point.y,
        width: selectedShape === 'square' ? 100 : selectedShape === 'rectangle' ? 150 : undefined,
        height: selectedShape === 'square' ? 100 : selectedShape === 'rectangle' ? 100 : undefined,
        radius: selectedShape === 'circle' ? 50 : undefined,
        stroke: strokeColor,
        strokeWidth,
        fill: fillColor,
        points: selectedShape === 'arrow' ? [0, 0, 100, 0] :
                selectedShape === 'line' ? [0, 0, 100, 0] :
                selectedShape === 'triangle' ? [0, -50, 50, 50, -50, 50] : undefined,
        draggable: true,
      };

      const newObjects = [...objects, newShape];
      setObjects(newObjects);
      addToHistory(newObjects);
      setSelectedId(newShape.id);
      setTool('select');
      return;
    }

    setIsDrawing(true);

    const newLine: DrawObject = {
      id: `line-${Date.now()}`,
      type: 'line',
      points: [point.x, point.y],
      stroke: tool === 'eraser' ? (darkMode ? '#1e1e1e' : '#ffffff') : color,
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

  const handleTextBoxComplete = () => {
    if (!textBox || !textValue.trim()) {
      setTextBox(null);
      setTextValue('');
      return;
    }

    const fontStyle = `${bold ? 'bold ' : ''}${italic ? 'italic' : ''}`.trim();

    const newText: DrawObject = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: textBox.x,
      y: textBox.y,
      text: textValue,
      fontSize,
      fontFamily,
      fontStyle: fontStyle || 'normal',
      textDecoration: underline ? 'underline' : '',
      fill: color,
      width: textBox.width,
      align: textAlign,
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

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-900';
  const secondaryText = darkMode ? 'text-gray-300' : 'text-gray-600';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const hoverBg = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const canvasBg = darkMode ? '#1e1e1e' : '#ffffff';

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
                className={`flex items-center space-x-2 ${secondaryText} ${textColor} px-3 py-2 rounded-lg ${hoverBg} transition`}
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h1 className={`text-lg font-semibold ${textColor}`}>{note?.title}</h1>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleDarkMode}
                className={`p-2 ${hoverBg} rounded-lg transition`}
                title={darkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-700" />
                )}
              </button>
              <button
                onClick={undo}
                disabled={historyStep === 0}
                className={`p-2 ${hoverBg} rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Undo"
              >
                <Undo className={`w-5 h-5 ${secondaryText}`} />
              </button>
              <button
                onClick={redo}
                disabled={historyStep === history.length - 1}
                className={`p-2 ${hoverBg} rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Redo"
              >
                <Redo className={`w-5 h-5 ${secondaryText}`} />
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
        {/* Left Sidebar - Tools */}
        <div className={`w-72 ${cardBg} border-r ${borderColor} p-4 overflow-y-auto flex-shrink-0`}>
          <div className="space-y-6">
            {/* Tools Section */}
            <div>
              <h3 className={`text-sm font-semibold ${textColor} mb-3`}>Tools</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setTool('select')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    tool === 'select' ? 'bg-blue-100 text-blue-700' : `${hoverBg} ${secondaryText}`
                  }`}
                >
                  <Move className="w-5 h-5" />
                  <span>Select / Move</span>
                </button>
                <button
                  onClick={() => setTool('pen')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    tool === 'pen' ? 'bg-blue-100 text-blue-700' : `${hoverBg} ${secondaryText}`
                  }`}
                >
                  <Pen className="w-5 h-5" />
                  <span>Pen</span>
                </button>
                <button
                  onClick={() => setTool('highlighter')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    tool === 'highlighter' ? 'bg-blue-100 text-blue-700' : `${hoverBg} ${secondaryText}`
                  }`}
                >
                  <Pen className="w-5 h-5" />
                  <span>Highlighter</span>
                </button>
                <button
                  onClick={() => setTool('text')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    tool === 'text' ? 'bg-blue-100 text-blue-700' : `${hoverBg} ${secondaryText}`
                  }`}
                >
                  <Type className="w-5 h-5" />
                  <span>Text</span>
                </button>
                <button
                  onClick={() => setTool('shape')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    tool === 'shape' ? 'bg-blue-100 text-blue-700' : `${hoverBg} ${secondaryText}`
                  }`}
                >
                  <Square className="w-5 h-5" />
                  <span>Shapes</span>
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    tool === 'eraser' ? 'bg-blue-100 text-blue-700' : `${hoverBg} ${secondaryText}`
                  }`}
                >
                  <Eraser className="w-5 h-5" />
                  <span>Eraser</span>
                </button>
              </div>
            </div>

            {/* Shape Selection */}
            {tool === 'shape' && (
              <div>
                <h3 className={`text-sm font-semibold ${textColor} mb-3`}>Shapes</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedShape('square')}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedShape === 'square'
                        ? 'border-blue-600 bg-blue-50'
                        : `${borderColor} hover:border-gray-300`
                    }`}
                    title="Square"
                  >
                    <Square className="w-6 h-6 mx-auto" />
                  </button>
                  <button
                    onClick={() => setSelectedShape('rectangle')}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedShape === 'rectangle'
                        ? 'border-blue-600 bg-blue-50'
                        : `${borderColor} hover:border-gray-300`
                    }`}
                    title="Rectangle"
                  >
                    <div className="w-8 h-5 border-2 border-current mx-auto" />
                  </button>
                  <button
                    onClick={() => setSelectedShape('circle')}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedShape === 'circle'
                        ? 'border-blue-600 bg-blue-50'
                        : `${borderColor} hover:border-gray-300`
                    }`}
                    title="Circle"
                  >
                    <CircleIcon className="w-6 h-6 mx-auto" />
                  </button>
                  <button
                    onClick={() => setSelectedShape('triangle')}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedShape === 'triangle'
                        ? 'border-blue-600 bg-blue-50'
                        : `${borderColor} hover:border-gray-300`
                    }`}
                    title="Triangle"
                  >
                    <Triangle className="w-6 h-6 mx-auto" />
                  </button>
                  <button
                    onClick={() => setSelectedShape('arrow')}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedShape === 'arrow'
                        ? 'border-blue-600 bg-blue-50'
                        : `${borderColor} hover:border-gray-300`
                    }`}
                    title="Arrow"
                  >
                    <ArrowRight className="w-6 h-6 mx-auto" />
                  </button>
                  <button
                    onClick={() => setSelectedShape('line')}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedShape === 'line'
                        ? 'border-blue-600 bg-blue-50'
                        : `${borderColor} hover:border-gray-300`
                    }`}
                    title="Line"
                  >
                    <div className="w-8 h-0 border-t-2 border-current mx-auto mt-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Text Formatting */}
            {tool === 'text' && (
              <div className="space-y-4">
                <div>
                  <h3 className={`text-sm font-semibold ${textColor} mb-3`}>Font Family</h3>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className={`w-full px-3 py-2 border ${borderColor} rounded-lg ${cardBg} ${textColor}`}
                  >
                    {FONTS.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${textColor} mb-3`}>Font Size: {fontSize}px</h3>
                  <input
                    type="range"
                    min="12"
                    max="72"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${textColor} mb-3`}>Text Style</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setBold(!bold)}
                      className={`flex-1 p-2 rounded-lg border-2 transition ${
                        bold ? 'border-blue-600 bg-blue-50' : `${borderColor} ${hoverBg}`
                      }`}
                    >
                      <Bold className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => setItalic(!italic)}
                      className={`flex-1 p-2 rounded-lg border-2 transition ${
                        italic ? 'border-blue-600 bg-blue-50' : `${borderColor} ${hoverBg}`
                      }`}
                    >
                      <Italic className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => setUnderline(!underline)}
                      className={`flex-1 p-2 rounded-lg border-2 transition ${
                        underline ? 'border-blue-600 bg-blue-50' : `${borderColor} ${hoverBg}`
                      }`}
                    >
                      <UnderlineIcon className="w-5 h-5 mx-auto" />
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${textColor} mb-3`}>Alignment</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setTextAlign('left')}
                      className={`flex-1 p-2 rounded-lg border-2 transition ${
                        textAlign === 'left' ? 'border-blue-600 bg-blue-50' : `${borderColor} ${hoverBg}`
                      }`}
                    >
                      <AlignLeft className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => setTextAlign('center')}
                      className={`flex-1 p-2 rounded-lg border-2 transition ${
                        textAlign === 'center' ? 'border-blue-600 bg-blue-50' : `${borderColor} ${hoverBg}`
                      }`}
                    >
                      <AlignCenter className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => setTextAlign('right')}
                      className={`flex-1 p-2 rounded-lg border-2 transition ${
                        textAlign === 'right' ? 'border-blue-600 bg-blue-50' : `${borderColor} ${hoverBg}`
                      }`}
                    >
                      <AlignRight className="w-5 h-5 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Colors */}
            <div>
              <h3 className={`text-sm font-semibold ${textColor} mb-3`}>
                {tool === 'text' ? 'Text Color' : tool === 'pen' || tool === 'highlighter' ? 'Pen Color' : 'Colors'}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-full h-10 rounded-lg border-2 transition ${
                      color === c ? `${darkMode ? 'border-blue-400' : 'border-blue-600'} scale-110` : `${borderColor}`
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <div className="mt-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Shape Controls */}
            {tool === 'shape' && (
              <div className="space-y-4">
                <div>
                  <h3 className={`text-sm font-semibold ${textColor} mb-3`}>Border Thickness: {strokeWidth}px</h3>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${textColor} mb-3`}>Border Color</h3>
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${textColor} mb-3`}>Fill Color</h3>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                      onChange={(e) => setFillColor(e.target.value)}
                      className="flex-1 h-10 rounded-lg cursor-pointer"
                    />
                    <button
                      onClick={() => setFillColor('transparent')}
                      className={`px-3 py-2 rounded-lg border-2 transition ${
                        fillColor === 'transparent' ? 'border-blue-600 bg-blue-50' : `${borderColor} ${hoverBg}`
                      }`}
                    >
                      None
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pen/Highlighter Thickness */}
            {(tool === 'pen' || tool === 'highlighter') && (
              <div>
                <h3 className={`text-sm font-semibold ${textColor} mb-3`}>
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
          </div>
        </div>

        {/* Canvas Area */}
        <div className={`flex-1 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-8 relative`}>
          <div className={`${cardBg} shadow-lg mx-auto relative`} style={{ width: '1200px', height: '1600px' }}>
            <Stage
              ref={stageRef}
              width={1200}
              height={1600}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <Layer>
                <Rect id="background" x={0} y={0} width={1200} height={1600} fill={canvasBg} />
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
                      />
                    );
                  }
                  return null;
                })}
                {tool === 'select' && <Transformer ref={transformerRef} />}
              </Layer>
            </Stage>

            {/* Dotted Text Box Overlay */}
            {textBox && (
              <div
                className="absolute border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-20 p-2"
                style={{
                  left: textBox.x,
                  top: textBox.y,
                  width: textBox.width,
                  height: textBox.height,
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
                    fontWeight: bold ? 'bold' : 'normal',
                    fontStyle: italic ? 'italic' : 'normal',
                    textDecoration: underline ? 'underline' : 'none',
                    textAlign,
                    color,
                  }}
                  placeholder="Type your text here..."
                />
                <div className="absolute bottom-0 right-0 flex space-x-2 p-2 bg-white rounded-tl shadow">
                  <button
                    onClick={() => {
                      setTextBox(null);
                      setTextValue('');
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTextBoxComplete}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
                {/* Resize handles */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsResizingText(true);
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startWidth = textBox.width;
                    const startHeight = textBox.height;

                    const handleMouseMove = (e: MouseEvent) => {
                      const deltaX = e.clientX - startX;
                      const deltaY = e.clientY - startY;
                      setTextBox({
                        ...textBox,
                        width: Math.max(100, startWidth + deltaX),
                        height: Math.max(50, startHeight + deltaY),
                      });
                    };

                    const handleMouseUp = () => {
                      setIsResizingText(false);
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${cardBg} rounded-xl shadow-xl max-w-md w-full p-6`}>
            <h3 className={`text-xl font-bold ${textColor} mb-4`}>Share Note</h3>
            <p className={`${secondaryText} mb-4`}>Anyone with this link can view your note</p>
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className={`flex-1 px-4 py-2 border ${borderColor} rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} ${textColor}`}
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
              className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
