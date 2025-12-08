import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Stage, Layer, Line, Rect, Circle, Text as KonvaText, Arrow } from 'react-konva';
import { supabase } from '../lib/supabase';
import { Eye } from 'lucide-react';

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

export function SharedNote() {
  const { shareId } = useParams<{ shareId: string }>();
  const [note, setNote] = useState<any>(null);
  const [objects, setObjects] = useState<DrawObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSharedNote();
  }, [shareId]);

  const fetchSharedNote = async () => {
    try {
      const { data: shareData, error: shareError } = await supabase
        .from('shared_notes')
        .select('note_id')
        .eq('id', shareId)
        .maybeSingle();

      if (shareError) throw shareError;
      if (!shareData) {
        setError('This shared note does not exist or has been removed.');
        setLoading(false);
        return;
      }

      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', shareData.note_id)
        .maybeSingle();

      if (noteError) throw noteError;
      if (!noteData) {
        setError('Note not found.');
        setLoading(false);
        return;
      }

      setNote(noteData);
      if (noteData.content && noteData.content.objects) {
        setObjects(noteData.content.objects);
      }
    } catch (error) {
      console.error('Error fetching shared note:', error);
      setError('Failed to load note.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading note...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">{error}</div>
          <a href="/" className="text-blue-600 hover:text-blue-700">
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-green-600 p-2 rounded-lg">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{note?.title}</h1>
                <p className="text-xs text-gray-500">View-only mode</p>
              </div>
            </div>
            <a
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"
            >
              Create your own notes
            </a>
          </div>
        </div>
      </nav>

      <main className="flex justify-center py-8 px-4">
        <div className="bg-white shadow-lg" style={{ width: '1200px', height: '1600px' }}>
          <Stage width={1200} height={1600}>
            <Layer>
              <Rect x={0} y={0} width={1200} height={1600} fill="#ffffff" />
              {objects.map((obj) => {
                if (obj.type === 'line' && obj.points) {
                  return (
                    <Line
                      key={obj.id}
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
                      x={obj.x}
                      y={obj.y}
                      width={obj.width}
                      height={obj.height}
                      stroke={obj.stroke}
                      strokeWidth={obj.strokeWidth}
                      fill={obj.fill}
                    />
                  );
                }
                if (obj.type === 'circle') {
                  return (
                    <Circle
                      key={obj.id}
                      x={obj.x}
                      y={obj.y}
                      radius={obj.radius}
                      stroke={obj.stroke}
                      strokeWidth={obj.strokeWidth}
                      fill={obj.fill}
                    />
                  );
                }
                if (obj.type === 'text') {
                  return (
                    <KonvaText
                      key={obj.id}
                      x={obj.x}
                      y={obj.y}
                      text={obj.text}
                      fontSize={obj.fontSize}
                      fill={obj.fill}
                    />
                  );
                }
                if (obj.type === 'arrow' && obj.points) {
                  return (
                    <Arrow
                      key={obj.id}
                      x={obj.x}
                      y={obj.y}
                      points={obj.points}
                      stroke={obj.stroke}
                      strokeWidth={obj.strokeWidth}
                      fill={obj.stroke}
                      pointerLength={10}
                      pointerWidth={10}
                    />
                  );
                }
                if (obj.type === 'triangle' && obj.points) {
                  return (
                    <Line
                      key={obj.id}
                      x={obj.x}
                      y={obj.y}
                      points={obj.points}
                      stroke={obj.stroke}
                      strokeWidth={obj.strokeWidth}
                      fill={obj.fill}
                      closed
                    />
                  );
                }
                return null;
              })}
            </Layer>
          </Stage>
        </div>
      </main>
    </div>
  );
}
