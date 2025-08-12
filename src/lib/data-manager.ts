import { supabase } from './supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { EditorSettings } from '@/contexts/RangeContext'; // Import EditorSettings

// --- Data Structure ---
interface SessionStat {
  trainingId: string;
  timestamp: number;
  duration: number;
  totalQuestions: number;
  correctAnswers: number;
}

interface AppData {
  version: number;
  folders: any[];
  actionButtons: any[];
  trainings: any[];
  statistics: SessionStat[];
  rangeAccessStats: Record<string, number>; // New: Range access counts
  charts: any[];
  editorSettings: EditorSettings; // Use imported EditorSettings type
  timestamp: string;
}

export interface MemorySlotData {
  folders: any[];
  actionButtons: any[];
  trainings: any[];
  statistics: SessionStat[];
  rangeAccessStats: Record<string, number>;
  charts: any[];
  editorSettings: EditorSettings; // Use imported EditorSettings type
}

export interface MemorySlot {
  id?: number;
  user_id?: string;
  slot_index: number;
  name: string;
  data: MemorySlotData | null;
  updated_at?: string;
}


export const APP_DATA_VERSION = 1;

// --- Helper Functions ---
const isTauri = (): boolean => '__TAURI__' in window;
const isCapacitor = (): boolean => !!(window as any).Capacitor?.isNativePlatform();

/**
 * Gathers all relevant data from localStorage into a single object.
 */
export const gatherData = (): AppData => {
  console.log("[DM] Gathering data from localStorage...");
  const folders = JSON.parse(localStorage.getItem('poker-ranges-folders') || '[]');
  const actionButtons = JSON.parse(localStorage.getItem('poker-ranges-actions') || '[]');
  const trainings = JSON.parse(localStorage.getItem('training-sessions') || '[]');
  
  let statistics: SessionStat[] = [];
  const statsRaw = localStorage.getItem('training-statistics');
  if (statsRaw) {
    try {
      const parsed = JSON.parse(statsRaw);
      if (Array.isArray(parsed)) {
        statistics = parsed;
      } else {
        console.warn("[DM] Old object-based training statistics found. Discarding for new array format.");
      }
    } catch (e) {
      console.error("[DM] Failed to parse training statistics, defaulting to empty array.", e);
    }
  }

  let rangeAccessStats: Record<string, number> = {};
  const rangeStatsRaw = localStorage.getItem('poker-range-access-statistics');
  if (rangeStatsRaw) {
    try {
      const parsed = JSON.parse(rangeStatsRaw);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        rangeAccessStats = parsed;
      } else {
        console.warn("[DM] Old array-based range access statistics found or invalid. Discarding for new object format.");
      }
    } catch (e) {
      console.error("[DM] Failed to parse range access statistics, defaulting to empty object.", e);
    }
  }

  const charts = JSON.parse(localStorage.getItem('userCharts') || '[]');
  // Parse editor settings and ensure inactiveFontTransparent has a default
  const editorSettingsRaw = localStorage.getItem('poker-editor-settings');
  let editorSettings: EditorSettings = {
    matrixBackgroundColor: { type: 'dark', customColor: '#000000' },
    cellBackgroundColor: { type: 'default', customColor: '#000000' },
    cellBorderRadius: 'md',
    cellSpacing: 'md',
    font: {
      size: 'm',
      customSize: '16px',
      color: 'auto',
      weight: 'normal',
      inactiveFontTransparent: false, // Default value for the new flag
    },
  };
  if (editorSettingsRaw) {
    try {
      const parsedSettings = JSON.parse(editorSettingsRaw);
      // Merge with defaults to ensure new properties are present
      editorSettings = {
        ...editorSettings, // Start with defaults
        ...parsedSettings, // Override with saved settings
        font: {
          ...editorSettings.font, // Start with default font settings
          ...parsedSettings.font, // Override with saved font settings
        }
      };
    } catch (e) {
      console.error("[DM] Failed to parse editor settings, defaulting to initial settings.", e);
    }
  }

  const timestamp = localStorage.getItem('poker-data-timestamp') || new Date(0).toISOString();

  const data = {
    version: APP_DATA_VERSION,
    folders,
    actionButtons,
    trainings,
    statistics,
    rangeAccessStats,
    charts,
    editorSettings,
    timestamp,
  };
  console.log("[DM] Gathered data:", data);
  console.log(`[DM] Gathered charts: ${data.charts.length} charts. Example chart (first 500 chars): ${JSON.stringify(data.charts[0] || {}).substring(0, 500)}`);
  return data;
};

