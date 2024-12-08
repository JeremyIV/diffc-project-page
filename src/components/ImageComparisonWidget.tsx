import React, { useState, useRef, useEffect } from 'react';

import DualAxisPlot from './DualAxisPlot';
import ThreeWaySlider from './ThreeWaySlider';
// Data transformer function
interface BaselineDataPoint {
  baseline: string;
  diffc: string;
  bpp: number;
  size: string;
  lpips: number;
  psnr: number;
}

interface ExperimentData {
  ground_truth: string;
  diffc_bpp: number[];
  diffc_psnr: number[];
  diffc_lpips: number[];
  [key: string]: string | number[] | BaselineDataPoint[];
}

function transformExperimentData(data: ExperimentData) {
  const xValues: number[][] = [data.diffc_bpp];
  const y1Arrays: number[][] = [data.diffc_psnr];
  const y2Arrays: number[][] = [data.diffc_lpips];
  const legend: string[] = ['DiffC'];

  const possibleBaselineKeys = Object.keys(data).filter(key => 
    !['ground_truth', 'diffc_bpp', 'diffc_psnr', 'diffc_lpips'].includes(key) &&
    Array.isArray(data[key]) &&
    data[key].length > 0 &&
    'bpp' in (data[key] as any)[0]
  );

  for (const baselineKey of possibleBaselineKeys) {
    const baselineData = data[baselineKey] as BaselineDataPoint[];
    const sortedData = [...baselineData].sort((a, b) => a.bpp - b.bpp);
    
    xValues.push(sortedData.map(point => point.bpp));
    y1Arrays.push(sortedData.map(point => point.psnr));
    y2Arrays.push(sortedData.map(point => point.lpips));
    legend.push(baselineKey.charAt(0).toUpperCase() + baselineKey.slice(1));
  }

  return { xValues, y1Arrays, y2Arrays, legend };
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


const getNearestMethodAndBpp = (target_bpp) => {
  const image_data = data[selectedImage];
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


const ImageComparisonWidget = ({ data }) => {
  const imageNames = Object.keys(data);
  
  const [selectedImage, setSelectedImage] = useState(imageNames[0] || null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedBpp, setSelectedBpp] = useState(null);
  const [stuckValue, setStuckValue] = useState(null); // For DualAxisPlot's vertical line

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
        setStuckValue(closestBpp);
      } else {
        // If no bpp selected, select first available
        setSelectedBpp(availableBpps[0] || null);
        setStuckValue(availableBpps[0] || null);
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
    setStuckValue(bpp); // Update the vertical line when buttons are clicked
  };

  const handlePlotXValueChange = (xValue) => {
    if (xValue !== null) {
      const { method, bpp } = getNearestMethodAndBpp(xValue, data, selectedImage, getMethodsForImage);
      if (method && bpp !== null) {
        setSelectedMethod(method);
        setSelectedBpp(bpp);
      }
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

      {/* Rate-Distortion Plot */}
      {plotData && (
        <div className="w-full flex justify-center mt-6">
          <DualAxisPlot
            xValues={plotData.xValues}
            y1Arrays={plotData.y1Arrays}
            y2Arrays={plotData.y2Arrays}
            legend={plotData.legend}
            width={800}
            height={400}
            xLabel="Bits per pixel (bpp)"
            y1Label="PSNR (dB)"
            y2Label="LPIPS"
            onXValueChange={handlePlotXValueChange}
            stuckX={stuckValue} // Pass the current bpp as the stuck value
            setStuckX={setStuckValue}
          />
        </div>
      )}
    </div>
  );
};

export default ImageComparisonWidget;