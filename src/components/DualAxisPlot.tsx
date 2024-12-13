import React, { useMemo, useState, useEffect } from 'react';

const DualAxisPlot = ({
  xValues = [],
  y1Arrays = [],
  y2Arrays = [],
  methods = [],
  methodNamesAndColors = {},  // Add this
  width = 600,
  height = 400,
  margin = { top: 10, right: 70, bottom: 40, left: 70 },
  xLabel = 'X Axis',
  y1Label = 'Y1 Axis',
  y2Label = 'Y2 Axis',
  pointRadius = 4,
  onXValueChange = null,
  selection = null
}) => {
  // State for hover line and stuck position
  const [hoverX, setHoverX] = useState(null);

  // Calculate the actual plotting area dimensions
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Calculate scales and data processing
  const { scales, allNonFirstX } = useMemo(() => {
    const allX = xValues.flat();
    const xMin = Math.min(...allX);
    const xMax = Math.max(...allX);
    const xScale = (x) => (
      margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth
    );
    const xInverse = (px) => (
      xMin + ((px - margin.left) / plotWidth) * (xMax - xMin)
    );

    const allY1Values = y1Arrays.flat();
    const y1Min = allY1Values.length ? Math.min(...allY1Values) : 0;
    const y1Max = allY1Values.length ? Math.max(...allY1Values) : 1;
    const y1Scale = (y) => (
      height - margin.bottom - ((y - y1Min) / (y1Max - y1Min)) * plotHeight
    );

    const allY2Values = y2Arrays.flat();
    const y2Min = allY2Values.length ? Math.min(...allY2Values) : 0;
    const y2Max = allY2Values.length ? Math.max(...allY2Values) : 1;
    const y2Scale = (y) => (
      height - margin.bottom - ((y - y2Min) / (y2Max - y2Min)) * plotHeight
    );

    const allNonFirstX = xValues.slice(1).flat();

    return { 
      scales: { xScale, xInverse, y1Scale, y2Scale, xMin, xMax, y1Min, y1Max, y2Min, y2Max },
      allNonFirstX
    };
  }, [xValues, y1Arrays, y2Arrays, margin, plotWidth, plotHeight, height]);

  // Handle mouse movement
  const handleMouseMove = (event) => {
    const svgRect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - svgRect.left;
    
    // Only process if mouse is within plot area
    if (mouseX >= margin.left && mouseX <= width - margin.right) {
      const hoveredX = scales.xInverse(mouseX);
      
      // Find the closest x value from non-first series
      const closestX = allNonFirstX.reduce((closest, current) => {
        return Math.abs(current - hoveredX) < Math.abs(closest - hoveredX) ? current : closest;
      }, allNonFirstX[0]);
      
      setHoverX(closestX);
    } else {
      setHoverX(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverX(null);
  };

  // Handle click to set stuck position
  const handleClick = () => {
    if (hoverX !== null && onXValueChange) {
      onXValueChange(hoverX);
    }
  };

  // Rest of your existing code for ticks, paths, etc...
  const xTicks = useMemo(() => {
    const tickCount = 5;
    const step = (scales.xMax - scales.xMin) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => scales.xMin + step * i);
  }, [scales.xMin, scales.xMax]);

  const generateYTicks = (min, max) => {
    const tickCount = 5;
    const step = (max - min) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => min + step * i);
  };

  const y1Ticks = useMemo(() => generateYTicks(scales.y1Min, scales.y1Max), 
    [scales.y1Min, scales.y1Max]);
  const y2Ticks = useMemo(() => generateYTicks(scales.y2Min, scales.y2Max),
    [scales.y2Min, scales.y2Max]);

  // Generate line paths with optional points
  const generateLinePath = (xVals, yVals, yScale) => {
    const points = xVals.map((x, i) => ({
      x: scales.xScale(x),
      y: yScale(yVals[i])
    }));

    return points.reduce((acc, point, i) => (
      i === 0 ? `M ${point.x},${point.y}` : `${acc} L ${point.x},${point.y}`
    ), '');
  };

  // Determine which vertical line to show
  const displayX = hoverX !== null ? hoverX : selection.bpp;

  // Create paths and points for y1 lines  
  const y1Elements = y1Arrays.map((yArray, index) => {
    const methodKey = methods[index];
    const color = methodNamesAndColors[methodKey].color;
    return (
      <g key={`y1-line-${index}`}>
        <path
          d={generateLinePath(xValues[index], yArray, scales.y1Scale)}
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
        {index > 0 && xValues[index].map((x, i) => (
          <circle
            key={`y1-point-${index}-${i}`}
            cx={scales.xScale(x)}
            cy={scales.y1Scale(yArray[i])}
            r={x === selection.bpp ? pointRadius * 2 : pointRadius}
            fill={color}
          />
        ))}
      </g>
    );
  });

  // Create paths and points for y2 lines
  const y2Elements = y2Arrays.map((yArray, index) => {
    const methodKey = methods[index];
    const color = methodNamesAndColors[methodKey].color;
    return (
      <g key={`y2-line-${index}`}>
        <path
          d={generateLinePath(xValues[index], yArray, scales.y2Scale)}
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeDasharray="4,4"
        />
        {index > 0 && xValues[index].map((x, i) => (
          <circle
            key={`y2-point-${index}-${i}`}
            cx={scales.xScale(x)}
            cy={scales.y2Scale(yArray[i])}
            r={x === selection.bpp ? pointRadius * 2 : pointRadius}
            fill={color}
          />
        ))}
      </g>
    );
  });

  // Generate legend elements horizontally
  const legendElements = Object.entries(methodNamesAndColors).map(([key, value], index) => {
    const availableWidth = width - margin.left - margin.right;
    const itemWidth = Math.min(120, availableWidth / Object.keys(methodNamesAndColors).length);
    const startX = margin.left + (availableWidth - (itemWidth * Object.keys(methodNamesAndColors).length)) / 2;
    const x = startX + (index * itemWidth);
    
    return (
      <g key={`legend-${key}`} transform={`translate(${x}, 0)`}>
        <rect
          x={0}
          y={10}
          width={16}
          height={16}
          fill={value.color}
        />
        <text
          x={21}
          y={18}
          className="text-sm fill-gray-800"
          dominantBaseline="middle"
        >
          {value.name}
        </text>
      </g>
    );
  });

  return (
    <svg 
      width={width} 
      height={height} 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Plot elements */}
      {y1Elements}
      {y2Elements}

      {/* Vertical reference line - shows either hover or stuck position */}
      {displayX !== null && (
        <line
          x1={scales.xScale(displayX)}
          y1={margin.top}
          x2={scales.xScale(displayX)}
          y2={height - margin.bottom}
          stroke="#9CA3AF"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
      )}

      {/* Axes */}
      <line
        x1={margin.left}
        y1={height - margin.bottom}
        x2={width - margin.right}
        y2={height - margin.bottom}
        stroke="black"
        strokeWidth="1"
      />
      
      <line
        x1={margin.left}
        y1={margin.top}
        x2={margin.left}
        y2={height - margin.bottom}
        stroke="black"
        strokeWidth="1"
      />

      <line
        x1={width - margin.right}
        y1={margin.top}
        x2={width - margin.right}
        y2={height - margin.bottom}
        stroke="black"
        strokeWidth="1"
      />

      {/* X-axis ticks and labels */}
      {xTicks.map((tick, i) => (
        <g key={`x-tick-${i}`}>
          <line
            x1={scales.xScale(tick)}
            y1={height - margin.bottom}
            x2={scales.xScale(tick)}
            y2={height - margin.bottom + 5}
            stroke="black"
            strokeWidth="1"
          />
          <text
            x={scales.xScale(tick)}
            y={height - margin.bottom + 20}
            textAnchor="middle"
            className="text-xs fill-gray-600"
          >
            {tick.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Left Y-axis ticks and labels */}
      {y1Ticks.map((tick, i) => (
        <g key={`y1-tick-${i}`}>
          <line
            x1={margin.left - 5}
            y1={scales.y1Scale(tick)}
            x2={margin.left}
            y2={scales.y1Scale(tick)}
            stroke="black"
            strokeWidth="1"
          />
          <text
            x={margin.left - 15}
            y={scales.y1Scale(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            className="text-xs fill-gray-600"
          >
            {tick.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Right Y-axis ticks and labels */}
      {y2Ticks.map((tick, i) => (
        <g key={`y2-tick-${i}`}>
          <line
            x1={width - margin.right}
            y1={scales.y2Scale(tick)}
            x2={width - margin.right + 5}
            y2={scales.y2Scale(tick)}
            stroke="black"
            strokeWidth="1"
          />
          <text
            x={width - margin.right + 15}
            y={scales.y2Scale(tick)}
            textAnchor="start"
            dominantBaseline="middle"
            className="text-xs fill-gray-600"
          >
            {tick.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Axis labels with line indicators */}
      <text
        x={width / 2}
        y={height - 5}
        textAnchor="middle"
        className="text-sm font-medium fill-gray-800"
      >
        {xLabel}
      </text>
      
      {/* Y1 label with solid line indicator */}
      <g transform={`translate(0, ${height/2}) rotate(-90)`}>
        <line
          x1={-65}
          y1={margin.left / 4}
          x2={-35}
          y2={margin.left / 4}
          stroke="black"
          strokeWidth="2"
        />
        <line
          x1={35}
          y1={margin.left / 4}
          x2={65}
          y2={margin.left / 4}
          stroke="black"
          strokeWidth="2"
        />
        <text
          x={0}
          y={margin.left / 3}
          textAnchor="middle"
          className="text-sm font-medium fill-gray-800"
        >
          {y1Label}
        </text>
      </g>

      {/* Y2 label with dashed line indicator */}
      <g transform={`translate(${width}, ${height/2}) rotate(-90)`}>
        <line
          x1={-55}
          y1={-margin.right / 2.5}
          x2={-25}
          y2={-margin.right / 2.5}
          stroke="black"
          strokeWidth="2"
          strokeDasharray="4,4"
        />
        <line
          x1={25}
          y1={-margin.right / 2.5}
          x2={55}
          y2={-margin.right / 2.5}
          stroke="black"
          strokeWidth="2"
          strokeDasharray="4,4"
        />
        <text
          x={0}
          y={-margin.right / 3}
          textAnchor="middle"
          className="text-sm font-medium fill-gray-800"
        >
          {y2Label}
        </text>
      </g>
    </svg>
  );
};

export default DualAxisPlot;