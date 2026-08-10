import { useState } from "react";
import { NODE_META } from "@/lib/meta";
import type { NodeType } from "@/lib/types";
import { ZoomIn, ZoomOut, Maximize2, MoreHorizontal } from "lucide-react";

interface CanvasToolbarProps {
  onAddNode: (type: NodeType) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  disabled?: boolean;
}

// Primary types shown directly in the bar
const PRIMARY_TOOLS: NodeType[] = ["claim", "support", "conflict", "note"];

// Overflow types shown in the "more" menu
const OVERFLOW_TOOLS: NodeType[] = ["premise", "value", "source", "limit"];

export default function CanvasToolbar({ 
  onAddNode, 
  onZoomIn,
  onZoomOut,
  onFitView,
  disabled 
}: CanvasToolbarProps) {
  const [showMore, setShowMore] = useState(false);
  
  if (disabled) return null;

  return (
    <>
      {/* Main toolbar — bottom center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-lg border border-slate-200/60 shadow-xl shadow-slate-200/30 rounded-xl px-2 py-1.5">
        
        {PRIMARY_TOOLS.map((type) => {
          const meta = NODE_META[type];
          return (
            <button
              key={type}
              onClick={() => onAddNode(type)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium text-slate-600 hover:text-slate-900"
              title={meta.description}
            >
              <span style={{ color: meta.color }} className="text-base">
                {meta.icon}
              </span>
              <span className="hidden sm:inline">{meta.label}</span>
            </button>
          );
        })}

        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* Overflow menu trigger */}
        <div className="relative">
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
            title="More node types"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMore && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMore(false)} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 bg-white/95 backdrop-blur-lg border border-slate-200/60 shadow-xl rounded-xl p-2 min-w-[160px]">
                {OVERFLOW_TOOLS.map((type) => {
                  const meta = NODE_META[type];
                  return (
                    <button
                      key={type}
                      onClick={() => { onAddNode(type); setShowMore(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                      <span style={{ color: meta.color }} className="text-base">
                        {meta.icon}
                      </span>
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Zoom controls — bottom right */}
      <div className="absolute bottom-6 right-6 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-lg border border-slate-200/60 shadow-lg rounded-lg p-1">
        <button
          type="button"
          onClick={onZoomIn}
          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onFitView}
          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
