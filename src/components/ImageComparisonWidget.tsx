import React, { useState, useRef, useEffect } from 'react';
import transformExperimentData from './TransformExperimentData';

import DualAxisPlot from './DualAxisPlot';
import ThreeWaySlider from './ThreeWaySlider';

interface Selection {
  method: string | null;
  bpp: number | null;
  xValue: number | null;
}

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

const methodNamesAndColors = {
  'diffc': {
    name: 'DiffC',
    color: '#2563eb'  // deep blue
  },
  'msillm': {
    name: 'MS-ILLM',
    color: '#16a34a'  // emerald green
  },
  'perco': {
    name: 'PerCo',
    color: '#9333ea'  // vivid purple
  },
  'diffeic': {
    name: 'DiffEIC',
    color: '#dc2626'  // bright red
  }
};

const MethodSelector = ({ method, displayName, bitrates, selectedBpp, onBppSelect }) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-2 mb-1">
      <div 
        className="w-4 h-4 rounded-full shrink-0"
        style={{ backgroundColor: methodNamesAndColors[method].color }}
      />
      <span className="text-sm font-medium text-gray-700">{displayName}</span>
    </div>
    <div className="flex flex-wrap gap-1">
      {bitrates.map((bpp) => (
        <button
          key={bpp}
          onClick={() => onBppSelect(method, bpp)}
          className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
            selectedBpp === bpp
              ? 'text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          style={selectedBpp === bpp ? { backgroundColor: methodNamesAndColors[method].color } : undefined}
        >
          {bpp.toFixed(4) + " bpp"} 
        </button>
      ))}
    </div>
  </div>
);
const ImageComparisonWidget = ({ data }) => {
  const imageNames = Object.keys(data);
  
  const [selectedImage, setSelectedImage] = useState(imageNames[0] || null);
  const [selection, setSelection] = useState<Selection>({
    method: null,
    bpp: null,
    xValue: null
  });

  const updateSelection = (update: Partial<Selection>, source: 'plot' | 'buttons' | 'image-change') => {
    if (source === 'plot') {
      if (update.xValue !== null) {
        const { method, bpp } = getNearestMethodAndBpp(update.xValue);
        setSelection({
          method,
          bpp,
          xValue: update.xValue
        });
      }
    } else if (source === 'buttons') {
      setSelection(prev => ({
        method: update.method ?? prev.method,
        bpp: update.bpp ?? prev.bpp,
        xValue: update.bpp  // Set xValue to match bpp when coming from buttons
      }));
    } else {
    // image-change
    const methods = getMethodsForImage(selectedImage);
    const newMethod = methods.includes(selection.method) ? selection.method : methods[0];
    
    // Get available BPPs for the new method
    const availableBpps = getBitratesForMethod(selectedImage, newMethod);
    
    // If we had a previous BPP, find the closest new one
    let newBpp = null;
    if (selection.bpp !== null && availableBpps.length > 0) {
      newBpp = availableBpps.reduce((closest, current) => {
        const currentDiff = Math.abs(current - selection.bpp!);
        const closestDiff = Math.abs(closest - selection.bpp!);
        return currentDiff < closestDiff ? current : closest;
      }, availableBpps[0]);
    } else {
      // If no previous BPP, fall back to first available
      newBpp = availableBpps[0] || null;
    }
    
    setSelection({
      method: newMethod,
      bpp: newBpp,
      xValue: newBpp
    });
    }
  };
  
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
      updateSelection({}, 'image-change');
    }
  }, [selectedImage]);
  
  // Get available bitrates for current method
  const getBitratesForMethod = (imageName, method) => {
    if (!method || !data[imageName] || !data[imageName][method]) return [];
    return data[imageName][method].map(item => item.bpp).sort((a, b) => a - b);
  };

  const bitrates = getBitratesForMethod(selectedImage, selection.method);

  const getCurrentTriple = () => {
    if (!selectedImage || !selection.method || selection.bpp === null) return null;
    
    const imageData = data[selectedImage];
    if (!imageData || !imageData[selection.method]) return null;

    const selectedComparison = imageData[selection.method].find(item => item.bpp === selection.bpp);
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
      labelB: selection.method ? methodNamesAndColors[selection.method].name : '',
      labelC: "Ground Truth"
    };
  };
  
  
  const handleImageClick = (imageName) => {
    setSelectedImage(imageName);
  };

  const handleBppSelect = (method: string, bpp: number) => {
    updateSelection({ method, bpp }, 'buttons');
  };
  
  const handlePlotXValueChange = (xValue: number | null) => {
    if (xValue !== null) {
      updateSelection({ xValue }, 'plot');
    }
  };

  const getNearestMethodAndBpp = (target_bpp) => {
    const image_data = data[selectedImage];

    const getMethodsForImage = (imageName) => {
      return imageName && data[imageName] 
        ? Object.keys(data[imageName]).filter(key => 
            !['ground_truth', 'diffc_bpp', 'diffc_psnr', 'diffc_lpips'].includes(key)
          )
        : [];
    };
  
    const methods = getMethodsForImage(selectedImage);
    
    let best_distance = Infinity;
    let best_bpp = null;
    let best_method = null;
  
     methods.forEach(method => {      
      if (image_data[method] && Array.isArray(image_data[method])) {
        image_data[method].forEach(entry => {
          const bpp = entry.bpp;
          const distance = Math.abs(bpp - target_bpp);
          if (distance < best_distance) {
            best_distance = distance;
            best_bpp = bpp;
            best_method = method;
          }
        });
      }
    });
  
    return {
      method: best_method,
      bpp: best_bpp
    };  
  }

  const imageTriple = getCurrentTriple();
  const labels = getLabels();

  // Transform the current image's data for the DualAxisPlot
  const plotData = selectedImage ? transformExperimentData(data[selectedImage]) : null;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Image selection */}
      <div className="flex gap-4 justify-center items-end flex-wrap">
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
          </>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Select an image and comparison settings
          </div>
        )}
      </div>

      {/* Method and bitrate selection */}
      <div className="flex gap-8 justify-center">
        {/* DiffC legend entry */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 flex items-center">
              <div 
                className="w-full h-0.5"
                style={{ backgroundColor: methodNamesAndColors['diffc'].color }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">{methodNamesAndColors['diffc'].name}</span>
          </div>
        </div>

        {methods.map((method) => (
          <MethodSelector
          key={method}
          method={method}
          displayName={methodNamesAndColors[method].name}  // Add this
          bitrates={getBitratesForMethod(selectedImage, method)}
          selectedBpp={selection.method === method ? selection.bpp : null}
          onBppSelect={handleBppSelect}
        />        
        ))}
      </div>

      {/* Rate-Distortion Plot */}
      {plotData && (
      <div className="w-full flex justify-center mt-6">
        <DualAxisPlot
          xValues={plotData.xValues}
          y1Arrays={plotData.y1Arrays}
          y2Arrays={plotData.y2Arrays}
          methods={plotData.methods}
          methodNamesAndColors={methodNamesAndColors}  // Add this
          width={800}
          height={400}
          xLabel="Bits per pixel (bpp)"
          y1Label="PSNR (dB)"
          y2Label="LPIPS"
          onXValueChange={handlePlotXValueChange}
          selection={selection}
        />
      </div>
    )}
    </div>
  );
};

export default ImageComparisonWidget;