/**
 * Applies imported data to the application.
 */
export const applyData = (data: AppData, reload: boolean = true) => {
  console.log("[DM] Attempting to apply data:", data);
  if (!data || data.version > APP_DATA_VERSION) {
    console.error("[DM] Invalid or newer data format.");
    alert("Ошибка: Неверный или более новый формат файла настроек, который не поддерживается этой версией приложения.");
    return;
  }

  try {
    localStorage.setItem('poker-ranges-folders', JSON.stringify(data.folders || []));
    localStorage.setItem('poker-ranges-actions', JSON.stringify(data.actionButtons || []));
    localStorage.setItem('training-sessions', JSON.stringify(data.trainings || []));
    localStorage.setItem('training-statistics', JSON.stringify(data.statistics || []));
    localStorage.setItem('poker-range-access-statistics', JSON.stringify(data.rangeAccessStats || {})); // Add this
    localStorage.setItem('userCharts', JSON.stringify(data.charts || []));
    localStorage.setItem('poker-editor-settings', JSON.stringify(data.editorSettings || {}));
    localStorage.setItem('poker-data-timestamp', data.timestamp);

    console.log("[DM] Data successfully written to localStorage.");
    console.log(`[DM] Applied charts: ${data.charts.length} charts. Example chart (first 500 chars): ${JSON.stringify(data.charts[0] || {}).substring(0, 500)}`);


    if (reload) {
      alert("Настройки успешно импортированы! Приложение будет перезагружено.");
      setTimeout(() => {
        console.log("[DM] Reloading window...");
        window.location.reload();
      }, 250);
    }
  } catch (e) {
    console.error("[DM] Error applying data to localStorage:", e);
    alert("Ошибка при сохранении данных локально.");
  }
};

/**
 * Merges local and cloud statistics arrays, ensuring uniqueness.
 */
const mergeStatistics = (localStats: SessionStat[], cloudStats: SessionStat[]): SessionStat[] => {
  console.log("[DM] Merging training statistics arrays...");
  const combined = [...(localStats || []), ...(cloudStats || [])];
  const uniqueStats = new Map<number, SessionStat>();

  for (const stat of combined) {
    if (stat && typeof stat.timestamp === 'number') {
      if (!uniqueStats.has(stat.timestamp)) {
        uniqueStats.set(stat.timestamp, stat);
      }
    }
  }
  
  const mergedArray = Array.from(uniqueStats.values());
  console.log(`[DM] Merged training stats result: ${mergedArray.length} unique sessions.`);
  return mergedArray;
};

/**
 * Merges local and cloud range access statistics objects, summing counts.
 */
const mergeRangeAccessStats = (
  localStats: Record<string, number>,
  cloudStats: Record<string, number>
): Record<string, number> => {
  console.log("[DM] Merging range access statistics...");
  const merged = { ...localStats };
  for (const rangeId in cloudStats) {
    if (cloudStats.hasOwnProperty(rangeId)) {
      merged[rangeId] = (merged[rangeId] || 0) + cloudStats[rangeId];
    }
  }
  console.log(`[DM] Merged range access stats result: ${Object.keys(merged).length} unique ranges.`);
  return merged;
};


// --- Supabase Data Management ---

