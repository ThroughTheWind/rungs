const $ = (id) => document.getElementById(id);
const state = {
  data: null,
  view: 'work',
  search: '',
  status: 'all',
  type: 'all',
  archive: 'live',
  kind: 'items',
  group: false,
  page: 0,
  surface: 'all',
  gateMode: 'registry',
  diagnostics: null,
  busy: false,
  job: null,
  jobs: [],
};
const PAGE = 50;
const fragment = location.hash.slice(1);
history.replaceState(null, '', location.pathname);
let token = /^[\w-]{43}$/.test(fragment) ? fragment : '';
try {
  if (token) sessionStorage.setItem('rungs-access', token);
  else token = sessionStorage.getItem('rungs-access') || '';
} catch {
  /* memory access remains available */
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'text') node.textContent = String(value);
    else if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  node.append(...children.flat(Infinity).filter((child) => child !== null && child !== undefined));
  return node;
}
const btn = (label, action, cls = '', attrs = {}) =>
  el('button', { type: 'button', class: cls, onclick: action, ...attrs }, label);
const replace = (node, ...children) =>
  node.replaceChildren(
    ...children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false),
  );
const badge = (value) =>
  el('span', { class: `badge ${String(value).replace(/[^\w-]/g, '')}`, text: String(value).replaceAll('_', ' ') });
const text = (value) =>
  value === undefined || value === null ? 'Not recorded' : typeof value === 'string' ? value : JSON.stringify(value);
const date = (value) => (value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString() : text(value));
let observedGeneration = null;
function evidenceAge(result) {
  return el('p', {
    class: 'muted subtle',
    'data-generation': result.generation,
    'data-inconsistent': String(!!result.changed),
    role: 'status',
  });
}
function markEvidence() {
  document.querySelectorAll('[data-generation]').forEach((node) => {
    const matches =
      observedGeneration && node.dataset.generation === observedGeneration && node.dataset.inconsistent !== 'true';
    node.textContent = `Source generation ${node.dataset.generation.slice(0, 12)}. ${matches ? 'Matches the latest observed files; external inputs are not certified.' : 'Historical or unverified source; refresh and request a new pass before acting.'}`;
  });
}
const notice = (message) => {
  $('notice').textContent = message;
  $('notice').hidden = false;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => {
    $('notice').hidden = true;
  }, 5000);
};
async function api(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error?.message || `Request failed (${response.status}).`);
  return value;
}
async function action(work) {
  try {
    await work();
  } catch (error) {
    notice(error.message);
  }
}
function copy(value) {
  void action(async () => {
    await navigator.clipboard.writeText(value);
    notice('Copied.');
  });
}
function sourceButton(path, label = path, line) {
  return btn(
    label,
    () => {
      void action(() => openSource(path, line));
    },
    'link',
  );
}
function sourceRow(path, line) {
  return el(
    'div',
    { class: 'source-row' },
    sourceButton(path, `${path}${line ? `:${line}` : ''}`, line),
    btn('Copy path', () => copy(path), 'quiet'),
  );
}
function issuesBox(issues, heading = 'Some information could not be read') {
  if (!issues?.length) return null;
  return el(
    'div',
    { class: 'callout' },
    el('strong', { text: heading }),
    el(
      'ul',
      {},
      issues.map((i) => el('li', {}, typeof i === 'string' ? i : `${i.path}: ${i.message}`)),
    ),
  );
}
function empty(title, message, extra) {
  return el('div', { class: 'empty' }, el('h2', { text: title }), el('p', { text: message }), extra);
}
function heading(title, description, actions) {
  return el(
    'div',
    { class: 'page-heading' },
    el('div', {}, el('h1', { text: title }), el('p', { text: description })),
    actions && el('div', { class: 'heading-actions' }, actions),
  );
}
function grid(entries) {
  return el(
    'dl',
    { class: 'details-grid' },
    entries.map(([key, value]) => [el('dt', { text: key }), el('dd', {}, value instanceof Node ? value : text(value))]),
  );
}
function table(headers, rows) {
  return el(
    'div',
    { class: 'table-wrap' },
    el(
      'table',
      {},
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          headers.map((header) => el('th', { scope: 'col', text: header })),
        ),
      ),
      el('tbody', {}, rows),
    ),
  );
}
function tabs(options, active, set) {
  return el(
    'div',
    { class: 'tabs', role: 'group', 'aria-label': 'Display' },
    options.map(([key, title]) =>
      btn(
        title,
        () => {
          set(key);
          state.page = 0;
          render();
        },
        key === active ? 'active' : '',
        { 'aria-pressed': key === active },
      ),
    ),
  );
}
function select(id, label, values, chosen, change) {
  const node = el(
    'select',
    {
      id,
      'aria-label': label,
      onchange: (event) => {
        change(event.target.value);
        state.page = 0;
        render();
      },
    },
    values.map(([value, title]) => el('option', { value, text: title })),
  );
  node.value = chosen;
  return el('label', {}, label, node);
}
function searchBox() {
  return el('input', {
    id: 'search',
    type: 'search',
    value: state.search,
    'aria-label': 'Search this view',
    placeholder: 'Search ids, titles or evidence…',
    oninput: (event) => {
      state.search = event.target.value;
      state.page = 0;
      render();
    },
  });
}
function matches(value) {
  return !state.search || value.toLowerCase().includes(state.search.toLowerCase());
}
function pageRows(rows) {
  state.page = Math.min(state.page, Math.max(0, Math.ceil(rows.length / PAGE) - 1));
  return rows.slice(state.page * PAGE, (state.page + 1) * PAGE);
}
function pagination(count) {
  return el(
    'div',
    { class: 'pagination' },
    el('span', {
      text: count ? `${state.page * PAGE + 1}–${Math.min((state.page + 1) * PAGE, count)} of ${count}` : '0 records',
    }),
    btn(
      'Previous',
      () => {
        state.page--;
        render();
      },
      '',
      { disabled: state.page === 0 },
    ),
    btn(
      'Next',
      () => {
        state.page++;
        render();
      },
      '',
      { disabled: (state.page + 1) * PAGE >= count },
    ),
  );
}

