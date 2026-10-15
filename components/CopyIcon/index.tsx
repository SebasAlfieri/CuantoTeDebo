interface CopyIconProps {
  size?: number;
}

const CopyIcon = ({ size = 14 }: CopyIconProps) => (
  <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false">
    <rect
      x="5"
      y="5"
      width="9"
      height="9"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M11 3.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export default CopyIcon;
