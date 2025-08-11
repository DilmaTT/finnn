import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StoredChart, ChartButton } from "@/types/chart";
import { Range, ActionButton as ActionButtonType } from "@/contexts/RangeContext";
import { PokerMatrix } from "@/components/PokerMatrix";
import { useRangeContext } from "@/contexts/RangeContext";

// Helper function to get the color for a simple action
const getActionColor = (actionId: string, allButtons: ActionButtonType[]): string => {
  if (actionId === 'fold') return '#6b7280';
  const button = allButtons.find(b => b.id === actionId);
  if (button && button.type === 'simple') {
    return button.color;
  }
  return '#ffffff'; // Fallback color
};

// Helper function to get the style for any action button (simple or weighted)
const getActionButtonStyle = (button: ActionButtonType, allButtons: ActionButtonType[]) => {
  if (button.type === 'simple') {
    return { backgroundColor: button.color };
  }
  if (button.type === 'weighted') {
    const color1 = getActionColor(button.action1Id, allButtons);
    const color2 = getActionColor(button.action2Id, allButtons);
    return {
      background: `linear-gradient(to right, ${color1} ${button.weight}%, ${color2} ${button.weight}%)`,
    };
  }
  return {};
};

// Legend Component
const Legend = ({
  usedActions,
  allActionButtons,
  legendOverrides,
  legendIsMultiLine,
}: {
  usedActions: ActionButtonType[];
  allActionButtons: ActionButtonType[];
  legendOverrides?: Record<string, string>;
  legendIsMultiLine?: boolean;
}) => {
  if (usedActions.length === 0) return null;

  const isMultiLine = legendIsMultiLine ?? true;

  return (
    <div className={cn(
      "mt-4",
      isMultiLine
        ? "flex flex-col items-start gap-y-2"
        : "flex flex-row flex-wrap items-center gap-x-4 gap-y-2"
    )}>
      {usedActions.map(action => (
        <div key={action.id} className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-sm border"
            style={getActionButtonStyle(action, allActionButtons)}
          />
          <span className="text-sm font-medium">
            {legendOverrides?.[action.id] || action.name}
          </span>
        </div>
      ))}
    </div>
  );
};


interface ChartViewerProps {
  isMobileMode?: boolean;
  chart: StoredChart;
  allRanges: Range[];
  onBackToCharts: () => void;
}

