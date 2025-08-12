import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, Download, Edit, Check, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRangeContext } from '@/contexts/RangeContext';
import {
  fetchMemorySlots,
  saveToMemorySlot,
  loadFromMemorySlot,
  renameMemorySlot,
  MemorySlot,
  MemorySlotData,
} from '@/lib/data-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';

interface MemorySlotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MemorySlotsContent: React.FC<{ setOpen: (open: boolean) => void }> = ({ setOpen }) => {
  const { folders, actionButtons, setFolders, setActionButtons } = useRangeContext();
  const [slots, setSlots] = useState<MemorySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});
  const [renameInput, setRenameInput] = useState<Record<number, string>>({});
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    const fetchedSlots = await fetchMemorySlots();
    setSlots(fetchedSlots);
    const initialRenameState: Record<number, string> = {};
    fetchedSlots.forEach(slot => {
      initialRenameState[slot.slot_index] = slot.name;
    });
    setRenameInput(initialRenameState);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      loadSlots();
    }
  }, [open, loadSlots]);

  const handleOperation = async (key: string, operation: () => Promise<any>) => {
    setOperationLoading(prev => ({ ...prev, [key]: true }));
    try {
      await operation();
    } catch (error) {
      console.error(`Operation ${key} failed`, error);
      alert(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSave = async (slotIndex: number) => {
    const slotName = slots.find(s => s.slot_index === slotIndex)?.name || `Слот ${slotIndex + 1}`;
    const dataToSave: MemorySlotData = { folders, actionButtons };
    
    await handleOperation(`save-${slotIndex}`, async () => {
      const result = await saveToMemorySlot(slotIndex, slotName, dataToSave);
      if (result.success) {
        alert(`Настройки успешно сохранены в "${slotName}"`);
        await loadSlots();
      } else {
        throw result.error || new Error('Не удалось сохранить слот.');
      }
    });
  };

  const handleLoad = async (slotIndex: number) => {
    if (!confirm("Вы уверены, что хотите загрузить этот слот? Текущие несохраненные папки и кнопки будут перезаписаны.")) {
      return;
    }
    await handleOperation(`load-${slotIndex}`, async () => {
      const data = await loadFromMemorySlot(slotIndex);
      if (data) {
        setFolders(data.folders);
        setActionButtons(data.actionButtons);
        alert("Настройки успешно загружены.");
        setOpen(false);
      } else {
        alert("Не удалось загрузить данные из слота.");
      }
    });
  };

  const handleRename = async (slotIndex: number) => {
    const newName = renameInput[slotIndex];
    if (!newName || newName.trim() === '') {
      alert("Имя слота не может быть пустым.");
      return;
    }
    await handleOperation(`rename-${slotIndex}`, async () => {
      const result = await renameMemorySlot(slotIndex, newName.trim());
      if (result.success) {
        alert("Слот успешно переименован.");
        setEditingSlot(null);
        await loadSlots();
      } else {
        throw result.error || new Error('Не удалось переименовать слот.');
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-4 text-muted-foreground">Загрузка слотов...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-0 space-y-4 max-h-[80vh] overflow-y-auto">
      {slots.map((slot) => {
        const isSaving = !!operationLoading[`save-${slot.slot_index}`];
        const isLoading = !!operationLoading[`load-${slot.slot_index}`];
        const isRenaming = !!operationLoading[`rename-${slot.slot_index}`];
        const isEditing = editingSlot === slot.slot_index;

        return (
          <div key={slot.slot_index} className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between min-h-[32px]">
              {isEditing ? (
                <div className="flex items-center gap-2 w-full">
                   <Input
                    value={renameInput[slot.slot_index] || ''}
                    onChange={(e) => setRenameInput(prev => ({ ...prev, [slot.slot_index]: e.target.value }))}
                    className="h-8"
                    placeholder="Новое имя слота"
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(slot.slot_index)}
                  />
                  <Button size="icon" variant="ghost" onClick={() => handleRename(slot.slot_index)} disabled={isRenaming} className="h-8 w-8 flex-shrink-0">
                    {isRenaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-500" />}
                  </Button>
                   <Button size="icon" variant="ghost" onClick={() => setEditingSlot(null)} className="h-8 w-8 flex-shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{slot.name}</h3>
                  <Button size="icon" variant="ghost" onClick={() => setEditingSlot(slot.slot_index)} className="h-6 w-6">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleSave(slot.slot_index)} disabled={isSaving || isLoading} className="w-full">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Сохранить
              </Button>
              <Button onClick={() => handleLoad(slot.slot_index)} disabled={!slot.data || isLoading || isSaving} variant="secondary" className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Загрузить
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const MemorySlotsDialog: React.FC<MemorySlotsDialogProps> = ({ open, onOpenChange }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Слоты памяти</DrawerTitle>
            <DrawerDescription>
              Сохраняйте и загружайте до 5 различных конфигураций папок и кнопок.
            </DrawerDescription>
          </DrawerHeader>
          {open && <MemorySlotsContent setOpen={onOpenChange} />}
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Закрыть</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Слоты памяти</DialogTitle>
          <DialogDescription>
            Сохраняйте и загружайте до 5 различных конфигураций папок и кнопок.
          </DialogDescription>
        </DialogHeader>
        {open && <MemorySlotsContent setOpen={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
};