export const syncDataToSupabase = async (showAlert = true) => {
  console.log("[DM] Attempting to sync data to Supabase...");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (showAlert) alert("Вы должны войти в систему для синхронизации данных.");
    console.log("[DM] No user logged in for sync.");
    return;
  }

  const appData = gatherData();
  const { version, timestamp, ...userData } = appData;
  const newTimestamp = new Date().toISOString();

  console.log(`[DM] Preparing to sync ${userData.folders.length} folders, ${userData.actionButtons.length} actions, ${userData.trainings.length} trainings, ${userData.statistics.length} training stats, ${Object.keys(userData.rangeAccessStats).length} range access stats, ${userData.charts.length} charts.`);
  console.log(`[DM] Syncing charts data (first 500 chars): ${JSON.stringify(userData.charts[0] || {}).substring(0, 500)}`);

  const { error } = await supabase
    .from('user_data')
    .upsert({
      user_id: user.id,
      folders: userData.folders,
      action_buttons: userData.actionButtons,
      trainings: userData.trainings,
      statistics: userData.statistics,
      range_access_stats: userData.rangeAccessStats, // Add this
      charts: userData.charts,
      editor_settings: userData.editorSettings,
      updated_at: newTimestamp,
    }, { onConflict: 'user_id' });

  if (error) {
    console.error("[DM] Error syncing data to Supabase:", error);
    if (showAlert) alert("Ошибка синхронизации данных с облаком.");
  } else {
    console.log("[DM] Data successfully synced to Supabase.");
    // Update local timestamp after successful sync
    localStorage.setItem('poker-data-timestamp', newTimestamp);
    if (showAlert) alert("Данные успешно сохранены в облаке!");
  }
};

export const loadDataFromSupabase = async (user: SupabaseUser | null) => {
  console.log("[DM] loadDataFromSupabase called.");
  
  if (!user) {
    console.log("[DM] No user provided, cannot load data. Returning.");
    return;
  }
  console.log(`[DM] User session found, proceeding to fetch user_data for user_id: ${user.id}`);

  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("[DM] Error loading data from Supabase:", error);
      return;
    }

    const cloudUserData = data;

    if (cloudUserData) {
      console.log("[DM] Data received from Supabase:", cloudUserData);
      console.log(`[DM] Cloud charts data (first 500 chars): ${JSON.stringify(cloudUserData.charts[0] || {}).substring(0, 500)}`);

      const localData = gatherData();
      const localTimestamp = localData.timestamp;
      const cloudTimestamp = cloudUserData.updated_at;

      console.log(`[DM] Local timestamp: ${localTimestamp}, Cloud timestamp: ${cloudTimestamp}`);

      if (!localTimestamp || new Date(cloudTimestamp) > new Date(localTimestamp)) {
          console.log("[DM] Cloud data is newer or local data is missing. Prompting user.");
          if (confirm("Найдены данные в облаке. Загрузить их? Это объединит вашу статистику и перезапишет остальные настройки (папки, чарты).")) {
              
              const localStats = localData.statistics;
              const cloudStats = cloudUserData.statistics;
              const cloudStatsArray: SessionStat[] = Array.isArray(cloudStats) ? cloudStats : [];
              const mergedTrainingStats = mergeStatistics(localStats, cloudStatsArray);

              const localRangeStats = localData.rangeAccessStats;
              const cloudRangeStats = cloudUserData.range_access_stats;
              const cloudRangeStatsObject: Record<string, number> = (typeof cloudRangeStats === 'object' && cloudRangeStats !== null && !Array.isArray(cloudRangeStats)) ? cloudRangeStats : {};
              const mergedRangeAccessStats = mergeRangeAccessStats(localRangeStats, cloudRangeStatsObject);

              // Ensure editor_settings is properly typed and defaults are applied if missing from cloud
              const cloudEditorSettings: EditorSettings = {
                matrixBackgroundColor: cloudUserData.editor_settings?.matrixBackgroundColor || { type: 'dark', customColor: '#000000' },
                cellBackgroundColor: cloudUserData.editor_settings?.cellBackgroundColor || { type: 'default', customColor: '#000000' },
                cellBorderRadius: cloudUserData.editor_settings?.cellBorderRadius || 'md',
                cellSpacing: cloudUserData.editor_settings?.cellSpacing || 'md',
                font: {
                  size: cloudUserData.editor_settings?.font?.size || 'm',
                  customSize: cloudUserData.editor_settings?.font?.customSize || '16px',
                  color: cloudUserData.editor_settings?.font?.color || 'auto',
                  weight: cloudUserData.editor_settings?.font?.weight || 'normal',
                  inactiveFontTransparent: cloudUserData.editor_settings?.font?.inactiveFontTransparent ?? false, // Use nullish coalescing for boolean
                },
              };

              const appDataToApply: AppData = {
                version: APP_DATA_VERSION,
                folders: cloudUserData.folders || [],
                actionButtons: cloudUserData.action_buttons || [],
                trainings: cloudUserData.trainings || [],
                statistics: mergedTrainingStats,
                rangeAccessStats: mergedRangeAccessStats, // Add this
                charts: cloudUserData.charts || [],
                editorSettings: cloudEditorSettings, // Use the merged/defaulted editor settings
                timestamp: cloudUserData.updated_at || new Date().toISOString(),
              };
              console.log(`[DM] Applying cloud data: ${appDataToApply.folders.length} folders, ${appDataToApply.actionButtons.length} actions, ${appDataToApply.trainings.length} trainings, ${appDataToApply.statistics.length} training stats, ${Object.keys(appDataToApply.rangeAccessStats).length} range access stats, ${appDataToApply.charts.length} charts.`);
              applyData(appDataToApply);
          } else {
              console.log("[DM] User chose not to load newer cloud data.");
          }
      } else {
          console.log("[DM] Local data is up-to-date or newer. No automatic action taken.");
      }
    } else {
      console.log("[DM] No data found in Supabase for this user. Prompting to sync local data.");
      const localData = gatherData();
      if (localData.folders.length > 0 || localData.charts.length > 0 || localData.statistics.length > 0 || Object.keys(localData.rangeAccessStats).length > 0) {
        if (confirm("В облаке нет данных. Хотите сохранить текущие локальные данные в облако?")) {
            console.log("[DM] User confirmed to sync local data to Supabase.");
            await syncDataToSupabase(false);
            alert("Данные успешно сохранены в облаке!");
        }
      } else {
        console.log("[DM] No cloud data and no significant local data to upload.");
      }
    }
  } catch (e) {
    console.error("[DM] Unhandled error in loadDataFromSupabase:", e);
  } finally {
    console.log("[DM] loadDataFromSupabase function finished execution.");
  }
};