let detailFocus;
// Bounded local timing probes for the fixture walkthrough; never sent or persisted.
function recordRender(node, started) {
  node.dataset.renderCommitMs = (performance.now() - started).toFixed(2);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      node.dataset.renderFrameMs = (performance.now() - started).toFixed(2);
    }),
  );
}
function showDetail(title, children, started = performance.now()) {
  if (!$('detail').open) detailFocus = document.activeElement;
  $('detail-title').textContent = title;
  replace($('detail-content'), children);
  if (!$('detail').open) $('detail').showModal();
  $('detail').scrollTop = 0;
  markEvidence();
  $('close-detail').focus({ preventScroll: true });
  recordRender($('detail'), started);
}
$('close-detail').onclick = () => $('detail').close();
$('detail').addEventListener('close', () => {
  if (detailFocus?.isConnected) detailFocus.focus();
  else $('main').focus({ preventScroll: true });
});
$('detail').addEventListener('click', (event) => {
  if (event.target === $('detail') && event.clientX < $('detail').getBoundingClientRect().left) $('detail').close();
});

// Render a small, inert Markdown subset. All repository text enters through text nodes, never HTML.
function inline(value, links = []) {
  const nodes = [];
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|(?<!!)\[[^\]\n]*\]\((?:<[^>\n]+>|[^)\s]+)(?:\s+"[^"]*")?\))/g;
  let start = 0;
  for (const match of value.matchAll(pattern)) {
    nodes.push(value.slice(start, match.index));
    const part = match[0];
    if (part.startsWith('`')) nodes.push(el('code', { text: part.slice(1, -1) }));
    else if (part.startsWith('**')) nodes.push(el('strong', { text: part.slice(2, -2) }));
    else {
      const parsed = /^\[([^\]]*)\]\((<[^>]+>|[^)\s]+)/.exec(part);
      const label = parsed?.[1] || part,
        target = parsed?.[2]?.replace(/^<|>$/g, '') || '';
      const known = links.find((link) => link.target === target);
      if (known?.path && known.exists) nodes.push(sourceButton(known.path, label, known.line));
      else if (/^https?:\/\//i.test(target))
        nodes.push(el('a', { href: target, target: '_blank', rel: 'noopener noreferrer', text: label }));
      else nodes.push(el('span', { text: label, title: known?.exists === false ? `Unresolved: ${target}` : target }));
    }
    start = match.index + part.length;
  }
  nodes.push(value.slice(start));
  return nodes;
}
const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll('\\|', '|'));
function markdown(value, links = []) {
  const content = el('div', { class: 'document' });
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (/^\s*(```|~~~)/.test(line)) {
      const delimiter = line.trim().slice(0, 3),
        code = [];
      while (++i < lines.length && !lines[i].trimStart().startsWith(delimiter)) code.push(lines[i]);
      content.append(el('pre', {}, el('code', { text: code.join('\n') })));
      continue;
    }
    const headingMatch = /^(#{1,6})\s+(.+)/.exec(line);
    if (headingMatch) {
      content.append(el(`h${Math.min(4, Math.max(2, headingMatch[1].length))}`, {}, inline(headingMatch[2], links)));
      continue;
    }
    if (/^\s*\|/.test(line) && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || '')) {
      const heads = cells(line),
        rows = [];
      i++;
      while (/^\s*\|/.test(lines[i + 1] || ''))
        rows.push(
          el(
            'tr',
            {},
            cells(lines[++i]).map((cell) => el('td', {}, inline(cell, links))),
          ),
        );
      const wrapper = table(heads, rows);
      wrapper.className = 'doc-table';
      content.append(wrapper);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line),
        items = [];
      let current = line;
      do {
        const prose = [current.replace(/^\s*(?:[-*]|\d+\.)\s+/, '')];
        while (lines[i + 1]?.trim() && !/^\s*(?:#|>|[-*]\s|\d+\.\s|```|~~~|\|)/.test(lines[i + 1]))
          prose.push(lines[++i].trim());
        items.push(el('li', {}, inline(prose.join(' '), links)));
        if (!/^\s*(?:[-*]|\d+\.)\s+/.test(lines[i + 1] || '')) break;
        current = lines[++i];
      } while (true);
      content.append(el(ordered ? 'ol' : 'ul', ordered ? { start: Number(line.trim().match(/^\d+/)[0]) } : {}, items));
      continue;
    }
    if (/^>\s?/.test(line)) {
      content.append(el('blockquote', {}, inline(line.replace(/^>\s?/, ''), links)));
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      content.append(el('hr'));
      continue;
    }
    const paragraph = [line];
    while (lines[i + 1]?.trim() && !/^\s*(?:#|>|[-*]\s|\d+\.\s|```|~~~|\|)/.test(lines[i + 1]))
      paragraph.push(lines[++i]);
    content.append(el('p', {}, inline(paragraph.join('\n'), links)));
  }
  return content;
}

