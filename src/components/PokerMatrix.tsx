import { Button } from "@/components/ui/button";
import { cn, isColorDark } from "@/lib/utils";
import React, { useState, useEffect, useRef } from 'react';
import { useIsMobile } from "@/hooks/use-mobile";
import { useRangeContext, ActionButton, EditorSettings } from "@/contexts/RangeContext";
import { HANDS } from "@/lib/poker-utils";

interface PokerMatrixProps {
  selectedHands: Record<string, string>;
  onHandSelect: (hand: string, mode: 'select' | 'deselect') => void;
  activeAction: string;
  actionButtons: ActionButton[];
  readOnly?: boolean;
  isBackgroundMode?: boolean;
  sizeVariant?: 'default' | 'editorPreview';
}

const getBorderRadiusClass = (radius: EditorSettings['cellBorderRadius']) => ({
  'none': 'rounded-none', 'sm': 'rounded-sm', 'md': 'rounded-md', 'lg': 'rounded-lg'
}[radius] || 'rounded-md');

const getCellSpacingClass = (spacing: EditorSettings['cellSpacing']) => ({
  'none': 'gap-0',
  'sm': 'gap-px sm:gap-0.5',
  'md': 'gap-0.5 sm:gap-1',
  'lg': 'gap-1 sm:gap-1.5'
}[spacing] || 'gap-0.5 sm:gap-1');

const getFontSizeClass = (size: EditorSettings['font']['size']) => {
  switch (size) {
    case 's': return 'text-xs';
    case 'm': return 'text-sm';
    case 'l': return 'text-base';
    case 'xl': return 'text-lg';
    default: return ''; // For 'custom'
  }
};

const getFontWeightClass = (weight: EditorSettings['font']['weight']) => ({
  'normal': 'font-normal',
  'bold': 'font-bold',
}[weight] || 'font-normal');

