export default function RegentMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={undefined}
      height={undefined}
      className={className}
      role="img"
      aria-label="Regent"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M128 24 A104 104 0 1 1 128 232 A104 104 0 1 1 128 24 Z M84 54 L136 54 A36 36 0 0 1 136 126 L176 196 L148 196 L108 126 L108 196 L84 196 Z M108 76 L136 76 A14 14 0 0 1 136 104 L108 104 Z"
      />
    </svg>
  );
}
