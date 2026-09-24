/**
 * Plugin PostCSS : ajoute top/right/bottom/left devant chaque `inset`.
 * La propriété `inset` n'existe pas avant Chrome 87 / iOS 14.5 : sans ce
 * repli, les fenêtres et décors positionnés s'afficheraient mal sur les
 * anciens téléphones.
 */
const SIDES = ['top', 'right', 'bottom', 'left'];

function expand(value) {
  const v = value.trim().split(/\s+/);
  if (v.length === 1) return [v[0], v[0], v[0], v[0]];
  if (v.length === 2) return [v[0], v[1], v[0], v[1]];
  if (v.length === 3) return [v[0], v[1], v[2], v[1]];
  return v.slice(0, 4);
}

module.exports = () => ({
  postcssPlugin: 'n1-inset-fallback',
  Declaration: {
    inset(decl) {
      if (decl.value.includes('var(')) return;
      const values = expand(decl.value);
      SIDES.forEach((side, i) => {
        const exists = decl.parent.some((d) => d.type === 'decl' && d.prop === side);
        if (!exists) decl.cloneBefore({ prop: side, value: values[i] });
      });
    },
  },
});
module.exports.postcss = true;
