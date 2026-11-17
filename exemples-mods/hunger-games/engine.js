/**
 * Moteur du simulateur Hunger Games (sans interface : utilisable dans le navigateur ou sous Node).
 *
 * Déroulé : bain de sang, puis chaque jour : (festin, une fois) → jour → (événement de l'arène, parfois)
 * → nuit → coups de canon, jusqu'à ce qu'il ne reste qu'un tribut.
 * À chaque phase, les tributs vivants sont mélangés puis répartis dans des événements (1 à 6 tributs).
 */
(function (root) {
  'use strict';

  const PHASE_TITLES = {
    bloodbath: 'Le bain de sang',
    day: 'Jour',
    night: 'Nuit',
    feast: 'Le festin',
    arena: 'Événement de l’arène',
    fallen: 'Coups de canon',
  };

  // Probabilité qu'un événement soit mortel, selon la phase (multipliée par la létalité)
  const FATAL_RATE = { bloodbath: 0.35, day: 0.16, night: 0.2, feast: 0.4 };
  const ARENA_DEATH_RATE = 0.45;
  const LETHALITY = { low: 0.6, normal: 1, high: 1.5 };
  const MAX_DAYS = 60;

  /** Générateur pseudo-aléatoire reproductible (mulberry32). */
  function makeRng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const shuffle = (list, rng) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const pick = (list, rng) => list[Math.floor(rng() * list.length)];

  /**
   * Simule une partie.
   * - tributes : [{ name, gender: 'm' | 'f' | 'n', district }] (seul le nombre compte pour le moteur)
   * - options  : { seed, lethality: 'low' | 'normal' | 'high' }
   * - events   : banque d'événements (window.HG_EVENTS)
   * Renvoie { seed, phases: [{ kind, day, title, intro?, events: [{ text, players, killed, killers }], fallen? }], winner, days }.
   */
  function simulate(tributes, options, events) {
    const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);
    const rng = makeRng(seed);
    const lethality = LETHALITY[options.lethality] || 1;
    const alive = new Set(tributes.map((_, i) => i));
    const phases = [];
    let fallenSince = [];
    const feastDay = 3 + Math.floor(rng() * 4); // jour 3 à 6
    const usedDisasters = new Set();

    const runPhase = (kind, day, safePool, fatalPool) => {
      // Les combats s'intensifient avec les jours
      const rate = Math.min(0.9, (FATAL_RATE[kind] + Math.max(0, day - 4) * 0.03) * lethality);
      const remaining = shuffle([...alive], rng);
      const results = [];
      while (remaining.length) {
        const wantFatal = alive.size > 1 && rng() < rate;
        const fits = (e) => e.n <= remaining.length && (e.killed?.length || 0) < alive.size;
        let pool = wantFatal ? fatalPool.filter(fits) : [];
        if (!pool.length) pool = safePool.filter(fits);
        if (!pool.length) pool = safePool.filter((e) => e.n === 1);
        const event = pick(pool, rng);
        const players = remaining.splice(0, event.n);
        results.push(apply(event, players));
      }
      phases.push({ kind, day, title: kind === 'day' || kind === 'night' ? `${PHASE_TITLES[kind]} ${day}` : PHASE_TITLES[kind], events: results });
    };

    // Applique un événement : morts, tueurs ; renvoie l'entrée du journal
    const apply = (event, players) => {
      const killed = (event.killed || []).map((n) => players[n - 1]);
      const at = (n) => players[n - 1];
      const perVictim = event.killers && !Array.isArray(event.killers);
      // Tueurs de chaque victime (index des tributs) ; `killers` : tous les tueurs de l'événement
      const killedBy = {};
      for (const n of event.killed || []) {
        const list = perVictim ? event.killers[n] || [] : event.killers || [];
        killedBy[at(n)] = list.map(at).filter((k) => k !== at(n));
      }
      const killers = [...new Set(Object.values(killedBy).flat())];
      for (const idx of killed) {
        alive.delete(idx);
        fallenSince.push(idx);
      }
      return { text: event.text, players, killed, killers, killedBy };
    };

    const runArena = (day) => {
      const choices = events.arena.map((a, i) => i).filter((i) => !usedDisasters.has(i));
      if (!choices.length) return;
      const index = pick(choices, rng);
      usedDisasters.add(index);
      const disaster = events.arena[index];
      const remaining = shuffle([...alive], rng);
      const results = [];
      while (remaining.length) {
        const fits = (e) => e.n <= remaining.length && (e.killed?.length || 0) < alive.size;
        const deadly = alive.size > 1 && rng() < Math.min(0.85, ARENA_DEATH_RATE * lethality);
        const pool = deadly ? disaster.fatal.filter(fits) : [];
        const event = pick(pool.length ? pool : disaster.survive, rng);
        results.push(apply(event, remaining.splice(0, event.n)));
      }
      phases.push({ kind: 'arena', day, title: PHASE_TITLES.arena, intro: disaster.intro, events: results });
    };

    const cannons = (day) => {
      phases.push({ kind: 'fallen', day, title: PHASE_TITLES.fallen, events: [], fallen: fallenSince });
      fallenSince = [];
    };

    let day = 1;
    runPhase('bloodbath', 1, events.bloodbath, events.bloodbathFatal);
    while (alive.size > 1 && day <= MAX_DAYS) {
      if (day === feastDay && alive.size > 2) runPhase('feast', day, events.feast, events.feastFatal);
      if (alive.size > 1) runPhase('day', day, events.day, events.fatal);
      if (alive.size > 1 && day >= 2 && rng() < 0.22) runArena(day);
      if (alive.size > 1) runPhase('night', day, events.night, events.fatal);
      cannons(day);
      day++;
    }
    if (fallenSince.length) cannons(day);
    const winner = alive.size === 1 ? [...alive][0] : null;
    return { seed, lethality: options.lethality || 'normal', phases, winner, days: Math.min(day, MAX_DAYS) };
  }

  // ---------------------------------------------------------------------------
  // Texte
  // ---------------------------------------------------------------------------

  const PRONOUNS = {
    m: { il: 'il', le: 'le', lui: 'lui', e: '' },
    f: { il: 'elle', le: 'la', lui: 'elle', e: 'e' },
    n: { il: 'iel', le: 'lea', lui: 'iel', e: '·e' },
  };

  /**
   * Découpe le texte d'un événement en morceaux : chaînes, et { tribute: index } pour les noms.
   * `players` : index des tributs ; `tributes` : [{ name, gender }].
   */
  function renderParts(text, players, tributes) {
    const parts = [];
    const re = /\{(Il|il|le|lui|e)?(\d)\}/g;
    let last = 0;
    let match;
    while ((match = re.exec(text))) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      const idx = players[Number(match[2]) - 1];
      const tribute = tributes[idx];
      if (!match[1]) parts.push({ tribute: idx });
      else {
        const forms = PRONOUNS[tribute?.gender] || PRONOUNS.m;
        const word = forms[match[1].toLowerCase()];
        parts.push(match[1] === 'Il' ? word.charAt(0).toUpperCase() + word.slice(1) : word);
      }
      last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    // Morceaux de texte consécutifs fusionnés
    return parts.reduce((out, p) => {
      if (typeof p === 'string' && typeof out[out.length - 1] === 'string') out[out.length - 1] += p;
      else out.push(p);
      return out;
    }, []);
  }

  /** Texte brut d'un événement (noms compris). */
  const renderText = (text, players, tributes) =>
    renderParts(text, players, tributes).map((p) => (typeof p === 'string' ? p : tributes[p.tribute]?.name || '?')).join('');

  // ---------------------------------------------------------------------------
  // Résultats
  // ---------------------------------------------------------------------------

  /**
   * Statistiques par tribut : { index, place, kills, victims, killedBy, deathPhase, deathDay, alive }.
   * Classement : le vainqueur, puis les tributs du dernier mort au premier.
   */
  function computeStats(game, tributeCount) {
    const stats = Array.from({ length: tributeCount }, (_, index) => ({
      index, kills: 0, victims: [], killedBy: [], deathOrder: null, deathPhase: null, deathDay: null, alive: true,
    }));
    let order = 0;
    game.phases.forEach((phase, phaseIndex) => {
      for (const event of phase.events) {
        for (const victim of event.killed) {
          const s = stats[victim];
          s.alive = false;
          s.deathOrder = order++;
          s.deathPhase = phaseIndex;
          s.deathDay = phase.day;
          s.deathTitle = phase.title;
          // Parties enregistrées avant l'attribution par victime : tous les tueurs de l'événement
          s.killedBy = (event.killedBy?.[victim] ?? event.killers).filter((k) => k !== victim);
          for (const killer of s.killedBy) {
            stats[killer].kills++;
            stats[killer].victims.push(victim);
          }
        }
      }
    });
    const ranked = [...stats].sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return (b.deathOrder ?? 0) - (a.deathOrder ?? 0);
    });
    ranked.forEach((s, i) => {
      s.place = i + 1;
    });
    return stats;
  }

  /** Classement des districts : meilleure place, total de morts infligées, survivants. */
  function districtStats(stats, tributes) {
    const byDistrict = new Map();
    stats.forEach((s) => {
      const district = tributes[s.index].district;
      if (!byDistrict.has(district)) byDistrict.set(district, { district, best: Infinity, kills: 0, members: [] });
      const d = byDistrict.get(district);
      d.best = Math.min(d.best, s.place);
      d.kills += s.kills;
      d.members.push(s.index);
    });
    return [...byDistrict.values()].sort((a, b) => a.best - b.best || b.kills - a.kills);
  }

  const api = { simulate, renderParts, renderText, computeStats, districtStats, PHASE_TITLES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HG_ENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
