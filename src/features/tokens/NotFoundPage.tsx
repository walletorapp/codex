import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="state-panel">
      <span className="not-found-code">404</span>
      <strong>Signal not found</strong>
      <p>This Walletor route does not exist.</p>
      <Link className="button button--secondary" to="/trending">
        <ArrowLeft size={15} /> Return to trending
      </Link>
    </div>
  );
}
