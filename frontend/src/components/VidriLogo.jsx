export default function VidriLogo({ variant = "dark", size = 24, ariaLabel }) {
  const firstFill = variant === "light" ? "#1B2D55" : "#F2B8C0";
  const secondFill = variant === "light" ? "#9E4A5A" : "#D98A9A";

  return (
    <svg
      viewBox="12 14 40 36"
      width={(size * 40) / 36}
      height={size}
      {...(ariaLabel
        ? { role: "img", "aria-label": ariaLabel }
        : { "aria-hidden": "true" })}
    >
      <path d="M12 14H26L32 34V50H26Z" fill={firstFill} />
      <path d="M52 14H38L32 34V50H38Z" fill={secondFill} />
    </svg>
  );
}
