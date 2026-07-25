import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

export default function AddLocationModal({ position, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [imageDescription, setImageDescription] = useState('');
  const [exifData, setExifData] = useState({});
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (position) {
      setReverseGeocoding(true);
      api.get('/search/reverse', { params: { lat: position[0], lon: position[1] } })
        .then((res) => {
          setAddress(res.data.display_name || '');
        })
        .catch(() => {})
        .finally(() => setReverseGeocoding(false));
    }
  }, [position]);

  const MAX_FILE_SIZE_MB = 10;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Please choose an image under ${MAX_FILE_SIZE_MB} MB.`);
      setFile(null);
      setPreview(null);
      return;
    }
    setError('');

    setFile(selected);
    setPreview(URL.createObjectURL(selected));

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const exif = {
          width: img.naturalWidth,
          height: img.naturalHeight,
        };

        // Try reading EXIF with basic approach
        const view = new DataView(event.target.result);
        if (view.getUint16(0, false) !== 0xFFD8) {
          setExifData(exif);
          return;
        }

        let offset = 2;
        while (offset < view.byteLength - 1) {
          if (view.getUint8(offset) !== 0xFF) break;
          const marker = view.getUint8(offset + 1);
          if (marker === 0xE1) {
            const length = view.getUint16(offset + 2, false);
            parseEXIF(view, offset + 4, offset + 2 + length, exif);
            break;
          }
          offset += 2 + view.getUint16(offset + 2, false);
        }

        setExifData(exif);
      };
      img.src = event.target.result;
    };
    reader.readAsArrayBuffer(selected);
  };

  const parseEXIF = (view, start, end, exif) => {
    try {
      let i = start;
      if (view.getUint16(i, false) !== 0x4578) return;
      i += 6;

      const tiffOffset = i;
      const bigEndian = view.getUint16(i, false) !== 0x4949;
      i += 2;

      const ifdCount = view.getUint16(i, false, bigEndian);
      i += 2;

      for (let j = 0; j < ifdCount; j++) {
        const tag = view.getUint16(i, false, bigEndian);
        const type = view.getUint16(i + 2, false, bigEndian);
        const count = view.getUint32(i + 4, false, bigEndian);
        const valueOffset = i + 8;

        if (tag === 0x0112) {
          // Orientation - skip
        } else if (tag === 0x829A) {
          // ExposureTime
          const num = view.getUint32(valueOffset, false, bigEndian);
          const den = view.getUint32(valueOffset + 4, false, bigEndian);
          if (den) exif.shutter_speed = `1/${Math.round(den / num)}s`;
        } else if (tag === 0x829D) {
          // FNumber
          const num = view.getUint32(valueOffset, false, bigEndian);
          const den = view.getUint32(valueOffset + 4, false, bigEndian);
          if (den) exif.aperture = `f/${(num / den).toFixed(1)}`;
        } else if (tag === 0x8827) {
          // ISOSpeedRatings
          exif.iso = view.getUint16(valueOffset, false, bigEndian);
        } else if (tag === 0x920A) {
          // FocalLength
          const num = view.getUint32(valueOffset, false, bigEndian);
          const den = view.getUint32(valueOffset + 4, false, bigEndian);
          if (den) exif.focal_length = `${(num / den).toFixed(1)}mm`;
        } else if (tag === 0x010F) {
          // Make
          exif.camera_make = readASCII(view, valueOffset, Math.min(count, 30));
        } else if (tag === 0x0110) {
          // Model
          exif.camera_model = readASCII(view, valueOffset, Math.min(count, 30));
        } else if (tag === 0x9003) {
          // DateTimeOriginal
          const dt = readASCII(view, valueOffset, Math.min(count, 20));
          if (dt) {
            exif.taken_at = dt;
            const parts = dt.split(' ');
            if (parts.length === 2) {
              setManualDate(parts[0].replace(/:/g, '-'));
              setManualTime(parts[1]);
            }
          }
        }

        i += 12;
      }
    } catch (e) {
      // EXIF parsing failed silently
    }
  };

  const readASCII = (view, offset, length) => {
    let str = '';
    for (let i = 0; i < length; i++) {
      const c = view.getUint8(offset + i);
      if (c === 0) break;
      str += String.fromCharCode(c);
    }
    return str;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('عنوان الزامی است');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('latitude', position[0]);
      formData.append('longitude', position[1]);
      if (description) formData.append('description', description);
      if (address) formData.append('address', address);
      if (imageDescription) formData.append('image_description', imageDescription);

      if (manualDate && manualTime) {
        formData.append('image_taken_at', `${manualDate}T${manualTime}`);
      } else if (exifData.taken_at) {
        formData.append('image_taken_at', exifData.taken_at);
      }

      if (exifData.camera_make) formData.append('image_camera_make', exifData.camera_make);
      if (exifData.camera_model) formData.append('image_camera_model', exifData.camera_model);
      if (exifData.iso) formData.append('image_iso', exifData.iso);

      if (file) {
        formData.append('file', file);
      }

      await api.post('/locations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onCreated();
    } catch (err) {
      const msg = err.response?.data?.detail;
      if (err.response?.status === 413 || (typeof msg === 'string' && msg.toLowerCase().includes('too large'))) {
      setError(`حجم فایل بیشتر از حد مجاز است. لطفاً تصویری زیر ${MAX_FILE_SIZE_MB} مگابایت انتخاب کنید.`);
      } else {
        setError(msg || 'ایجاد مکان ناموفق بود');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">افزودن مکان جدید</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Coordinates */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">مختصات انتخاب‌شده</p>
            <p className="text-sm font-mono">
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </p>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">آدرس</label>
            {reverseGeocoding ? (
              <div className="text-sm text-gray-400">در حال جستجوی آدرس...</div>
            ) : (
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="خودکار از مختصات"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان مکان <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً پل پارک غروب"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="چرا این مکان برای عکاسی پرتره عالی است؟"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عکس</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              {preview ? (
                <img src={preview} alt="پیش‌نمایش" className="max-h-40 mx-auto rounded-lg" />
              ) : (
                <div>
                  <svg className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">برای آپلود عکس کلیک کنید</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* EXIF Data Display */}
          {file && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-gray-700">اطلاعات عکس</p>
              {exifData.camera_make && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">دوربین</span>
                  <span>{exifData.camera_make} {exifData.camera_model}</span>
                </div>
              )}
              {exifData.taken_at && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">تاریخ عکاسی</span>
                  <span>{exifData.taken_at}</span>
                </div>
              )}
              {exifData.iso && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">ISO</span>
                  <span>{exifData.iso}</span>
                </div>
              )}
              {exifData.aperture && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">دیافراگم</span>
                  <span>{exifData.aperture}</span>
                </div>
              )}
              {exifData.shutter_speed && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">سرعت شاتر</span>
                  <span>{exifData.shutter_speed}</span>
                </div>
              )}
              {exifData.focal_length && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">فاصله کانونی</span>
                  <span>{exifData.focal_length}</span>
                </div>
              )}
              {exifData.width && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">رزولوشن</span>
                  <span>{exifData.width} x {exifData.height}</span>
                </div>
              )}
              {!exifData.camera_make && !exifData.taken_at && !exifData.iso && (
                <p className="text-xs text-gray-400">اطلاعات EXIF در عکس یافت نشد</p>
              )}
            </div>
          )}

          {/* Manual Date/Time (shown if no EXIF date or to override) */}
          {file && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">تاریخ عکاسی</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">زمان عکاسی</label>
                <input
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          )}

          {/* Image Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات عکس</label>
            <textarea
              value={imageDescription}
              onChange={(e) => setImageDescription(e.target.value)}
              placeholder="این عکس را توصیف کن..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'در حال ذخیره...' : 'ذخیره مکان'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
