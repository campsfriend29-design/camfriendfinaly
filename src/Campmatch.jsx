import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  User2,
  PlusCircle,
  LogOut,
  MapPin,
  Settings,
  Send,
  Heart,
  Pencil,
  X,
  Check,
  Moon,
  Sun,
  Search,
  LogIn,
} from "lucide-react";

/**
 * Camp'Match — Dark theme MVP (v2)
 * Nouvelles features: Auth (MVP), Géolocalisation (opt‑in), Distance aux campings, Créateur amélioré
 * - Pages: Auth, Profil, Messagerie, Créateur
 * - Boutons fonctionnels, persistance localStorage
 * - "Mode API" prêt: si window.CAMPMATCH_API_BASE est défini, les actions Auth/Events appelleront l'API
 */

const STORAGE_KEYS = {
  profile: "campmatch.profile",
  events: "campmatch.events",
  theme: "campmatch.theme",
  session: "campmatch.session",
};

// Petit répertoire de campings FR avec coordonnées (approx.) pour calcul de distance
const CAMPINGS = [
  { name: "Camping La Sirène", city: "Argelès-sur-Mer", lat: 42.566, lon: 3.043 },
  { name: "Camping Le Vieux Port", city: "Messanges", lat: 43.804, lon: -1.376 },
  { name: "Camping Les Mimosas", city: "Fréjus", lat: 43.433, lon: 6.735 },
  { name: "Camping Le Brasilia", city: "Canet-en-Roussillon", lat: 42.703, lon: 3.028 },
  { name: "Camping Les Ormes", city: "Dol-de-Bretagne", lat: 48.491, lon: -1.732 },
  { name: "Camping La Yole", city: "Valras-Plage", lat: 43.268, lon: 3.267 },
  { name: "Domaine de la Dragonnière", city: "Vias", lat: 43.309, lon: 3.375 },
  { name: "Camping Le Pommier", city: "Villeneuve-de-Berg", lat: 44.575, lon: 4.506 },
  { name: "Camping Les Cigales", city: "Molitg-les-Bains", lat: 42.631, lon: 2.413 },
  { name: "Camping La Roubine", city: "Vallon-Pont-d'Arc", lat: 44.409, lon: 4.403 },
];

const initialProfile = {
  displayName: "Campeur·euse Mystère",
  bio: "Fan de randonnée, barbecue et soirées étoiles ✨",
  age: 26,
  city: "Lyon",
  interests: ["Randonnée", "Surf", "Pétanque"],
  preferredCampings: [
    { name: "Camping Les Mimosas", city: "Fréjus", lat: 43.433, lon: 6.735 },
    { name: "Camping Le Vieux Port", city: "Messanges", lat: 43.804, lon: -1.376 },
  ],
  avatar: "https://api.dicebear.com/8.x/fun-emoji/svg?seed=camper",
  coords: null, // {lat, lon}
};

const mockUsers = [
  {
    id: "u1",
    name: "Léa",
    camping: { name: "Camping La Sirène", city: "Argelès-sur-Mer", lat: 42.566, lon: 3.043 },
    last: "À l'apéro ce soir?",
    avatar: "https://api.dicebear.com/8.x/fun-emoji/svg?seed=lea",
  },
  {
    id: "u2",
    name: "Nico",
    camping: { name: "Camping Les Ormes", city: "Dol-de-Bretagne", lat: 48.491, lon: -1.732 },
    last: "Partie de volley demain matin?",
    avatar: "https://api.dicebear.com/8.x/fun-emoji/svg?seed=nico",
  },
  {
    id: "u3",
    name: "Sarah",
    camping: { name: "Camping Le Brasilia", city: "Canet-en-Roussillon", lat: 42.703, lon: 3.028 },
    last: "J'organise une rando dimanche à 9h",
    avatar: "https://api.dicebear.com/8.x/fun-emoji/svg?seed=sarah",
  },
];

const mockMessages = {
  u1: [
    { from: "them", text: "Salut ! Tu es à La Sirène aussi?" },
    { from: "me", text: "Yes, emplacement 42, et toi?" },
    { from: "them", text: "Vers la piscine 😄" },
  ],
  u2: [{ from: "them", text: "On fait une équipe volley demain?" }],
  u3: [{ from: "them", text: "Rando facile au bord de mer!" }],
};

