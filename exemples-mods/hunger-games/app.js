/**
 * Interface du simulateur Hunger Games (mod de Codex).
 * Écrans : parties enregistrées → choix des tributs → déroulé phase par phase → podium et statistiques.
 * Les parties sont enregistrées dans les données du mod (collection « simulations »).
 */
(function () {
  'use strict';

  const E = window.HG_EVENTS;
  const H = window.HG_ENGINE;
  const app = document.getElementById('app');
  const COLLECTION = 'simulations';
  const GENDERS = { m: '♂', f: '♀', n: '⚧' };
  const GENDER_LABELS = { m: 'Masculin', f: 'Féminin', n: 'Neutre (iel)' };
  const LETHALITY = [
    { value: 'low', label: 'Basse' },
    { value: 'normal', label: 'Normale' },
    { value: 'high', label: 'Élevée' },
  ];

  const S = {
    ctx: null,
    characters: [],
    records: [],
    setup: { districts: 12, per: 2, lethality: 'normal', slots: [] },
    sim: null, // { tributes, game, stats, record? }
    phase: 0,
  };

  // ---------------------------------------------------------------------------
  // Outils
  // ---------------------------------------------------------------------------

  /** Crée un élément : h('button', { class: 'primary', onclick }, 'Texte', enfant…). */
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'style') for (const [k, v] of Object.entries(value)) el.style.setProperty(k, v);
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else if (key in el && typeof value !== 'string') el[key] = value;
      else el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  const render = (...nodes) => {
    app.replaceChildren(...nodes.flat(Infinity).filter((n) => n != null && n !== false));
  };
  const top = () => Codex.scrollToTop().catch(() => {});
  const fail = (error) => Codex.toast(error.message || String(error), 'error');

  const characterName = (c) => [c.firstname, c.name].filter(Boolean).join(' ').trim() || 'Sans nom';
  const guessGender = (c) => {
    const g = (c?.genders?.name || '').toLowerCase();
    if (/femme|fille|féminin|feminin|female|woman/.test(g)) return 'f';
    if (/non.?binaire|neutre|agenre|autre|fluide/.test(g)) return 'n';
    return 'm';
  };
  const districtColor = (d) => `hsl(${((d - 1) * 47) % 360} 62% 46%)`;
  const shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
  const formatDate = (iso) => new Date(iso).toLocaleString('fr', { dateStyle: 'medium', timeStyle: 'short' });
  const canCreate = () => Boolean(S.ctx?.user?.canCreate);
  const canDelete = (record) => S.ctx?.user && (S.ctx.user.isAdmin || record.createdBy === S.ctx.user.id);

  function avatar(t, { dead = false, size = '' } = {}) {
    const style = { '--district': districtColor(t.district) };
    const cls = ['avatar', size, dead && 'dead'].filter(Boolean).join(' ');
    return t.avatar
      ? h('img', { class: cls, style, src: Codex.imageUrl(t.avatar), alt: '', loading: 'lazy' })
      : h('span', { class: cls, style, 'aria-hidden': 'true' }, initials(t.name));
  }

  function nameEl(t, { dead = false, link = false } = {}) {
    const el = h('span', { class: `name${dead ? ' dead' : ''}`, style: { '--district': districtColor(t.district) } }, t.name);
    if (link && t.ref?.id) {
      el.style.cursor = 'pointer';
      el.title = 'Ouvrir la fiche';
      el.addEventListener('click', async () => Codex.navigate(await Codex.pathOf('characters', t.ref.id)).catch(fail));
    }
    return el;
  }

  /** Texte d'un événement, noms mis en forme (les tributs tués en rouge). */
  function eventText(event, tributes) {
    return H.renderParts(event.text, event.players, tributes).map((part) =>
      typeof part === 'string' ? part : nameEl(tributes[part.tribute], { dead: event.killed.includes(part.tribute) }),
    );
  }

  const listNames = (indexes, tributes) => {
    const out = [];
    indexes.forEach((idx, i) => {
      if (i) out.push(i === indexes.length - 1 ? ' et ' : ', ');
      out.push(nameEl(tributes[idx]));
    });
    return out.length ? out : ['—'];
  };

  // ---------------------------------------------------------------------------
  // Accueil : parties enregistrées
  // ---------------------------------------------------------------------------

  async function loadRecords() {
    S.records = await Codex.records.list(COLLECTION);
  }

  function renderHome() {
    Codex.setQuery({ simulation: null }).catch(() => {});
    const enough = S.characters.length >= 2;
    render(
      h('h1', {}, 'Hunger Games'),
      h('p', { class: 'muted' }, 'Les tributs de chaque district entrent dans l’arène. Un seul en ressortira vivant.'),
      h('div', { class: 'toolbar' },
        h('button', { class: 'primary', disabled: !enough, onclick: () => { initSetup(); renderSetup(); top(); } }, 'Nouvelle partie'),
        !enough && h('span', { class: 'muted small' }, 'Il faut au moins deux personnages dans l’univers.'),
      ),
      h('h2', {}, 'Parties enregistrées'),
      S.records.length
        ? h('ul', { class: 'saved' }, S.records.map((record) => {
          const data = record.data || {};
          const winner = data.game?.winner != null ? data.tributes?.[data.game.winner] : null;
          return h('li', { class: 'card' },
            winner ? avatar(winner) : h('span', { class: 'avatar' }, '✝'),
            h('div', { class: 'info' },
              h('div', { class: 'title' }, data.title || 'Partie sans titre'),
              h('div', { class: 'muted small' },
                winner ? ['Victoire de ', nameEl(winner)] : 'Aucun survivant',
                ` · ${data.tributes?.length || 0} tributs · ${data.game?.days || '?'} jours · ${record.author?.displayName || '?'}, ${formatDate(record.createdAt)}`,
              ),
            ),
            h('button', { onclick: () => openRecord(record) }, 'Voir'),
            canDelete(record) && h('button', { class: 'danger', onclick: () => deleteRecord(record) }, 'Supprimer'),
          );
        }))
        : h('p', { class: 'muted' }, 'Aucune partie enregistrée pour l’instant.'),
    );
  }

  async function deleteRecord(record) {
    if (!confirm(`Supprimer « ${record.data?.title || 'cette partie'} » ?`)) return;
    try {
      await Codex.records.remove(record.id);
      await loadRecords();
      Codex.toast('Partie supprimée.', 'success');
      if (S.sim?.record?.id === record.id) S.sim = null;
      renderHome();
    } catch (error) {
      fail(error);
    }
  }

  function openRecord(record) {
    const { tributes, game } = record.data;
    // Avatars à jour si le personnage existe toujours
    const byId = new Map(S.characters.map((c) => [c.id, c]));
    const fresh = tributes.map((t) => ({ ...t, avatar: byId.get(t.ref?.id)?.avatar ?? t.avatar }));
    S.sim = { tributes: fresh, game, stats: H.computeStats(game, fresh.length), record, settings: record.data.settings };
    Codex.setQuery({ simulation: record.id }).catch(() => {});
    renderResults();
    top();
  }

  // ---------------------------------------------------------------------------
  // Choix des tributs
  // ---------------------------------------------------------------------------

  const EMPTY = { value: '', gender: null };

  /** Nouvelle moisson : toutes les places tirées au sort (modifiables ensuite). */
  function initSetup() {
    const { districts, per } = S.setup;
    S.setup.slots = Array.from({ length: districts * per }, () => ({ ...EMPTY }));
    drawSlots(() => true);
  }

  /** Nouveau nombre de districts / de tributs : chaque district garde ses tributs, les nouvelles places sont tirées au sort. */
  function resizeSlots(oldPer) {
    const old = S.setup.slots;
    const { districts, per } = S.setup;
    const added = [];
    S.setup.slots = Array.from({ length: districts * per }, (_, i) => {
      const previous = old[Math.floor(i / per) * oldPer + (i % per)];
      if (i % per < oldPer && previous) return previous;
      added.push(i);
      return { ...EMPTY };
    });
    drawSlots((_, i) => added.includes(i));
  }

  /**
   * Tire au sort un personnage pour chaque place retenue par `which(slot, index)`,
   * parmi ceux qui ne sont pas déjà dans les autres places. Plus de personnage disponible : place vide.
   */
  function drawSlots(which) {
    const slots = S.setup.slots;
    const targets = slots.map((slot, i) => (which(slot, i) ? i : -1)).filter((i) => i >= 0);
    const kept = new Set(slots.filter((_, i) => !targets.includes(i)).map((s) => s.value).filter(Boolean));
    const pool = shuffle(S.characters.filter((c) => !kept.has(String(c.id))));
    for (const i of targets) {
      const character = pool.shift();
      slots[i] = character ? { value: String(character.id), gender: null } : { ...EMPTY };
    }
  }

  const slotCharacter = (slot) => (slot.value ? S.characters.find((c) => String(c.id) === slot.value) : null);
  const slotGender = (slot) => slot.gender || (slotCharacter(slot) ? guessGender(slotCharacter(slot)) : null);

  function renderSetup() {
    const { districts, per, slots } = S.setup;
    const sorted = [...S.characters].sort((a, b) => characterName(a).localeCompare(characterName(b), 'fr'));
    const used = new Set(slots.map((s) => s.value).filter(Boolean));

    const numberInput = (label, key, min, max) =>
      h('label', {}, label, h('input', {
        type: 'number', min, max, value: S.setup[key], style: { width: '6rem' },
        onchange: (e) => {
          const oldPer = S.setup.per;
          S.setup[key] = Math.max(min, Math.min(max, Number(e.target.value) || min));
          resizeSlots(oldPer);
          renderSetup();
        },
      }));

    const draw = (which) => {
      drawSlots(which);
      renderSetup();
    };

    const filled = slots.filter((s) => s.value).length;

    render(
      h('div', { class: 'toolbar' }, h('button', { class: 'ghost', onclick: () => { renderHome(); top(); } }, '← Parties')),
      h('h1', {}, 'Moisson'),
      h('p', { class: 'muted' }, 'Les tributs ont été tirés au sort : changez-les à la main ou relancez le tirage (🎲) d’une place. Le symbole ♂ ♀ ⚧ règle les accords (il, elle, iel).'),
      h('div', { class: 'toolbar' },
        numberInput('Districts', 'districts', 1, 24),
        numberInput('Tributs par district', 'per', 1, 4),
        h('label', {}, 'Létalité', h('select', { onchange: (e) => { S.setup.lethality = e.target.value; } },
          LETHALITY.map((l) => h('option', { value: l.value, selected: l.value === S.setup.lethality }, l.label)))),
        h('span', { class: 'grow' }),
        h('button', { onclick: () => draw(() => true) }, '🎲 Nouveau tirage'),
        h('button', { onclick: () => draw((slot) => !slot.value) }, 'Compléter au hasard'),
        h('button', { onclick: () => { S.setup.slots = slots.map(() => ({ value: '', gender: null })); renderSetup(); } }, 'Vider'),
      ),
      h('div', { class: 'districts' }, Array.from({ length: districts }, (_, d) =>
        h('section', { class: 'card district', style: { '--district': districtColor(d + 1) } },
          h('h3', {}, `District ${d + 1}`),
          Array.from({ length: per }, (_, p) => {
            const index = d * per + p;
            const slot = slots[index];
            const gender = slotGender(slot);
            return h('div', { class: 'slot' },
              h('select', {
                'aria-label': `District ${d + 1}, tribut ${p + 1}`,
                onchange: (e) => {
                  slots[index] = { value: e.target.value, gender: null };
                  renderSetup();
                },
              },
                h('option', { value: '', selected: !slot.value }, '— Vide —'),
                sorted.map((c) => h('option', {
                  value: String(c.id),
                  selected: slot.value === String(c.id),
                  disabled: used.has(String(c.id)) && slot.value !== String(c.id),
                }, characterName(c))),
              ),
              h('button', {
                class: 'gender small',
                title: 'Tirer un autre personnage au sort',
                'aria-label': `Tirer au sort le tribut ${p + 1} du district ${d + 1}`,
                disabled: used.size - (slot.value ? 1 : 0) >= S.characters.length,
                onclick: () => draw((_, i) => i === index),
              }, '🎲'),
              h('button', {
                class: 'gender small',
                disabled: !slot.value,
                title: gender ? `Accords : ${GENDER_LABELS[gender]} (cliquer pour changer)` : 'Aucun tribut',
                onclick: () => {
                  const order = ['m', 'f', 'n'];
                  slots[index] = { ...slot, gender: order[(order.indexOf(gender || 'm') + 1) % 3] };
                  renderSetup();
                },
              }, gender ? GENDERS[gender] : '?'),
            );
          }),
        ),
      )),
      h('div', { class: 'nav' },
        h('span', { class: 'muted small' },
          `${filled} tribut${filled > 1 ? 's' : ''} sur ${slots.length} places`,
          filled < slots.length ? ' · les places vides sont ignorées' : '',
        ),
        h('button', { class: 'primary', onclick: launch }, 'Que les jeux commencent !'),
      ),
    );
  }

  /** Lance la simulation avec les tributs affichés. */
  function launch() {
    const { slots, per } = S.setup;
    const tributes = [];
    slots.forEach((slot, index) => {
      const character = slotCharacter(slot);
      if (!character) return;
      tributes.push({
        ref: { type: 'character', id: character.id },
        name: characterName(character),
        avatar: character.avatar || null,
        gender: slotGender(slot),
        district: Math.floor(index / per) + 1,
      });
    });
    if (tributes.length < 2) {
      Codex.toast('Il faut au moins deux tributs.', 'error');
      return;
    }
    startGame(tributes, { lethality: S.setup.lethality });
  }

  function startGame(tributes, settings) {
    const game = H.simulate(tributes, { lethality: settings.lethality }, E);
    S.sim = { tributes, game, stats: H.computeStats(game, tributes.length), settings };
    S.phase = 0;
    Codex.setQuery({ simulation: null }).catch(() => {});
    renderPhase();
    top();
  }

  // ---------------------------------------------------------------------------
  // Déroulé
  // ---------------------------------------------------------------------------

  function aliveAfter(phaseIndex) {
    const dead = new Set();
    S.sim.game.phases.slice(0, phaseIndex + 1).forEach((p) => p.events.forEach((e) => e.killed.forEach((k) => dead.add(k))));
    return S.sim.tributes.length - dead.size;
  }

  function renderPhase() {
    const { tributes, game } = S.sim;
    const phase = game.phases[S.phase];
    const total = game.phases.length;
    const go = (i) => { S.phase = i; renderPhase(); top(); };

    let body;
    if (phase.kind === 'fallen') {
      body = phase.fallen.length
        ? [
          h('p', { class: 'intro' }, `${phase.fallen.length} coup${phase.fallen.length > 1 ? 's' : ''} de canon retenti${phase.fallen.length > 1 ? 'ssent' : 't'} au loin.`),
          h('ul', { class: 'fallen' }, phase.fallen.map((idx) => h('li', { class: 'card' },
            avatar(tributes[idx], { size: 'big', dead: true }),
            nameEl(tributes[idx]),
            h('span', { class: 'muted small' }, `District ${tributes[idx].district}`),
          ))),
        ]
        : [h('p', { class: 'intro' }, 'Aucun coup de canon ne retentit cette nuit.')];
    } else {
      body = [
        phase.intro && h('p', { class: 'intro' }, phase.intro),
        h('ul', { class: 'events' }, phase.events.map((event) =>
          h('li', { class: `card event${event.killed.length ? ' fatal' : ''}` },
            h('span', { class: 'faces' }, event.players.map((idx) => avatar(tributes[idx], { dead: event.killed.includes(idx) }))),
            h('span', {}, eventText(event, tributes)),
          ),
        )),
      ];
    }

    const last = S.phase === total - 1;
    render(
      h('div', { class: 'toolbar' },
        h('button', { class: 'ghost', onclick: () => { renderResults(); top(); } }, 'Aller aux résultats'),
      ),
      h('div', { class: 'phase-head' },
        h('div', {},
          h('div', { class: 'phase-kind' }, phase.kind === 'fallen' ? `Fin du jour ${phase.day}` : `Jour ${phase.day}`),
          h('h1', {}, phase.title),
        ),
        h('span', { class: 'muted' }, `${aliveAfter(S.phase)} tribut${aliveAfter(S.phase) > 1 ? 's' : ''} en vie`),
      ),
      body,
      h('div', { class: 'nav' },
        h('button', { disabled: S.phase === 0, onclick: () => go(S.phase - 1) }, '← Précédent'),
        h('div', { class: 'progress', title: `Phase ${S.phase + 1} sur ${total}` }, h('span', { style: { width: `${((S.phase + 1) / total) * 100}%` } })),
        last
          ? h('button', { class: 'primary', onclick: () => { renderResults(); top(); } }, 'Résultats →')
          : h('button', { class: 'primary', onclick: () => go(S.phase + 1) }, 'Suivant →'),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Résultats : podium et statistiques
  // ---------------------------------------------------------------------------

  function renderResults() {
    const { tributes, game, stats, record } = S.sim;
    const byPlace = [...stats].sort((a, b) => a.place - b.place);
    const winner = game.winner != null ? tributes[game.winner] : null;
    // Morts : au combat (un tueur au moins) ou par l'arène / un accident
    const dead = stats.filter((s) => !s.alive);
    const combatDeaths = dead.filter((s) => s.killedBy.length).length;
    const maxKills = Math.max(...stats.map((s) => s.kills));
    const topKillers = stats.filter((s) => s.kills === maxKills && maxKills > 0);
    const first = stats.find((s) => s.deathOrder === 0);
    const districts = H.districtStats(stats, tributes);

    const step = (place) => {
      const s = byPlace[place - 1];
      if (!s) return h('div');
      const t = tributes[s.index];
      return h('div', { class: `step p${place}` },
        avatar(t, { size: 'big', dead: !s.alive }),
        nameEl(t, { link: true }),
        h('span', { class: 'muted small' }, `District ${t.district} · ${s.kills} victime${s.kills > 1 ? 's' : ''}`),
        h('div', { class: 'block' }, place),
      );
    };

    const highlight = (label, value, detail) => h('div', { class: 'card highlight' },
      h('div', { class: 'muted small' }, label), h('div', { class: 'value' }, value), detail && h('div', { class: 'muted small' }, detail));

    const defaultTitle = `Hunger Games — ${winner ? `victoire de ${winner.name}` : 'aucun survivant'}`;
    let titleInput;
    const saveSection = record
      ? h('div', { class: 'save-row' },
        h('span', { class: 'muted' }, `Enregistrée par ${record.author?.displayName || '?'} le ${formatDate(record.createdAt)}.`),
        canDelete(record) && h('button', { class: 'danger', onclick: () => deleteRecord(record) }, 'Supprimer cette partie'))
      : canCreate()
        ? h('div', { class: 'save-row' },
          h('label', { style: { flex: '1' } }, 'Titre', titleInput = h('input', { type: 'text', value: defaultTitle, maxlength: '120' })),
          h('button', { class: 'primary', onclick: (e) => save(e.currentTarget, titleInput.value) }, 'Enregistrer la partie'))
        : h('p', { class: 'muted small' }, 'Seuls les éditeurs peuvent enregistrer une partie.');

    render(
      h('div', { class: 'toolbar' },
        h('button', { class: 'ghost', onclick: () => { renderHome(); top(); } }, '← Parties'),
        h('span', { class: 'grow' }),
        h('button', { onclick: () => { S.phase = 0; renderPhase(); top(); } }, 'Revoir le déroulé'),
        h('button', { onclick: () => startGame(tributes.map(({ ref, name, avatar: a, gender, district }) => ({ ref, name, avatar: a, gender, district })), S.sim.settings || {}) }, 'Rejouer avec les mêmes tributs'),
        h('button', { onclick: () => { initSetup(); renderSetup(); top(); } }, 'Nouvelle partie'),
      ),
      h('div', { class: 'card winner' },
        h('div', { class: 'label' }, record?.data?.title || 'Fin des jeux'),
        winner
          ? [avatar(winner, { size: 'huge' }), h('div', { class: 'title' }, nameEl(winner, { link: true })), h('div', { class: 'muted' }, `Vainqueur des Hunger Games · District ${winner.district}`)]
          : h('div', { class: 'title' }, 'Aucun survivant'),
        h('div', { class: 'podium' }, step(2), step(1), step(3)),
      ),

      h('h2', {}, 'Faits marquants'),
      h('div', { class: 'highlights' },
        highlight('Durée', `${game.days} jour${game.days > 1 ? 's' : ''}`, `${tributes.length} tributs`),
        highlight('Morts au combat', String(combatDeaths), `${dead.length - combatDeaths} par l’arène ou par accident`),
        highlight('Plus redoutable', topKillers.length ? listNames(topKillers.map((s) => s.index), tributes) : '—', topKillers.length ? `${maxKills} victime${maxKills > 1 ? 's' : ''}` : 'Aucune victime'),
        first && highlight('Premier sang', nameEl(tributes[first.index]), first.killedBy.length ? ['Tué par ', listNames(first.killedBy, tributes)] : first.deathTitle),
      ),

      h('h2', {}, 'Classement des tributs'),
      h('div', { class: 'card table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', { class: 'num' }, '#'), h('th', {}, 'Tribut'), h('th', {}, 'District'), h('th', { class: 'num' }, 'Victimes'), h('th', {}, 'Tués'), h('th', {}, 'Mort'))),
        h('tbody', {}, byPlace.map((s) => {
          const t = tributes[s.index];
          return h('tr', {},
            h('td', { class: 'num' }, s.place),
            h('td', {}, h('span', { class: 'who' }, avatar(t, { dead: !s.alive }), nameEl(t, { link: true }))),
            h('td', {}, t.district),
            h('td', { class: 'num' }, s.kills),
            h('td', {}, s.victims.length ? listNames(s.victims, tributes) : h('span', { class: 'muted' }, '—')),
            h('td', {}, s.alive
              ? h('strong', {}, 'Survivant')
              : [s.deathTitle, s.killedBy.length ? [h('span', { class: 'muted' }, ' · par '), listNames(s.killedBy, tributes)] : null]),
          );
        })),
      )),

      h('h2', {}, 'Classement des districts'),
      h('div', { class: 'card table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'District'), h('th', {}, 'Tributs'), h('th', { class: 'num' }, 'Meilleure place'), h('th', { class: 'num' }, 'Victimes'))),
        h('tbody', {}, districts.map((d) => h('tr', {},
          h('td', {}, h('span', { class: 'name', style: { '--district': districtColor(d.district) } }, `District ${d.district}`)),
          h('td', {}, listNames(d.members, tributes)),
          h('td', { class: 'num' }, d.best),
          h('td', { class: 'num' }, d.kills),
        ))),
      )),

      h('h2', {}, 'Enregistrement'),
      saveSection,
    );
  }

  async function save(button, title) {
    button.disabled = true;
    try {
      const { tributes, game, settings } = S.sim;
      // Les tributs gardent une référence { type, id } vers leur fiche (conservée à l'export de l'univers)
      const record = await Codex.records.create(COLLECTION, {
        version: 1,
        title: title.trim().slice(0, 120) || 'Hunger Games',
        settings: settings || {},
        tributes,
        game,
      });
      S.sim.record = record;
      await loadRecords();
      Codex.toast('Partie enregistrée.', 'success');
      Codex.setQuery({ simulation: record.id }).catch(() => {});
      renderResults();
    } catch (error) {
      button.disabled = false;
      fail(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Démarrage
  // ---------------------------------------------------------------------------

  if (!window.Codex) {
    render(h('p', { class: 'error' }, 'Le SDK de Codex n’a pas pu être chargé (/mod-files/codex-sdk.js).'));
    return;
  }
  Codex.ready()
    .then(async (ctx) => {
      S.ctx = ctx;
      const [characters] = await Promise.all([Codex.entities.list('characters'), loadRecords()]);
      S.characters = characters;
      const wanted = Number(ctx.query?.simulation);
      const record = wanted && S.records.find((r) => r.id === wanted);
      if (record) openRecord(record);
      else renderHome();
    })
    .catch((error) => render(h('p', { class: 'error' }, `Erreur : ${error.message}`)));
})();
