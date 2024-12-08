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
  
  interface PlotData {
    xValues: number[][];
    y1Arrays: number[][];
    y2Arrays: number[][];
    legend: string[];
  }
  
  function transformExperimentData(data: ExperimentData): PlotData {
    // Initialize arrays with diffC data
    const xValues: number[][] = [data.diffc_bpp];
    const y1Arrays: number[][] = [data.diffc_psnr];
    const y2Arrays: number[][] = [data.diffc_lpips];
    const legend: string[] = ['DiffC'];
  
    // Get all keys that might be baseline methods
    const possibleBaselineKeys = Object.keys(data).filter(key => 
      // Filter out known non-baseline keys
      !['ground_truth', 'diffc_bpp', 'diffc_psnr', 'diffc_lpips'].includes(key) &&
      // Check if the value is an array of BaselineDataPoint objects
      Array.isArray(data[key]) &&
      data[key].length > 0 &&
      'bpp' in (data[key] as any)[0]
    );
  
    // Process each baseline method
    for (const baselineKey of possibleBaselineKeys) {
      const baselineData = data[baselineKey] as BaselineDataPoint[];
      
      // Sort the baseline data by bpp to ensure curves are drawn correctly
      const sortedData = [...baselineData].sort((a, b) => a.bpp - b.bpp);
      
      // Extract the arrays for this baseline
      const bppValues = sortedData.map(point => point.bpp);
      const psnrValues = sortedData.map(point => point.psnr);
      const lpipsValues = sortedData.map(point => point.lpips);
  
      // Add the arrays to our plot data
      xValues.push(bppValues);
      y1Arrays.push(psnrValues);
      y2Arrays.push(lpipsValues);
      
      // Add the method name to legend (capitalize first letter)
      legend.push(baselineKey.charAt(0).toUpperCase() + baselineKey.slice(1));
    }
  
    return {
      xValues,
      y1Arrays,
      y2Arrays,
      legend
    };
  }
  
  export default transformExperimentData;