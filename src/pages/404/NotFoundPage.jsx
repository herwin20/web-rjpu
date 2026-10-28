// pages/NotFound/NotFoundPage.jsx (Alternative with more animations)
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiHome, FiAlertTriangle, FiArrowLeft, FiSearch } from "react-icons/fi";

const NotFoundPage = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white/10 rounded-full animate-float"
            style={{
              width: Math.random() * 4 + 2 + "px",
              height: Math.random() * 4 + 2 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animationDelay: Math.random() * 5 + "s",
              animationDuration: Math.random() * 5 + 3 + "s",
            }}
          ></div>
        ))}
      </div>

      {/* Glowing orb that follows mouse */}
      <div
        className="absolute w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none transition-all duration-300"
        style={{
          left: mousePosition.x - 128,
          top: mousePosition.y - 128,
        }}
      ></div>

      {/* 404 Card */}
      <div className="relative bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg p-8 text-center border border-gray-700 transform transition-all duration-500 animate-fade-in-up">
        {/* Animated 404 */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full blur-2xl animate-pulse"></div>
          </div>
          <div className="relative w-32 h-32 bg-gradient-to-br from-red-600 to-orange-600 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
            <FiAlertTriangle className="text-white text-5xl animate-pulse" />
          </div>
        </div>

        {/* 404 Numbers */}
        <div className="relative mb-4">
          <h1 className="text-9xl font-black bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent animate-gradient">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <h1 className="text-9xl font-black text-white select-none">404</h1>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">Page Not Found</h2>

        <p className="text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Search suggestion */}
        <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <FiSearch />
            <span className="text-sm">Try visiting:</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition"
            >
              /dashboard
            </button>
            <button
              onClick={() => navigate("/login")}
              className="text-sm px-3 py-1 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition"
            >
              /login
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-600 rounded-lg font-semibold text-gray-300 hover:bg-gray-700 hover:border-gray-500 transition-all duration-200"
          >
            <FiArrowLeft />
            Go Back
          </button>

          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
          >
            <FiHome />
            Go Home
          </button>
        </div>

        {/* Status Code */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 font-mono">
            Error 404 | Resource Not Found
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-float {
          animation: float linear infinite;
        }

        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default NotFoundPage;
