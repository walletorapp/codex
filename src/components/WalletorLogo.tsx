export function WalletorLogo() {
  return (
    <svg
      className="walletor-logo"
      viewBox="0 0 64 52"
      role="img"
      aria-label="Walletor"
    >
      <defs>
        <linearGradient id="walletor-mark" x1="6" y1="5" x2="57" y2="47">
          <stop stopColor="#5ab7ff" />
          <stop offset="1" stopColor="#2667d8" />
        </linearGradient>
      </defs>
      <path d="M32 2 62 19 32 50 2 19 32 2Z" fill="url(#walletor-mark)" />
      <path
        d="m13 18 13 17 6-8 7 8 13-17-8-5-12 15-12-15-7 5Z"
        fill="#f7fbff"
      />
      <path d="m32 2 12 11-12 15-12-15L32 2Z" fill="#0a0d12" />
    </svg>
  );
}