export const PokerMatrix = ({ selectedHands, onHandSelect, activeAction, actionButtons, readOnly = false, isBackgroundMode = false }: PokerMatrixProps) => {
  const isMobile = useIsMobile();
  const { editorSettings, foldColor } = useRangeContext();
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect' | null>(null);
  const initialHandRef = useRef<string | null>(null);
  const hasDragged = useRef(false); // Флаг для определения, было ли движение (перетаскивание)

  const getActionColor = (actionId: string, buttons: ActionButton[]): string => {
    if (actionId === 'fold') return foldColor;
    const button = buttons.find(b => b.id === actionId);
    if (button && button.type === 'simple') return button.color;
    return '#ffffff'; 
  };

  useEffect(() => {
    if (isBackgroundMode) {
      setIsDragging(false);
      setDragMode(null);
      initialHandRef.current = null;
      hasDragged.current = false;
    }
  }, [isBackgroundMode]);

  // Глобальный слушатель mouse/touch up для обработки окончания перетаскивания/тапа
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (readOnly || isBackgroundMode) return;

      // Логика выбора ячейки теперь обрабатывается в handleDesktopMouseDown и handleMobileTouchStart.
      // Здесь мы просто сбрасываем состояние перетаскивания.
      setIsDragging(false);
      setDragMode(null);
      initialHandRef.current = null;
      hasDragged.current = false;
    };

    window.addEventListener('mouseup', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalPointerUp);
    window.addEventListener('touchcancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalPointerUp);
      window.removeEventListener('touchcancel', handleGlobalPointerUp);
    };
  }, [readOnly, isBackgroundMode]); // Зависимости изменены, так как здесь больше нет логики выбора

  // Вспомогательная функция для логики перетаскивания (входа в ячейку)
  const handleDragEnterLogic = (hand: string) => {
    if (readOnly || isBackgroundMode || !isDragging || !dragMode) return;
    
    // Если рука отличается от начальной, или если уже было движение (hasDragged = true),
    // то это перетаскивание, и мы выбираем руку.
    if (initialHandRef.current !== hand || hasDragged.current) {
      hasDragged.current = true; // Подтверждаем, что это перетаскивание
      onHandSelect(hand, dragMode);
    }
  };

  // Обработчики для десктопа (мышь)
  const handleDesktopMouseDown = (event: React.MouseEvent<HTMLButtonElement>, hand: string) => {
    if (readOnly || isBackgroundMode) return;
    event.preventDefault(); // Предотвращаем выделение текста
    
    initialHandRef.current = hand;
    hasDragged.current = false;
    setIsDragging(true);
    
    const currentHandAction = selectedHands[hand];
    const mode = currentHandAction === activeAction ? 'deselect' : 'select';
    setDragMode(mode);
    
    onHandSelect(hand, mode); // Выбираем начальную руку сразу для десктопа
  };

  const handleDesktopMouseEnter = (hand: string) => {
    handleDragEnterLogic(hand);
  };

  // Обработчики для мобильных устройств (тач)
  const handleMobileTouchStart = (event: React.TouchEvent<HTMLButtonElement>, hand: string) => {
    if (readOnly || isBackgroundMode) return;
    event.preventDefault(); // Предотвращаем стандартное поведение касания (например, прокрутку)
    
    initialHandRef.current = hand;
    hasDragged.current = false; // Изначально предполагаем, что это тап
    setIsDragging(true);
    
    const currentHandAction = selectedHands[hand];
    const mode = currentHandAction === activeAction ? 'deselect' : 'select';
    setDragMode(mode);
    
    onHandSelect(hand, mode); // Выбираем начальную руку сразу для мобильных устройств
  };

  const handleMobileTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || isBackgroundMode) return;
    event.preventDefault(); // Предотвращаем прокрутку во время перетаскивания
    const touch = event.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element instanceof HTMLElement && element.dataset.hand) {
      const hand = element.dataset.hand;
      // Если касание переместилось на другую руку, или если мы уже начали перетаскивание,
      // то обрабатываем это как перетаскивание.
      if (initialHandRef.current !== hand || hasDragged.current) {
          hasDragged.current = true; // Подтверждаем, что это перетаскивание
          handleDragEnterLogic(hand);
      }
    }
  };

  const getHandStyle = (hand: string): React.CSSProperties => {
    const { font, cellBackgroundColor } = editorSettings;
    const actionId = selectedHands[hand];
    const style: React.CSSProperties = {};

    if (font.size === 'custom' && font.customSize) {
      style.fontSize = font.customSize;
    }

    let finalBgColor: string | null = null;
    let isWeighted = false;

    if (actionId) {
      const action = actionButtons.find(b => b.id === actionId);
      if (action) {
        if (action.type === 'simple') {
          finalBgColor = action.color;
          style.backgroundColor = finalBgColor;
        } else if (action.type === 'weighted') {
          isWeighted = true;
          const color1 = getActionColor(action.action1Id, actionButtons);
          const color2 = getActionColor(action.action2Id, actionButtons);
          style.background = `linear-gradient(to right, ${color1} ${action.weight}%, ${color2} ${action.weight}%)`;
        }
      }
    } else {
      if (cellBackgroundColor.type === 'white') {
        finalBgColor = '#ffffff';
      } else if (cellBackgroundColor.type === 'custom') {
        finalBgColor = cellBackgroundColor.customColor;
      } else { // 'default'
        finalBgColor = foldColor;
      }
      style.backgroundColor = finalBgColor;
    }

    if (font.color === 'white') {
      style.color = 'white';
    } else if (font.color === 'black') {
      style.color = 'black';
    } else {
      if (isWeighted) {
        style.color = 'white';
      } else if (finalBgColor) {
        style.color = isColorDark(finalBgColor) ? 'white' : 'black';
      }
    }

    // Применяем 50% прозрачности для неактивных ячеек, если настройка включена
    if (editorSettings.font.inactiveFontTransparent && !actionId) {
      style.opacity = 0.5;
    } else {
      style.opacity = 1; // Убедимся, что активные ячейки полностью непрозрачны
    }

    return style;
  };

  const getHandColorClass = (hand: string) => {
    if (selectedHands[hand]) return '';
    const { cellBackgroundColor } = editorSettings;
    if (cellBackgroundColor.type === 'default') {
      return 'hover:bg-muted/70';
    }
    return '';
  };

  const getMatrixBackgroundStyle = (): React.CSSProperties => {
    const { matrixBackgroundColor } = editorSettings;
    if (matrixBackgroundColor?.type === 'custom' && matrixBackgroundColor.customColor) {
      return { backgroundColor: matrixBackgroundColor.customColor };
    }
    return {};
  };

  const getMatrixBackgroundClass = () => {
    const { matrixBackgroundColor } = editorSettings;
    if (!matrixBackgroundColor) return 'bg-background';
    switch (matrixBackgroundColor.type) {
      case 'white': return 'bg-white';
      case 'dark': return 'bg-background';
      case 'custom': return '';
      default: return 'bg-background';
    }
  };

  const parentContainerClasses = cn(
    "space-y-4 rounded-lg",
    isMobile ? "px-[1%] py-[1%]" : "p-4",
    isBackgroundMode ? "w-full h-full flex items-center justify-center" : "w-full",
    getMatrixBackgroundClass()
  );
  
  const gridClasses = cn(
    "grid grid-cols-13 aspect-square w-full select-none rounded-lg",
    isBackgroundMode ? "gap-0.5" : getCellSpacingClass(editorSettings.cellSpacing)
  );
  
  const buttonClasses = cn(
    "w-full h-full aspect-square font-mono border transition-all duration-200",
    "hover:ring-2 hover:ring-ring",
    getBorderRadiusClass(editorSettings.cellBorderRadius),
    getFontSizeClass(editorSettings.font.size),
    getFontWeightClass(editorSettings.font.weight),
    isMobile ? "p-0" : "p-0.5"
  );

  return (
    <div className={parentContainerClasses} style={getMatrixBackgroundStyle()}>
      <div className={gridClasses} onTouchMove={isMobile ? handleMobileTouchMove : undefined}>
        {HANDS.map((row, rowIndex) => 
          row.map((hand, colIndex) => (
            <Button
              key={`${rowIndex}-${colIndex}`}
              data-hand={hand}
              variant="outline"
              size="sm"
              className={cn(buttonClasses, getHandColorClass(hand))}
              style={getHandStyle(hand)}
              onMouseDown={isMobile ? undefined : (e) => handleDesktopMouseDown(e, hand)}
              onMouseEnter={isMobile ? undefined : () => handleDesktopMouseEnter(hand)}
              onTouchStart={isMobile ? (e) => handleMobileTouchStart(e, hand) : undefined}
            >
              {hand}
            </Button>
          ))
        )}
      </div>
    </div>
  );
};

export const getCombinations = (hand: string): number => {
  if (hand.length === 2 && hand[0] === hand[1]) return 6;
  if (hand.endsWith('s')) return 4;
  if (hand.endsWith('o')) return 12;
  return 0;
};

export const TOTAL_POKER_COMBINATIONS = HANDS.flat().reduce((sum, hand) => sum + getCombinations(hand), 0);