const CustomDialog = ({ isOpen, onClose, children, isMobileMode = false }) => {
    if (!isOpen) return null;

    return (
        <div 
            className={cn(
                "fixed inset-0 z-50 flex bg-black/50",
                isMobileMode ? "items-stretch p-0" : "items-center justify-center p-2"
            )} 
            onClick={onClose}
        >
            <div 
                className={cn(
                    "bg-background shadow-2xl",
                    isMobileMode ? "w-full h-full rounded-none" : "w-auto p-4 rounded-lg"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
};

export const ChartViewer = ({ isMobileMode = false, chart, allRanges, onBackToCharts }: ChartViewerProps) => {
  const { actionButtons } = useRangeContext();
  const [displayedRange, setDisplayedRange] = useState<Range | null>(null);
  const [showMatrixDialog, setShowMatrixDialog] = useState(false);
  const [activeButton, setActiveButton] = useState<ChartButton | null>(null);
  const [randomNumber, setRandomNumber] = useState<number | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [dynamicBorderStyle, setDynamicBorderStyle] = useState<React.CSSProperties>({});

  const recordRangeAccess = (rangeId: string) => {
    if (!rangeId) {
      console.warn("[Stats] recordRangeAccess called with no rangeId.");
      return;
    }
  
    let stats: Record<string, number> = {};
    try {
      const rawStats = localStorage.getItem('poker-range-access-statistics');
      if (rawStats) {
        const parsed = JSON.parse(rawStats);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          stats = parsed;
        }
      }
    } catch (error) {
      console.error("Error parsing range access statistics, starting fresh for this session.", error);
      stats = {};
    }
    
    try {
      const currentCount = Number(stats[rangeId]) || 0;
      stats[rangeId] = currentCount + 1;
      localStorage.setItem('poker-range-access-statistics', JSON.stringify(stats));
    } catch (error) {
      console.error("Error saving range access statistics to localStorage.", error);
      alert("Не удалось сохранить статистику. Возможно, хранилище переполнено.");
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    try {
      const bgHslString = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
      if (!bgHslString) return;

      const parts = bgHslString.replace(/%/g, '').split(' ');
      if (parts.length < 3) return;

      const h = parseFloat(parts[0]);
      const s = parseFloat(parts[1]);
      const l = parseFloat(parts[2]);

      if (isNaN(h) || isNaN(s) || isNaN(l)) return;

      const newL = l + (100 - l) * 0.15;
      const newBorderColor = `hsl(${h} ${s}% ${Math.min(100, newL)}%)`;

      setDynamicBorderStyle({
        borderColor: newBorderColor,
        borderWidth: '1px',
        borderStyle: 'solid'
      });
    } catch (error) {
      console.error("Could not calculate dynamic border color, falling back.", error);
      setDynamicBorderStyle({
        borderColor: 'hsl(var(--border))',
        borderWidth: '1px',
        borderStyle: 'solid'
      });
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleButtonClick = (button: ChartButton) => {
    if (button.type === 'label') {
      return;
    }
  
    if (button.type === 'exit') {
      onBackToCharts();
      return;
    }
  
    const linkedRange = allRanges.find(range => range.id === button.linkedItem);
    if (linkedRange) {
      recordRangeAccess(linkedRange.id);
      setDisplayedRange(linkedRange);
      setActiveButton(button);
      
      if (button.showRandomizer) {
        setRandomNumber(Math.floor(Math.random() * 101));
      } else {
        setRandomNumber(null);
      }

      setShowMatrixDialog(true);
    } else {
      alert("Привязанный диапазон не найден.");
    }
  };
  
  const handleCloseDialog = () => {
    setShowMatrixDialog(false);
    setDisplayedRange(null);
    setActiveButton(null);
    setRandomNumber(null);
  }

  const handleLinkButtonClick = (targetRangeId: string) => {
    const targetRange = allRanges.find(r => r.id === targetRangeId);
    if (targetRange) {
      recordRangeAccess(targetRange.id);
      setDisplayedRange(targetRange);
    } else {
      alert('Связанный ренж не найден!');
    }
  };

  const usedActions = React.useMemo(() => {
    if (!displayedRange) return [];
    
    const usedActionIds = new Set(Object.values(displayedRange.hands));
    
    return actionButtons.filter(action => usedActionIds.has(action.id));

  }, [displayedRange, actionButtons]);


  const scale = (isMobileMode && viewportSize.width > 0 && chart.canvasWidth > 0)
    ? Math.min(
        viewportSize.width / chart.canvasWidth,
        viewportSize.height / chart.canvasHeight
      )
    : 1;

  const linkButtonContainerPositionClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <>
      <div className={cn(
        isMobileMode
          ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          : "p-6 min-h-screen"
      )}>
        <div className={cn(
          isMobileMode ? "w-full h-full flex flex-col items-center justify-center" : "w-full flex justify-center items-start"
        )}>
          <div
            className={cn(
              "relative flex items-center justify-center overflow-hidden",
              isMobileMode ? "bg-background" : "bg-card rounded-lg"
            )}
            style={{
              width: chart.canvasWidth,
              height: chart.canvasHeight,
              ...(isMobileMode ? {
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
              } : {
                flexShrink: 0,
                ...dynamicBorderStyle
              })
            }}
          >
            {(!isMobileMode || !showMatrixDialog) && chart.buttons.map((button) => {
              const finalStyle: React.CSSProperties = {
                backgroundColor: button.color,
                position: 'absolute',
                left: button.x,
                top: button.y,
                width: Math.max(5, button.width || 0),
                height: Math.max(5, button.height || 0),
                color: (button.isFontAdaptive === false && button.fontColor) ? button.fontColor : 'white',
              };

              if (button.isFontAdaptive === false && button.fontSize) {
                finalStyle.fontSize = `${button.fontSize}px`;
              }

              return (
                <div
                  key={button.id}
                  style={finalStyle}
                  className={cn(
                    "flex items-center justify-center rounded-md shadow-md font-semibold z-20",
                    button.type !== 'label' && "cursor-pointer hover:opacity-90 transition-opacity"
                  )}
                  onClick={() => handleButtonClick(button)}
                >
                  {button.name}
                </div>
              );
            })}
            {chart.buttons.length === 0 && (!isMobileMode || !showMatrixDialog) && (
              <p className="text-muted-foreground z-10">В этом чарте нет кнопок.</p>
            )}
          </div>
        </div>
      </div>

      <CustomDialog isOpen={showMatrixDialog} onClose={handleCloseDialog} isMobileMode={isMobileMode}>
          {displayedRange && (
            <div className={cn(
              "relative flex flex-col h-full",
              isMobileMode ? "pb-[30px]" : "p-4" // Added p-4 for desktop dialog content
            )}>
              {activeButton?.showRandomizer && randomNumber !== null && (
                <div 
                  className="absolute top-0 right-0 font-bold z-10 rounded-md"
                  style={{ 
                    fontSize: '20px', 
                    color: 'white', 
                    backgroundColor: '#0d0e12',
                    padding: '4px 12px'
                  }}
                >
                  {randomNumber}
                </div>
              )}

              {displayedRange.showTitle && displayedRange.titleText && (
                <h3
                  className="pt-10 mb-2 px-4 font-bold text-white flex-shrink-0"
                  style={{
                    fontSize: `${displayedRange.titleFontSize || 20}px`,
                    textAlign: displayedRange.titleAlignment || 'center',
                  }}
                >
                  {displayedRange.titleText}
                </h3>
              )}

              {/* Matrix container - removed flex-grow to fix its position */}
              <div className={cn(
                "flex items-center justify-center flex-shrink-0", // Ensure it doesn't grow
                isMobileMode ? "w-full" : "h-full" // This ensures the matrix itself scales correctly
              )}>
                <div className={cn(
                  "aspect-square",
                  isMobileMode ? "w-full" : "h-full"
                )}>
                  <PokerMatrix
                    selectedHands={displayedRange.hands}
                    onHandSelect={() => {}}
                    activeAction=""
                    actionButtons={actionButtons}
                    readOnly={true}
                    isBackgroundMode={false}
                  />
                </div>
              </div>
              
              <div className={cn("flex-shrink-0", isMobileMode && "px-4 pb-4")}>
                {activeButton?.showLegend && (
                  <Legend
                    usedActions={usedActions}
                    allActionButtons={actionButtons}
                    legendOverrides={activeButton?.legendOverrides}
                    legendIsMultiLine={activeButton?.legendIsMultiLine}
                  />
                )}
                {activeButton?.linkButtons && activeButton.linkButtons.some(b => b.enabled) && (
                  <div className={cn(
                    "mt-4 flex",
                    linkButtonContainerPositionClass[activeButton.linkButtons[0].position]
                  )}>
                    <div className="grid grid-cols-3 gap-2">
                      {activeButton.linkButtons.map((linkButton, index) => (
                        linkButton.enabled && linkButton.targetRangeId && (
                          <Button
                            key={index}
                            onClick={() => handleLinkButtonClick(linkButton.targetRangeId)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold h-8 px-2 text-xs"
                          >
                            {linkButton.text || "Перейти"}
                          </Button>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isMobileMode && (
                <Button
                  onClick={handleCloseDialog}
                  className="absolute bottom-0 left-0 w-full rounded-none text-white font-bold bg-gray-800 hover:bg-gray-700 z-20"
                  style={{ height: '30px' }}
                >
                  Назад
                </Button>
              )}
            </div>
          )}
      </CustomDialog>
    </>
  );
};
