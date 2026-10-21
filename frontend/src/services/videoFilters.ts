// ffmpeg -vf filter chains for the editor's aspect-ratio / crop tools.
// The ClipFlow extension applies this chain with ffmpeg.wasm when exporting.

/**
 * Computes FFmpeg video filter for target aspect ratio, fit/pad mode, crop position, and quality scaling.
 */
export function buildVideoFilter(
  aspectRatio: string = '16:9',
  fitMode: 'crop' | 'pad' = 'pad',
  cropPosition: 'center' | 'left' | 'right' = 'center',
  cropBox?: { x: number; y: number; width: number; height: number }
): string | null {
  const filters: string[] = [];

  const hasValidCropBox = !!(cropBox && cropBox.width > 0 && cropBox.height > 0);
  const isCustom = aspectRatio === 'custom';
  const isSubFrame = hasValidCropBox && (cropBox.width < 0.999 || cropBox.height < 0.999 || cropBox.x > 0.001 || cropBox.y > 0.001);

  // 1. Custom mode or Interactive Framing Crop Box
  if (hasValidCropBox && (isCustom || (fitMode === 'crop' && isSubFrame))) {
    if (cropBox.width <= 1.0 && cropBox.height <= 1.0) {
      const w = Math.min(1, Math.max(0.05, cropBox.width)).toFixed(4);
      const h = Math.min(1, Math.max(0.05, cropBox.height)).toFixed(4);
      const x = Math.min(1, Math.max(0, cropBox.x)).toFixed(4);
      const y = Math.min(1, Math.max(0, cropBox.y)).toFixed(4);
      filters.push(`crop=trunc(iw*${w}/2)*2:trunc(ih*${h}/2)*2:trunc(iw*${x}/2)*2:trunc(ih*${y}/2)*2`);
    } else {
      const w = Math.max(2, Math.round(cropBox.width / 2) * 2);
      const h = Math.max(2, Math.round(cropBox.height / 2) * 2);
      const x = Math.max(0, Math.round(cropBox.x));
      const y = Math.max(0, Math.round(cropBox.y));
      filters.push(`crop=${w}:${h}:${x}:${y}`);
    }
  } else if (isCustom) {
    // Custom aspect ratio fallback if no cropBox coordinates provided
    filters.push('crop=min(iw\\,ih):min(iw\\,ih):(iw-min(iw\\,ih))/2:(ih-min(iw\\,ih))/2');
  }
  // 2. Aspect Ratio Presets
  else if (aspectRatio && aspectRatio !== '16:9' && aspectRatio !== 'original') {
    if (aspectRatio === '9:16') {
      if (fitMode === 'crop') {
        const xOffset = cropPosition === 'left' ? '0' : cropPosition === 'right' ? '(iw-out_w)' : '(iw-out_w)/2';
        filters.push(`crop=trunc(min(iw\\,ih*9/16)/2)*2:trunc(min(ih\\,iw*16/9)/2)*2:${xOffset}:(ih-out_h)/2`);
      } else {
        // Fit mode: pad to exact 9:16 aspect ratio with top/bottom black letterboxing
        filters.push(`pad=trunc(max(iw\\,ih*9/16)/2)*2:trunc(max(ih\\,iw*16/9)/2)*2:(ow-iw)/2:(oh-ih)/2:black`);
      }
    } else if (aspectRatio === '1:1') {
      if (fitMode === 'crop') {
        const xOffset = cropPosition === 'left' ? '0' : cropPosition === 'right' ? '(iw-out_w)' : '(iw-out_w)/2';
        filters.push(`crop=trunc(min(iw\\,ih)/2)*2:trunc(min(iw\\,ih)/2)*2:${xOffset}:(ih-out_h)/2`);
      } else {
        filters.push(`pad=trunc(max(iw\\,ih)/2)*2:trunc(max(iw\\,ih)/2)*2:(ow-iw)/2:(oh-ih)/2:black`);
      }
    } else if (aspectRatio === '4:5') {
      if (fitMode === 'crop') {
        const xOffset = cropPosition === 'left' ? '0' : cropPosition === 'right' ? '(iw-out_w)' : '(iw-out_w)/2';
        filters.push(`crop=trunc(min(iw\\,ih*4/5)/2)*2:trunc(min(ih\\,iw*5/4)/2)*2:${xOffset}:(ih-out_h)/2`);
      } else {
        filters.push(`pad=trunc(max(iw\\,ih*4/5)/2)*2:trunc(max(ih\\,iw*5/4)/2)*2:(ow-iw)/2:(oh-ih)/2:black`);
      }
    }
  }

  // Note: Quality is determined 100% directly from the stream downloaded from the CDN.
  // FFmpeg ONLY handles framing and cropping. Never scale/downsample video in FFmpeg.
  return filters.length > 0 ? filters.join(',') : null;
}
