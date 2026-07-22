import { useState } from "react";

export function TokenAvatar({
  logoUrl,
  symbol,
  size = "md",
}: {
  logoUrl: string | null;
  symbol: string;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const fallback =
    symbol
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <span className={`token-avatar token-avatar--${size}`} aria-hidden="true">
      {logoUrl && !failed ? (
        <img
          src={logoUrl}
          alt=""
          onError={() => {
            setFailed(true);
          }}
        />
      ) : (
        fallback
      )}
    </span>
  );
}
