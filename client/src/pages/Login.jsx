import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppReady } from '../contexts/AppReadyContext';
import { fa, faNum, toEnglishDigits } from '../utils/persianNum';
import { isValidIranianPhone } from '../utils/validation';

export default function Login() {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendCode, verifyCode } = useAuth();
  const { markReady } = useAppReady();
  const navigate = useNavigate();

  useEffect(() => {
    markReady();
  }, [markReady]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidIranianPhone(phone)) {
      setError('شماره تلفن همراه معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)');
      return;
    }
    setLoading(true);
    try {
      await sendCode(phone);
      setStep('code');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyCode(phone, code);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-4">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <img src="/icons/logo.svg" alt="لوک‌لنز" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-blue-600">لوک‌لنز</h1>
          <p className="text-gray-500 mt-2">مکان‌های عکاسی پرتره زیبا را کشف و به اشتراک بگذار</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          {step === 'phone' ? (
            <form onSubmit={handleSendCode}>
              <h2 className="text-xl font-semibold mb-4">ورود</h2>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                شماره تلفن
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(toEnglishDigits(e.target.value).replace(/[^\d+]/g, ''))}
                placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4"
              />
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'در حال ارسال...' : 'ارسال کد تایید'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <h2 className="text-xl font-semibold mb-2">کد را وارد کنید</h2>
              <p className="text-sm text-gray-500 mb-4">
                کد به {phone} ارسال شد
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                کد تایید
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={(e) => setCode(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 6))}
                placeholder="کد ۶ رقمی را وارد کنید"
                required
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4 text-center text-2xl tracking-widest"
              />
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'در حال بررسی...' : 'تایید و ورود'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                className="w-full text-sm text-gray-500 mt-3 hover:text-gray-700"
              >
                تغییر شماره تلفن
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          دمو: هر شماره و کد <span className="font-mono font-bold">{faNum('123456')}</span> را وارد کنید
        </p>
      </div>
    </div>
  );
}
