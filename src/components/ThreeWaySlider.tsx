import React, { useState, useRef, useEffect } from 'react';

const ThreeWaySlider = ({
    imageA, 
    imageB, 
    imageC, 
    labelA = '', 
    labelB = '', 
    labelC = '' 
  }) => {
    const [horizontalPosition, setHorizontalPosition] = useState(50);
    const [verticalPosition, setVerticalPosition] = useState(90);
    const [aspectRatio, setAspectRatio] = useState(1.5); // Default 3:2 ratio
    const containerRef = useRef(null);
    const isDraggingHorizontal = useRef(false);
    const isDraggingVertical = useRef(false);
  
    useEffect(() => {
      // Set actual aspect ratio once the first image loads
      const img = new Image();
      img.onload = () => {
        setAspectRatio(img.width / img.height);
      };
      img.src = imageA;
    }, [imageA]);
  
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      
      if (isDraggingHorizontal.current) {
        const x = e.clientX - rect.left;
        const newPosition = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setHorizontalPosition(newPosition);
      }
      
      if (isDraggingVertical.current) {
        const y = e.clientY - rect.top;
        const newPosition = Math.max(0, Math.min(100, (y / rect.height) * 100));
        setVerticalPosition(newPosition);
      }
    };
  
    const handleMouseUp = () => {
      isDraggingHorizontal.current = false;
      isDraggingVertical.current = false;
    };
  
    useEffect(() => {
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mousemove', handleMouseMove);
      
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }, []);
  
    const Label = ({ children, className }) => (
      <div className={`absolute px-2 py-1 bg-black bg-opacity-50 text-white text-sm rounded ${className}`}>
        {children}
      </div>
    );
  
    return (
      <div 
        ref={containerRef}
        className="relative select-none w-full"
        style={{ 
          paddingTop: `${(1 / aspectRatio) * 100}%`
        }}
      >
        <div className="absolute inset-0">
          {/* Base image (A) */}
          <div className="absolute inset-0">
            <img 
              src={imageA} 
              alt="Ground Truth"
              className="absolute top-0 left-0 w-full h-full object-contain"
            />
            {labelA && <Label className="top-2 left-2">{labelA}</Label>}
          </div>
          
          {/* Image B with horizontal clip */}
          <div 
            className="absolute top-0 left-0 w-full h-full overflow-hidden"
            style={{ clipPath: `polygon(${horizontalPosition}% 0, 100% 0, 100% 100%, ${horizontalPosition}% 100%)` }}
          >
            <img 
              src={imageB} 
              alt="Baseline"
              className="absolute top-0 left-0 w-full h-full object-contain"
            />
            {labelB && <Label className="top-2 right-2">{labelB}</Label>}
          </div>
  
          {/* Image C with vertical clip */}
          <div 
            className="absolute top-0 left-0 w-full h-full overflow-hidden"
            style={{ clipPath: `polygon(0 ${verticalPosition}%, 100% ${verticalPosition}%, 100% 100%, 0 100%)` }}
          >
            <img 
              src={imageC} 
              alt="DiffC"
              className="absolute top-0 left-0 w-full h-full object-contain"
            />
            {labelC && <Label className="bottom-2 left-2">{labelC}</Label>}
          </div>
  
          {/* Horizontal slider */}
          <div 
            className="absolute w-1 bg-white/50 cursor-ew-resize"
            style={{ 
              left: `${horizontalPosition}%`,
              top: 0,
              height: `${verticalPosition}%`
            }}
            onMouseDown={() => isDraggingHorizontal.current = true}
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
              ↔
            </div>
          </div>
  
          {/* Vertical slider */}
          <div 
            className="absolute left-0 right-0 h-1 bg-white/50 cursor-ns-resize"
            style={{ top: `${verticalPosition}%` }}
            onMouseDown={() => isDraggingVertical.current = true}
          >
            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
              ↕
            </div>
          </div>
        </div>
      </div>
    );
  };
  
export default ThreeWaySlider;