async function openSource(path, line) {
  const source = await api(`/api/source?path=${encodeURIComponent(path)}`);
  const raw = el('pre', { class: 'raw-source', tabindex: '0', text: source.text });
  showDetail('Source', [
    sourceRow(path, line),
    source.state === 'absent'
      ? empty('Source is absent', 'The file is no longer present. Refresh the repository to update its references.')
      : null,
    source.state === 'partial'
      ? issuesBox(['Source changed during the read or exceeds the 8 MiB preview limit. This is not the complete file.'])
      : null,
    el(
      'div',
      { class: 'inline-controls' },
      btn('Copy text', () => copy(source.text)),
      el('span', {
        class: 'muted subtle',
        text: `${source.bytes.toLocaleString()} bytes${line ? `; requested line ${line}` : ''}`,
      }),
    ),
    raw,
    source.links?.length
      ? el(
          'details',
          {},
          el('summary', { text: 'Links in this source' }),
          el(
            'ul',
            {},
            source.links.map((link) => el('li', {}, inline(`[${link.label}](${link.target})`, source.links))),
          ),
        )
      : null,
  ]);
  if (line)
    requestAnimationFrame(() => {
      raw.scrollTop = Math.max(0, (line - 5) * 18.6);
    });
}
function openWork(doc) {
  const started = performance.now();
  const refs = doc.references.map((ref) =>
    ref.paths.length === 1
      ? btn(`${ref.id} (${ref.kind})`, () => {
          const found = [...state.data.work.items, ...state.data.work.decisions].find(
            (item) => item.path === ref.paths[0],
          );
          if (found) openWork(found);
          else {
            const target = /^(.*?):(\d+)$/.exec(ref.paths[0]);
            void action(() => openSource(target ? target[1] : ref.paths[0], target ? Number(target[2]) : undefined));
          }
        })
      : el('span', { class: 'badge unknown', text: `${ref.id}: ${ref.paths.length ? 'ambiguous' : 'unresolved'}` }),
  );
  showDetail(
    doc.id || 'Work record',
    [
      el('div', { class: 'tag-row' }, badge(doc.status), badge(doc.type), doc.archived ? badge('archived') : null),
      el('h2', { class: 'detail-title', text: doc.title }),
      sourceRow(doc.path),
      issuesBox(doc.issues),
      grid([
        ['Declared branch', doc.fields.branch || 'Not declared'],
        ['Observed branch', doc.branchFact?.message || 'No branch observation requested.'],
        ['Created', doc.fields.created ?? doc.fields.date],
        ['Updated', doc.fields.updated],
      ]),
      refs.length
        ? el('section', {}, el('h3', { text: 'References' }), el('div', { class: 'reference-list' }, refs))
        : null,
      markdown(doc.body, doc.links),
      el(
        'details',
        {},
        el('summary', { text: 'All declared fields' }),
        el('pre', { text: JSON.stringify(doc.fields, null, 2) }),
      ),
    ],
    started,
  );
}
function openFinding(row) {
  showDetail(row.id || 'Finding', [
    badge(row.section),
    sourceRow(row.path, row.line),
    ...Object.entries(row.cells).map(([key, value]) =>
      el('section', { class: 'section-block' }, el('h3', { text: key }), markdown(value, row.links)),
    ),
  ]);
}

function workView() {
  const work = state.data.work;
  const content = [
    heading('Work in this repository', 'Browse the declared work, then follow its decisions and evidence.'),
    tabs(
      [
        ['items', 'Work items'],
        ['findings', 'Findings'],
        ['decisions', 'Decisions'],
      ],
      state.kind,
      (kind) => {
        state.kind = kind;
        state.status = 'all';
        state.type = 'all';
        state.search = '';
      },
    ),
  ];
  if (work.state === 'error')
    return [
      ...content,
      issuesBox(work.issues),
      empty(
        'Work records unavailable',
        'Inspect the install record to resolve the configured paths.',
        sourceRow('.ai/rungs.toml'),
      ),
    ];
  content.push(issuesBox(work.issues));
  const convention = state.data.install.modules.find(
    (mod) => mod.name === (state.kind === 'decisions' ? 'adr' : state.kind === 'findings' ? 'findings' : 'backlog'),
  );
  if (convention?.detection.paradigm)
    content.push(
      el(
        'div',
        { class: 'callout' },
        `This repository uses ${convention.detection.paradigm.id}. These records are not a conversion of that tracker. `,
        btn('Inspect tracking evidence', () => openModule(convention), 'link'),
      ),
    );
  if (state.kind === 'findings') {
    const rows = work.findings.value || [];
    const sections = [...new Set(rows.map((row) => row.section))];
    content.push(
      el(
        'div',
        { class: 'toolbar' },
        searchBox(),
        select('status', 'Section', [['all', 'All sections'], ...sections.map((s) => [s, s])], state.status, (v) => {
          state.status = v;
        }),
      ),
    );
    content.push(issuesBox(work.findings.issues));
    const filtered = rows.filter(
      (row) => (state.status === 'all' || row.section === state.status) && matches(Object.values(row.cells).join(' ')),
    );
    content.push(
      filtered.length
        ? table(
            ['Finding', 'Section', 'Evidence'],
            pageRows(filtered).map((row) =>
              el(
                'tr',
                {},
                el(
                  'td',
                  { class: 'work-title' },
                  el('span', { class: 'id', text: row.id }),
                  btn(
                    row.cells.What || row.cells.Title || row.cells.Observation || row.id || 'Inspect row',
                    () => openFinding(row),
                    'link',
                  ),
                ),
                el('td', {}, badge(row.section)),
                el('td', {}, sourceButton(row.path, `Line ${row.line}`, row.line)),
              ),
            ),
          )
        : empty(
            'No matching findings',
            work.findings.state === 'absent'
              ? 'No findings register at the configured path.'
              : 'Change the filter or inspect the register source.',
          ),
    );
    if (work.findings.source) content.push(sourceRow(work.findings.source));
    content.push(pagination(filtered.length));
    return content;
  }
  const records = state.kind === 'decisions' ? work.decisions : work.items;
  const statuses = [...new Set(records.map((doc) => doc.status))].sort(),
    types = [...new Set(records.map((doc) => doc.type))].sort();
  content.push(
    el(
      'div',
      { class: 'toolbar' },
      searchBox(),
      select(
        'status',
        'Status',
        [['all', 'All statuses'], ...statuses.map((s) => [s, s.replaceAll('_', ' ')])],
        state.status,
        (v) => {
          state.status = v;
        },
      ),
      state.kind === 'items'
        ? select(
            'archive',
            'Location',
            [
              ['live', 'Live items'],
              ['all', 'Live + archive'],
              ['archive', 'Archived'],
            ],
            state.archive,
            (v) => {
              state.archive = v;
            },
          )
        : null,
      select('type', 'Type', [['all', 'All types'], ...types.map((s) => [s, s])], state.type, (v) => {
        state.type = v;
      }),
      state.kind === 'items'
        ? btn(
            state.group ? 'Show table' : 'Group by status',
            () => {
              state.group = !state.group;
              render();
            },
            'quiet',
            { 'aria-pressed': state.group },
          )
        : null,
    ),
  );
  const filtered = records.filter(
    (doc) =>
      (state.kind !== 'items' || state.archive === 'all' || doc.archived === (state.archive === 'archive')) &&
      (state.status === 'all' || doc.status === state.status) &&
      (state.type === 'all' || doc.type === state.type) &&
      matches(`${doc.id} ${doc.title} ${doc.body}`),
  );
  const shown = pageRows(filtered);
  content.push(
    el('div', {
      class: 'result-count',
      text: `${filtered.length} ${state.kind === 'items' ? 'work items' : 'decisions'}; status comes from each record`,
    }),
  );
  if (!filtered.length)
    content.push(
      empty(
        'No matching records',
        records.length
          ? 'Change the filters to see other work.'
          : 'No supported records at the configured path. Installation detection may show a different tracking convention.',
        work.board ? sourceRow(work.board) : null,
      ),
    );
  else if (state.group && state.kind === 'items') {
    content.push(
      el(
        'div',
        { class: 'group-grid' },
        [...new Set(shown.map((doc) => doc.status))].map((status) =>
          el(
            'section',
            { class: 'work-group' },
            el(
              'h3',
              {},
              status.replaceAll('_', ' '),
              el('span', { text: String(shown.filter((doc) => doc.status === status).length) }),
            ),
            shown
              .filter((doc) => doc.status === status)
              .map((doc) =>
                btn(
                  el('span', {}, el('span', { class: 'id', text: doc.id }), doc.title),
                  () => openWork(doc),
                  'group-item',
                ),
              ),
          ),
        ),
      ),
    );
  } else
    content.push(
      table(
        ['Record', 'Declared status', 'Type', 'References'],
        shown.map((doc) =>
          el(
            'tr',
            {},
            el(
              'td',
              { class: 'work-title' },
              el('span', { class: 'id', text: doc.id || 'Unrecognized id' }),
              btn(doc.title, () => openWork(doc), 'link'),
              doc.issues.length ? el('span', { class: 'secondary', text: 'Read limitations; inspect source' }) : null,
            ),
            el('td', {}, badge(doc.status)),
            el('td', { text: doc.type }),
            el('td', { class: 'subtle', text: doc.references.length ? String(doc.references.length) : '—' }),
          ),
        ),
      ),
    );
  content.push(pagination(filtered.length));
  if (work.session)
    content.push(
      el(
        'div',
        { class: 'section-block' },
        el('p', {
          class: 'muted subtle',
          text: 'Session state is an authored handoff; it does not determine the statuses above.',
        }),
        sourceRow(work.session),
      ),
    );
  return content;
}

