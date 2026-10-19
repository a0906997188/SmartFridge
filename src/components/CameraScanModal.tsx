import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, RefreshCw, AlertTriangle, Sparkles, Plus, Image as ImageIcon, ChevronRight, Info } from 'lucide-react';
import { Ingredient } from '../types/fridge';
import { postApi } from '../lib/api';
import { DEMO_FRIDGE_IMAGE, getFoodEmoji, getLocationLabel } from '../data/initialData';

interface CameraScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmIngredients: (items: Ingredient[]) => void;
}

export const CameraScanModal: React.FC<CameraScanModalProps> = ({
  isOpen,
  onClose,
  onConfirmIngredients,
}) => {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedItems, setDetectedItems] = useState<Ingredient[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFallbackSource, setIsFallbackSource] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setPhotoDataUrl(null);
      setDetectedItems([]);
      setSelectedItemIndex(null);
      setErrorMessage(null);
      setIsFallbackSource(false);
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setErrorMessage(null);
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Unable to access camera:', err);
      setIsCameraActive(false);
      setErrorMessage('無法存取相機裝置，請使用相簿上傳或示範相片。');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      stopCamera();
      setPhotoDataUrl(dataUrl);
      analyzePhoto(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('相片大小請小於 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPhotoDataUrl(result);
      analyzePhoto(result);
    };
    reader.readAsDataURL(file);
  };

  const useDemoPhoto = () => {
    setPhotoDataUrl(DEMO_FRIDGE_IMAGE);
    analyzePhoto(DEMO_FRIDGE_IMAGE);
  };

  const analyzePhoto = async (dataUrl: string) => {
    setIsScanning(true);
    setErrorMessage(null);

    try {
      const data = await postApi('/api/identify-ingredients', {
        imageBase64: dataUrl,
        mimeType: dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
      });

      // Check if fallback source
      if (data.source === 'fallback') {
        setIsFallbackSource(true);
      } else {
        setIsFallbackSource(false);
      }

      if (data.error || !data.ingredients || !Array.isArray(data.ingredients)) {
        setErrorMessage(data.message || '辨識失敗，請檢查網路或重試。');
        return;
      }

      // Task 1: No fake boxes + confidence missing treated as low confidence (wait)
      const mapped: Ingredient[] = data.ingredients.map((item: any, idx: number) => {
        const hasConfidence = typeof item.confidence === 'number';
        const confidenceVal = hasConfidence ? item.confidence : 0.5;
        // Task 1.2: 缺值視為低信心，狀態設為 wait（待確認）
        const isOk = hasConfidence && confidenceVal >= 0.75 && item.status !== 'wait';

        // Task 1.1: 沒有 bbox 的項目不畫框，設為 undefined
        const validBbox: [number, number, number, number] | undefined =
          Array.isArray(item.bbox) && item.bbox.length === 4
            ? [item.bbox[0], item.bbox[1], item.bbox[2], item.bbox[3]]
            : undefined;

        return {
          id: `scan-${Date.now()}-${idx}`,
          name: item.name || '未知食材',
          quantity: item.quantity !== undefined ? item.quantity : 1,
          unit: item.unit || '個',
          category: item.category || 'veg',
          location: item.location || 'shelf_mid',
          status: isOk ? 'ok' : 'wait',
          confidence: confidenceVal,
          freshnessTip: item.freshnessTip || '請於有效期限內食用',
          expiryDays: 7,
          bbox: validBbox,
          addedAt: '剛辨識',
          source: 'photo',
        };
      });

      setDetectedItems(mapped);
    } catch (err: any) {
      console.error('Scan request failed:', err);
      // Task 2.3: 錯誤提示與重試按鈕，且不得清空已確認的食材清單
      setErrorMessage(err?.message || '辨識連線發生錯誤，請點擊重試。');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRetry = () => {
    if (photoDataUrl) {
      analyzePhoto(photoDataUrl);
    }
  };

  const handleUpdateItem = (index: number, updates: Partial<Ingredient>) => {
    setDetectedItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, ...updates } : it))
    );
  };

  const handleRemoveItem = (index: number) => {
    setDetectedItems((prev) => prev.filter((_, idx) => idx !== index));
    if (selectedItemIndex === index) setSelectedItemIndex(null);
  };

  const handleAddManualItem = () => {
    const newItem: Ingredient = {
      id: `manual-scan-${Date.now()}`,
      name: '蒜頭',
      quantity: 1,
      unit: '小把',
      category: 'condiment',
      location: 'pantry',
      status: 'ok',
      confidence: 1.0,
      freshnessTip: '手動補充調味配料',
      expiryDays: 30,
      addedAt: '剛剛',
      source: 'manual',
    };
    setDetectedItems((prev) => [...prev, newItem]);
    setSelectedItemIndex(detectedItems.length);
  };

  const handleConfirm = () => {
    if (detectedItems.length === 0) return;
    onConfirmIngredients(detectedItems);
    onClose();
  };

  if (!isOpen) return null;

  // Count items with and without bounding box
  const itemsWithBox = detectedItems.filter((i) => i.bbox);
  const itemsWithoutBox = detectedItems.filter((i) => !i.bbox);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8E5] bg-[#FAF8F3]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#2E9E6A]/10 text-[#2E9E6A] flex items-center justify-center min-w-[40px] min-h-[40px]">
              <Camera className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#2B2B2B]">拍照盤點冰箱</h2>
              <p className="text-sm text-[#666666]">AI 視覺辨識食材與數量框選</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="關閉拍照盤點"
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Task 1.3: Fallback Banner */}
          {isFallbackSource && (
            <div className="bg-[#FFF1E6] border border-[#F2B98A] text-[#9A4D12] p-3.5 rounded-2xl flex items-center gap-2.5 text-sm font-semibold">
              <Info className="w-5 h-5 text-[#E8833A] shrink-0" />
              <span>示範資料，未連接 AI（目前為安全展示模式）</span>
            </div>
          )}

          {/* Task 2.3: Error & Retry Banner */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm min-h-[44px] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
                <span>重試</span>
              </button>
            </div>
          )}

          {/* Phase 1: Camera capture / Choose Photo if no photo yet */}
          {!photoDataUrl && !isCameraActive && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-[#CFD8D3] rounded-3xl p-6 text-center bg-[#FAF8F3]/60 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-[#E3F4EC] text-[#2E9E6A] flex items-center justify-center">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2B2B2B]">開啟鏡頭拍攝或上傳相片</h3>
                  <p className="text-sm text-gray-600 mt-1 max-w-sm">
                    拍攝冰箱內部層架，AI 自動識別雞蛋、蔬菜、肉品等各項庫存與數量。
                  </p>
                </div>

                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <button
                    onClick={startCamera}
                    className="py-3 px-4 min-h-[44px] bg-[#2E9E6A] text-white font-bold text-base rounded-xl hover:bg-[#258559] flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Camera className="w-5 h-5" />
                    <span>即時相機拍照</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-3 px-4 min-h-[44px] bg-white text-[#2B2B2B] font-bold text-base rounded-xl border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Upload className="w-5 h-5" />
                    <span>相簿圖片上傳</span>
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Fast Demo Option */}
              <div className="bg-[#F1F7F4] border border-[#BFE0CF] rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-6 h-6 text-[#2E9E6A] shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-[#1F7A50]">一鍵載入示範冰箱相片體驗</h4>
                    <p className="text-sm text-[#1F7A50]/80">內含雞蛋、高麗菜、牛奶、板豆腐、香菇與肉品</p>
                  </div>
                </div>
                <button
                  onClick={useDemoPhoto}
                  className="px-4 py-2 min-h-[44px] bg-[#2E9E6A] text-white text-sm font-bold rounded-xl shadow-xs hover:bg-[#258559] cursor-pointer whitespace-nowrap"
                >
                  載入測試
                </button>
              </div>
            </div>
          )}

          {/* Active Camera Viewfinder */}
          {isCameraActive && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder crosshairs */}
              <div className="absolute inset-8 border-2 border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-white/90 text-sm bg-black/60 px-3.5 py-1.5 rounded-full backdrop-blur-xs font-medium">
                  請將冰箱內部對準框線
                </span>
              </div>

              {/* Shutter Button */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                <button
                  onClick={stopCamera}
                  className="px-4 py-2.5 min-h-[44px] bg-black/60 text-white text-sm font-bold rounded-full hover:bg-black/80"
                >
                  取消
                </button>
                <button
                  onClick={capturePhoto}
                  aria-label="按下快門拍照"
                  className="w-16 h-16 rounded-full border-4 border-white bg-[#2E9E6A] flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
                  title="拍照"
                >
                  <Camera className="w-7 h-7 text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Phase 2: Photo Preview + Scanning or Detection Results */}
          {photoDataUrl && (
            <div className="space-y-4">
              {/* Photo Display with AI Bounding Boxes (Only drawn if bbox exists) */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#DCE4E0] bg-[#FAF8F3] aspect-4/3 max-h-[300px]">
                <img
                  src={photoDataUrl}
                  alt="冰箱相片"
                  className="w-full h-full object-contain bg-slate-900/5"
                />

                {/* Scanning Animation Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#2E9E6A] mb-2" />
                    <p className="font-bold text-base">正在由 AI 辨識食材中...</p>
                    <p className="text-sm text-white/90 mt-1">分析冷藏層架、品項與預估數量</p>
                    <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#2E9E6A] to-transparent animate-pulse" />
                  </div>
                )}

                {/* Interactive Bounding Boxes Overlay (Task 1.1: Only items with real bbox) */}
                {!isScanning &&
                  detectedItems.map((item, idx) => {
                    if (!item.bbox) return null;
                    const [ymin, xmin, ymax, xmax] = item.bbox;
                    const top = `${ymin / 10}%`;
                    const left = `${xmin / 10}%`;
                    const width = `${(xmax - xmin) / 10}%`;
                    const height = `${(ymax - ymin) / 10}%`;
                    const isSelected = selectedItemIndex === idx;
                    const isPending = item.status === 'wait';

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemIndex(idx)}
                        style={{ top, left, width, height }}
                        className={`absolute border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-yellow-400 bg-yellow-400/20 ring-2 ring-yellow-400 z-20'
                            : isPending
                            ? 'border-[#E8833A] border-dashed bg-[#E8833A]/10 hover:bg-[#E8833A]/20'
                            : 'border-[#2E9E6A] bg-[#2E9E6A]/10 hover:bg-[#2E9E6A]/20'
                        }`}
                        title={`${item.name} (${item.quantity} ${item.unit})`}
                      >
                        <span
                          className={`absolute -top-3.5 left-1 text-xs font-bold px-2 py-0.5 rounded shadow-xs whitespace-nowrap text-white ${
                            isSelected
                              ? 'bg-yellow-500'
                              : isPending
                              ? 'bg-[#E8833A]'
                              : 'bg-[#2E9E6A]'
                          }`}
                        >
                          {getFoodEmoji(item.name, item.category)} {item.name}
                        </span>
                      </div>
                    );
                  })}
              </div>

              {/* Photo Action Bar */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{itemsWithBox.length > 0 ? '點擊相片方框或下方清單微調' : '部分食材未有精確框線，可於下方清單確認'}</span>
                <button
                  onClick={() => {
                    setPhotoDataUrl(null);
                    setDetectedItems([]);
                    setSelectedItemIndex(null);
                    setIsFallbackSource(false);
                  }}
                  className="text-[#2E9E6A] font-bold hover:underline cursor-pointer flex items-center gap-1 min-h-[44px]"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>重新拍攝</span>
                </button>
              </div>

              {/* Identified Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#666666] tracking-wide">
                    辨識結果清單 ({detectedItems.length} 項)
                  </h4>
                  <button
                    onClick={handleAddManualItem}
                    className="text-sm font-bold text-[#2E9E6A] hover:underline flex items-center gap-1 cursor-pointer min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>手動補錄食材</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {detectedItems.map((item, idx) => {
                    const isSelected = selectedItemIndex === idx;
                    const isPending = item.status === 'wait';

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          isSelected
                            ? 'border-[#2E9E6A] bg-[#F1F9F5]'
                            : 'border-[#E2E8E5] bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div
                            onClick={() => setSelectedItemIndex(isSelected ? null : idx)}
                            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 min-h-[44px]"
                          >
                            <span className="text-2xl shrink-0">{getFoodEmoji(item.name, item.category)}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-base text-[#2B2B2B] truncate">{item.name}</span>
                                <span className="text-sm font-semibold text-[#555]">
                                  {item.quantity} {item.unit}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {getLocationLabel(item.location)}
                                {!item.bbox && ' · (未標框)'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isPending ? (
                              <button
                                onClick={() => handleUpdateItem(idx, { status: 'ok' })}
                                className="text-sm font-bold px-3 py-1.5 rounded-xl bg-[#FFF1E6] text-[#9A4D12] border border-[#F2B98A] cursor-pointer hover:bg-[#ffe5d1] min-h-[44px] flex items-center"
                                title="點擊轉為正常庫存"
                              >
                                待確認 (點擊確認)
                              </button>
                            ) : (
                              <span className="text-sm font-bold px-2.5 py-1 rounded-xl bg-[#E3F4EC] text-[#1F7A50]">
                                正常
                              </span>
                            )}

                            <button
                              onClick={() => handleRemoveItem(idx)}
                              aria-label={`移除 ${item.name}`}
                              className="p-2 text-gray-400 hover:text-red-500 cursor-pointer rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                              title="移除"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Edit Drawer if selected */}
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500 block mb-1 font-medium">名稱</span>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateItem(idx, { name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-xl font-bold text-base"
                              />
                            </div>
                            <div>
                              <span className="text-gray-500 block mb-1 font-medium">數量與單位</span>
                              <div className="flex gap-1.5">
                                <input
                                  type="number"
                                  step="any"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 0 })
                                  }
                                  className="w-20 px-2 py-2 border rounded-xl font-bold text-center text-base"
                                />
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => handleUpdateItem(idx, { unit: e.target.value })}
                                  className="w-full px-2 py-2 border rounded-xl text-base"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#EAEFEA] bg-[#FAF8F3] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-3 min-h-[44px] border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-100 text-base cursor-pointer"
          >
            關閉
          </button>

          {photoDataUrl && (
            <button
              onClick={handleConfirm}
              disabled={detectedItems.length === 0 || isScanning}
              className={`px-6 py-3 min-h-[44px] rounded-xl font-extrabold text-white text-base flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                detectedItems.length === 0 || isScanning
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-[#2E9E6A] hover:bg-[#258257]'
              }`}
            >
              <Check className="w-5 h-5 stroke-[2.4]" />
              <span>將 {detectedItems.length} 項食材加入冰箱</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