// --- Memory Slot Management ---

/**
 * Fetches all 5 memory slots for the current user.
 * Returns default objects for empty slots.
 */
export const fetchMemorySlots = async (): Promise<MemorySlot[]> => {
  console.log("[DM] Fetching memory slots...");
  const { data: { user } } = await supabase.auth.getUser();
  const defaultSlots: MemorySlot[] = Array.from({ length: 5 }, (_, i) => ({
    slot_index: i,
    name: 'Пустой слот',
    data: null,
  }));

  if (!user) {
    console.log("[DM] No user logged in, returning default slots.");
    return defaultSlots;
  }

  const { data, error } = await supabase
    .from('memory_slots')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error("[DM] Error fetching memory slots:", error);
    return defaultSlots;
  }

  const slotsMap = new Map(data.map(slot => [slot.slot_index, slot]));
  const resultSlots = defaultSlots.map((defaultSlot, i) => {
    return slotsMap.has(i) ? { ...defaultSlot, ...slotsMap.get(i) } : defaultSlot;
  });

  console.log("[DM] Memory slots fetched and merged:", resultSlots);
  return resultSlots;
};

/**
 * Saves data to a specific memory slot for the current user.
 */
export const saveToMemorySlot = async (slotIndex: number, name: string, data: MemorySlotData): Promise<{ success: boolean; error?: any }> => {
  console.log(`[DM] Saving to memory slot ${slotIndex}...`);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error("[DM] Cannot save to memory slot: no user logged in.");
    return { success: false, error: new Error("Пользователь не авторизован.") };
  }

  const { error } = await supabase
    .from('memory_slots')
    .upsert({
      user_id: user.id,
      slot_index: slotIndex,
      name,
      data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,slot_index' });

  if (error) {
    console.error(`[DM] Error saving to memory slot ${slotIndex}:`, error);
    return { success: false, error };
  }

  console.log(`[DM] Successfully saved to memory slot ${slotIndex}.`);
  return { success: true };
};

/**
 * Loads data from a specific memory slot.
 * Returns the data object or null if the slot is empty.
 */
export const loadFromMemorySlot = async (slotIndex: number): Promise<MemorySlotData | null> => {
  console.log(`[DM] Loading from memory slot ${slotIndex}...`);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error("[DM] Cannot load from memory slot: no user logged in.");
    return null;
  }

  const { data, error } = await supabase
    .from('memory_slots')
    .select('data')
    .eq('user_id', user.id)
    .eq('slot_index', slotIndex)
    .single();

  if (error && error.code !== 'PGRST116') { // Ignore "no rows found" error
    console.error(`[DM] Error loading from memory slot ${slotIndex}:`, error);
    return null;
  }

  if (data && data.data) {
    console.log(`[DM] Data loaded from slot ${slotIndex}.`);
    return data.data as MemorySlotData;
  }
  
  console.log(`[DM] No data found in memory slot ${slotIndex}.`);
  return null;
};

