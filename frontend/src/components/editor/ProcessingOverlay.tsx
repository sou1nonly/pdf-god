import React from 'react';
import { 
  FileText, 
  ScanSearch, 
  Brain, 
  Sparkles, 
  Layers, 
  CheckCircle2,
  Loader2
} from 'lucide-react';
import type { ProcessingStage, StageInfo } from '@/hooks/engine/useHydrationEngine';

// Cast to any to fix TS version mismatch with lucide-react
const icons = {
  FileText: FileText as any,
  ScanSearch: ScanSearch as any,
  Brain: Brain as any,
  Sparkles: Sparkles as any,
  Layers: Layers as any,
  CheckCircle2: CheckCircle2 as any,
  Loader2: Loader2 as any,
};

interface ProcessingOverlayProps {
  stageInfo: StageInfo;
  progress: number;
}

interface StageConfig {
  icon: React.ReactNode;
  label: string;
  color: string;
}

const stageConfigs: Record<string, StageConfig> = {
  opening: {
    icon: <icons.FileText className="w-6 h-6" />,
    label: 'Opening Document',
    color: 'text-blue-500'
  },
  scanning: {
    icon: <icons.ScanSearch className="w-6 h-6" />,
    label: 'Scanning Structure',
    color: 'text-purple-500'
  },
  'ai-init': {
    icon: <icons.Brain className="w-6 h-6" />,
    label: 'Loading AI Models',
    color: 'text-pink-500'
  },
  'ai-ready': {
    icon: <icons.Sparkles className="w-6 h-6" />,
    label: 'AI Ready',
    color: 'text-green-500'
  },
  'ai-skip': {
    icon: <icons.Brain className="w-6 h-6 opacity-50" />,
    label: 'Using Heuristics',
    color: 'text-amber-500'
  },
  extracting: {
    icon: <icons.Layers className="w-6 h-6" />,
    label: 'Extracting Content',
    color: 'text-indigo-500'
  },
  'extracting-page': {
    icon: <icons.Layers className="w-6 h-6" />,
    label: 'Extracting Pages',
    color: 'text-indigo-500'
  },
  analyzing: {
    icon: <icons.ScanSearch className="w-6 h-6" />,
    label: 'Analyzing Layout',
    color: 'text-cyan-500'
  },
  'ai-processing': {
    icon: <icons.Sparkles className="w-6 h-6" />,
    label: 'AI Processing',
    color: 'text-pink-500'
  },
  building: {
    icon: <icons.Layers className="w-6 h-6" />,
    label: 'Building Editor',
    color: 'text-emerald-500'
  },
  complete: {
    icon: <icons.CheckCircle2 className="w-6 h-6" />,
    label: 'Complete',
    color: 'text-green-500'
  }
};

const allStages: ProcessingStage[] = [
  'opening',
  'scanning', 
  'ai-init',
  'extracting',
  'analyzing',
  'building',
  'complete'
];

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ stageInfo, progress }) => {
  const config = stageConfigs[stageInfo.stage] || stageConfigs.opening;
  
  // Determine which stages are complete
  const currentIndex = allStages.findIndex(s => 
    stageInfo.stage === s || 
    stageInfo.stage.startsWith(s.split('-')[0])
  );

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      {/* Main Animation Container */}
      <div className="relative mb-8">
        {/* Outer Glow Ring */}
        <div className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 blur-xl animate-pulse" />
        
        {/* Spinning Ring */}
        <div className="w-32 h-32 rounded-full border-4 border-gray-200 relative">
          <div 
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-purple-500 animate-spin"
            style={{ animationDuration: '1.5s' }}
          />
          
          {/* Center Icon */}
          <div className={`absolute inset-0 flex items-center justify-center ${config.color}`}>
            <div className="animate-bounce">
              {config.icon}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Label */}
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        {config.label}
      </h2>
      
      {/* Dynamic Message */}
      <p className="text-gray-500 mb-6 text-center max-w-md animate-pulse">
        {stageInfo.message}
      </p>

      {/* Progress Bar */}
      <div className="w-80 max-w-full mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Processing</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage Timeline */}
      <div className="flex items-center gap-2 mt-4">
        {allStages.slice(0, -1).map((stage, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const stageConfig = stageConfigs[stage];
          
          return (
            <React.Fragment key={stage}>
              <div 
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                  ${isComplete ? 'bg-green-500 text-white scale-90' : ''}
                  ${isCurrent ? 'bg-blue-500 text-white scale-110 ring-4 ring-blue-200' : ''}
                  ${!isComplete && !isCurrent ? 'bg-gray-200 text-gray-400' : ''}
                `}
                title={stageConfig.label}
              >
                {isComplete ? (
                  <icons.CheckCircle2 className="w-4 h-4" />
                ) : isCurrent ? (
                  <icons.Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>
              
              {index < allStages.length - 2 && (
                <div 
                  className={`w-8 h-0.5 transition-all duration-500 ${
                    isComplete ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Stage Labels */}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
        <span className="w-8 text-center">Open</span>
        <div className="w-8" />
        <span className="w-8 text-center">Scan</span>
        <div className="w-8" />
        <span className="w-8 text-center">AI</span>
        <div className="w-8" />
        <span className="w-8 text-center">Extract</span>
        <div className="w-8" />
        <span className="w-8 text-center">Layout</span>
        <div className="w-8" />
        <span className="w-8 text-center">Build</span>
      </div>

      {/* Tips */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          ✨ Your PDF is being transformed into an editable canvas
        </p>
      </div>
    </div>
  );
};
