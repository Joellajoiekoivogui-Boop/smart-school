'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getToken, clearToken } from '../../lib/api';

const NIVEAU_LABEL = {
  froid: 'Froid',
  tiede: 'Tiède',
  chaud: 'Chaud',
  pret_a_acheter: 'Prêt à acheter',
};
const NIVEAU_ORDER = ['froid', 'tiede', 'chaud', 'pret_a_acheter'];

function pillClass(niveau) {
  if (niveau === 'froid') return 'pill pill-froid';
  if (niveau === 'tiede') return 'pill pill-tiede';
  if (niveau === 'chaud') return 'pill pill-chaud';
  if (niveau === 'pret_a_acheter') return 'pill pill-pret';
  return 'pill pill-neutral';
}

function formatGNF(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toLocaleString('fr-FR')} GNF`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  return `il y a ${j} j`;
}

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('overview');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="shell">
      <Sidebar view={view} setView={setView} router={router} />
      <div className="main">
        <Topbar view={view} />
        <main className="content">
          {view === 'overview' && <OverviewView />}
          {view === 'conversations' && <ConversationsView />}
          {view === 'leads' && <LeadsView />}
          {view === 'produits' && <ProduitsView />}
          {view === 'parametres' && <ParametresView />}
        </main>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'conversations', label: 'Conversations' },
  { id: 'leads', label: 'Leads' },
  { id: 'produits', label: 'Produits' },
  { id: 'parametres', label: 'Paramètres agent' },
];

function Sidebar({ view, setView, router }) {
  function logout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">V</div>
        <div>
          <div className="brand-name">Vigie Commerciale</div>
          <div className="brand-tag">Console agent IA</div>
        </div>
      </div>

      <nav className="primary">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${view === item.id ? 'is-active' : ''}`}
            onClick={() => setView(item.id)}
          >
            <span className="nav-dot" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        Connecté à l&apos;API
        <button className="btn btn-sm" onClick={logout}>Se déconnecter</button>
      </div>
    </aside>
  );
}

const TITLES = {
  overview: ["Vue d'ensemble", "Ce que l'agent a fait, en un coup d'œil."],
  conversations: ['Conversations', 'Chaque échange WhatsApp, en direct.'],
  leads: ['Leads', 'Qualification automatique des prospects.'],
  produits: ['Produits', "Le catalogue consulté par l'agent."],
  parametres: ['Paramètres agent', "Ce que l'humain autorise ou non."],
};

function Topbar({ view }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    apiFetch('/api/agent-settings').then(setSettings).catch(() => setSettings(false));
  }, []);

  const [title, sub] = TITLES[view];

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <div className="topbar-sub">{sub}</div>
      </div>
      {settings && (
        <div className={`status-pill ${settings.agentActif ? '' : 'is-off'}`}>
          <span className="live-dot" />
          {settings.agentActif ? 'Agent actif' : 'Agent en pause'}
        </div>
      )}
    </header>
  );
}