/**
 * Renames a specific memory slot for the current user.
 */
export const renameMemorySlot = async (slotIndex: number, newName: string): Promise<{ success: boolean; error?: any }> => {
  console.log(`[DM] Renaming memory slot ${slotIndex} to "${newName}"...`);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error("[DM] Cannot rename memory slot: no user logged in.");
    return { success: false, error: new Error("Пользователь не авторизован.") };
  }

  const { error } = await supabase
    .from('memory_slots')
    .upsert({
      user_id: user.id,
      slot_index: slotIndex,
      name: newName,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,slot_index' });

  if (error) {
    console.error(`[DM] Error renaming memory slot ${slotIndex}:`, error);
    return { success: false, error };
  }

  console.log(`[DM] Successfully renamed memory slot ${slotIndex}.`);
  return { success: true };
};


export const clearLocalData = () => {
  console.log("[DM] Clearing local data...");
  localStorage.removeItem('poker-ranges-folders');
  localStorage.removeItem('poker-ranges-actions');
  localStorage.removeItem('training-sessions');
  localStorage.removeItem('training-statistics');
  localStorage.removeItem('poker-range-access-statistics'); // Add this
  localStorage.removeItem('userCharts');
  localStorage.removeItem('poker-editor-settings');
  localStorage.removeItem('poker-data-timestamp');
  console.log("[DM] Local data cleared. Reloading window...");
  window.location.reload();
};


// --- Platform-Specific File Export Implementations ---

const exportForWeb = (appData: AppData) => {
  console.log("[DM] Exporting data for web:", appData);
  const dataStr = JSON.stringify(appData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `poker-settings-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log("[DM] Web export initiated.");
};

const exportForTauri = async (appData: AppData) => {
  console.log("[DM] Exporting data for Tauri:", appData);
  try {
    const { save } = await import('@tauri-apps/api/dialog');
    const { writeTextFile } = await import('@tauri-apps/api/fs');
    
    const filePath = await save({
      defaultPath: `poker-settings-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (filePath) {
      const dataStr = JSON.stringify(appData, null, 2);
      await writeTextFile(filePath, dataStr);
      alert('Настройки успешно экспортированы!');
      console.log("[DM] Tauri export successful to:", filePath);
    } else {
      console.log("[DM] Tauri export cancelled.");
    }
  } catch (error) {
    console.error('[DM] Failed to export settings via Tauri:', error);
    alert('Ошибка экспорта настроек.');
  }
};

const exportForCapacitor = async (appData: AppData) => {
  console.log("[DM] Exporting data for Capacitor:", appData);
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const permissionStatus = await Filesystem.requestPermissions();
    if (permissionStatus.publicStorage !== 'granted') {
      alert('Для экспорта настроек необходимо разрешение на доступ к хранилищу.');
      console.warn("[DM] Capacitor export: Public storage permission not granted.");
      return;
    }
    const dataStr = JSON.stringify(appData, null, 2);
    const fileName = `poker-settings-backup-${new Date().toISOString()}.json`;
    await Filesystem.writeFile({
      path: fileName,
      data: dataStr,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    alert(`Настройки сохранены в папку "Документы" под именем: ${fileName}`);
    console.log("[DM] Capacitor export successful to:", fileName);
  } catch (error) {
    console.error('[DM] Failed to export settings via Capacitor:', error);
    alert('Ошибка экспорта настроек. Проверьте разрешения приложения.');
  }
};

// --- Platform-Specific File Import Implementations ---

const importForWeb = () => {
  console.log("[DM] Initiating web import...");
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          console.log("[DM] Web import: File parsed, applying data:", data);
          applyData(data);
        } catch (err) {
          console.error("[DM] Error parsing JSON file.", err);
          alert("Ошибка: Не удалось прочитать файл.");
        }
      };
      reader.readAsText(file);
    } else {
      console.log("[DM] Web import: No file selected.");
    }
  };
  input.click();
};

