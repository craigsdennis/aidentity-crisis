
type QRCodeProps = {
  value: string;
  size?: number; // pixels
  className?: string;
};

// Lightweight QR using an external image service to avoid adding deps.
// If you prefer a local generator, we can switch to a library later.
export function QRCode({ value, size = 256, className }: QRCodeProps) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value,
  )}`;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="QR code"
      className={className}
    />
  );
}

export default QRCode;
