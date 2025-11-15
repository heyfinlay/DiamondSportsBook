const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">Admin</p>
        <h1 className="text-3xl font-semibold">Control Center</h1>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Sessions", copy: "Create & manage race sessions." },
          { title: "Markets", copy: "Configure tote events and outcomes." },
          { title: "Wallets", copy: "Approve deposits & withdrawals." }
        ].map((card) => (
          <article
            key={card.title}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <h3 className="text-xl font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm text-white/70">{card.copy}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