function openModule(mod) {
  const detection = mod.detection;
  const groups = detection.ours ? Object.entries(detection.ours).filter(([, value]) => Array.isArray(value)) : [];
  showDetail(mod.name, [
    badge(detection.state),
    el('h2', { class: 'detail-title', text: mod.summary || mod.name }),
    grid([
      ['Bundle version', mod.version],
      ['Installed version', mod.installed?.version],
      ['Rung', mod.rung],
      ['Requires', mod.requires?.join(', ') || 'None'],
      ['Install state', mod.installed?.state],
    ]),
    detection.error ? issuesBox([detection.error]) : null,
    ...groups.map(([name, paths]) =>
      el(
        'section',
        { class: 'section-block' },
        el('h3', { text: `${name} (${paths.length})` }),
        el(
          'ul',
          {},
          paths.map((path) => el('li', {}, sourceButton(path))),
        ),
      ),
    ),
    ...(detection.matchedPaths?.map((match) =>
      el(
        'section',
        { class: 'section-block' },
        el('h3', { text: `${match.pattern} (${match.count})` }),
        el(
          'ul',
          {},
          match.sample.map((path) => el('li', {}, sourceButton(path))),
        ),
      ),
    ) || []),
    detection.paradigm
      ? issuesBox(
          [`${detection.paradigm.id}: ${detection.paradigm.note || 'This repository uses a different convention.'}`],
          'Different tracking convention',
        )
      : null,
    ...(detection.paradigm?.matched ?? []).map((path) => sourceRow(path)),
    ...(detection.adoptable ?? []).map((match) =>
      el(
        'section',
        { class: 'section-block' },
        el('h3', { text: `Adopted ${match.kind} (${match.count})` }),
        el('p', { text: match.note || 'Existing repository authority.' }),
        ...match.sample.map((path) => sourceRow(path)),
      ),
    ),
    el('h3', { text: 'Parameters' }),
    el('pre', { text: JSON.stringify(mod.params || {}, null, 2) }),
    el('h3', { text: 'Provenance and maintenance' }),
    el('p', { text: mod.provenance?.incident || mod.provenance?.rationale || 'No bundled provenance available.' }),
    grid([
      ['Origin', mod.provenance?.kind],
      ['Sources', mod.provenance?.sources?.join(', ')],
      ['Patterns', mod.provenance?.patterns?.join(', ')],
      [
        'Threshold',
        mod.threshold
          ? `${mod.threshold.minimum}+ ${mod.threshold.metric}`
          : 'No admission threshold declared; ongoing document and rule maintenance still belongs to the repository.',
      ],
    ]),
    el(
      'details',
      {},
      el('summary', { text: 'Complete detection evidence' }),
      el('pre', { text: JSON.stringify(detection, null, 2) }),
    ),
  ]);
}
function repositoryView() {
  const { install, scan, toolVersion } = state.data;
  const installed = install.modules.filter((mod) => mod.installed).length;
  return [
    heading('Installation', 'Compare what the repository records with the CLI bundle you are running.', [
      btn('Preview upgrade', () => {
        void action(() => preview('upgrade'));
      }),
      btn('Preview archive', () => {
        void action(() => preview('archive'));
      }),
    ]),
    el(
      'div',
      { class: 'installation-summary' },
      ...[
        ['Executing CLI', toolVersion],
        ['Repository pin', install.pin.version || install.pin.state],
        ['Installed modules', `${installed} recorded`],
      ].map(([key, value]) => el('dl', {}, el('dt', { text: key }), el('dd', { text: value }))),
    ),
    el('p', { class: 'muted', text: install.pin.reason }),
    issuesBox(install.record.issues),
    issuesBox(install.issues),
    issuesBox(scan.issues, 'The scan is incomplete'),
    sourceRow('.ai/rungs.toml'),
    el('div', { class: 'toolbar' }, searchBox()),
    table(
      ['Module', 'Observed state', 'Installed / bundle', 'Rung'],
      install.modules
        .filter((mod) => matches(`${mod.name} ${mod.summary} ${mod.detection.state}`))
        .map((mod) =>
          el(
            'tr',
            {},
            el(
              'td',
              { class: 'work-title' },
              btn(mod.name, () => openModule(mod), 'link'),
              el('span', { class: 'secondary', text: mod.summary || 'Module unavailable in this bundle' }),
            ),
            el('td', {}, badge(mod.detection.state)),
            el('td', { class: 'subtle', text: `${mod.installed?.version || '—'} / ${mod.version || '—'}` }),
            el('td', { text: mod.rung ?? '—' }),
          ),
        ),
    ),
    el(
      'section',
      { class: 'section-block' },
      el('h2', { text: 'Harnesses and rendering' }),
      el('p', { text: install.record.value?.harnesses?.join(', ') || 'No harnesses recorded.' }),
      sourceRow('.ai/render-report.md'),
      issuesBox(install.report.issues),
      install.report.value
        ? markdown(install.report.value.text, install.report.value.links)
        : el('p', { class: 'muted', text: 'No readable render report is present.' }),
    ),
    el(
      'section',
      { class: 'section-block' },
      el('h2', { text: 'Install journal' }),
      install.journal.state === 'absent'
        ? el('p', { class: 'muted', text: 'No interrupted-install journal is present.' })
        : [
            issuesBox(install.journal.issues),
            el('pre', { text: JSON.stringify(install.journal.value || {}, null, 2) }),
            el('p', {
              class: 'muted',
              text: 'Inspect the journal and use the CLI to resume the recorded module set. This view never resumes an install.',
            }),
            sourceRow(install.journal.source),
          ],
    ),
  ];
}
async function preview(operation) {
  notice(`Reading ${operation} preview…`);
  const result = await api('/api/preview', { operation });
  const summary =
    operation === 'upgrade'
      ? table(
          ['Module', 'Version', 'File', 'Observed state'],
          result.value.flatMap((mod) =>
            mod.files.map((file) =>
              el(
                'tr',
                {},
                el('td', { text: mod.module }),
                el('td', { text: `${mod.from} → ${mod.to}` }),
                el('td', { class: 'id', text: file.rel }),
                el('td', {}, badge(file.state)),
              ),
            ),
          ),
        )
      : table(
          ['Work item', 'From', 'To'],
          (result.value.moves || []).map((move) =>
            el(
              'tr',
              {},
              el('td', { text: move.id }),
              el('td', { class: 'id', text: move.from }),
              el('td', { class: 'id', text: move.to }),
            ),
          ),
        );
  showDetail(`${operation === 'upgrade' ? 'Upgrade' : 'Archive'} preview`, [
    evidenceAge(result),
    el('p', { text: result.coverage }),
    result.changed ? issuesBox(['The repository changed while this preview was read. Refresh before acting.']) : null,
    summary,
    operation === 'archive'
      ? el('p', {
          text: `${result.value.moves?.length || 0} proposed moves. Inspect the full plan for held items and link rewrites.`,
        })
      : null,
    el(
      'details',
      {},
      el('summary', { text: 'Complete planner result' }),
      el('pre', { text: JSON.stringify(result.value, null, 2) }),
    ),
    el('h3', { text: 'Continue in the CLI' }),
    el('p', { class: 'muted subtle', text: result.handoff.shell }),
    el('pre', { text: result.handoff.command }),
    btn('Copy command', () => copy(result.handoff.command)),
  ]);
}

