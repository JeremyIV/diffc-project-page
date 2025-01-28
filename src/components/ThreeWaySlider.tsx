import React, { useState, useRef, useEffect } from 'react';
import { Move } from 'lucide-react';

const ThreeWaySlider = ({
  imageA, 
  imageB, 
  imageC, 
  labelA = '', 
  labelB = '', 
  labelC = '' 
}) => {
  const [horizontalPosition, setHorizontalPosition] = useState(50);
  const [verticalPosition, setVerticalPosition] = useState(70);
  const [aspectRatio, setAspectRatio] = useState(1.5);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setAspectRatio(img.width / img.height);
    };
    img.src = imageA;
  }, [imageA]);

  const handleMove = (clientX, clientY) => {
    if (!containerRef.current || !isDragging.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const newHorizontalPosition = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newVerticalPosition = Math.max(0, Math.min(100, (y / rect.height) * 100));
    
    setHorizontalPosition(newHorizontalPosition);
    setVerticalPosition(newVerticalPosition);
  };

  // Mouse event handlers
  const handleMouseMove = (e) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Touch event handlers
  const handleTouchMove = (e) => {
    e.preventDefault(); // Prevent scrolling while dragging
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    // Mouse events
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    // Touch events
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      // Clean up mouse events
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      
      // Clean up touch events
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
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
      className="relative select-none w-full touch-none"
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

        {/* Lines */}
        <div 
          className="absolute w-0.5 bg-white/50"
          style={{ 
            left: `${horizontalPosition}%`,
            top: 0,
            height: `${verticalPosition}%`
          }}
        />
        <div 
          className="absolute left-0 right-0 h-0.5 bg-white/50"
          style={{ top: `${verticalPosition}%` }}
        />

        {/* Single intersection handle */}
        <div 
          className="absolute w-12 sm:w-8 h-12 sm:h-8 cursor-move"
          style={{ 
            left: `${horizontalPosition}%`,
            top: `${verticalPosition}%`,
            transform: 'translate(-50%, -50%)'
          }}
          onMouseDown={() => isDragging.current = true}
          onTouchStart={() => isDragging.current = true}
        >
          <div className="w-full h-full bg-white shadow-lg flex items-center justify-center rotate-45 rounded-sm">
            <Move size={20} className="-rotate-45 sm:w-5 sm:h-5 w-8 h-8" strokeWidth={2} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeWaySlider;