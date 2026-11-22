export default function RoadmapIcon({ size = 28, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="8" cy="24" r="3" />
      <circle cx="24" cy="8" r="3" />
      <path d="M11 24h11a5 5 0 0 0 0-10H10a4 4 0 0 1 0-8h5M24 11v3" />
      <path d="m12 3 3 3-3 3" />
    </svg>
  );
}