function openGate(gate, run) {
  const mod = state.data.install.modules.find((mod) => mod.name === gate.module);
  showDetail(gate.id, [
    el(
      'div',
      { class: 'tag-row' },
      badge(gate.executionSurface || 'runner'),
      badge(run?.status || gate.implementation || 'not run'),
    ),
    el('h2', { class: 'detail-title', text: gate.id }),
    el('p', { text: gate.why || 'No rationale recorded.' }),
    sourceRow('.ai/gates.toml'),
    grid([
      ['Tier', gate.tier || 'Untiered'],
      ['Engine', gate.engine],
      ['Module', gate.module],
      ['Trigger', gate.trigger],
      ['Matcher', gate.matcher],
    ]),
    gate.command
      ? [el('h3', { text: 'Repository command' }), el('pre', { class: 'gate-command', text: gate.command })]
      : null,
    mod?.provenance
      ? el('p', { class: 'muted subtle', text: mod.provenance.incident || mod.provenance.rationale })
      : null,
    run
      ? [
          el('h3', { text: 'Recorded result in this session' }),
          grid([
            ['Status', badge(run.status)],
            ['Duration', `${run.ms} ms`],
            ['Examined', run.examined],
          ]),
          run.findings.length
            ? run.findings.map((finding) =>
                el(
                  'section',
                  { class: 'section-block' },
                  el('pre', { text: finding.message }),
                  finding.file ? sourceRow(finding.file) : null,
                ),
              )
            : el('p', { text: 'No findings in this result. Scope is limited to what this invocation examined.' }),
        ]
      : el('p', {
          class: 'muted',
          text:
            gate.executionSurface === 'hook'
              ? 'This check is triggered by the harness; it is not part of a runner tier.'
              : gate.executionSurface === 'explain'
                ? 'This detector reports evidence through Diagnostics; it does not enforce a verdict.'
                : 'No result for this gate in the selected session run.',
        }),
  ]);
}
function budgetText(value) {
  if (!value) return 'Budget evidence unavailable.';
  if (value.state === 'report')
    return `${value.tier}: median ${value.medianMs} ms, max ${value.maxMs} ms across ${value.runs} recorded runs; budget ${value.budgetMs} ms (${value.over} overruns).`;
  if (value.state === 'too-short')
    return `${value.usable} usable runs; ${value.needed} needed for a budget report. ${value.unreadable} unreadable rows.`;
  return (
    {
      disabled: 'The repository has disabled its ledger.',
      absent: 'No local ledger is present.',
      'no-budget': 'No duration budget is configured.',
    }[value.state] || text(value)
  );
}
function gatesView() {
  const gates = state.data.gates,
    registry = gates.registry.value;
  const actions = [
    btn(
      'Prepare check run',
      () => {
        void action(prepareChecks);
      },
      'primary',
    ),
  ];
  const content = [
    heading(
      'Gates and recorded results',
      'Inspect what runs, why it exists, and what each result actually examined.',
      actions,
    ),
    issuesBox(gates.registry.issues),
    tabs(
      [
        ['registry', 'Registered gates'],
        ['history', 'Local history'],
      ],
      state.gateMode,
      (mode) => {
        state.gateMode = mode;
        state.search = '';
      },
    ),
    el('p', { class: 'muted subtle', text: budgetText(gates.budget.value) }),
    issuesBox(gates.budget.issues),
  ];
  if (state.gateMode === 'history') {
    content.push(
      el('p', {
        class: 'muted',
        text: `Historical rows captured ${date(state.data.capturedAt)}. They contain no current-tree fingerprint or complete findings.`,
      }),
      issuesBox(gates.ledger.issues),
      el('div', { class: 'toolbar' }, searchBox()),
    );
    const rows = [...(gates.ledger.value?.records || [])].reverse().filter((row) => matches(JSON.stringify(row.value)));
    content.push(
      rows.length
        ? table(
            ['Gate', 'Recorded status', 'When', 'Duration', 'Source'],
            pageRows(rows).map((row) =>
              el(
                'tr',
                {},
                el('td', { class: 'id', text: row.value?.id || 'Unknown row' }),
                el('td', {}, badge(row.value?.status || 'unknown')),
                el('td', { class: 'subtle', text: date(row.value?.run || row.value?.at) }),
                el('td', { text: typeof row.value?.ms === 'number' ? `${row.value.ms} ms` : 'Unknown' }),
                el('td', {}, sourceButton('.ai/.gate-ledger.jsonl', `Line ${row.line}`, row.line)),
              ),
            ),
          )
        : empty(
            'No matching history',
            'Run checks explicitly to produce new local observations. Existing legacy or unreadable rows remain available in the ledger source.',
          ),
    );
    content.push(pagination(rows.length));
    return content;
  }
  content.push(
    el(
      'div',
      { class: 'toolbar' },
      searchBox(),
      select(
        'surface',
        'Surface',
        [
          ['all', 'All surfaces'],
          ['runner', 'Runner checks'],
          ['hook', 'Lifecycle hooks'],
          ['explain', 'Explain only'],
        ],
        state.surface,
        (v) => {
          state.surface = v;
        },
      ),
    ),
  );
  const rows = (registry?.gates || []).filter(
    (gate) =>
      (state.surface === 'all' || gate.executionSurface === state.surface) &&
      matches(`${gate.id} ${gate.why} ${gate.module} ${gate.engine} ${gate.command}`),
  );
  content.push(
    el('p', {
      class: 'result-count',
      text: state.job
        ? `Results from selected session run (${state.job.status}); historical results do not establish current validity.`
        : `${rows.length} declarations. No check runs automatically.`,
    }),
  );
  const runs = new Map((state.job?.runs || []).map((run) => [run.id, run]));
  content.push(
    rows.length
      ? table(
          ['Gate', 'Surface', 'Tier', 'Selected run'],
          pageRows(rows).map((gate) =>
            el(
              'tr',
              {},
              el(
                'td',
                { class: 'work-title' },
                btn(gate.id, () => openGate(gate, runs.get(gate.id)), 'link'),
                el('span', {
                  class: 'secondary',
                  text: (gate.why || gate.command || gate.engine || 'No rationale recorded').slice(0, 160),
                }),
              ),
              el('td', {}, badge(gate.executionSurface)),
              el('td', { class: 'subtle', text: gate.tier || 'Untiered' }),
              el(
                'td',
                {},
                badge(
                  runs.get(gate.id)?.status || (gate.implementation === 'unimplemented' ? 'unimplemented' : 'not run'),
                ),
              ),
            ),
          ),
        )
      : empty(
          'No matching gates',
          registry ? 'Change the filter or inspect the registry.' : 'No readable gate registry at .ai/gates.toml.',
          sourceRow('.ai/gates.toml'),
        ),
  );
  content.push(pagination(rows.length));
  return content;
}
async function prepareChecks() {
  const tiers = state.data.gates.registry.value?.runner?.tiers || [];
  const chooser = el(
    'select',
    { id: 'check-tier', 'aria-label': 'Check tier' },
    el('option', { value: '', text: 'Default: all runner checks' }),
    tiers.map((tier) => el('option', { value: tier, text: `${tier} and lower levels` })),
  );
  const result = el('div');
  let serial = 0;
  async function load() {
    const current = ++serial;
    result.replaceChildren(el('p', { class: 'muted', text: 'Resolving the current operation…' }));
    try {
      const plan = await api('/api/check-plan', { tier: chooser.value || null });
      if (serial !== current) return;
      replace(
        result,
        grid([
          ['Repository', plan.root],
          ['CLI version', plan.toolVersion],
          ['Repository pin', plan.pin.version || plan.pin.state],
          ['Selected gates', plan.gates.length],
        ]),
        el('div', { class: 'callout' }, plan.authority),
        issuesBox(plan.reasons, 'Check execution is unavailable'),
        table(
          ['Gate', 'Operation'],
          plan.gates.map((gate) =>
            el(
              'tr',
              {},
              el('td', { class: 'id', text: gate.id }),
              el('td', {}, el('code', { text: gate.command || `Declared engine: ${gate.engine || 'unimplemented'}` })),
            ),
          ),
        ),
        el(
          'div',
          { class: 'inline-controls' },
          btn(
            'Run checks',
            () => {
              void action(async () => {
                const job = await api('/api/jobs', { planId: plan.id });
                state.job = job;
                state.jobs.push({ id: job.id, status: job.status, startedAt: job.startedAt });
                $('detail').close();
                state.view = 'gates';
                render();
                renderJob();
                pollJob(job.id);
              });
            },
            'primary',
            { disabled: !plan.allowed || state.job?.status === 'running' },
          ),
          btn('Copy CLI command', () => copy(plan.handoff.command)),
        ),
        el('p', {
          class: 'muted subtle',
          text: 'This plan expires after five minutes and is checked again against the files before execution.',
        }),
      );
    } catch (error) {
      if (serial === current) result.replaceChildren(issuesBox([error.message]));
    }
  }
  chooser.onchange = load;
  showDetail('Prepare a check run', [
    el('p', { text: 'Review the selected operation, then run it explicitly.' }),
    el('div', { class: 'inline-controls' }, chooser),
    result,
  ]);
  await load();
}