const importForTauri = async () => {
  console.log("[DM] Initiating Tauri import...");
  try {
    const { open } = await import('@tauri-apps/api/dialog');
    const { readTextFile } = await import('@tauri-apps/api/fs');
    const selected = await open({
      multiple: false,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (typeof selected === 'string' && selected) {
      const contents = await readTextFile(selected);
      const data = JSON.parse(contents);
      console.log("[DM] Tauri import: File read and parsed, applying data:", data);
      applyData(data);
    } else {
      console.log("[DM] Tauri import cancelled or no file selected.");
    }
  } catch (error) {
    console.error('[DM] Failed to import settings via Tauri:', error);
    alert('Ошибка импорта настроек.');
  }
};

const importForCapacitor = () => {
  console.log("[DM] Initiating Capacitor import (using web fallback)...");
  importForWeb();
};

// --- Public API for File I/O ---

export const resetRangeAccessStats = async (showAlert = true) => {
  console.log("[DM] Resetting range access statistics...");

  // 1. Clear local storage
  localStorage.setItem('poker-range-access-statistics', JSON.stringify({}));
  console.log("[DM] Local range access statistics cleared.");

  // 2. Clear in Supabase if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    console.log("[DM] User is logged in, clearing range access stats in Supabase...");
    const newTimestamp = new Date().toISOString();
    const { error } = await supabase
      .from('user_data')
      .update({ 
          range_access_stats: {},
          updated_at: newTimestamp 
      })
      .eq('user_id', user.id);

    if (error) {
      console.error("[DM] Error clearing range access stats in Supabase:", error);
      if (showAlert) alert("Ошибка при сбросе статистики в облаке. Локальная статистика сброшена.");
    } else {
      console.log("[DM] Supabase range access stats cleared successfully.");
      localStorage.setItem('poker-data-timestamp', newTimestamp);
      if (showAlert) alert("Статистика обращений к ренджам успешно сброшена.");
    }
  } else {
      if (showAlert) alert("Статистика обращений к ренджам успешно сброшена.");
  }
};

export const exportDataToFile = () => {
  console.log("[DM] Exporting data to file...");
  const appData = gatherData();
  if (isTauri()) {
    exportForTauri(appData);
  } else if (isCapacitor()) {
    exportForCapacitor(appData);
  } else {
    exportForWeb(appData);
  }
};

export const importDataFromFile = () => {
  console.log("[DM] Importing data from file...");
  if (isTauri()) {
    importForTauri();
  } else if (isCapacitor()) {
    importForCapacitor();
  } else {
    importForWeb();
  }
};

export const downloadCloudBackup = async () => {
  console.log("[DM] Attempting to download cloud backup...");
  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  if (!user) {
    alert("Вы должны войти в систему, чтобы скачать бэкап из облака.");
    console.log("[DM] No user logged in for cloud backup download.");
    return;
  }

  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      console.log("[DM] Cloud backup data received:", data);
      const appData: AppData = {
        version: APP_DATA_VERSION,
        folders: data.folders || [],
        actionButtons: data.action_buttons || [],
        trainings: data.trainings || [],
        statistics: data.statistics || [],
        rangeAccessStats: data.range_access_stats || {}, // Add this
        charts: data.charts || [],
        editorSettings: data.editor_settings || {},
        timestamp: data.updated_at || new Date().toISOString(),
      };
      exportForWeb(appData);
      console.log("[DM] Cloud backup exported via web.");
    } else {
      alert("В облаке нет данных для скачивания.");
      console.log("[DM] No cloud backup data found.");
    }
  } catch (error) {
    console.error("[DM] Error downloading cloud backup:", error);
    alert("Ошибка загрузки бэкапа из облака.");
  }
};
