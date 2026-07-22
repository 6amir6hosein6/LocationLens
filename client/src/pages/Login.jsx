import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendCode, verifyCode } = useAuth();
  const navigate = useNavigate();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
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
          <img src="/icons/logo.svg" alt="LocationLens" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-blue-600">LocationLens</h1>
          <p className="text-gray-500 mt-2">Find & share beautiful portrait locations</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          {step === 'phone' ? (
            <form onSubmit={handleSendCode}>
              <h2 className="text-xl font-semibold mb-4">Sign In</h2>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4"
              />
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <h2 className="text-xl font-semibold mb-2">Enter Code</h2>
              <p className="text-sm text-gray-500 mb-4">
                Code sent to {phone}
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
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
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                className="w-full text-sm text-gray-500 mt-3 hover:text-gray-700"
              >
                Change phone number
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Demo: Use any phone number and code <span className="font-mono font-bold">123456</span>
        </p>
      </div>
    </div>
  );
}
