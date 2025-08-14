import { useRangeContext, ActionButton } from "@/contexts/RangeContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, EyeOff } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ActionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getActionButtonStyle = (button: ActionButton, allButtons: ActionButton[]) => {
  if (button.type === 'simple') {
    return { backgroundColor: button.color };
  }
  if (button.type === 'weighted') {
    const getActionColor = (actionId: string): string => {
      const btn = allButtons.find(b => b.id === actionId);
      return (btn && btn.type === 'simple') ? btn.color : '#cccccc'; // Fallback grey
    };
    const color1 = getActionColor(button.action1Id);
    const color2 = getActionColor(button.action2Id);
    return {
      background: `linear-gradient(to right, ${color1} ${button.weight}%, ${color2} ${button.weight}%)`,
    };
  }
  return {};
};

export const ActionSettingsDialog = ({ open, onOpenChange }: ActionSettingsDialogProps) => {
  const isMobile = useIsMobile();
  const { actionButtons, hiddenActionIds, setHiddenActionIds } = useRangeContext();

  const toggleVisibility = (buttonId: string) => {
    setHiddenActionIds(prev =>
      prev.includes(buttonId)
        ? prev.filter(id => id !== buttonId)
        : [...prev, buttonId]
    );
  };

  const visibleButtons = actionButtons.filter(b => !hiddenActionIds.includes(b.id));
  const hiddenButtons = actionButtons.filter(b => hiddenActionIds.includes(b.id));

  const renderButtonList = (buttons: ActionButton[], isVisibleList: boolean) => (
    <div className="space-y-2">
      {buttons.map(button => (
        <div key={button.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
          <div
            className="px-3 py-1 text-sm rounded text-primary-foreground flex-1 text-center truncate"
            style={getActionButtonStyle(button, actionButtons)}
          >
            {button.name}
          </div>
          <Button variant="ghost" size="icon" onClick={() => toggleVisibility(button.id)} className="h-8 w-8">
            {isVisibleList ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      ))}
      {buttons.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Список пуст</p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        mobileFullscreen={isMobile}
        className={cn(
          "sm:max-w-[640px]",
          isMobile && "flex flex-col h-full"
        )}
      >
        <DialogHeader>
          <DialogTitle>Настройки кнопок действий</DialogTitle>
          <DialogDescription>
            Скройте или покажите кнопки, чтобы настроить рабочее пространство.
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 gap-6 py-4",
          isMobile && "flex-1 overflow-y-auto"
        )}>
          <div className="space-y-3">
            <h4 className="font-medium text-center">Видимые кнопки</h4>
            <div className={cn(
              "p-3 rounded-lg border",
              !isMobile && "h-64 overflow-y-auto"
            )}>
              {renderButtonList(visibleButtons, true)}
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-center">Скрытые кнопки</h4>
            <div className={cn(
              "p-3 rounded-lg border",
              !isMobile && "h-64 overflow-y-auto"
            )}>
              {renderButtonList(hiddenButtons, false)}
            </div>
          </div>
        </div>

        <DialogFooter className={cn(isMobile && "mt-auto border-t pt-4")}>
          <Button onClick={() => onOpenChange(false)} className={cn(isMobile && "w-full")}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
