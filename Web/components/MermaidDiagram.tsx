import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from './ThemeContext';

interface MermaidDiagramProps {
  chart: string;
  id: string; // Ensure unique ID for each diagram
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, id }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    // Initialize mermaid configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        padding: 20
      },
      er: {
        useMaxWidth: true,
      },
      sequence: {
        useMaxWidth: true,
      }
    });

    const renderChart = async () => {
      if (!elementRef.current) return;

      try {
        const uniqueId = `mermaid-${id}-${Date.now()}`;

        // Clear previous content
        setSvg('');
        setError(null);

        // Render the diagram
        const { svg: svgContent } = await mermaid.render(uniqueId, chart);
        setSvg(svgContent);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        // Clean up error element that mermaid might leave behind
        const errorElement = document.querySelector(`#d${id}`);
        if (errorElement) {
          errorElement.remove();
        }
        setError('Diagram rendering failed');
      }
    };

    renderChart();
  }, [chart, id, theme]);

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-mono border border-red-200 dark:border-red-800">
        <p className="font-bold mb-2">Mermaid Error:</p>
        <pre className="whitespace-pre-wrap">{error}</pre>
        <pre className="mt-4 text-xs opacity-70">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      className="mermaid-container w-full flex justify-center py-6 overflow-x-auto"
      ref={elementRef}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