/* ============ VUE D'ENSEMBLE ============ */
function OverviewView() {
  const [state, setState] = useState({ loading: true, error: null, conversations: [], leads: [] });

  useEffect(() => {
    Promise.all([apiFetch('/api/conversations'), apiFetch('/api/leads')])
      .then(([conversations, leads]) => setState({ loading: false, error: null, conversations, leads }))
      .catch((err) => setState({ loading: false, error: err.message, conversations: [], leads: [] }));
  }, []);

  if (state.loading) return <p className="state-msg">Chargement…</p>;
  if (state.error) return <p className="state-msg is-error">Erreur : {state.error}</p>;

  const { conversations, leads } = state;
  const actives = conversations.filter((c) => c.statut === 'ouverte').length;
  const necessitentHumain = conversations.filter((c) => c.statut === 'transferee_humain').length;
  const relances = conversations.reduce((sum, c) => sum + (c.nombreRelances || 0), 0);
  const parNiveau = Object.fromEntries(NIVEAU_ORDER.map((n) => [n, leads.filter((l) => l.niveauInteret === n).length]));
  const maxNiveau = Math.max(1, ...Object.values(parNiveau));
  const niveauColor = { froid: 'var(--froid)', tiede: 'var(--tiede)', chaud: 'var(--chaud)', pret_a_acheter: 'var(--pret)' };

  const recentes = [...conversations]
    .sort((a, b) => new Date(b.dernierMessageAt) - new Date(a.dernierMessageAt))
    .slice(0, 5);

  return (
    <>
      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Conversations actives</div>
          <div className="kpi-value">{actives}</div>
          <div className="kpi-delta">sur {conversations.length} au total</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Leads chauds</div>
          <div className="kpi-value">{parNiveau.chaud + parNiveau.pret_a_acheter}</div>
          <div className="kpi-delta">dont {parNiveau.pret_a_acheter} prêts à acheter</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Relances envoyées</div>
          <div className="kpi-value">{relances}</div>
          <div className="kpi-delta">cumul sur les conversations ouvertes</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Nécessitent un humain</div>
          <div className="kpi-value">{necessitentHumain}</div>
          <div className="kpi-delta">en attente de reprise</div>
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel">
          <h3>Leads par niveau d&apos;intérêt</h3>
          <div className="panel-sub">{leads.length} leads qualifiés au total</div>
          {NIVEAU_ORDER.map((n) => (
            <div className="bar-row" key={n}>
              <div className="bar-name">{NIVEAU_LABEL[n]}</div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(parNiveau[n] / maxNiveau) * 100}%`, background: niveauColor[n] }}
                />
              </div>
              <div className="bar-num">{parNiveau[n]}</div>
            </div>
          ))}
        </div>

        <div className="panel">
          <h3>Conversations récentes</h3>
          <div className="panel-sub">Triées par dernier message</div>
          {recentes.length === 0 && <p className="state-msg">Aucune conversation pour l&apos;instant.</p>}
          {recentes.map((c) => (
            <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{c.customerId?.nom || c.customerId?.whatsappId || 'Client'}</span>
              <span className="cell-sub">{timeAgo(c.dernierMessageAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ============ CONVERSATIONS ============ */
function ConversationsView() {
  const [conversations, setConversations] = useState(null);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const loadList = useCallback(() => {
    apiFetch('/api/conversations').then((data) => {
      setConversations(data);
      if (!selectedId && data.length > 0) setSelectedId(data[0]._id);
    }).catch((err) => setError(err.message));
  }, [selectedId]);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    apiFetch(`/api/conversations/${selectedId}`).then(setDetail).catch((err) => setError(err.message));
  }, [selectedId]);

  async function handleAction(action) {
    if (!selectedId) return;
    try {
      await apiFetch(`/api/conversations/${selectedId}/${action}`, { method: 'POST' });
      const refreshed = await apiFetch(`/api/conversations/${selectedId}`);
      setDetail(refreshed);
      loadList();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSendReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !selectedId) return;
    setSending(true);
    try {
      await apiFetch(`/api/conversations/${selectedId}/repondre`, { method: 'POST', body: { texte: replyText } });
      setReplyText('');
      const refreshed = await apiFetch(`/api/conversations/${selectedId}`);
      setDetail(refreshed);
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (error) return <p className="state-msg is-error">Erreur : {error}</p>;
  if (!conversations) return <p className="state-msg">Chargement…</p>;

  return (
    <div className="convo-layout">
      <div className="convo-list">
        {conversations.length === 0 && <p className="state-msg" style={{ padding: '16px' }}>Aucune conversation.</p>}
        {conversations.map((c) => (
          <button
            key={c._id}
            className={`convo-row ${selectedId === c._id ? 'is-active' : ''}`}
            onClick={() => setSelectedId(c._id)}
          >
            <div className="avatar">{initials(c.customerId?.nom || c.customerId?.whatsappId)}</div>
            <div className="convo-meta">
              <div className="convo-top-line">
                <span className="convo-name">{c.customerId?.nom || c.customerId?.whatsappId || 'Client'}</span>
                <span className="convo-time">{timeAgo(c.dernierMessageAt)}</span>
              </div>
              <div className="convo-snippet">{c.resume || `Statut : ${c.statut}`}</div>
              <div className="convo-tags">
                {c.statut === 'transferee_humain' && <span className="pill pill-critique">Nécessite humain</span>}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="thread">
        {!detail && <p className="state-msg" style={{ padding: '18px' }}>Sélectionnez une conversation.</p>}
        {detail && (
          <>
            <div className="thread-head">
              <div className="who">
                <div className="avatar">{initials(detail.conversation.customerId?.nom || detail.conversation.customerId?.whatsappId)}</div>
                <div>
                  <div className="who-name">{detail.conversation.customerId?.nom || 'Client'}</div>
                  <div className="who-num">{detail.conversation.customerId?.whatsappId}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {detail.conversation.statut === 'transferee_humain' ? (
                  <button className="btn" onClick={() => handleAction('rendre-a-agent')}>Rendre la main à l&apos;agent</button>
                ) : (
                  <button className="btn" onClick={() => handleAction('reprendre')}>Reprendre la conversation</button>
                )}
              </div>
            </div>

            <div className="thread-body">
              {detail.messages.length === 0 && <p className="state-msg">Aucun message pour l&apos;instant.</p>}
              {detail.messages.map((m) => (
                <MessageBubble key={m._id} message={m} />
              ))}
            </div>

            <form className="thread-compose" onSubmit={handleSendReply}>
              <input
                type="text"
                placeholder="Écrire en tant qu'humain…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <button className="btn btn-accent" type="submit" disabled={sending || !replyText.trim()}>
                {sending ? 'Envoi…' : 'Envoyer'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const side = message.auteur === 'client' ? 'from-client' : `from-${message.auteur}`;
  return (
    <div className={`msg-row ${side}`}>
      {message.isRelance && <span className="sys-note">Relance automatique</span>}
      {(message.toolCalls || []).map((tc, i) => (
        <span className="tool-chip" key={i}>🔧 {tc.nom}</span>
      ))}
      <div className="bubble">{message.contenu}</div>
      <span className="msg-time">{new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  );
}

/* ============ LEADS ============ */
function LeadsView() {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('tous');

  useEffect(() => {
    const query = filter === 'tous' ? '' : filter === 'humain' ? '?necessiteHumain=true' : `?niveauInteret=${filter}`;
    apiFetch(`/api/leads${query}`).then(setLeads).catch((err) => setError(err.message));
  }, [filter]);

  if (error) return <p className="state-msg is-error">Erreur : {error}</p>;

  return (
    <>
      <div className="filters">
        {[
          ['tous', 'Tous'],
          ['froid', 'Froid'],
          ['tiede', 'Tiède'],
          ['chaud', 'Chaud'],
          ['pret_a_acheter', 'Prêt à acheter'],
          ['humain', 'Nécessite humain'],
        ].map(([key, label]) => (
          <button key={key} className={`chip ${filter === key ? 'is-on' : ''}`} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      {!leads ? (
        <p className="state-msg">Chargement…</p>
      ) : leads.length === 0 ? (
        <p className="state-msg">Aucun lead pour ce filtre.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th><th>Besoin exprimé</th><th>Niveau</th><th>Statut</th><th>Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead._id}>
                  <td className="cell-strong">{lead.customerId?.nom || lead.customerId?.whatsappId || '—'}</td>
                  <td>{lead.besoinExprime || '—'}</td>
                  <td><span className={pillClass(lead.niveauInteret)}>{NIVEAU_LABEL[lead.niveauInteret] || lead.niveauInteret}</span></td>
                  <td>{lead.statut}{lead.necessiteHumain && <span className="pill pill-critique" style={{ marginLeft: 6 }}>Humain</span>}</td>
                  <td className="cell-sub">{timeAgo(lead.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ============ PRODUITS ============ */
function ProduitsView() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  const load = useCallback(() => {
    apiFetch('/api/products').then(setProducts).catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(p) {
    setEditingId(p._id);
    setDraft({ prixGNF: p.prixGNF, stock: p.stock, disponible: p.disponible });
  }

  async function saveEdit(id) {
    try {
      await apiFetch(`/api/products/${id}`, {
        method: 'PUT',
        body: { prixGNF: Number(draft.prixGNF), stock: Number(draft.stock), disponible: draft.disponible },
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p className="state-msg is-error">Erreur : {error}</p>;
  if (!products) return <p className="state-msg">Chargement…</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Produit</th><th>Prix</th><th>Stock</th><th>Disponible</th><th></th></tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const editing = editingId === p._id;
            return (
              <tr key={p._id}>
                <td className="cell-strong">{p.nom}<div className="cell-sub">{p.categorie}</div></td>
                <td className="cell-num">
                  {editing ? (
                    <input className="cell-input" value={draft.prixGNF} onChange={(e) => setDraft({ ...draft, prixGNF: e.target.value })} />
                  ) : formatGNF(p.prixActuelGNF ?? p.prixGNF)}
                </td>
                <td className="cell-num">
                  {editing ? (
                    <input className="cell-input" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
                  ) : (
                    <span className={p.stock === 0 ? 'stock-out' : p.stock <= (p.seuilAlerteStock || 3) ? 'stock-warn' : ''}>
                      {p.stock}{p.stock === 0 ? ' — rupture' : p.stock <= (p.seuilAlerteStock || 3) ? ' — bas' : ''}
                    </span>
                  )}
                </td>
                <td>
                  <button
                    className={`toggle ${(editing ? draft.disponible : p.disponible) ? 'is-on' : ''}`}
                    onClick={() => editing ? setDraft({ ...draft, disponible: !draft.disponible }) : startEdit({ ...p, disponible: !p.disponible })}
                  />
                </td>
                <td>
                  {editing ? (
                    <button className="btn btn-sm btn-accent" onClick={() => saveEdit(p._id)}>Enregistrer</button>
                  ) : (
                    <button className="btn btn-sm" onClick={() => startEdit(p)}>Modifier</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ============ PARAMETRES ============ */
function ParametresView() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    apiFetch('/api/agent-settings').then(setSettings).catch((err) => setError(err.message));
  }, []);

  function update(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  async function handleSave() {
    setStatus(null);
    try {
      const saved = await apiFetch('/api/agent-settings', {
        method: 'PUT',
        body: {
          agentActif: settings.agentActif,
          tonalite: settings.tonalite,
          peutAccorderRemise: settings.peutAccorderRemise,
          remiseMaxPourcent: Number(settings.remiseMaxPourcent),
          peutPromettreDelaiLivraison: settings.peutPromettreDelaiLivraison,
          peutRechercherSurInternet: settings.peutRechercherSurInternet,
          delaiRelanceMinutes: Number(settings.delaiRelanceMinutes),
          maxRelancesParConversation: Number(settings.maxRelancesParConversation),
          messageBienvenue: settings.messageBienvenue,
        },
      });
      setSettings(saved);
      setStatus({ ok: true, message: 'Enregistré.' });
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    }
  }

  if (error) return <p className="state-msg is-error">Erreur : {error}</p>;
  if (!settings) return <p className="state-msg">Chargement…</p>;

  return (
    <>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="field-row">
          <div>
            <div className="field-label">Agent actif</div>
            <div className="field-help">Désactivez pour répondre vous-même à tous les clients.</div>
          </div>
          <button className={`toggle ${settings.agentActif ? 'is-on' : ''}`} onClick={() => update('agentActif', !settings.agentActif)} />
        </div>
        <div className="field-row">
          <div className="field-label">Tonalité</div>
          <div className="segmented">
            {['chaleureux', 'professionnel', 'decontracte'].map((t) => (
              <button key={t} className={settings.tonalite === t ? 'is-on' : ''} onClick={() => update('tonalite', t)}>
                {t === 'chaleureux' ? 'Chaleureux' : t === 'professionnel' ? 'Professionnel' : 'Décontracté'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel">
          <h3>Ce qu&apos;il peut promettre</h3>
          <div className="panel-sub">Marges de négociation autorisées sans validation humaine</div>
          <div className="field-row">
            <div className="field-label">Autoriser une remise</div>
            <button className={`toggle ${settings.peutAccorderRemise ? 'is-on' : ''}`} onClick={() => update('peutAccorderRemise', !settings.peutAccorderRemise)} />
          </div>
          <div className="field-row">
            <div className="field-label">Remise max</div>
            <div><input className="num-input" value={settings.remiseMaxPourcent} onChange={(e) => update('remiseMaxPourcent', e.target.value)} /> %</div>
          </div>
          <div className="field-row">
            <div className="field-label">Annoncer un délai de livraison</div>
            <button className={`toggle ${settings.peutPromettreDelaiLivraison ? 'is-on' : ''}`} onClick={() => update('peutPromettreDelaiLivraison', !settings.peutPromettreDelaiLivraison)} />
          </div>
          <div className="field-row">
            <div className="field-label">Recherche externe (Exa)</div>
            <button className={`toggle ${settings.peutRechercherSurInternet ? 'is-on' : ''}`} onClick={() => update('peutRechercherSurInternet', !settings.peutRechercherSurInternet)} />
          </div>
        </div>

        <div className="panel">
          <h3>Relances automatiques</h3>
          <div className="panel-sub">Quand une conversation reste sans réponse</div>
          <div className="field-row">
            <div className="field-label">Délai avant relance</div>
            <div><input className="num-input" value={settings.delaiRelanceMinutes} onChange={(e) => update('delaiRelanceMinutes', e.target.value)} /> min</div>
          </div>
          <div className="field-row">
            <div className="field-label">Relances max par conversation</div>
            <input className="num-input" value={settings.maxRelancesParConversation} onChange={(e) => update('maxRelancesParConversation', e.target.value)} />
          </div>
          <div className="field-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <div className="field-label">Message d&apos;accueil</div>
            <textarea className="field-textarea" value={settings.messageBienvenue} onChange={(e) => update('messageBienvenue', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="save-bar">
        <span className={status ? `save-status ${status.ok ? '' : 'is-error'}` : ''}>
          {status ? status.message : 'Les modifications sont appliquées immédiatement par l\'agent après enregistrement.'}
        </span>
        <button className="btn btn-accent" onClick={handleSave}>Enregistrer</button>
      </div>
    </>
  );
}
