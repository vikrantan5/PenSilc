import { Link } from 'react-router-dom';
import { PenTool, FileText, Share2, Palette } from 'lucide-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <nav className="bg-white bg-opacity-90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <PenTool className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">PenSilc</span>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Create Beautiful Notes
              <br />
              <span className="text-blue-600">Anywhere, Anytime</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              A powerful PenSilc with drawing tools, text formatting, shapes, and easy sharing.
              Organize your thoughts and ideas with style.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                to="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg transition text-lg font-medium shadow-lg"
              >
                Start Creating for Free
              </Link>
              <Link
                to="/login"
                className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-lg transition text-lg font-medium border-2 border-gray-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <PenTool className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Drawing Tools</h3>
              <p className="text-gray-600">
                Pen, highlighter, and eraser with customizable colors and thickness.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <div className="bg-green-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Text Formatting</h3>
              <p className="text-gray-600">
                Add styled text boxes with custom fonts, sizes, and colors.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <div className="bg-purple-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Palette className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Shapes Library</h3>
              <p className="text-gray-600">
                Insert squares, circles, triangles, arrows, and lines effortlessly.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <div className="bg-orange-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Share2 className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Easy Sharing</h3>
              <p className="text-gray-600">
                Share your notes with unique links. View-only mode for recipients.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-blue-600 text-white py-20">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold mb-6">Ready to get started?</h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of users creating beautiful notes every day.
            </p>
            <Link
              to="/signup"
              className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-lg transition text-lg font-medium inline-block"
            >
              Create Your Free Account
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 PenSilc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
