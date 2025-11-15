import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const AdminDashboard = () => {
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { children: [_jsx("p", { className: "text-sm uppercase tracking-[0.3em] text-white/60", children: "Admin" }), _jsx("h1", { className: "text-3xl font-semibold", children: "Control Center" })] }), _jsx("div", { className: "grid gap-4 md:grid-cols-3", children: [
                    { title: "Sessions", copy: "Create & manage race sessions." },
                    { title: "Markets", copy: "Configure tote events and outcomes." },
                    { title: "Wallets", copy: "Approve deposits & withdrawals." }
                ].map((card) => (_jsxs("article", { className: "rounded-3xl border border-white/10 bg-white/5 p-6", children: [_jsx("h3", { className: "text-xl font-semibold", children: card.title }), _jsx("p", { className: "mt-2 text-sm text-white/70", children: card.copy })] }, card.title))) })] }));
};
export default AdminDashboard;
