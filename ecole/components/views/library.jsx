'use client';
/** Bibliothèque numérique : cours, PDF, vidéos, exercices et liens, par matière. */
import { useState } from 'react';
import Icon from '../Icon';
import { Badge, Card, Empty, Field, Modal, PageHead, Select } from '../ui';
import { byId, studentClass, timeAgo } from '@/lib/compute';
import { can } from '@/lib/permissions';
import * as A from '@/lib/actions';

const TYPES = {
  pdf: { label: 'PDF / fiche', icon: 'file', tone: 'red' },
  video: { label: 'Vidéo', icon: 'video', tone: 'blue' },
  exercices: { label: 'Exercices', icon: 'edit', tone: 'orange' },
  lien: { label: 'Lien web', icon: 'send', tone: 'green' },
};

export function LibraryView({ state, user, run, notify, go }) {
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState('');
  const [adding, setAdding] = useState(false);
  const canWrite = can(user, 'library:write');
  const teacher = user.role === 'enseignant' ? byId(state.teachers, user.personId) : null;
  const mySubjects = user.role === 'admin' ? state.subjects : state.subjects.filter((s) => teacher?.subjectIds.includes(s.id));
  const q = query.trim().toLowerCase();
  const items = state.library.filter(
    (r) =>
      (!subjectId || r.subjectId === subjectId) &&
      (!type || r.type === type) &&
      (!q || `${r.title} ${r.topic} ${r.description}`.toLowerCase().includes(q)),
  );

  const open = (r) => {
    if (r.url) window.open(r.url, '_blank', 'noopener,noreferrer');
    else if (r.dataUrl) {
      const a = document.createElement('a');
      a.href = r.dataUrl;
      a.download = r.fileName || r.title;
      a.click();
    } else notify(`« ${r.title} » : support de démonstration (aucun fichier joint).`);
  };

  const student = user.role === 'eleve' ? byId(state.students, user.personId) : null;

  return (
    <>
      <PageHead title="Bibliothèque numérique" subtitle={`${state.library.length} ressources : cours, fiches, vidéos, exercices et liens utiles.`}>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} /> Ajouter une ressource
          </button>
        )}
      </PageHead>
      <div className="row" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <input className="input" placeholder="Rechercher un cours, une notion…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher" />
        </div>
        <Select className="select" style={{ width: 200 }} value={subjectId} onChange={setSubjectId} aria-label="Matière" options={[{ value: '', label: 'Toutes les matières' }, ...state.subjects.map((s) => ({ value: s.id, label: s.name }))]} />
        <Select className="select" style={{ width: 170 }} value={type} onChange={setType} aria-label="Type" options={[{ value: '', label: 'Tous les types' }, ...Object.entries(TYPES).map(([v, t]) => ({ value: v, label: t.label }))]} />
      </div>
      {student && (
        <p className="small muted" style={{ marginBottom: 12 }}>
          Astuce : les notions travaillées en classe de {studentClass(state, student)?.name} sont aussi dans <button className="btn btn-ghost btn-sm" onClick={() => go('cours')}>Cours</button>.
        </p>
      )}
      <div className="grid g-3">
        {items.slice(0, 90).map((r) => {
          const t = TYPES[r.type] || TYPES.pdf;
          const author = byId(state.users, r.addedBy);
          const mine = r.addedBy === user.id || user.role === 'admin';
          return (
            <Card key={r.id}>
              <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <span className={`notif-icon tone-${t.tone === 'red' ? 'red' : t.tone}`}>
                  <Icon name={t.icon} size={18} />
                </span>
                <Badge tone="blue">{byId(state.subjects, r.subjectId)?.name}</Badge>
              </div>
              <h3 style={{ marginTop: 12 }}>{r.title}</h3>
              <p className="small muted" style={{ marginTop: 4 }}>
                {r.topic && <span className="strong">{r.topic} · </span>}
                {r.description}
              </p>
              <p className="tiny muted" style={{ marginTop: 8 }}>
                {t.label} · {author?.name || '—'} · {timeAgo(r.at)}
              </p>
              <div className="row mt">
                <button className="btn btn-sm btn-primary" onClick={() => open(r)}>
                  <Icon name={r.url ? 'send' : 'download'} size={14} /> {r.url ? 'Ouvrir' : 'Télécharger'}
                </button>
                {canWrite && mine && (
                  <button className="btn btn-sm btn-danger" onClick={() => window.confirm('Supprimer cette ressource ?') && run(A.deleteResource, { resourceId: r.id }, 'Ressource supprimée.')}>
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {!items.length && (
        <Card>
          <Empty>Aucune ressource ne correspond à votre recherche.</Empty>
        </Card>
      )}
      {adding && <ResourceModal run={run} subjects={mySubjects} onClose={() => setAdding(false)} />}
    </>
  );
}

function ResourceModal({ run, subjects, onClose }) {
  const [form, setForm] = useState({ subjectId: subjects[0]?.id, title: '', type: 'pdf', topic: '', url: '', description: '', fileName: '', dataUrl: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, fileName: file.name, dataUrl: String(reader.result), title: f.title || file.name.replace(/\.[^.]+$/, '') }));
    reader.readAsDataURL(file);
  };
  const submit = () => run(A.addResource, form, 'Ressource publiée dans la bibliothèque.').ok && onClose();
  return (
    <Modal
      title="Ajouter une ressource"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Publier
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Matière">
          <Select value={form.subjectId} onChange={set('subjectId')} options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
        </Field>
        <Field label="Type">
          <Select value={form.type} onChange={set('type')} options={Object.entries(TYPES).map(([v, t]) => ({ value: v, label: t.label }))} />
        </Field>
        <Field label="Titre" full>
          <input className="input" value={form.title} onChange={set('title')} />
        </Field>
        <Field label="Notion / chapitre">
          <input className="input" value={form.topic} onChange={set('topic')} placeholder="ex. Fractions" />
        </Field>
        <Field label="Lien (https://…)">
          <input className="input" value={form.url} onChange={set('url')} placeholder="facultatif" />
        </Field>
        <Field label="Description" full>
          <textarea className="textarea" rows={3} value={form.description} onChange={set('description')} />
        </Field>
        <Field label="Fichier (750 Ko max. en démonstration)" full>
          <input className="input" type="file" style={{ paddingTop: 8 }} onChange={(e) => onFile(e.target.files?.[0])} />
        </Field>
      </div>
    </Modal>
  );
}
