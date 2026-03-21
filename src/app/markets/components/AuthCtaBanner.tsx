import { Link, useLocation } from "react-router-dom";

export const AuthCtaBanner = () => {
  const location = useLocation();
  const redirectState = {
    from: {
      pathname: location.pathname,
      search: location.search
    }
  };

  return (
    <div className="prismatic-card flex flex-col gap-4 px-5 py-5 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-headline text-xl font-extrabold uppercase tracking-[0.06em] text-white">
          Sign in or create an account to place bets.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-on-subtle">
          Diamond vault access requires a verified profile.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          to="/login?mode=signin"
          state={redirectState}
          className="prismatic-button prismatic-button-secondary text-center"
        >
          Sign in
        </Link>
        <Link
          to="/login?mode=signup"
          state={redirectState}
          className="prismatic-button prismatic-button-primary text-center"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
};
