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

const transformExperimentData = (imageData) => {
  if (!imageData) return null;

  // Get the baseline methods - all methods except diffc, ground_truth, and meta fields
  const baselineMethods = Object.keys(imageData).filter(key => 
    !['diffc_bpp', 'diffc_psnr', 'diffc_lpips', 'ground_truth'].includes(key)
  );

  // Find max bpp across all baseline methods
  const maxBaselineBpp = Math.max(...baselineMethods.map(method => {
    if (!Array.isArray(imageData[method])) return 0;
    return Math.max(...imageData[method].map(point => point.bpp));
  }));

  // Initialize arrays
  const methods = ['diffc', ...baselineMethods];
  const xValues = methods.map(() => []);
  const y1Arrays = methods.map(() => []); // PSNR
  const y2Arrays = methods.map(() => []); // LPIPS

  // Process DiffC data first - now filtered by maxBaselineBpp
  const diffc_bpps = imageData.diffc_bpp || [];
  const diffc_psnrs = imageData.diffc_psnr || [];
  const diffc_lpips = imageData.diffc_lpips || [];

  diffc_bpps.forEach((bpp, i) => {
    // Only include points up to maxBaselineBpp instead of hardcoded 1
    if (bpp <= maxBaselineBpp * 1.05) {
      xValues[0].push(bpp);
      y1Arrays[0].push(diffc_psnrs[i]);
      y2Arrays[0].push(diffc_lpips[i]);
    }
  });

  // Process baseline methods
  baselineMethods.forEach((method, methodIndex) => {
    if (Array.isArray(imageData[method])) {
      imageData[method].forEach(point => {
        xValues[methodIndex + 1].push(point.bpp);
        y1Arrays[methodIndex + 1].push(point.psnr);
        y2Arrays[methodIndex + 1].push(point.lpips);
      });
    }
  });

  return {
    methods,
    xValues,
    y1Arrays,
    y2Arrays
  };
};

export default transformExperimentData;
