type SlideFrameProps = {
  background?: string;
  className?: string;
  children?: React.ReactNode;
  overlayBottomRight?: React.ReactNode;
};

export function SlideFrame({ background, className, children, overlayBottomRight }: SlideFrameProps) {
  const bgStyle: React.CSSProperties = background
    ? {
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
      };

  return (
    <div
      className={
        'relative h-screen w-screen overflow-hidden ' +
        (className ?? '')
      }
      style={bgStyle}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 w-full h-full p-8 sm:p-16 flex items-center justify-center">
        <div className="text-white text-center text-5xl sm:text-6xl md:text-7xl font-semibold leading-tight max-w-[80%]">
          {children}
        </div>
      </div>
      {overlayBottomRight && (
        <div className="absolute z-20 bottom-6 right-6">
          {overlayBottomRight}
        </div>
      )}
    </div>
  );
}

export default SlideFrame;