function diagnosticsView() {
  const content = [
    heading(
      'Diagnostics',
      'Run the existing detectors explicitly, then inspect their evidence and scope.',
      btn(
        state.busy ? 'Reading…' : 'Run diagnostics',
        () => {
          void action(async () => {
            state.busy = true;
            render();
            try {
              state.diagnostics = await api('/api/diagnostics', {});
              state.page = 0;
            } finally {
              state.busy = false;
              render();
            }
          });
        },
        'primary',
        { disabled: state.busy },
      ),
    ),
  ];
  const result = state.diagnostics;
  if (!result)
    return [
      ...content,
      empty(
        'No diagnostic pass requested',
        'Opening this view does not execute detectors. A pass reports findings, skipped checks and the modules it could examine; it does not score this repository.',
      ),
    ];
  content.push(
    evidenceAge(result),
    el('p', {
      class: 'muted subtle',
      text: `Captured ${date(result.capturedAt)}. Scope: ${result.scope.join(', ') || 'no applicable modules'}.`,
    }),
    result.changed
      ? issuesBox(['Source changed during the pass. These results are not a consistent current snapshot.'])
      : null,
    el('div', { class: 'toolbar' }, searchBox()),
  );
  const rows = result.reported
    .flatMap((group) =>
      group.findings.map((finding) => ({
        ...finding,
        gate: group.gate,
        module: group.module,
        why: group.why,
        examined: group.examined,
      })),
    )
    .filter((finding) => matches(`${finding.gate} ${finding.file || ''} ${finding.message}`));
  content.push(
    rows.length
      ? el(
          'div',
          { class: 'diagnostic-list' },
          pageRows(rows).map((finding) =>
            el(
              'article',
              { class: 'diagnostic-row' },
              btn(
                finding.message.split('\n')[0].slice(0, 240),
                () =>
                  showDetail(finding.gate, [
                    evidenceAge(result),
                    el('p', { class: 'muted', text: finding.why || '' }),
                    el('pre', { text: finding.message }),
                    finding.file ? sourceRow(finding.file) : null,
                    grid([
                      ['Module', finding.module],
                      ['Examined', finding.examined],
                    ]),
                  ]),
                'link',
              ),
              el('span', { class: 'secondary', text: `${finding.gate}${finding.file ? ` | ${finding.file}` : ''}` }),
            ),
          ),
        )
      : empty(
          'No matching findings reported',
          'This describes only the selected detector scope. Review skipped and errored detectors below.',
        ),
  );
  content.push(
    pagination(rows.length),
    el(
      'section',
      { class: 'section-block' },
      el('h2', { text: 'Skipped and errored detectors' }),
      el('p', {
        text: `${result.skipped.command} command declarations were skipped; diagnostics do not run repository commands.`,
      }),
      el('pre', { text: JSON.stringify(result.skipped, null, 2) }),
    ),
  );
  return content;
}