function kmDistance(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

// ===== Auth (MVP) =====
function useSession() {
  const [session, setSession] = useLocalStorage(STORAGE_KEYS.session, null);
  const apiBase = typeof window !== "undefined" ? window.CAMPMATCH_API_BASE : undefined;

  async function login(email, password) {
    if (apiBase) {
      // Si une API est branchée, on l'appelle
      const r = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) throw new Error("Connexion impossible");
      const data = await r.json();
      setSession({ token: data.token, email: data.user.email });
      return;
    }
    // Fallback local (non sécurisé, pour démo uniquement)
    const users = JSON.parse(localStorage.getItem("campmatch.users") || "[]");
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) throw new Error("Identifiants invalides");
    setSession({ token: "demo-token", email });
  }

  async function register(email, password) {
    if (apiBase) {
      const r = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) throw new Error("Inscription impossible");
      return login(email, password);
    }
    const users = JSON.parse(localStorage.getItem("campmatch.users") || "[]");
    if (users.some((u) => u.email === email)) throw new Error("Email déjà utilisé");
    users.push({ email, password });
    localStorage.setItem("campmatch.users", JSON.stringify(users));
    return login(email, password);
  }

  function logout() {
    setSession(null);
  }

  return { session, login, register, logout };
}

function AuthPage({ onDone }) {
  const { login, register } = useSession();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      if (mode === "login") await login(email, password);
      else await register(email, password);
      onDone();
    } catch (err) {
      setError(err.message || "Erreur");
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="text-emerald-400" />
        <h2 className="text-lg font-semibold text-white">Camp'Match</h2>
        <span className="ml-2 rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
          Rencontres de camping (France)
        </span>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-neutral-400">Email</label>
          <input
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-neutral-400">Mot de passe</label>
          <input
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="rounded-xl border border-red-800 bg-red-900/20 p-2 text-xs text-red-300">{error}</div>}
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-600/10 py-2 text-sm text-emerald-300 hover:bg-emerald-600/20"
        >
          <LogIn size={16} /> {mode === "login" ? "Se connecter" : "Créer un compte"}
        </button>
      </form>
      <div className="mt-3 text-center text-xs text-neutral-400">
        {mode === "login" ? (
          <button onClick={() => setMode("register")} className="hover:text-neutral-200">
            Pas de compte ? Inscription
          </button>
        ) : (
          <button onClick={() => setMode("login")} className="hover:text-neutral-200">
            Déjà inscrit ? Connexion
          </button>
        )}
      </div>
    </div>
  );
}

function Header({ current, onNavigate, theme, onToggleTheme, onLogout }) {
  const tabs = [
    { key: "profil", label: "Profil", icon: <User2 size={18} /> },
    { key: "messagerie", label: "Messagerie", icon: <MessageSquare size={18} /> },
    { key: "createur", label: "Créateur", icon: <PlusCircle size={18} /> },
  ];
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <MapPin className="text-emerald-400" />
          <span className="text-lg font-semibold text-white">Camp'Match</span>
          <span className="ml-2 rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
            Rencontres de camping (France)
          </span>
        </div>
        <nav className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => onNavigate(t.key)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-neutral-800 ${
                current === t.key ? "bg-neutral-800 text-white" : "text-neutral-300"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <button
            onClick={onToggleTheme}
            className="ml-2 rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
            title="Basculer le thème"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={onLogout}
            className="ml-2 rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
            title="Se déconnecter"
          >
            <LogOut size={16} />
          </button>
        </nav>
      </div>
    </header>
  );
}

function Chip({ children }) {
  return (
    <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300">
      {children}
    </span>
  );
}

