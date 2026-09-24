/**
 * Photos de profil.
 *
 * - Une vraie photo (prise avec le téléphone ou choisie dans la galerie) est
 *   recadrée en carré et réduite à 256 px avant d'être enregistrée.
 * - En attendant, chaque élève et enseignant a un portrait illustré, généré à
 *   partir de son identifiant (toujours le même, sans connexion Internet).
 */

const SKIN = ['#6b3e1d', '#7a4a1f', '#8d5524', '#a0673a', '#5a3319', '#94603a'];
const HAIR = ['#1b1210', '#231a16', '#2e211b', '#120c0a'];
const BG = [
  ['#dbeafe', '#bfdbfe'],
  ['#dcfce7', '#bbf7d0'],
  ['#fef3c7', '#fde68a'],
  ['#ede9fe', '#ddd6fe'],
  ['#fee2e2', '#fecaca'],
  ['#e0f2fe', '#bae6fd'],
];
const UNIFORM = ['#1d4ed8', '#0f766e', '#b45309', '#1e3a8a', '#7c2d12'];
const TEACHER_CLOTH = ['#0f172a', '#7c3aed', '#be123c', '#047857', '#1d4ed8', '#a16207'];
const SCARF = ['#db2777', '#7c3aed', '#059669', '#ea580c', '#0ea5e9'];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = (list, n) => list[Math.abs(n) % list.length];

/** Portrait illustré (SVG) propre à une personne. */
export function illustratedAvatar(id, gender = 'M', kind = 'student') {
  const h = hash(`${kind}-${id}`);
  const skin = pick(SKIN, h);
  const hair = pick(HAIR, h >>> 3);
  const [bg1, bg2] = pick(BG, h >>> 5);
  const cloth = kind === 'teacher' ? pick(TEACHER_CLOTH, h >>> 7) : pick(UNIFORM, h >>> 7);
  const female = gender === 'F';
  const style = (h >>> 9) % 3; // variante de coiffure
  const glasses = kind === 'teacher' && (h >>> 11) % 3 === 0;

  let hairSvg;
  if (female) {
    if (style === 0) {
      // Foulard
      const scarf = pick(SCARF, h >>> 13);
      hairSvg = `<path d="M34 60c0-20 13-33 30-33s30 13 30 33v6c-4-12-14-20-30-20S38 54 34 66z" fill="${scarf}"/><path d="M34 62c-3 18 2 34 10 42l6-6c-6-8-9-20-8-34z" fill="${scarf}"/><path d="M94 62c3 18-2 34-10 42l-6-6c6-8 9-20 8-34z" fill="${scarf}"/>`;
    } else if (style === 1) {
      // Chignon
      hairSvg = `<circle cx="64" cy="24" r="12" fill="${hair}"/><path d="M36 60c0-19 12-31 28-31s28 12 28 31c-6-10-15-15-28-15s-22 5-28 15z" fill="${hair}"/>`;
    } else {
      // Tresses
      hairSvg = `<path d="M36 60c0-19 12-31 28-31s28 12 28 31c-6-10-15-15-28-15s-22 5-28 15z" fill="${hair}"/><rect x="31" y="56" width="7" height="34" rx="3.5" fill="${hair}"/><rect x="90" y="56" width="7" height="34" rx="3.5" fill="${hair}"/>`;
    }
  } else {
    hairSvg =
      style === 2
        ? `<path d="M38 56c0-17 11-28 26-28s26 11 26 28c-5-7-14-11-26-11s-21 4-26 11z" fill="${hair}"/>`
        : `<path d="M37 58c0-18 12-30 27-30s27 12 27 30c-2-4-6-8-9-9-5 3-12 4-18 4s-13-1-18-4c-3 1-7 5-9 9z" fill="${hair}"/>`;
  }

  const collar = kind === 'teacher'
    ? `<path d="M52 98l12 12 12-12" fill="none" stroke="#fff" stroke-width="3" opacity=".85"/>`
    : `<path d="M50 98l14 10 14-10" fill="#fff" opacity=".95"/>`;
  const specs = glasses
    ? `<g fill="none" stroke="#0f172a" stroke-width="2"><circle cx="54" cy="64" r="7"/><circle cx="74" cy="64" r="7"/><path d="M61 64h6"/></g>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="128" height="128" fill="url(#b)"/><path d="M20 128c2-22 20-34 44-34s42 12 44 34z" fill="${cloth}"/>${collar}<rect x="56" y="80" width="16" height="18" rx="6" fill="${skin}"/><ellipse cx="64" cy="62" rx="24" ry="27" fill="${skin}"/><ellipse cx="40" cy="64" rx="4" ry="6" fill="${skin}"/><ellipse cx="88" cy="64" rx="4" ry="6" fill="${skin}"/>${hairSvg}<ellipse cx="54" cy="64" rx="3" ry="3.4" fill="#1b1210"/><ellipse cx="74" cy="64" rx="3" ry="3.4" fill="#1b1210"/><circle cx="55" cy="63" r="1" fill="#fff"/><circle cx="75" cy="63" r="1" fill="#fff"/>${specs}<path d="M56 76c5 5 11 5 16 0" fill="none" stroke="#3b1f12" stroke-width="2.4" stroke-linecap="round"/><path d="M47 55c3-2 7-2 10 0M71 55c3-2 7-2 10 0" stroke="${hair}" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Photo d'un élève ou d'un enseignant (vraie photo, sinon portrait illustré). */
export function photoOf(person, kind = 'student') {
  if (!person) return null;
  return person.photo || illustratedAvatar(person.id, person.gender, kind);
}

/** Photo associée à un compte utilisateur (élève ou enseignant), sinon null. */
export function userPhoto(state, user) {
  if (!user) return null;
  if (user.role === 'eleve') return photoOf(state.students.find((s) => s.id === user.personId), 'student');
  if (user.role === 'enseignant') return photoOf(state.teachers.find((t) => t.id === user.personId), 'teacher');
  return null;
}

/**
 * Prépare une photo pour l'enregistrement : recadrage carré centré, 256 px,
 * JPEG compressé (≈ 15 à 30 Ko). Navigateur uniquement.
 */
export function preparePhoto(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) {
      reject(new Error('Choisissez une image (photo).'));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      reject(new Error('Image trop lourde (15 Mo maximum).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire cette image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format d’image non pris en charge.'));
      img.onload = () => {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
