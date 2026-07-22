import { useState, useRef, useCallback } from 'react';

export default function SwipeCard({ card, onReveal, onSkip, onShowComments }) {
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const cardRef = useRef(null);

  const handleStart = useCallback((clientX, clientY) => {
    setDragging(true);
    startX.current = clientX;
    startY.current = clientY;
  }, []);

  const handleMove = useCallback((clientX, clientY) => {
    if (!dragging) return;
    const dx = clientX - startX.current;
    const dy = clientY - startY.current;
    // Only start dragging horizontally if horizontal movement dominates
    if (Math.abs(dx) > Math.abs(dy) || Math.abs(dx) > 10) {
      setDragX(dx);
      setDragY(dy * 0.2);
    }
  }, [dragging]);

  const handleEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > 100) {
      onReveal();
    } else if (dragX < -100) {
      onSkip();
    }
    setDragX(0);
    setDragY(0);
  }, [dragging, dragX, onReveal, onSkip]);

  const onPointerDown = (e) => {
    if (e.target.closest('button, [data-no-drag]')) return;
    handleStart(e.clientX, e.clientY);
    try { cardRef.current?.setPointerCapture(e.pointerId); } catch {}
  };
  const onPointerMove = (e) => handleMove(e.clientX, e.clientY);
  const onPointerUp = () => handleEnd();
  const onTouchStart = (e) => {
    if (e.target.closest('button, [data-no-drag]')) return;
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e) => {
    if (dragging && Math.abs(dragX) > 5) {
      e.preventDefault();
    }
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchEnd = () => handleEnd();

  const rotation = dragX * 0.05;
  const opacity = Math.max(0.5, 1 - Math.abs(dragX) / 600);
  const scale = dragging ? 1.03 : 1;
  const showReveal = dragX > 40;
  const showSkip = dragX < -40;

  const roundedRating = card.avg_rating ? Math.round(card.avg_rating) : 0;
  const imageUrl = card.image?.filename ? `/uploads/${card.image.filename}` : '';

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 select-none touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ zIndex: 10 }}
    >
      <div
        className="w-full h-full rounded-3xl overflow-hidden relative bg-gray-800"
        style={{
          transform: `translateX(${dragX}px) translateY(${dragY}px) rotate(${rotation}deg) scale(${scale})`,
          opacity: opacity,
          transition: dragging ? 'none' : 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 25px 60px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05)',
        }}
      >
        {/* Image */}
        {imageUrl ? (
          <>
            {!imgLoaded && !imgError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
              </div>
            )}
            {imgError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 z-10">
                <svg className="h-12 w-12 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-xs">Image unavailable</p>
              </div>
            )}
            <img
              src={imageUrl}
              alt={card.title}
              className="w-full h-full object-cover"
              draggable={false}
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                setImgLoaded(true);
                setImgError(true);
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
            <svg className="h-12 w-12 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-xs">No image</p>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none" />

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-6 text-white pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold leading-tight truncate">{card.title}</h2>
            <div data-no-drag className="flex-shrink-0 bg-black/50 backdrop-blur-md rounded-full px-2 py-0.5 flex items-center gap-1">
              <span className="text-xs">🪙</span>
              <span className="text-white text-xs font-bold">1</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs font-bold">
              {(card.user_name || '?')[0].toUpperCase()}
            </div>
            <span className="text-white/70 text-sm truncate">{card.user_name}</span>
          </div>

          {/* Stars + comment icon row */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(s => (
                <svg key={s} className={`h-3.5 w-3.5 ${s <= roundedRating ? 'text-yellow-400' : 'text-white/30'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            {card.avg_rating ? (
              <>
                <span className="text-white text-sm font-bold">{Number(card.avg_rating).toFixed(1)}</span>
                <span className="text-white/40 text-xs">({card.rating_count})</span>
              </>
            ) : (
              <span className="text-white/30 text-xs">No rating</span>
            )}

            {/* Comment icon — clickable */}
            {onShowComments && (
              <button
                onClick={(e) => { e.stopPropagation(); onShowComments(); }}
                className="pointer-events-auto flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full px-2 py-0.5"
              >
                <svg className="h-3.5 w-3.5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-white/70 text-[10px] font-medium">
                  {card.rating_count || 0}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* SEE LOCATION stamp */}
        {showReveal && (
          <div className="absolute top-12 left-6 pointer-events-none" style={{ opacity: Math.min(1, (dragX - 40) / 100), transform: `rotate(-15deg) scale(${0.8 + Math.min(0.2, (dragX - 40) / 400)})` }}>
            <div className="border-[3px] border-green-400 rounded-lg px-4 py-1.5 bg-green-400/10 backdrop-blur-sm">
              <span className="text-green-400 font-extrabold text-xl tracking-wide">SEE LOCATION</span>
            </div>
          </div>
        )}

        {/* SKIP stamp */}
        {showSkip && (
          <div className="absolute top-12 right-6 pointer-events-none" style={{ opacity: Math.min(1, (Math.abs(dragX) - 40) / 100), transform: `rotate(15deg) scale(${0.8 + Math.min(0.2, (Math.abs(dragX) - 40) / 400)})` }}>
            <div className="border-[3px] border-red-400 rounded-lg px-4 py-1.5 bg-red-400/10 backdrop-blur-sm">
              <span className="text-red-400 font-extrabold text-xl tracking-wide">SKIP</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
