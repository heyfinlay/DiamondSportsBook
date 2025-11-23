const UnauthorizedPage = () => (
  <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/80">
    <h1 className="text-2xl font-semibold">Access restricted</h1>
    <p className="mt-3 text-sm text-white/60">
      You are signed in, but your account doesn&apos;t have permission to view this page.
    </p>
  </div>
);

export default UnauthorizedPage;