function Section({ title, action, children }) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-200">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function ProfilePage({ profile, setProfile }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);

  useEffect(() => setDraft(profile), [profile]);

  // Géoloc opt‑in (navigateur)
  function askGeoloc() {
    if (!navigator.geolocation) return alert("Géolocalisation non supportée");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setProfile({ ...profile, coords });
      },
      () => alert("Impossible de récupérer la position"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const save = () => {
    setProfile(draft);
    setEditing(false);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Section
        title="Votre profil"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
            >
              <Pencil size={16} /> Modifier
            </button>
            <button
              onClick={askGeoloc}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-600/20"
            >
              Activer la géoloc
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-4">
          <img src={profile.avatar} alt="avatar" className="h-16 w-16 rounded-2xl border border-neutral-700" />
          <div>
            <div className="text-lg font-semibold text-white">{profile.displayName}</div>
            <div className="text-sm text-neutral-400">
              {profile.age} ans · {profile.city}
            </div>
            <div className="text-xs text-neutral-500">
              {profile.coords ? `📍 ${profile.coords.lat.toFixed(3)}, ${profile.coords.lon.toFixed(3)}` : "📍 Position non définie"}
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-neutral-300">{profile.bio}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.interests.map((it) => (
            <Chip key={it}>{it}</Chip>
          ))}
        </div>
      </Section>

      <Section title="Campings favoris">
        <ul className="space-y-2">
          {profile.preferredCampings.map((c, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-300">
              <span className="flex items-center gap-2">
                <MapPin size={16} className="text-emerald-400" /> {c.name}
                <span className="text-neutral-500">· {c.city}</span>
              </span>
              <div className="flex items-center gap-2">
                {profile.coords && c.lat && (
                  <Chip>{kmDistance(profile.coords, c)} km</Chip>
                )}
                <button
                  onClick={() => {
                    const next = profile.preferredCampings.filter((_, idx) => idx !== i);
                    setProfile({ ...profile, preferredCampings: next });
                  }}
                  className="rounded-lg border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                >
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Suggestions près de vous">
        <div className="space-y-3">
          {mockUsers.map((u) => {
            const dist = profile.coords ? kmDistance(profile.coords, u.camping) : null;
            return (
              <div key={u.id} className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <div className="flex items-center gap-3">
                  <img src={u.avatar} className="h-10 w-10 rounded-xl" />
                  <div>
                    <div className="text-sm font-medium text-neutral-200">{u.name}</div>
                    <div className="text-xs text-neutral-400">
                      {u.camping.name} · {u.camping.city}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dist != null && <Chip>{dist} km</Chip>}
                  <button className="rounded-lg border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800">Voir</button>
                  <button className="inline-flex items-center gap-1 rounded-lg border border-emerald-600 bg-emerald-600/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-600/20">
                    <Heart size={14} /> Match
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <EditProfileModal open={editing} onClose={() => setEditing(false)} draft={draft} setDraft={setDraft} onSave={save} />
    </div>
  );
}

function EditProfileModal({ open, onClose, draft, setDraft, onSave }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-neutral-200">Modifier le profil</h4>
              <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-neutral-400">Nom affiché</label>
                  <input className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200 outline-none focus:ring-2 focus:ring-emerald-600" value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs text-neutral-400">Âge</label>
                  <input type="number" min={18} className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200 outline-none focus:ring-2 focus:ring-emerald-600" value={draft.age} onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })} required />
                </div>
                <div>
                  <label className="text-xs text-neutral-400">Ville</label>
                  <input className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200 outline-none focus:ring-2 focus:ring-emerald-600" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-neutral-400">Avatar (URL)</label>
                  <input className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200 outline-none focus:ring-2 focus:ring-emerald-600" value={draft.avatar} onChange={(e) => setDraft({ ...draft, avatar: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400">Bio</label>
                <textarea rows={3} className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200 outline-none focus:ring-2 focus:ring-emerald-600" value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-neutral-400">Centres d'intérêt (séparés par des virgules)</label>
                <input className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200" value={draft.interests.join(", ")} onChange={(e) => setDraft({ ...draft, interests: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
              </div>
              <div>
                <label className="text-xs text-neutral-400">Ajouter un camping favori</label>
                <div className="mt-1 flex gap-2">
                  <select className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200" onChange={(e) => {
                      const val = e.target.value; if (!val) return; const c = CAMPINGS.find(c => `${c.name} (${c.city})` === val);
                      if (!c) return; const { name, city, lat, lon } = c; setDraft({ ...draft, preferredCampings: [...draft.preferredCampings, { name, city, lat, lon }] });
                    }} defaultValue="">
                    <option value="" disabled>Sélectionner un camping</option>
                    {CAMPINGS.map((c) => (
                      <option key={c.name} value={`${c.name} (${c.city})`}>{c.name} ({c.city})</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setDraft({ ...draft, preferredCampings: [] })} className="rounded-xl border border-neutral-700 px-3 text-sm text-neutral-300 hover:bg-neutral-800">Réinitialiser</button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800">Annuler</button>
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-600/20"><Check size={16} /> Enregistrer</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Conversation({ user, thread, onSend }) {
  const [text, setText] = useState("");
  return (
    <div className="flex h-[520px] flex-col rounded-2xl border border-neutral-800 bg-neutral-900">
      <div className="flex items-center gap-3 border-b border-neutral-800 p-3">
        <img src={user.avatar} className="h-8 w-8 rounded-lg" />
        <div className="text-sm text-neutral-200">
          {user.name}
          <div className="text-xs text-neutral-500">{user.camping.name} · {user.camping.city}</div>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {thread.map((m, i) => (
          <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`${m.from === "me" ? "bg-emerald-600/20 border-emerald-700" : "bg-neutral-950 border-neutral-800"} max-w-[70%] rounded-xl border px-3 py-2 text-sm text-neutral-200`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; onSend(text.trim()); setText(""); }} className="flex items-center gap-2 border-t border-neutral-800 p-2">
        <input placeholder="Écrire un message..." className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200 outline-none focus:ring-2 focus:ring-emerald-600" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-600/20">
          <Send size={16} /> Envoyer
        </button>
      </form>
    </div>
  );
}

function MessagingPage() {
  const [activeId, setActiveId] = useState(mockUsers[0].id);
  const [threads, setThreads] = useState(() => ({ ...mockMessages }));
  const activeUser = useMemo(() => mockUsers.find((u) => u.id === activeId), [activeId]);
  const activeThread = threads[activeId] || [];

  const send = (text) => {
    setThreads((prev) => ({ ...prev, [activeId]: [...(prev[activeId] || []), { from: "me", text }] }));
    setTimeout(() => {
      setThreads((prev) => ({ ...prev, [activeId]: [...(prev[activeId] || []), { from: "them", text: "À plus dans l'allée D!" }] }));
    }, 800);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Section title="Conversations" action={<div className="flex items-center gap-2"><div className="relative"><Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-neutral-500" /><input placeholder="Rechercher" className="w-44 rounded-xl border border-neutral-700 bg-neutral-950 py-2 pl-8 pr-2 text-xs text-neutral-200 outline-none focus:w-56 focus:ring-2 focus:ring-emerald-600 md:w-52" /></div></div>}>
        <ul className="space-y-2">
          {mockUsers.map((u) => (
            <li key={u.id}>
              <button onClick={() => setActiveId(u.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${activeId === u.id ? "border-emerald-700 bg-emerald-600/10" : "border-neutral-800 bg-neutral-950 hover:bg-neutral-900"}`}>
                <div className="flex items-center gap-3">
                  <img src={u.avatar} className="h-10 w-10 rounded-xl" />
                  <div>
                    <div className="text-sm font-medium text-neutral-200">{u.name}</div>
                    <div className="line-clamp-1 text-xs text-neutral-400">{u.last}</div>
                  </div>
                </div>
                <Chip>{u.camping.city}</Chip>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <div className="md:col-span-2">{activeUser ? <Conversation user={activeUser} thread={activeThread} onSend={send} /> : <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center text-neutral-400">Sélectionnez une conversation</div>}</div>
    </div>
  );
}

function CreatorPage({ events, setEvents, profile }) {
  const [draft, setDraft] = useState({
    title: "Apéro rencontre",
    camping: `${CAMPINGS[0].name} (${CAMPINGS[0].city})`,
    date: new Date().toISOString().slice(0, 10),
    time: "19:00",
    description: "Apéro convivial près de la piscine. Chacun ramène un truc !",
    visibility: "Public",
  });

  const campingFromValue = (val) => CAMPINGS.find((c) => `${c.name} (${c.city})` === val);

  const create = () => {
    const id = crypto.randomUUID();
    const c = campingFromValue(draft.camping);
    const next = {
      id,
      ...draft,
      coords: c ? { lat: c.lat, lon: c.lon } : null,
      createdAt: new Date().toISOString(),
      attendees: 1,
    };
    setEvents([next, ...events]);
    setDraft({ ...draft, title: "", description: "" });
  };

  const toggleVisibility = (id) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, visibility: e.visibility === "Public" ? "Privé" : "Public" } : e)));
  };

  const remove = (id) => setEvents((prev) => prev.filter((e) => e.id !== id));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Section title="Créer une rencontre">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-400">Titre</label>
            <input className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200 outline-none focus:ring-2 focus:ring-emerald-600" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex: Tournoi de pétanque" />
          </div>
          <div>
            <label className="text-xs text-neutral-400">Camping</label>
            <select className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200" value={draft.camping} onChange={(e) => setDraft({ ...draft, camping: e.target.value })}>
              {CAMPINGS.map((c) => (
                <option key={c.name} value={`${c.name} (${c.city})`}>{c.name} ({c.city})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-400">Date</label>
              <input type="date" className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-neutral-400">Heure</label>
              <input type="time" className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-400">Description</label>
            <textarea rows={3} className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-200 outline-none focus:ring-2 focus:ring-emerald-600" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-neutral-400">Visibilité</label>
            <div className="mt-1 flex gap-2">
              {["Public", "Privé"].map((v) => (
                <button key={v} onClick={() => setDraft({ ...draft, visibility: v })} className={`rounded-xl border px-3 py-1 text-sm ${draft.visibility === v ? "border-emerald-700 bg-emerald-600/10 text-emerald-300" : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:bg-neutral-900"}`}>{v}</button>
              ))}
            </div>
          </div>
          <button onClick={create} disabled={!draft.title.trim()} className="w-full rounded-xl border border-emerald-700 bg-emerald-600/10 py-2 text-sm text-emerald-300 hover:bg-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50">
            Publier la rencontre
          </button>
        </div>
      </Section>

      <Section title="Vos rencontres publiées">
        {events.length === 0 ? (
          <div className="text-sm text-neutral-400">Aucune rencontre pour le moment.</div>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-neutral-200">{e.title}</div>
                    <div className="text-xs text-neutral-400">{e.camping} · {e.date} {e.time}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.coords && (
                      <Chip>{profile.coords ? `${kmDistance(profile.coords, e.coords)} km` : "GPS?"}</Chip>
                    )}
                    <Chip>{e.visibility}</Chip>
                    <button onClick={() => toggleVisibility(e.id)} className="rounded-lg border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800">Basculer</button>
                    <button onClick={() => remove(e.id)} className="rounded-lg border border-red-700 px-2 py-1 text-xs text-red-300 hover:bg-red-900/20">Supprimer</button>
                  </div>
                </div>
                {e.description && <p className="mt-2 text-sm text-neutral-300">{e.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Conseils de sécurité">
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-300">
          <li>Rencontrez-vous dans les zones communes du camping.</li>
          <li>Prévenez un ami/une amie de votre rendez-vous.</li>
          <li>Ne partagez pas d'informations sensibles dans le chat.</li>
        </ul>
      </Section>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useLocalStorage(STORAGE_KEYS.theme, "dark");
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const { session, logout } = useSession();

  const [profile, setProfile] = useLocalStorage(STORAGE_KEYS.profile, initialProfile);
  const [events, setEvents] = useLocalStorage(STORAGE_KEYS.events, []);
  const [page, setPage] = useState("profil");

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
          <AuthPage onDone={() => { /* no-op: session set in hook */ }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Header current={page} onNavigate={setPage} theme={theme} onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} onLogout={logout} />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs text-neutral-400">
            {page === "profil" && "Gérez votre profil, vos campings favoris et vos matchs."}
            {page === "messagerie" && "Discutez avec les campeurs et organisez des rencontres."}
            {page === "createur" && "Publiez des rencontres pour votre camping (distance visible si GPS activé)."}
          </div>
          <div className="flex items-center gap-2">
            <Chip>{session.email}</Chip>
            <button className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800" onClick={() => { localStorage.clear(); window.location.reload(); }} title="Réinitialiser les données locales">
              <LogOut size={14} /> Réinitialiser l'app
            </button>
          </div>
        </div>

        {page === "profil" && <ProfilePage profile={profile} setProfile={setProfile} />}
        {page === "messagerie" && <MessagingPage />}
        {page === "createur" && <CreatorPage events={events} setEvents={setEvents} profile={profile} />}
      </main>

      <footer className="border-t border-neutral-900 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-neutral-500 md:flex-row">
          <div>© {new Date().getFullYear()} Camp'Match — Fait avec 💚 pour les campings de France.</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-neutral-300">CGU</a>
            <a href="#" className="hover:text-neutral-300">Confidentialité</a>
            <button className="inline-flex items-center gap-1 hover:text-neutral-300"><Settings size={14} /> Paramètres</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
