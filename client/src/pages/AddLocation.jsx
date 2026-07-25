import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import MapPicker from '../components/MapPicker';
import { PROVINCES, getCitiesForProvince } from '../data/iran';

export default function AddLocation() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [imageDescription, setImageDescription] = useState('');
  const [exifData, setExifData] = useState({});
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const fileInputRef = useRef(null);
  const imgRef = useRef(null);

  const cities = getCitiesForProvince(province);

  useEffect(() => {
    if (province && !cities.includes(city)) {
      setCity('');
    }
  }, [province]);

  const getMyLocation = () => {
    if (!navigator.geolocation) {
      setError('موقعیت‌یاب توسط مرورگر شما پشتیبانی نمی‌شود');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGettingLocation(false);
        setGpsError('');
        reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        if (!latitude && !longitude) {
          setGpsError('دریافت GPS امکان‌پذیر نبود. روی نقشه پین بگذارید.');
        }
        setGettingLocation(false);
      }
    );
  };

  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await api.get('/search/reverse', { params: { lat, lon } });
      const data = res.data;
      if (data.display_name) setAddress(data.display_name);
    } catch (e) {}
  };

  const MAX_FILE_SIZE_MB = 10; // Must match backend MAX_UPLOAD_SIZE_MB

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    // Pre-check file size
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`حجم فایل بیشتر از حد مجاز است. لطفاً تصویری زیر ${MAX_FILE_SIZE_MB} مگابایت انتخاب کنید.`);
      setFile(null);
      setPreview(null);
      return;
    }
    setError(''); // clear previous size error

    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreview(url);

    // Load image to get dimensions
    const img = new Image();
    img.onload = () => {
      const exif = { width: img.naturalWidth, height: img.naturalHeight };
      setExifData(exif);
    };
    img.src = url;

    // Parse EXIF separately using ArrayBuffer
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const view = new DataView(event.target.result);
        if (view.getUint16(0, false) !== 0xFFD8) return;
        let offset = 2;
        while (offset < view.byteLength - 1) {
          if (view.getUint8(offset) !== 0xFF) break;
          const marker = view.getUint8(offset + 1);
          if (marker === 0xE1) {
            const length = view.getUint16(offset + 2, false);
            const exifResult = parseEXIF(view, offset + 4, offset + 2 + length);
            setExifData(prev => {
              const merged = { ...prev, ...exifResult };
              if (exifResult.latitude != null) setLatitude(exifResult.latitude.toFixed(6));
              if (exifResult.longitude != null) setLongitude(exifResult.longitude.toFixed(6));
              if (exifResult.taken_at) {
                const parts = exifResult.taken_at.split(' ');
                if (parts.length === 2) {
                  setManualDate(parts[0].replace(/:/g, '-'));
                  setManualTime(parts[1]);
                }
              }
              return merged;
            });
            break;
          }
          offset += 2 + view.getUint16(offset + 2, false);
        }
      } catch (err) {}
    };
    reader.readAsArrayBuffer(selected);
  };

  const readRational = (view, offset, isBigEndian) => {
    const num = view.getUint32(offset, !isBigEndian);
    const den = view.getUint32(offset + 4, !isBigEndian);
    return den ? num / den : 0;
  };

  const parseGPS = (view, gpsOffset, isBigEndian) => {
    try {
      if (view.getUint16(gpsOffset, false) !== 0x4749) return {};
      let j = gpsOffset + 2;
      const count = view.getUint16(j, !isBigEndian);
      j += 2;
      const tags = {};
      for (let k = 0; k < count; k++) {
        const tag = view.getUint16(j, !isBigEndian);
        const valOff = j + 8;
        tags[tag] = valOff;
        j += 12;
      }

      let lat = null, lon = null;

      if (tags[0x0002] && tags[0x0001]) {
        const refOff = tags[0x0001];
        const ref = String.fromCharCode(view.getUint8(Array.isArray(refOff) ? refOff[0] : refOff));
        const d = readRational(view, tags[0x0002], isBigEndian);
        const m = readRational(view, tags[0x0002] + 8, isBigEndian);
        const s = readRational(view, tags[0x0002] + 16, isBigEndian);
        lat = d + m / 60 + s / 3600;
        if (ref === 'S') lat = -lat;
      }

      if (tags[0x0004] && tags[0x0003]) {
        const ref = String.fromCharCode(view.getUint8(tags[0x0003]));
        const d = readRational(view, tags[0x0004], isBigEndian);
        const m = readRational(view, tags[0x0004] + 8, isBigEndian);
        const s = readRational(view, tags[0x0004] + 16, isBigEndian);
        lon = d + m / 60 + s / 3600;
        if (ref === 'W') lon = -lon;
      }

      return { lat, lon };
    } catch (e) {
      return {};
    }
  };

  const parseEXIF = (view, start, end) => {
    try {
      let i = start;
      if (view.getUint16(i, false) !== 0x4578) return {};
      i += 6;
      const isBigEndian = view.getUint16(i, false) !== 0x4949;
      i += 2;
      const ifdCount = view.getUint16(i, !isBigEndian);
      i += 2;
      let gpsIfdOffset = 0;
      const exif = {};
      for (let j = 0; j < ifdCount; j++) {
        const tag = view.getUint16(i, !isBigEndian);
        const count = view.getUint32(i + 4, !isBigEndian);
        const valueOffset = i + 8;
        if (tag === 0x829A) {
          const num = view.getUint32(valueOffset, !isBigEndian);
          const den = view.getUint32(valueOffset + 4, !isBigEndian);
          if (den) exif.shutter_speed = `1/${Math.round(den / num)}s`;
        } else if (tag === 0x829D) {
          const num = view.getUint32(valueOffset, !isBigEndian);
          const den = view.getUint32(valueOffset + 4, !isBigEndian);
          if (den) exif.aperture = `f/${(num / den).toFixed(1)}`;
        } else if (tag === 0x8827) {
          exif.iso = view.getUint16(valueOffset, !isBigEndian);
        } else if (tag === 0x920A) {
          const num = view.getUint32(valueOffset, !isBigEndian);
          const den = view.getUint32(valueOffset + 4, !isBigEndian);
          if (den) exif.focal_length = `${(num / den).toFixed(1)}mm`;
        } else if (tag === 0x010F) {
          exif.camera_make = readASCII(view, valueOffset, Math.min(count, 30));
        } else if (tag === 0x0110) {
          exif.camera_model = readASCII(view, valueOffset, Math.min(count, 30));
        } else if (tag === 0x9003) {
          const dt = readASCII(view, valueOffset, Math.min(count, 20));
          if (dt) exif.taken_at = dt;
        } else if (tag === 0x8825) {
          gpsIfdOffset = view.getUint32(valueOffset, !isBigEndian);
        }
        i += 12;
      }

      if (gpsIfdOffset) {
        const gps = parseGPS(view, gpsIfdOffset, isBigEndian);
        if (gps.lat != null) exif.latitude = gps.lat;
        if (gps.lon != null) exif.longitude = gps.lon;
      }
      return exif;
    } catch (e) {
      return {};
    }
  };

  const readASCII = (view, offset, length) => {
    let str = '';
    for (let k = 0; k < length; k++) {
      const c = view.getUint8(offset + k);
      if (c === 0) break;
      str += String.fromCharCode(c);
    }
    return str;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {       setError('عنوان الزامی است'); return; }
    if (!latitude || !longitude) { setError('لطفاً روی نقشه یک مکان انتخاب کنید'); return; }
    if (!province) { setError('لطفاً استان را انتخاب کنید'); return; }
    if (!file) { setError('لطفاً یک عکس آپلود کنید'); return; }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('latitude', parseFloat(latitude));
      formData.append('longitude', parseFloat(longitude));
      if (description) formData.append('description', description);
      if (province) formData.append('province', province);
      if (city) formData.append('city', city);
      if (neighborhood) formData.append('neighborhood', neighborhood);
      if (address) formData.append('address', address);
      if (imageDescription) formData.append('image_description', imageDescription);
      if (manualDate && manualTime) formData.append('image_taken_at', `${manualDate}T${manualTime}`);
      else if (exifData.taken_at) formData.append('image_taken_at', exifData.taken_at);
      if (exifData.camera_make) formData.append('image_camera_make', exifData.camera_make);
      if (exifData.camera_model) formData.append('image_camera_model', exifData.camera_model);
      if (exifData.iso) formData.append('image_iso', exifData.iso);
      formData.append('file', file);

      await api.post('/locations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(true);
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

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🎉</p>
          <h2 className="text-xl font-bold mb-2">مکان ارسال شد!</h2>
          <p className="text-gray-500 text-sm mb-6">
            مکان شما اکنون در انتظار بررسی مدیر است. پس از تایید، ۲ سکه دریافت می‌کنید!
          </p>
          <div className="flex gap-3">
            <Link
              to="/"
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-center font-medium"
            >
              بازگشت به خانه
            </Link>
            <button
              onClick={() => {
                setSuccess(false);
                setTitle(''); setDescription(''); setAddress('');
                setLatitude(''); setLongitude('');
                setProvince(''); setCity(''); setNeighborhood('');
                setFile(null); setPreview(null); setExifData({});
                setGpsError('');
              }}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              افزودن مکان دیگر
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 pb-8">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          بازگشت به خانه
        </Link>

        <h1 className="text-2xl font-bold mb-1">افزودن مکان جدید</h1>
        <p className="text-gray-500 text-sm mb-6">یک مکان پرتره ثبت کن. وقتی تایید شد ۲ سکه بگیر!</p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── MAP PICKER ── */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                انتخاب مکان <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={getMyLocation}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {gettingLocation ? 'در حال دریافت...' : '📍 استفاده از GPS من'}
              </button>
            </div>
            <MapPicker
              latitude={latitude}
              longitude={longitude}
              onPick={(lat, lng) => { setLatitude(lat); setLongitude(lng); setGpsError(''); }}
            />
            {gpsError && !latitude && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg mt-2">{gpsError}</p>
            )}
            {exifData.latitude != null && exifData.longitude != null && (
              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                مختصات GPS از عکس استخراج شد
              </p>
            )}
          </div>

          {/* ── IRAN ADDRESS ── */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <p className="text-sm font-medium text-gray-700">آدرس</p>

            {/* Province */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">استان <span className="text-red-500">*</span></label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">انتخاب استان...</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">شهر</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!province}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white disabled:opacity-40"
              >
                <option value="">{province ? 'انتخاب شهر...' : 'ابتدا استان را انتخاب کنید'}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Neighborhood */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">محله</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="مثلاً نواب، ونک، تجریش"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Complete address */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">آدرس کامل</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="نام خیابان، شماره ساختمان و..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* ── TITLE ── */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان مکان <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً پل پارک غروب"
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* ── DESCRIPTION ── */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="چرا این مکان برای پرتره عالی است؟ جهت نور، بهترین زمان‌ها و..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* ── PHOTO ── */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              عکس <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              {preview ? (
                <img src={preview} alt="پیش‌نمایش" className="max-h-48 mx-auto rounded-lg" />
              ) : (
                <>
                  <svg className="h-10 w-10 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">برای آپلود عکس کلیک کنید</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* ── EXIF INFO ── */}
          {file && (exifData.camera_make || exifData.taken_at || exifData.iso) && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-2">شناسایی‌شده از عکس</p>
              <div className="space-y-1 text-xs text-gray-600">
                {exifData.camera_make && <div className="flex justify-between"><span className="text-gray-400">دوربین</span><span>{exifData.camera_make} {exifData.camera_model}</span></div>}
                {exifData.taken_at && <div className="flex justify-between"><span className="text-gray-400">تاریخ عکاسی</span><span>{exifData.taken_at}</span></div>}
                {exifData.iso && <div className="flex justify-between"><span className="text-gray-400">ISO</span><span>{exifData.iso}</span></div>}
                {exifData.aperture && <div className="flex justify-between"><span className="text-gray-400">دیافراگم</span><span>{exifData.aperture}</span></div>}
                {exifData.shutter_speed && <div className="flex justify-between"><span className="text-gray-400">سرعت شاتر</span><span>{exifData.shutter_speed}</span></div>}
                {exifData.width && <div className="flex justify-between"><span className="text-gray-400">رزولوشن</span><span>{exifData.width} x {exifData.height}</span></div>}
              </div>
            </div>
          )}

          {/* ── DATE & TIME ── */}
          {file && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-1">
                تاریخ و زمان عکس {exifData.taken_at ? '(خودکار از EXIF)' : ''}
              </p>
              <p className="text-xs text-gray-400 mb-3">                بدان چه زمانی نور عالی بوده — به بقیه در برنامه‌ریزی کمک می‌کند</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                <input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'در حال ارسال...' : 'ثبت مکان'}
          </button>

          <p className="text-xs text-gray-400 text-center pb-4">
            ارسال شما توسط مدیر بررسی خواهد شد. پس از تایید ۲ سکه دریافت می‌کنید.
          </p>
        </form>
      </div>
    </div>
  );
}
