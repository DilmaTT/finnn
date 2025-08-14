import React, { RefObject } from 'react';
import { cn } from '@/lib/utils';
import { ChartButton } from '@/types/chart';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

const MIN_BUTTON_DIMENSION = 5;

interface ChartCanvasProps {
  canvasRef: RefObject<HTMLDivElement>;
  width: number;
  height: number;
  buttons: ChartButton[];
  activeButtonId: string | null;
  onButtonMouseDown: (e: React.MouseEvent, button: ChartButton) => void;
  onButtonTouchStart: (e: React.TouchEvent, button: ChartButton) => void;
  onButtonMouseMove: (e: React.MouseEvent, button: ChartButton) => void;
  onButtonMouseLeave: (e: React.MouseEvent) => void;
  onSettingsClick: (e: React.MouseEvent, button: ChartButton) => void;
}

export const ChartCanvas = ({
  canvasRef,
  width,
  height,
  buttons,
  activeButtonId,
  onButtonMouseDown,
  onButtonTouchStart,
  onButtonMouseMove,
  onButtonMouseLeave,
  onSettingsClick,
}: ChartCanvasProps) => {
  return (
    <div
      ref={canvasRef}
      className="relative border-2 border-dashed border-muted-foreground rounded-lg bg-card flex items-center justify-center overflow-hidden"
      style={{ width: width, height: height }}
    >
      {buttons.length === 0 && (
        <p className="text-muted-foreground">Рабочая область (холст)</p>
      )}
      {buttons.map((button) => {
        const finalStyle: React.CSSProperties = {
          backgroundColor: button.color,
          position: 'absolute',
          left: button.x,
          top: button.y,
          width: Math.max(MIN_BUTTON_DIMENSION, button.width || 0),
          height: Math.max(MIN_BUTTON_DIMENSION, button.height || 0),
          zIndex: activeButtonId === button.id ? 100 : 1,
          color: (button.isFontAdaptive === false && button.fontColor) ? button.fontColor : 'white',
          display: 'flex', // Ensure flexbox for alignment
          alignItems: 'center', // Vertical center alignment
          justifyContent: button.textAlign === 'left' ? 'flex-start' : button.textAlign === 'right' ? 'flex-end' : 'center', // Horizontal alignment
          padding: '0 8px', // Add some padding to prevent text from touching edges
          textAlign: button.textAlign, // Apply text-align for text wrapping
        };

        if (button.isFontAdaptive === false && button.fontSize) {
          finalStyle.fontSize = `${button.fontSize}px`;
        }

        return (
          <div
            key={button.id}
            style={finalStyle}
            className={cn(
              "relative rounded-md shadow-md font-semibold group",
              {
                "whitespace-nowrap": !button.textWrap, // Apply whitespace-nowrap if textWrap is false
                "overflow-hidden": !button.textWrap, // Hide overflow if no wrap
                "text-ellipsis": !button.textWrap, // Add ellipsis if no wrap
              }
            )}
            onMouseDown={(e) => onButtonMouseDown(e, button)}
            onTouchStart={(e) => onButtonTouchStart(e, button)}
            onMouseMove={(e) => onButtonMouseMove(e, button)}
            onMouseLeave={onButtonMouseLeave}
          >
            {button.name}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity settings-icon"
              onClick={(e) => onSettingsClick(e, button)}
              title="Настройки кнопки"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
};