function render() {
  const started = performance.now();
  if (!state.data) return;
  const active = document.activeElement,
    id = active?.id,
    selection = active instanceof HTMLInputElement ? active.selectionStart : null;
  document.querySelectorAll('[data-view]').forEach((button) => {
    if (button.dataset.view === state.view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const views = { work: workView, repository: repositoryView, gates: gatesView, diagnostics: diagnosticsView };
  $('main').replaceChildren(...views[state.view]().flat(Infinity).filter(Boolean));
  markEvidence();
  if (id && $(id) && !$('detail').open) {
    $(id).focus({ preventScroll: true });
    if (selection !== null && $(id) instanceof HTMLInputElement) $(id).setSelectionRange(selection, selection);
  }
  recordRender($('main'), started);
}
function renderJob() {
  const area = $('job-region'),
    job = state.job;
  area.hidden = !job;
  if (!job) return;
  const outputOpen = area.querySelector('[data-output]')?.open || false;
  const resultsOpen = area.querySelector('[data-results]')?.open || false;
  const chooser = el(
    'select',
    {
      'aria-label': 'Session run',
      onchange: (event) => {
        void action(async () => {
          state.job = await api(`/api/jobs/${event.target.value}`);
          renderJob();
          render();
          if (state.job.status === 'running') pollJob(state.job.id);
        });
      },
    },
    state.jobs.map((run) => el('option', { value: run.id, text: `${date(run.startedAt)} (${run.status})` })),
  );
  chooser.value = job.id;
  const registry = state.data?.gates.registry.value?.gates || [];
  replace(
    area,
    el(
      'div',
      { class: 'job-header' },
      el(
        'div',
        {},
        el('h2', { 'aria-live': 'polite' }, 'Check run ', badge(job.status)),
        el('span', {
          class: 'secondary',
          text: job.currentGate ? `Running ${job.currentGate}` : `${job.runs.length} recorded gate results`,
        }),
      ),
      job.status === 'running'
        ? btn(
            'Cancel run',
            () => {
              void action(async () => {
                state.job = await api(`/api/jobs/${job.id}/cancel`, {});
                renderJob();
                render();
              });
            },
            'danger',
          )
        : chooser,
    ),
    el('p', {
      class: 'muted subtle',
      text: `${date(job.startedAt)}${job.result?.changed ? ' | Files changed during this run; result scope is stale.' : ' | Results describe this invocation, not continuing repository validity.'}`,
    }),
    issuesBox(job.error ? [job.error] : []),
    job.termination ? el('p', { class: 'muted subtle', text: job.termination }) : null,
    el(
      'details',
      { 'data-results': '', open: resultsOpen },
      el('summary', { text: 'Gate results and findings' }),
      table(
        ['Gate', 'Result', 'Duration', 'Examined'],
        job.runs.map((run) =>
          el(
            'tr',
            {},
            el(
              'td',
              {},
              btn(run.id, () => openGate(registry.find((gate) => gate.id === run.id) || run, run), 'link'),
            ),
            el('td', {}, badge(run.status)),
            el('td', { text: `${run.ms} ms` }),
            el('td', { text: run.examined }),
          ),
        ),
      ),
    ),
    el(
      'details',
      { 'data-output': '', open: outputOpen },
      el('summary', {
        text: job.outputTruncated ? 'Command output (last 256 KiB; earlier output omitted)' : 'Command output',
      }),
      el('pre', { text: job.output || 'No command output received.' }),
    ),
  );
}
let polling;
function pollJob(id) {
  clearTimeout(polling);
  polling = setTimeout(() => {
    void action(async () => {
      const job = await api(`/api/jobs/${id}`);
      const summary = state.jobs.find((run) => run.id === id);
      if (summary) summary.status = job.status;
      if (state.job?.id === id) {
        state.job = job;
        renderJob();
      }
      if (job.status === 'running') pollJob(id);
      else {
        render();
        notice(`Check run ${job.status}.`);
      }
    });
  }, 1000);
}
async function refresh() {
  $('refresh').disabled = true;
  $('freshness').textContent = 'Reading current files…';
  try {
    const first = !state.data;
    state.data = await api('/api/snapshot');
    observedGeneration = state.data.consistent ? state.data.generation : null;
    state.jobs = state.data.jobs || state.jobs;
    if (first && !state.data.work.items.length) state.view = 'repository';
    if (first && state.jobs.length) {
      state.job = await api(`/api/jobs/${state.jobs.at(-1).id}`);
      if (state.job.status === 'running') pollJob(state.job.id);
    }
    document.title = `${state.data.name} · rungs`;
    $('repo-name').textContent = state.data.name;
    $('repo-root').textContent = state.data.root;
    $('repo-root').title = state.data.root;
    const git = state.data.git;
    $('repo-branch').textContent =
      git.state === 'ok'
        ? `${git.branch || 'Detached'}${git.head ? ` / ${git.head.slice(0, 8)}` : ' / unborn'}${git.dirty ? ' / changes present' : ''}`
        : 'Git unavailable';
    $('version').textContent = `rungs ${state.data.toolVersion}`;
    $('mode').textContent = state.data.readOnly ? 'Read-only mode' : 'Checks run only when you request them.';
    $('work-count').textContent = String(state.data.work.items.filter((doc) => !doc.archived).length);
    $('gate-count').textContent = String(state.data.gates.registry.value?.gates.length || 0);
    $('freshness').className = state.data.consistent ? 'freshness' : 'freshness stale';
    $('freshness').textContent =
      `${state.data.consistent ? 'Snapshot captured' : 'Partial snapshot'} ${date(state.data.capturedAt)} · source ${state.data.generation.slice(0, 12)} · ${state.data.scan.files.toLocaleString()} files. Refresh runs no checks.`;
    render();
    renderJob();
  } catch (error) {
    $('freshness').className = 'freshness error';
    $('freshness').textContent = error.message;
    if (!state.data)
      $('main').replaceChildren(
        empty(
          'Could not read the repository',
          error.message,
          el('p', { class: 'muted', text: 'Open the complete local launch address from the running rungs process.' }),
        ),
      );
    else notice(error.message);
  } finally {
    $('refresh').disabled = false;
  }
}
$('navigation').onclick = (event) => {
  const button = event.target.closest('[data-view]');
  if (!button || !state.data) return;
  state.view = button.dataset.view;
  state.search = '';
  state.page = 0;
  render();
  $('main').focus({ preventScroll: true });
};
$('refresh').onclick = refresh;
$('export').onclick = () => {
  void action(async () => {
    const value = await api('/api/export');
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    const link = el('a', { href: url, download: 'rungs-inspection.json' });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice('Inspection export downloaded.');
  });
};
let checkingFreshness = false;
setInterval(() => {
  if (!state.data || document.hidden || checkingFreshness || $('refresh').disabled) return;
  checkingFreshness = true;
  api('/api/freshness')
    .then((value) => {
      observedGeneration = value.complete ? value.generation : null;
      markEvidence();
      if (value.generation !== state.data.generation || !value.complete) {
        $('freshness').className = 'freshness stale';
        $('freshness').textContent =
          'Files changed or the scan is incomplete. Refresh to inspect current state; existing evidence stays visible.';
      }
    })
    .catch(() => {
      observedGeneration = null;
      markEvidence();
      $('freshness').className = 'freshness error';
      $('freshness').textContent =
        'Could not check freshness. The foreground process may have stopped; this snapshot is no longer known to be current.';
    })
    .finally(() => {
      checkingFreshness = false;
    });
}, 10_000);
void refresh();
