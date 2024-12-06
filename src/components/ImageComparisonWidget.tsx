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

const ThumbnailButton = ({ imageSrc, isSelected, onClick }) => {
  const thumbnailHeight = 64;

  return (
    <img 
      src={imageSrc}
      alt="Thumbnail"
      onClick={onClick}
      style={{ maxHeight: `${thumbnailHeight}px` }}
      className={`w-auto cursor-pointer transition-transform ${
        isSelected 
          ? 'ring-2 ring-blue-500 ring-offset-2' 
          : 'hover:scale-105'
      }`}
    />
  );
};

const MethodSelector = ({ method, bitrates, selectedBpp, onBppSelect }) => (
  <div className="flex flex-col">
    <span className="text-sm font-medium mb-1 text-gray-700">{method}</span>
    <div className="flex flex-wrap gap-1">
      {bitrates.map((bpp) => (
        <button
          key={bpp}
          onClick={() => onBppSelect(method, bpp)}
          className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
            selectedBpp === bpp
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {bpp.toFixed(4)}
        </button>
      ))}
    </div>
  </div>
);

const ImageComparisonWidget = ({ data }) => {
  const imageNames = Object.keys(data);
  
  const [selectedImage, setSelectedImage] = useState(imageNames[0] || null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedBpp, setSelectedBpp] = useState(null);

  // Helper to find closest bpp value
  const findClosestBpp = (targetBpp, availableBpps) => {
    if (!availableBpps.length) return null;
    
    let closest = availableBpps[0];
    let minDiff = Math.abs(availableBpps[0] - targetBpp);

    for (let i = 1; i < availableBpps.length; i++) {
      const currentDiff = Math.abs(availableBpps[i] - targetBpp);
      if (currentDiff < minDiff) {
        minDiff = currentDiff;
        closest = availableBpps[i];
      }
    }

    return closest;
  };

  // Helper to get available methods for an image
  const getMethodsForImage = (imageName) => {
    return imageName && data[imageName] 
      ? Object.keys(data[imageName]).filter(key => 
          !['ground_truth', 'diffc_bpp', 'diffc_psnr', 'diffc_lpips'].includes(key)
        )
      : [];
  };
  
  // Get methods for current image
  const methods = getMethodsForImage(selectedImage);
  
  // Initialize or update selected method when image changes
  useEffect(() => {
    if (selectedImage) {
      const availableMethods = getMethodsForImage(selectedImage);
      
      // If current method isn't available for new image, select first available method
      if (!availableMethods.includes(selectedMethod)) {
        setSelectedMethod(availableMethods[0] || null);
      }
    }
  }, [selectedImage]);

  // Get available bitrates for current method
  const getBitratesForMethod = (imageName, method) => {
    if (!method || !data[imageName] || !data[imageName][method]) return [];
    return data[imageName][method].map(item => item.bpp).sort((a, b) => a - b);
  };

  const bitrates = getBitratesForMethod(selectedImage, selectedMethod);

  // Initialize or update selected bitrate when method changes
  useEffect(() => {
    if (selectedMethod && selectedImage) {
      const availableBpps = getBitratesForMethod(selectedImage, selectedMethod);
      
      if (selectedBpp !== null) {
        // Find closest available bpp to current selection
        const closestBpp = findClosestBpp(selectedBpp, availableBpps);
        setSelectedBpp(closestBpp);
      } else {
        // If no bpp selected, select first available
        setSelectedBpp(availableBpps[0] || null);
      }
    }
  }, [selectedMethod, selectedImage]);

  const getCurrentTriple = () => {
    if (!selectedImage || !selectedMethod || selectedBpp === null) return null;
    
    const imageData = data[selectedImage];
    if (!imageData || !imageData[selectedMethod]) return null;

    const selectedComparison = imageData[selectedMethod].find(item => item.bpp === selectedBpp);
    if (!selectedComparison) return null;

    return {
      ground_truth: imageData.ground_truth,
      diffc: selectedComparison.diffc,
      baseline: selectedComparison.baseline,
      metrics: {
        psnr: selectedComparison.psnr,
        lpips: selectedComparison.lpips,
        size: selectedComparison.size
      }
    };
  };

  const getLabels = () => {
    const labelA = selectedImage.toLowerCase().includes('div2k') 
      ? "DiffC (Flux-dev)"
      : "DiffC (Stable Diffusion 1.5)";

    return {
      labelA,
      labelB: selectedMethod,
      labelC: "Ground Truth"
    };
  };

  const handleImageClick = (imageName) => {
    setSelectedImage(imageName);
  };

  const handleBppSelect = (method, bpp) => {
    setSelectedMethod(method);
    setSelectedBpp(bpp);
  };

  const imageTriple = getCurrentTriple();
  const labels = getLabels();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Image selection */}
      <div className="flex gap-4 justify-center items-end">
        {imageNames.map((imageName) => (
          <ThumbnailButton
            key={imageName}
            imageSrc={data[imageName].ground_truth}
            isSelected={selectedImage === imageName}
            onClick={() => handleImageClick(imageName)}
          />
        ))}
      </div>

      {/* Image comparison */}
      <div className="flex flex-col items-center gap-4">
        {imageTriple ? (
          <>
            <ThreeWaySlider
              imageA={imageTriple.diffc}
              imageB={imageTriple.baseline}
              imageC={imageTriple.ground_truth}
              labelA={labels.labelA}
              labelB={labels.labelB}
              labelC={labels.labelC}
            />
            {/* Optional: Display metrics */}
            <div className="text-sm text-gray-600">
              PSNR: {imageTriple.metrics.psnr.toFixed(2)} dB | 
              LPIPS: {imageTriple.metrics.lpips.toFixed(4)} | 
              Size: {imageTriple.metrics.size}
            </div>
          </>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Select an image and comparison settings
          </div>
        )}
      </div>

      {/* Method and bitrate selection */}
      <div className="flex gap-8 justify-center">
        {methods.map((method) => (
          <MethodSelector
            key={method}
            method={method}
            bitrates={getBitratesForMethod(selectedImage, method)}
            selectedBpp={selectedMethod === method ? selectedBpp : null}
            onBppSelect={handleBppSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageComparisonWidget;