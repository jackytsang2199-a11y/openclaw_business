const NexGenLogo = ({ className = "h-7 w-7" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" className={className}>
    <rect width="40" height="40" rx="10" fill="hsl(var(--primary))" />
    <text
      x="20"
      y="29"
      textAnchor="middle"
      fontFamily="system-ui, sans-serif"
      fontWeight="700"
      fontSize="26"
      fill="white"
    >
      N
    </text>
  </svg>
);

export default NexGenLogo;
