type SlideFrameProps = {
  background?: string;
  className?: string;
  children?: React.ReactNode;
};

export function SlideFrame({ background, className, children }: SlideFrameProps) {
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
        'min-h-[80vh] w-full max-w-[1200px] rounded-2xl overflow-hidden shadow-2xl border border-slate-700 ' +
        (className ?? '')
      }
      style={bgStyle}
    >
      <div className="backdrop-brightness-90 backdrop-saturate-150 bg-black/30 w-full h-full p-10 flex items-center justify-center">
        <div className="prose prose-invert max-w-none text-slate-50">
          {children}
        </div>
      </div>
    </div>
  );
}

export default SlideFrame;

