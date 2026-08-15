import { jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { NeonPostgrestClient } from "@neondatabase/postgrest-js";
import { createAuthClient } from "@neondatabase/auth";
const TB = window.TIBLY_BACKEND || {};
const auth = createAuthClient(TB.authUrl);
const INPUT = "w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none";
const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink/60 mb-1";
const CATALOG = [
  { sku: "SURGE-WH", name: "Whole-building surge protection", price: 685, blurb: "Type 2 device at the service panel, torque-checked and labeled." },
  { sku: "EVSE-L2", name: "Level 2 EV charger install", price: 1290, blurb: "60A circuit, hardwired unit, load calc included." },
  { sku: "PANEL-200", name: "200A service and panel upgrade", price: 2850, blurb: "New meter main, permit and utility coordination handled." },
  { sku: "GEN-22", name: "22kW standby generator install", price: 1450, blurb: "Pad, transfer switch and startup. Deposit price shown." },
  { sku: "LED-RETRO", name: "LED retrofit, per fixture", price: 145, blurb: "Commercial troffer and high bay swaps, disposal included." },
  { sku: "EM-INSPECT", name: "Emergency lighting inspection", price: 395, blurb: "Annual 90 minute test with signed documentation." }
];
function friendly(e) {
  const m = String(e && e.message || e || "");
  if (/relation|does not exist|schema cache|permission denied/i.test(m)) return "This page isn't fully set up yet. Wait a moment and refresh.";
  if (/fetch|network|failed/i.test(m)) return "We couldn't reach the server. Check your connection and try again.";
  return m || "Something went wrong.";
}
async function freshToken() {
  try {
    const r = await fetch(TB.authUrl + "/token", { credentials: "include" });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.token ? j.token : null;
  } catch {
    return null;
  }
}
async function db() {
  const token = await freshToken();
  if (!token) throw new Error("Your session ended. Please sign in again.");
  return new NeonPostgrestClient({ dataApiUrl: TB.dataApiUrl, options: { global: { headers: { Authorization: "Bearer " + token } } } });
}
function money(v) {
  const n = Number(v) || 0;
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function day(v) {
  if (!v) return "To be scheduled";
  const d = new Date(v.length <= 10 ? v + "T12:00:00" : v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function Badge({ text }) {
  const t = text.toLowerCase();
  const cls = t.includes("complete") || t.includes("closed") ? "bg-emerald-100 text-emerald-800" : t.includes("schedul") || t.includes("progress") || t.includes("route") ? "bg-blue-100 text-blue-800" : t.includes("hold") || t.includes("wait") ? "bg-amber-100 text-amber-900" : "bg-ink/10 text-ink";
  return /* @__PURE__ */ jsx("span", { className: "inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize " + cls, children: text });
}
function SignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [sent, setSent] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function magic(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await auth.signIn.magicLink({ email, callbackURL: window.location.href });
      setSent(true);
    } catch (ex) {
      setErr("Magic link isn't available right now. Use a password below.");
      setFallback(true);
    }
    setBusy(false);
  }
  async function password(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await auth.signIn.email({ email, password: pw });
      if (r && r.error) throw new Error(r.error.message || "sign in failed");
      window.location.reload();
    } catch {
      try {
        const r2 = await auth.signUp.email({ email, password: pw, name: email });
        if (r2 && r2.error) throw new Error(r2.error.message || "sign up failed");
        window.location.reload();
      } catch (ex2) {
        setErr(friendly(ex2));
      }
    }
    setBusy(false);
  }
  return /* @__PURE__ */ jsxs("div", { className: "grid gap-8 lg:grid-cols-2", children: [
    /* @__PURE__ */ jsxs("div", { className: "card p-8", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl text-ink", children: "Sign in to your account" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-ink/70", children: "We send a one-time link to your email. No password to remember." }),
      sent ? /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-lg bg-brand-600/10 p-4 text-sm text-ink", children: [
        /* @__PURE__ */ jsx("p", { className: "font-semibold", children: "Check your inbox." }),
        /* @__PURE__ */ jsxs("p", { className: "mt-1", children: [
          "We sent a sign-in link to ",
          email,
          ". Open it on this device and you'll land right back here."
        ] })
      ] }) : /* @__PURE__ */ jsxs("form", { className: "mt-6 space-y-4", onSubmit: magic, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: LABEL, children: "Email address" }),
          /* @__PURE__ */ jsx("input", { className: INPUT, type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@company.com" })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "btn w-full", type: "submit", disabled: busy, children: busy ? "Sending..." : "Email me a sign-in link" })
      ] }),
      fallback && /* @__PURE__ */ jsxs("form", { className: "mt-6 space-y-4 border-t border-ink/10 pt-6", onSubmit: password, children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm text-ink/70", children: "Or use a password for this account." }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: LABEL, children: "Password" }),
          /* @__PURE__ */ jsx("input", { className: INPUT, type: "password", required: true, minLength: 8, value: pw, onChange: (e) => setPw(e.target.value), placeholder: "At least 8 characters" })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "btn-secondary w-full", type: "submit", disabled: busy, children: "Continue with password" })
      ] }),
      err && /* @__PURE__ */ jsx("p", { className: "mt-4 text-sm text-red-700", children: err }),
      !fallback && !sent && /* @__PURE__ */ jsx("button", { className: "mt-4 text-xs font-semibold text-brand-600 underline", onClick: () => setFallback(true), children: "Use a password instead" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "card bg-ink p-8 text-white", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-display text-2xl", children: "What's inside" }),
      /* @__PURE__ */ jsxs("ul", { className: "mt-5 space-y-4 text-sm text-white/80", children: [
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: "Service calls." }),
          " Every visit we've booked for you, the window we're holding, and the tech assigned."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: "Project files." }),
          " Scope, phase, square footage and the project manager on your build."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: "Purchase history." }),
          " Surge devices, EV chargers, panel upgrades and standby generators you've ordered."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: "Site contacts." }),
          " Gate codes, billing address and how you want us to reach you."
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-8 text-xs text-white/60", children: "Licensed and insured. Serving commercial and estate clients since 2009. Office: Monday to Friday, 7am to 4pm." })
    ] })
  ] });
}
function App() {
  const [booting, setBooting] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [who, setWho] = useState("");
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [calls, setCalls] = useState([]);
  const [projects, setProjects] = useState([]);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ service_type: "Troubleshooting", site_address: "", preferred_date: "", time_window: "morning", urgency: "standard", details: "" });
  const [pform, setPform] = useState({ name: "", site_address: "", scope: "", square_footage: "" });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const c = await db();
      const [a, b, o, p] = await Promise.all([
        c.from("ce_service_calls").select("*").order("created_at", { ascending: false }),
        c.from("ce_projects").select("*").order("created_at", { ascending: false }),
        c.from("ce_orders").select("*").order("created_at", { ascending: false }),
        c.from("ce_customer_profiles").select("*").limit(1)
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      if (o.error) throw o.error;
      if (p.error) throw p.error;
      setCalls(a.data || []);
      setProjects(b.data || []);
      setOrders(o.data || []);
      setProfile(p.data && p.data[0] || null);
    } catch (ex) {
      setErr(friendly(ex));
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    (async () => {
      const t2 = await freshToken();
      if (t2) {
        setSignedIn(true);
        try {
          const s = await auth.getSession();
          const u = s && (s.data ? s.data.user : s.user);
          if (u && u.email) setWho(u.email);
        } catch {
        }
        await load();
      }
      setBooting(false);
    })();
  }, [load]);
  async function bookCall(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const c = await db();
      const row = { ...form, preferred_date: form.preferred_date || null };
      const r = await c.from("ce_service_calls").insert(row);
      if (r.error) throw r.error;
      setForm({ service_type: "Troubleshooting", site_address: "", preferred_date: "", time_window: "morning", urgency: "standard", details: "" });
      setMsg("Request received. Dispatch confirms the window by phone within one business day.");
      await load();
    } catch (ex) {
      setErr(friendly(ex));
    }
    setBusy(false);
  }
  async function cancelCall(id) {
    setErr("");
    setMsg("");
    try {
      const c = await db();
      const r = await c.from("ce_service_calls").delete().eq("id", id);
      if (r.error) throw r.error;
      setMsg("Service call canceled.");
      await load();
    } catch (ex) {
      setErr(friendly(ex));
    }
  }
  async function requestProject(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const c = await db();
      const r = await c.from("ce_projects").insert({ name: pform.name, site_address: pform.site_address, scope: pform.scope, square_footage: pform.square_footage ? Number(pform.square_footage) : null });
      if (r.error) throw r.error;
      setPform({ name: "", site_address: "", scope: "", square_footage: "" });
      setMsg("Estimate request logged. An estimator reviews drawings before we price it.");
      await load();
    } catch (ex) {
      setErr(friendly(ex));
    }
    setBusy(false);
  }
  async function order(sku, name, price) {
    setErr("");
    setMsg("");
    try {
      const c = await db();
      const r = await c.from("ce_orders").insert({ item_sku: sku, item_name: name, unit_price: price, install_address: profile ? profile.service_address : "" });
      if (r.error) throw r.error;
      setMsg(name + " added. We'll call to schedule the install date.");
      await load();
    } catch (ex) {
      setErr(friendly(ex));
    }
  }
  async function saveProfile(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    const p = profile;
    if (!p) {
      setBusy(false);
      return;
    }
    try {
      const c = await db();
      const body = { full_name: p.full_name, email: p.email, phone: p.phone, company: p.company, service_address: p.service_address, city: p.city, state: p.state, postal_code: p.postal_code, preferred_contact: p.preferred_contact, site_access: p.site_access };
      const r = p.visitor_id ? await c.from("ce_customer_profiles").update(body).eq("visitor_id", p.visitor_id) : await c.from("ce_customer_profiles").insert(body);
      if (r.error) throw r.error;
      setMsg("Contact info saved.");
      await load();
    } catch (ex) {
      setErr(friendly(ex));
    }
    setBusy(false);
  }
  function editProfile(k, v) {
    const base = profile || { visitor_id: "", full_name: "", email: who, phone: "", company: "", service_address: "", city: "", state: "", postal_code: "", preferred_contact: "phone", site_access: "" };
    setProfile({ ...base, [k]: v });
  }
  const spent = orders.reduce((s, o) => s + (Number(o.unit_price) || 0) * (o.quantity || 1), 0);
  const open = calls.filter((c) => c.status !== "complete" && c.status !== "closed").length;
  const shell = (kids) => /* @__PURE__ */ jsxs("div", { className: "bg-white", children: [
    /* @__PURE__ */ jsx("section", { className: "bg-ink px-6 py-16 text-white", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-5xl", children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.3em] text-brand-600", children: "C-E ELECTRIC, LLC" }),
      /* @__PURE__ */ jsx("h1", { className: "mt-3 font-display text-4xl sm:text-5xl", children: "My Account" }),
      /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-xl text-white/70", children: "Your service calls, project files, orders and site contacts in one place." })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: "px-6 py-12", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-5xl", children: kids }) })
  ] });
  if (booting) return shell(/* @__PURE__ */ jsx("div", { className: "card p-10 text-center text-ink/60", children: "Checking your session..." }));
  if (!signedIn) return shell(/* @__PURE__ */ jsx(SignIn, {}));
  const t = (id, label) => /* @__PURE__ */ jsx("button", { onClick: () => setTab(id), className: tab === id ? "rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white" : "rounded-full bg-ink/5 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/10", children: label }, id);
  return shell(
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { className: "card mb-6 flex flex-wrap items-center justify-between gap-3 p-5", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-wide text-ink/50", children: "Signed in as" }),
          /* @__PURE__ */ jsx("p", { className: "font-semibold text-ink", children: who || profile && profile.email || "your account" })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "btn-secondary", onClick: async () => {
          try {
            await auth.signOut();
          } catch {
          }
          window.location.reload();
        }, children: "Sign out" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-6 flex flex-wrap gap-2", children: [
        t("overview", "Overview"),
        t("calls", "Service calls"),
        t("projects", "Projects"),
        t("orders", "Purchases"),
        t("profile", "Contact info")
      ] }),
      err && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800", children: err }),
      msg && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800", children: msg }),
      loading && /* @__PURE__ */ jsx("div", { className: "mb-4 text-sm text-ink/60", children: "Loading your records..." }),
      tab === "overview" && /* @__PURE__ */ jsxs("div", { className: "grid gap-5 sm:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "card p-6", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-wide text-ink/50", children: "Open service calls" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 font-display text-4xl text-ink", children: open })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "card p-6", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-wide text-ink/50", children: "Active projects" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 font-display text-4xl text-ink", children: projects.length })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "card p-6", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-wide text-ink/50", children: "Ordered to date" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 font-display text-4xl text-ink", children: money(spent) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "card p-6 sm:col-span-3", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-display text-xl text-ink", children: "Recent activity" }),
          calls.length === 0 && orders.length === 0 ? /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-ink/60", children: "Nothing on file yet. Book a service call or order a solution and it shows up here." }) : /* @__PURE__ */ jsxs("ul", { className: "mt-4 divide-y divide-ink/10 text-sm", children: [
            calls.slice(0, 3).map((c) => /* @__PURE__ */ jsxs("li", { className: "flex justify-between py-3", children: [
              /* @__PURE__ */ jsxs("span", { className: "text-ink", children: [
                c.service_type,
                " at ",
                c.site_address || "your site"
              ] }),
              /* @__PURE__ */ jsx(Badge, { text: c.status })
            ] }, "c" + c.id)),
            orders.slice(0, 3).map((o) => /* @__PURE__ */ jsxs("li", { className: "flex justify-between py-3", children: [
              /* @__PURE__ */ jsx("span", { className: "text-ink", children: o.item_name }),
              /* @__PURE__ */ jsx("span", { className: "text-ink/60", children: money(o.unit_price) })
            ] }, "o" + o.id))
          ] })
        ] })
      ] }),
      tab === "calls" && /* @__PURE__ */ jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "card p-6", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-display text-xl text-ink", children: "Book a service call" }),
          /* @__PURE__ */ jsxs("form", { className: "mt-4 space-y-4", onSubmit: bookCall, children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: LABEL, children: "Type of work" }),
              /* @__PURE__ */ jsxs("select", { className: INPUT, value: form.service_type, onChange: (e) => setForm({ ...form, service_type: e.target.value }), children: [
                /* @__PURE__ */ jsx("option", { children: "Troubleshooting" }),
                /* @__PURE__ */ jsx("option", { children: "Panel or service work" }),
                /* @__PURE__ */ jsx("option", { children: "Lighting" }),
                /* @__PURE__ */ jsx("option", { children: "Generator service" }),
                /* @__PURE__ */ jsx("option", { children: "EV charger" }),
                /* @__PURE__ */ jsx("option", { children: "Tenant improvement punch list" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: LABEL, children: "Site address" }),
              /* @__PURE__ */ jsx("input", { className: INPUT, required: true, value: form.site_address, onChange: (e) => setForm({ ...form, site_address: e.target.value }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: LABEL, children: "Preferred date" }),
                /* @__PURE__ */ jsx("input", { className: INPUT, type: "date", value: form.preferred_date, onChange: (e) => setForm({ ...form, preferred_date: e.target.value }) })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: LABEL, children: "Window" }),
                /* @__PURE__ */ jsxs("select", { className: INPUT, value: form.time_window, onChange: (e) => setForm({ ...form, time_window: e.target.value }), children: [
                  /* @__PURE__ */ jsx("option", { value: "morning", children: "7am to 11am" }),
                  /* @__PURE__ */ jsx("option", { value: "afternoon", children: "12pm to 4pm" }),
                  /* @__PURE__ */ jsx("option", { value: "after hours", children: "After hours" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: LABEL, children: "Urgency" }),
              /* @__PURE__ */ jsxs("select", { className: INPUT, value: form.urgency, onChange: (e) => setForm({ ...form, urgency: e.target.value }), children: [
                /* @__PURE__ */ jsx("option", { value: "standard", children: "Standard" }),
                /* @__PURE__ */ jsx("option", { value: "priority", children: "Priority, same week" }),
                /* @__PURE__ */ jsx("option", { value: "emergency", children: "Emergency, power out" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: LABEL, children: "What's happening" }),
              /* @__PURE__ */ jsx("textarea", { className: INPUT, rows: 3, value: form.details, onChange: (e) => setForm({ ...form, details: e.target.value }), placeholder: "Breaker trips when the compressor starts." })
            ] }),
            /* @__PURE__ */ jsx("button", { className: "btn w-full", disabled: busy, children: busy ? "Sending..." : "Request this visit" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-4", children: calls.length === 0 ? /* @__PURE__ */ jsx("div", { className: "card p-6 text-sm text-ink/60", children: "No service calls yet. Book one and dispatch confirms the window." }) : calls.map((c) => /* @__PURE__ */ jsxs("div", { className: "card p-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-ink", children: c.service_type }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-ink/60", children: c.site_address })
            ] }),
            /* @__PURE__ */ jsx(Badge, { text: c.status })
          ] }),
          /* @__PURE__ */ jsxs("dl", { className: "mt-4 grid grid-cols-2 gap-3 text-sm text-ink/70", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-xs uppercase text-ink/45", children: "Date" }),
              /* @__PURE__ */ jsx("dd", { children: day(c.preferred_date) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-xs uppercase text-ink/45", children: "Window" }),
              /* @__PURE__ */ jsx("dd", { className: "capitalize", children: c.time_window })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-xs uppercase text-ink/45", children: "Urgency" }),
              /* @__PURE__ */ jsx("dd", { className: "capitalize", children: c.urgency })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-xs uppercase text-ink/45", children: "Tech" }),
              /* @__PURE__ */ jsx("dd", { children: c.technician || "Assigning" })
            ] })
          ] }),
          c.details && /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-ink/70", children: c.details }),
          /* @__PURE__ */ jsx("button", { className: "mt-4 text-xs font-semibold text-red-700 underline", onClick: () => cancelCall(c.id), children: "Cancel this call" })
        ] }, c.id)) })
      ] }),
      tab === "projects" && /* @__PURE__ */ jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "card p-6", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-display text-xl text-ink", children: "Start a project estimate" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-ink/60", children: "Send the basics. An estimator reviews drawings before we price the work." }),
          /* @__PURE__ */ jsxs("form", { className: "mt-4 space-y-4", onSubmit: requestProject, children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: LABEL, children: "Project name" }),
              /* @__PURE__ */ jsx("input", { className: INPUT, required: true, value: pform.name, onChange: (e) => setPform({ ...pform, name: e.target.value }), placeholder: "Riverside warehouse fit-out" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: LABEL, children: "Site address" }),
              /* @__PURE__ */ jsx("input", { className: INPUT, value: pform.site_address, onChange: (e) => setPform({ ...pform, site_address: e.target.value }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: LABEL, children: "Approx. square footage" }),
              /* @__PURE__ */ jsx("input", { className: INPUT, type: "number", min: "0", value: pform.square_footage, onChange: (e) => setPform({ ...pform, square_footage: e.target.value }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: LABEL, children: "Scope" }),
              /* @__PURE__ */ jsx("textarea", { className: INPUT, rows: 4, value: pform.scope, onChange: (e) => setPform({ ...pform, scope: e.target.value }), placeholder: "800A service, 60 lighting fixtures, data rough-in." })
            ] }),
            /* @__PURE__ */ jsx("button", { className: "btn w-full", disabled: busy, children: busy ? "Sending..." : "Request an estimate" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-4", children: projects.length === 0 ? /* @__PURE__ */ jsx("div", { className: "card p-6 text-sm text-ink/60", children: "No project files yet. Requested estimates and active builds land here." }) : projects.map((p) => /* @__PURE__ */ jsxs("div", { className: "card p-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-ink", children: p.name }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-ink/60", children: p.site_address || "Address pending" })
            ] }),
            /* @__PURE__ */ jsx(Badge, { text: p.phase })
          ] }),
          /* @__PURE__ */ jsxs("dl", { className: "mt-4 grid grid-cols-2 gap-3 text-sm text-ink/70", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-xs uppercase text-ink/45", children: "Project manager" }),
              /* @__PURE__ */ jsx("dd", { children: p.project_manager })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-xs uppercase text-ink/45", children: "Target start" }),
              /* @__PURE__ */ jsx("dd", { children: day(p.target_start) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-xs uppercase text-ink/45", children: "Square footage" }),
              /* @__PURE__ */ jsx("dd", { children: p.square_footage ? p.square_footage.toLocaleString() : "Not set" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-xs uppercase text-ink/45", children: "Budget" }),
              /* @__PURE__ */ jsx("dd", { children: p.budget_estimate ? money(p.budget_estimate) : "In review" })
            ] })
          ] }),
          p.scope && /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-ink/70", children: p.scope })
        ] }, p.id)) })
      ] }),
      tab === "orders" && /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "font-display text-xl text-ink", children: "Electrical solutions" }),
          /* @__PURE__ */ jsx("div", { className: "mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: CATALOG.map((item) => /* @__PURE__ */ jsxs("div", { className: "card flex flex-col p-5", children: [
            /* @__PURE__ */ jsx("p", { className: "font-semibold text-ink", children: item.name }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 flex-1 text-sm text-ink/60", children: item.blurb }),
            /* @__PURE__ */ jsx("p", { className: "mt-3 font-display text-2xl text-ink", children: money(item.price) }),
            /* @__PURE__ */ jsx("button", { className: "btn mt-3", onClick: () => order(item.sku, item.name, item.price), children: "Order" })
          ] }, item.sku)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "card p-6", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-display text-xl text-ink", children: "Purchase history" }),
          orders.length === 0 ? /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-ink/60", children: "No purchases on file yet." }) : /* @__PURE__ */ jsxs("table", { className: "mt-4 w-full text-left text-sm", children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "text-xs uppercase tracking-wide text-ink/45", children: [
              /* @__PURE__ */ jsx("th", { className: "py-2", children: "Item" }),
              /* @__PURE__ */ jsx("th", { className: "py-2", children: "Ordered" }),
              /* @__PURE__ */ jsx("th", { className: "py-2", children: "Qty" }),
              /* @__PURE__ */ jsx("th", { className: "py-2", children: "Total" }),
              /* @__PURE__ */ jsx("th", { className: "py-2", children: "Status" })
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-ink/10", children: orders.map((o) => /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("td", { className: "py-3 text-ink", children: o.item_name }),
              /* @__PURE__ */ jsx("td", { className: "py-3 text-ink/60", children: day(o.created_at) }),
              /* @__PURE__ */ jsx("td", { className: "py-3 text-ink/60", children: o.quantity }),
              /* @__PURE__ */ jsx("td", { className: "py-3 text-ink", children: money((Number(o.unit_price) || 0) * (o.quantity || 1)) }),
              /* @__PURE__ */ jsx("td", { className: "py-3", children: /* @__PURE__ */ jsx(Badge, { text: o.status }) })
            ] }, o.id)) })
          ] })
        ] })
      ] }),
      tab === "profile" && /* @__PURE__ */ jsxs("form", { className: "card grid gap-4 p-6 sm:grid-cols-2", onSubmit: saveProfile, children: [
        /* @__PURE__ */ jsxs("div", { className: "sm:col-span-2", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-display text-xl text-ink", children: "Saved contact information" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-ink/60", children: "Our dispatchers use this to reach you and get on site." })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: LABEL, children: "Full name" }),
          /* @__PURE__ */ jsx("input", { className: INPUT, value: profile && profile.full_name || "", onChange: (e) => editProfile("full_name", e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: LABEL, children: "Company" }),
          /* @__PURE__ */ jsx("input", { className: INPUT, value: profile && profile.company || "", onChange: (e) => editProfile("company", e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: LABEL, children: "Email" }),
          /* @__PURE__ */ jsx("input", { className: INPUT, type: "email", value: profile && profile.email || "", onChange: (e) => editProfile("email", e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: LABEL, children: "Phone" }),
          /* @__PURE__ */ jsx("input", { className: INPUT, value: profile && profile.phone || "", onChange: (e) => editProfile("phone", e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sm:col-span-2", children: [
          /* @__PURE__ */ jsx("label", { className: LABEL, children: "Service address" }),
          /* @__PURE__ */ jsx("input", { className: INPUT, value: profile && profile.service_address || "", onChange: (e) => editProfile("service_address", e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: LABEL, children: "City" }),
          /* @__PURE__ */ jsx("input", { className: INPUT, value: profile && profile.city || "", onChange: (e) => editProfile("city", e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: LABEL, children: "State" }),
            /* @__PURE__ */ jsx("input", { className: INPUT, value: profile && profile.state || "", onChange: (e) => editProfile("state", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: LABEL, children: "ZIP" }),
            /* @__PURE__ */ jsx("input", { className: INPUT, value: profile && profile.postal_code || "", onChange: (e) => editProfile("postal_code", e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: LABEL, children: "Preferred contact" }),
          /* @__PURE__ */ jsxs("select", { className: INPUT, value: profile && profile.preferred_contact || "phone", onChange: (e) => editProfile("preferred_contact", e.target.value), children: [
            /* @__PURE__ */ jsx("option", { value: "phone", children: "Phone call" }),
            /* @__PURE__ */ jsx("option", { value: "text", children: "Text message" }),
            /* @__PURE__ */ jsx("option", { value: "email", children: "Email" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: LABEL, children: "Gate code or site access" }),
          /* @__PURE__ */ jsx("input", { className: INPUT, value: profile && profile.site_access || "", onChange: (e) => editProfile("site_access", e.target.value), placeholder: "Gate 2, code 4417, dock open at 7" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "sm:col-span-2", children: /* @__PURE__ */ jsx("button", { className: "btn", disabled: busy, children: busy ? "Saving..." : "Save contact info" }) })
      ] })
    ] })
  );
}
createRoot(document.getElementById("tibly-app-root")).render(/* @__PURE__ */ jsx(App, {}));
export {
  App as default
};
