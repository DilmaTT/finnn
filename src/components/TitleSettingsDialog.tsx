import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Range } from '@/contexts/RangeContext';

interface TitleSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  range: Range | null;
  onSave: (updatedSettings: Partial<Range>) => void;
}

export const TitleSettingsDialog = ({ open, onOpenChange, range, onSave }: TitleSettingsDialogProps) => {
  const [showTitle, setShowTitle] = useState(false);
  const [titleText, setTitleText] = useState('');
  const [titleFontSize, setTitleFontSize] = useState(20);
  const [titleAlignment, setTitleAlignment] = useState<'left' | 'center'>('center');

  useEffect(() => {
    if (range) {
      setShowTitle(range.showTitle ?? false);
      setTitleText(range.titleText ?? 'Пользовательский заголовок');
      setTitleFontSize(range.titleFontSize ?? 20);
      setTitleAlignment(range.titleAlignment ?? 'center');
    }
  }, [range]);

  const handleSave = () => {
    onSave({
      showTitle,
      titleText,
      titleFontSize,
      titleAlignment,
    });
    onOpenChange(false);
  };

  if (!range) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Настроить заголовок для "{range.name}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-title" className="text-base">
              Показывать заголовок
            </Label>
            <Switch
              id="show-title"
              checked={showTitle}
              onCheckedChange={setShowTitle}
            />
          </div>
          {showTitle && (
            <div className="space-y-4 animate-in fade-in-0 duration-300">
              <div className="space-y-2">
                <Label htmlFor="title-text">Текст заголовка</Label>
                <Input
                  id="title-text"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Размер шрифта: {titleFontSize}px</Label>
                <Slider
                  value={[titleFontSize]}
                  onValueChange={(value) => setTitleFontSize(value[0])}
                  min={12}
                  max={48}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Выравнивание</Label>
                <RadioGroup
                  value={titleAlignment}
                  onValueChange={(value) => setTitleAlignment(value as 'left' | 'center')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="left" id="align-left" />
                    <Label htmlFor="align-left">Слева</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="center" id="align-center" />
                    <Label htmlFor="align-center">По центру</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Отмена</Button>
          </DialogClose>
          <Button onClick={handleSave}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
