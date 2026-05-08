// Aligned with Desert Island Test ranking dimensions
const AXES = [
  { id: 'salary',       label: 'Salary',       low: 'Lowball',      high: 'Premium',     value: 3, bucket: 2 },
  { id: 'growth',       label: 'Tech Growth',  low: 'Stagnant',     high: 'Growing',     value: 3, bucket: 0 },
  { id: 'impact',       label: 'Impact',       low: 'Cog',          high: 'Owner',       value: 3, bucket: 1 },
  { id: 'culture',      label: 'Team Culture', low: 'Toxic',        high: 'Strong Bond', value: 3, bucket: 0 },
  { id: 'autonomy',     label: 'Autonomy',     low: 'Directed',     high: 'Free',        value: 3, bucket: 1 },
  { id: 'mission',      label: 'Mission',      low: 'Harmful',      high: 'Belief',      value: 3, bucket: 1 },
  { id: 'stability',    label: 'Stability',    low: 'Risky',        high: 'Secure',      value: 3, bucket: 0 },
  { id: 'location',     label: 'Location',     low: 'Restricted',   high: 'Flexible',    value: 3, bucket: 0 },
  { id: 'brand',        label: 'Brand',        low: 'Unknown',      high: 'Prestige',    value: 3, bucket: 2 },
  { id: 'management',   label: 'Leadership',   low: 'None',         high: 'Path',        value: 3, bucket: 1 },
];

const BUCKET_LABELS = ['Must', 'Nice', 'Skip'];
const BUCKET_CLASSES = ['b0', 'b1', 'b2'];
const BUCKET_WEIGHTS = [1.0, 0.6, 0.2];

let jobOverlays = [];

const COLORS = ['#ff6b6b','#51cf66','#ffd43b','#cc5de8','#20c997','#ff922b','#339af0','#e64980','#94d82d','#845ef7'];

function save() {
  localStorage.setItem('jfa-axes', JSON.stringify(AXES));
  localStorage.setItem('jfa-jobs', JSON.stringify(jobOverlays));
  localStorage.setItem('jfa-api-url', document.getElementById('api-url').value);
  localStorage.setItem('jfa-api-key', document.getElementById('api-key').value);
  localStorage.setItem('jfa-api-model', document.getElementById('api-model').value);
  const hl = document.getElementById('home-location');
  if (hl) localStorage.setItem('jfa-home-location', hl.value);
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem('jfa-axes'));
    if (saved) saved.forEach((s,i) => { if (AXES[i]) { AXES[i].value = s.value; AXES[i].bucket = s.bucket; } });
  } catch(e) {}
  try {
    const jobs = JSON.parse(localStorage.getItem('jfa-jobs'));
    if (jobs) jobOverlays = jobs;
  } catch(e) {}
  const au = localStorage.getItem('jfa-api-url');
  const ak = localStorage.getItem('jfa-api-key');
  const am = localStorage.getItem('jfa-api-model');
  if (au !== null) document.getElementById('api-url').value = au;
  if (ak !== null) document.getElementById('api-key').value = ak;
  if (am !== null) document.getElementById('api-model').value = am;
  const hl = localStorage.getItem('jfa-home-location');
  if (hl !== null) {
    document.getElementById('home-location').value = hl;
    document.getElementById('home-status').textContent = hl ? '✓' : '';
  }
  document.getElementById('home-location').addEventListener('input', () => {
    document.getElementById('home-status').textContent = document.getElementById('home-location').value ? '✓' : '';
    save();
  });
}

function renderAxes() {
  const c = document.getElementById('axes-container');
  c.innerHTML = '';
  AXES.forEach((axis, i) => {
    const row = document.createElement('div');
    row.className = 'axis-row';
    row.innerHTML = `
      <div class="label">${axis.label}</div>
      <div class="slider-wrap">
        <input type="range" min="1" max="5" value="${axis.value}" data-idx="${i}">
        <span class="val">${axis.value}</span>
      </div>
      <button class="bucket-btn ${BUCKET_CLASSES[axis.bucket]}" data-idx="${i}" title="${['Must have','Nice to have','Skip'][axis.bucket]}">${BUCKET_LABELS[axis.bucket]}</button>
    `;
    row.querySelector('input[type=range]').addEventListener('input', e => {
      AXES[i].value = parseInt(e.target.value);
      row.querySelector('.val').textContent = e.target.value;
      save(); draw(); renderHistory();
    });
    row.querySelector('.bucket-btn').addEventListener('click', () => {
      AXES[i].bucket = (AXES[i].bucket + 1) % 3;
      const btn = row.querySelector('.bucket-btn');
      btn.className = 'bucket-btn ' + BUCKET_CLASSES[AXES[i].bucket];
      btn.textContent = BUCKET_LABELS[AXES[i].bucket];
      save(); draw(); renderHistory();
    });
    c.appendChild(row);
  });
}

function resizeCanvas() {
  const canvas = document.getElementById('radar');
  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const w = container.clientWidth;
  const h = container.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.getContext('2d').scale(dpr, dpr);
  draw();
}

function calcFit(job) {
  let totalWeight = 0, totalScore = 0;
  AXES.forEach(axis => {
    const w = BUCKET_WEIGHTS[axis.bucket];
    const diff = Math.abs(axis.value - (job.scores[axis.id] || 3));
    totalWeight += w;
    totalScore += (5 - diff) * w;
  });
  return totalWeight > 0 ? Math.round((totalScore / (5 * totalWeight)) * 100) : 0;
}

function draw() {
  const canvas = document.getElementById('radar');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.35;
  const n = AXES.length;
  
  for (let ring = 1; ring <= 5; ring++) {
    const r = (ring / 5) * R;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = ring === 5 ? '#333' : '#1e1e1e';
    ctx.lineWidth = ring === 5 ? 1.5 : 0.5;
    ctx.stroke();
    if (ring % 2 === 1 || ring === 5) {
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillStyle = '#444'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ring, cx + 10, cy - r + 2);
    }
  }

  const bcolors = ['#4a9eff','#ffc44a','#555'];
  AXES.forEach((axis, i) => {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.5; ctx.stroke();
    const labelR = R + 24;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillStyle = bcolors[axis.bucket];
    ctx.textAlign = Math.abs(Math.cos(angle)) < 0.15 ? 'center' : Math.cos(angle) > 0 ? 'left' : 'right';
    ctx.textBaseline = Math.abs(Math.sin(angle)) < 0.15 ? 'middle' : Math.sin(angle) > 0 ? 'top' : 'bottom';
    ctx.fillText(axis.label, lx, ly);
  });

  function drawPoly(scores, fillColor, strokeColor, lineWidth) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const val = scores[idx] !== undefined ? scores[idx] : 0;
      const angle = (Math.PI * 2 * idx / n) - Math.PI / 2;
      const r = (val / 5) * R;
      i === 0 ? ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle)) : ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fillStyle = fillColor; ctx.fill();
    ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth; ctx.stroke();
    for (let i = 0; i < n; i++) {
      const val = scores[i] !== undefined ? scores[i] : 0;
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      const r = (val / 5) * R;
      ctx.beginPath();
      ctx.arc(cx + r * Math.cos(angle), cy + r * Math.sin(angle), 3, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor; ctx.fill();
    }
  }

  drawPoly(AXES.map(a => a.value), 'rgba(74,158,255,0.12)', '#4a9eff', 2);
  jobOverlays.forEach((job) => {
    if (job.hidden) return;
    drawPoly(AXES.map(a => job.scores[a.id] || 0), job.color + '18', job.color, 1.5);
  });

  ctx.font = 'bold 12px -apple-system, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#4a9eff';
  ctx.fillText('● Your Profile', 12, 12);
  jobOverlays.forEach((job, idx) => {
    if (job.hidden) return;
    ctx.fillStyle = job.color;
    const name = job.name.length > 25 ? job.name.substring(0, 25) + '…' : job.name;
    ctx.fillText('● ' + name + ' (' + calcFit(job) + '%)', 12, 28 + idx * 16);
  });
  ctx.restore();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  jobOverlays.forEach((job, idx) => {
    const fit = calcFit(job);
    const fitColor = fit >= 75 ? '#51cf66' : fit >= 50 ? '#ffd43b' : '#ff6b6b';
    const item = document.createElement('div');
    item.className = 'history-item' + (job.hidden ? ' hidden' : '');
    item.style.setProperty('--job-color', job.hidden ? '#555' : job.color);
    item.innerHTML = `
      <div class="job-info">
        <div class="job-title">${job.name}</div>
        <div class="job-meta">
          ${job.company ? '<span>' + job.company + '</span>' : ''}
          ${job.location ? '<span>' + job.location + '</span>' : ''}
          ${job.salary ? '<span>' + job.salary + '</span>' : ''}
          ${job.companySize ? '<span>' + job.companySize + '</span>' : ''}
        </div>
        ${job.summary ? '<div class="job-summary">' + job.summary + '</div>' : ''}
      </div>
      <div class="job-actions">
        <span class="fit-score" style="color:${fitColor}">${fit}%</span>
        <span class="toggle-btn" data-idx="${idx}" title="${job.hidden ? 'Show on chart' : 'Hide from chart'}">${job.hidden ? 'Show' : 'Hide'}</span>
        <span class="tailor-btn" data-idx="${idx}" title="Tailor CV">Tailor CV</span>
        <span class="remove" data-idx="${idx}" title="Delete">Del</span>
      </div>
    `;
    item.querySelector('.toggle-btn').addEventListener('click', e => {
      e.stopPropagation();
      jobOverlays[idx].hidden = !jobOverlays[idx].hidden;
      save(); renderHistory(); draw();
    });
    const tailorBtn = item.querySelector('.tailor-btn');
    if (tailorBtn) {
      const cvTemplate = localStorage.getItem('jfa-cv-template');
      if (!cvTemplate || !cvTemplate.trim()) {
        tailorBtn.disabled = true;
        tailorBtn.title = 'Save a CV template first';
      }
      tailorBtn.addEventListener('click', e => {
        e.stopPropagation();
        tailorCV(idx);
      });
    }
    item.querySelector('.remove').addEventListener('click', e => {
      e.stopPropagation();
      jobOverlays.splice(idx, 1);
      // Clean up cached tailored CV
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('jfa-cv-tailored-')) localStorage.removeItem(k);
      });
      save(); renderHistory(); draw();
    });
    list.appendChild(item);
  });
}

function showProgress(text) {
  const wrap = document.getElementById('progress-wrap');
  const bar = wrap.querySelector('.progress-bar');
  const textEl = wrap.querySelector('.progress-text');
  wrap.classList.add('visible');
  bar.classList.add('indeterminate');
  bar.classList.remove('progress-bar'); // force reflow
  void bar.offsetWidth;
  bar.className = 'progress-bar indeterminate';
  textEl.textContent = text;
}

function updateProgress(text) {
  const wrap = document.getElementById('progress-wrap');
  const textEl = wrap.querySelector('.progress-text');
  if (text) textEl.textContent += text;
  textEl.scrollTop = textEl.scrollHeight;
}

function setProgressDone() {
  const wrap = document.getElementById('progress-wrap');
  const bar = wrap.querySelector('.progress-bar');
  bar.classList.remove('indeterminate');
  bar.style.width = '100%';
}

function hideProgress() {
  const wrap = document.getElementById('progress-wrap');
  wrap.classList.remove('visible');
  const bar = wrap.querySelector('.progress-bar');
  bar.classList.remove('indeterminate');
  bar.style.width = '0%';
}

async function analyzeJob() {
  const url = document.getElementById('job-url').value.trim();
  const text = document.getElementById('job-text').value.trim();
  const apiUrl = document.getElementById('api-url').value.trim();
  const apiKey = document.getElementById('api-key').value.trim();
  const model = document.getElementById('api-model').value.trim() || 'gpt-4o-mini';
  
  if (!url && !text) return alert('Enter a job URL or paste a description.');
  if (!apiUrl || !apiKey) return alert('Set your LLM API URL and key first.');
  
  const btn = document.getElementById('analyze-btn');
  const status = document.getElementById('status');
  btn.disabled = true;
  status.style.display = 'block';
  status.textContent = '';
  showProgress('Sending to ' + model + '…\n');
  
  const homeLocation = localStorage.getItem('jfa-home-location') || '';
  
  const prompt = `You are a job-fit analyst. Analyze this job listing and return ONLY a JSON object with this exact structure:

{"name":"<job title>","company":"<company name>","salary":"<compensation as stated>","location":"<work arrangement: remote/hybrid/office + city>","companySize":"<estimated size>","scores":{"salary":N,"growth":N,"impact":N,"culture":N,"autonomy":N,"mission":N,"stability":N,"location":N,"brand":N,"management":N},"summary":"<one sentence>"}

Score each 1-5 where N is an integer:
- salary: 1=below market, 5=top of market
- growth: 1=no learning path, 5=strong growth trajectory
- impact: 1=cog in a machine, 5=significant ownership and influence
- culture: 1=red flags/toxic, 5=great team culture signals
- autonomy: 1=micro-managed/rigid, 5=high autonomy/flexible
- mission: 1=actively harmful to society or planet, 2=net negative, 3=neutral, 4=positive, 5=strong mission
- stability: 1=very risky/short-term, 5=very secure/permanent
- location: 1=strict on-site/no flexibility, 2=mostly on-site, 3=hybrid (2-3 days office), 4=mostly remote, 5=fully remote/location-independent${homeLocation ? '\n\nCandidate is based in: ' + homeLocation + '. Factor commute/distance into location score where relevant.' : ''}
- brand: 1=unknown, 5=top-tier recognizable brand
- management: 1=no management path, 5=clear leadership track

${url ? 'Job URL: ' + url : ''}
${text ? 'Job description:\n' + text : ''}

Return ONLY the JSON object. No markdown, no explanation, no code fences.`;

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" },
    stream: true
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      const err = await res.text();
      throw new Error('API error ' + res.status + ': ' + err.substring(0, 300));
    }

    let fullContent = '';
    let thinkingContent = '';
    let isStreaming = false;
    let nonStreamBody = '';

    // Read the response body
    if (res.body && typeof TextDecoder !== 'undefined') {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          if (trimmed.startsWith('data: ')) {
            isStreaming = true;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              // Content delta
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) { fullContent += delta; updateProgress(delta); }
              // Thinking/reasoning delta
              const thinkDelta = parsed.choices?.[0]?.delta?.reasoning_content || '';
              if (thinkDelta) {
                thinkingContent += thinkDelta;
                updateProgress(thinkDelta);
              }
            } catch(e) {}
          }
        }
      }
      // Remaining buffer
      if (buffer.trim()) {
        if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(buffer.trim().slice(6));
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) { fullContent += delta; updateProgress(delta); }
          } catch(e) {}
        } else {
          // Non-streamed response — the whole body came as one chunk
          nonStreamBody = buffer;
        }
      }
    }

    // If we didn't get SSE events, parse the raw body
    if (!isStreaming) {
      if (nonStreamBody) {
        fullContent = nonStreamBody;
      } else if (!fullContent) {
        // Body was consumed but no content extracted — try non-stream fallback
        updateProgress('\nRetrying without streaming…\n');
        const res2 = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, response_format: { type: "json_object" } })
        });
        const data = await res2.json();
        fullContent = data.choices?.[0]?.message?.content || data.output?.text || '';
        updateProgress(fullContent);
      }
    }

    setProgressDone();
    updateProgress('\n\nParsing…');

    let parsed;
    try {
      parsed = JSON.parse(fullContent);
    } catch(e) {
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response: ' + fullContent.substring(0, 300));
      parsed = JSON.parse(jsonMatch[0]);
    }
    
    // Handle flat scores (LLM might not nest them)
    if (!parsed.scores) {
      const possibleScores = {};
      const axisIds = AXES.map(a => a.id);
      axisIds.forEach(id => { if (typeof parsed[id] === 'number') { possibleScores[id] = parsed[id]; } });
      if (Object.keys(possibleScores).length === axisIds.length) {
        parsed.scores = possibleScores;
      }
    }
    
    if (!parsed.scores || typeof parsed.scores !== 'object') throw new Error('Response missing scores object');
    const requiredAxes = AXES.map(a => a.id);
    const missing = requiredAxes.filter(id => typeof parsed.scores[id] !== 'number');
    if (missing.length > 0) throw new Error('Missing axis scores: ' + missing.join(', '));
    
    jobOverlays.push({
      name: parsed.name || parsed.title || 'Job ' + (jobOverlays.length + 1),
      company: parsed.company || '',
      salary: parsed.salary || '',
      location: parsed.location || '',
      companySize: parsed.companySize || parsed.company_size || '',
      scores: parsed.scores,
      color: COLORS[jobOverlays.length % COLORS.length],
      summary: parsed.summary || '',
      hidden: false,
      originalUrl: url || '',
      originalText: text || ''
    });
    
    save();
    renderHistory();
    draw();
    hideProgress();
    status.textContent = '✓ ' + (parsed.name || 'Job') + ' — ' + (parsed.summary || '');
    status.style.color = '#51cf66';
    document.getElementById('job-url').value = '';
    document.getElementById('job-text').value = '';
  } catch (e) {
    hideProgress();
    status.textContent = '✗ ' + e.message;
    status.style.color = '#ff6b6b';
  }
  btn.disabled = false;
}

// ========== CV TEMPLATE ==========

function toggleCVSection() {
  const body = document.getElementById('cv-template-body');
  const icon = document.getElementById('cv-toggle-icon');
  body.classList.toggle('open');
  icon.classList.toggle('open');
}

function loadCVTemplate() {
  const saved = localStorage.getItem('jfa-cv-template');
  const textarea = document.getElementById('cv-template');
  if (saved) {
    textarea.value = saved;
    updateCVCharCount();
    // Default collapsed if template exists
    return true;
  }
  return false;
}

function saveCVTemplate() {
  const textarea = document.getElementById('cv-template');
  localStorage.setItem('jfa-cv-template', textarea.value);
  // Invalidate all cached tailored CVs
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('jfa-cv-tailored-')) localStorage.removeItem(k);
  });
  updateCVCharCount();
  renderHistory(); // Re-render to enable/disable tailor buttons
}

function updateCVCharCount() {
  const textarea = document.getElementById('cv-template');
  const count = document.getElementById('cv-char-count');
  count.textContent = textarea.value.length + ' chars';
}

// ========== CV TAILOR ==========

let currentTailoredData = null;
let currentTailoredJobIdx = null;
let keptBullets = new Set(); // bullets forced back from cut

async function reanalyzeJob(jobIndex) {
  const job = jobOverlays[jobIndex];
  if (!job) throw new Error('Job not found');

  const apiUrl = document.getElementById('api-url').value.trim();
  const apiKey = document.getElementById('api-key').value.trim();
  const model = document.getElementById('api-model').value.trim() || 'gpt-4o-mini';

  if (!apiUrl || !apiKey) throw new Error('Configure LLM API URL and key first');

  // Try fetching the original URL if we have it, otherwise warn
  let jobText = '';
  if (job.name && job.company) {
    // Reconstruct a minimal description from stored metadata
    jobText = `${job.name} at ${job.company}`;
    if (job.location) jobText += ` | ${job.location}`;
    if (job.salary) jobText += ` | ${job.salary}`;
    if (job.summary) jobText += `\n${job.summary}`;
  }

  if (!jobText.trim()) throw new Error('Not enough job data to re-analyze');

  const homeLocation = localStorage.getItem('jfa-home-location') || '';

  const prompt = `You are a job-fit analyst. Analyze this job listing and return ONLY a JSON object with this exact structure:

{"name":"<job title>","company":"<company name>","salary":"<compensation as stated>","location":"<work arrangement: remote/hybrid/office + city>","companySize":"<estimated size>","scores":{"salary":N,"growth":N,"impact":N,"culture":N,"autonomy":N,"mission":N,"stability":N,"location":N,"brand":N,"management":N},"summary":"<one sentence>"}

Score each 1-5 where N is an integer:
- salary: 1=below market, 5=top of market
- growth: 1=no learning path, 5=strong growth trajectory
- impact: 1=cog in a machine, 5=significant ownership and influence
- culture: 1=red flags/toxic, 5=great team culture signals
- autonomy: 1=micro-managed/rigid, 5=high autonomy/flexible
- mission: 1=actively harmful to society or planet, 2=net negative, 3=neutral, 4=positive, 5=strong mission
- stability: 1=very risky/short-term, 5=very secure/permanent
- location: 1=strict on-site/no flexibility, 2=mostly on-site, 3=hybrid (2-3 days office), 4=mostly remote, 5=fully remote/location-independent${homeLocation ? '\n\nCandidate is based in: ' + homeLocation + '. Factor commute/distance into location score where relevant.' : ''}
- brand: 1=unknown, 5=top-tier recognizable brand
- management: 1=no management path, 5=clear leadership track

Job description:\n${jobText}

Return ONLY the JSON object. No markdown, no explanation, no code fences.`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, response_format: { type: 'json_object' } })
  });

  if (!res.ok) throw new Error('API error ' + res.status);

  const data = await res.json();
  let parsed;
  try {
    parsed = JSON.parse(data.choices?.[0]?.message?.content || data.output?.text || '');
  } catch(e) {
    const jsonMatch = (data.choices?.[0]?.message?.content || '').match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid response');
    parsed = JSON.parse(jsonMatch[0]);
  }

  if (!parsed.scores) throw new Error('Missing scores');

  // Update the job in place
  jobOverlays[jobIndex] = { ...job, ...parsed, originalText: jobText };
  save();
  renderHistory();
  draw();
}

async function tailorCV(jobIndex) {
  const job = jobOverlays[jobIndex];
  if (!job) return;

  // If no original text stored (pre-CV-tailor job), re-analyze first
  if (!job.originalUrl && !job.originalText) {
    openCVModal();
    document.getElementById('cv-tailored-output').innerHTML =
      '<div class="cv-loading"><div class="cv-spinner"></div><span>Re-analyzing job to enable tailoring…</span></div>';
    document.getElementById('cv-diff-output').innerHTML = '';
    document.getElementById('cv-modal-status').textContent = 'Re-analyzing…';
    try {
      await reanalyzeJob(jobIndex);
    } catch(e) {
      document.getElementById('cv-tailored-output').innerHTML =
        '<div class="cv-error">Re-analysis failed: ' + e.message + '</div>';
      return;
    }
  }

  currentTailoredJobIdx = jobIndex;
  keptBullets = new Set();
  openCVModal();

  // Check cache
  const cacheKey = 'jfa-cv-tailored-' + jobIndex;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      currentTailoredData = data;
      renderTailoredCV(data, jobIndex);
      return;
    } catch(e) {}
  }

  // Generate
  generateTailoredCV(job, jobIndex);
}

function openCVModal() {
  document.getElementById('cv-modal-overlay').classList.add('open');
}

function closeCVModal() {
  document.getElementById('cv-modal-overlay').classList.remove('open');
  currentTailoredData = null;
  currentTailoredJobIdx = null;
  keptBullets = new Set();
}

async function generateTailoredCV(job, jobIndex) {
  const cvTemplate = localStorage.getItem('jfa-cv-template') || '';
  const apiUrl = document.getElementById('api-url').value.trim();
  const apiKey = document.getElementById('api-key').value.trim();
  const model = document.getElementById('api-model').value.trim() || 'gpt-4o-mini';

  if (!cvTemplate.trim()) return;
  if (!apiUrl || !apiKey) {
    document.getElementById('cv-tailored-output').innerHTML =
      '<div class="cv-error">Configure your LLM API URL and key first.</div>';
    return;
  }

  // Show loading
  document.getElementById('cv-tailored-output').innerHTML =
    '<div class="cv-loading"><div class="cv-spinner"></div><span>Generating tailored CV…</span></div>';
  document.getElementById('cv-diff-output').innerHTML = '';
  document.getElementById('cv-modal-status').textContent = 'Calling ' + model + '…';

  const fit = calcFit(job);
  const axisScores = AXES.map(a => `${a.label}: ${job.scores[a.id] || 3}/5`).join(', ');

  const jobDescription = job.originalUrl
    ? 'Job URL: ' + job.originalUrl
    : job.originalText;

  const prompt = `You are a CV optimization assistant. Given a candidate's full CV and a job ad, produce a tailored CV that maximizes relevance WITHOUT fabricating anything.

RULES:
- Every fact in the output MUST exist in the input CV. No new achievements, metrics, or experiences.
- Numbers and metrics are sacred — never change them.
- Light rephrasing only: adjust word choice to align with the job ad's language where a natural fit exists. Do NOT change meaning.
- Select the most relevant bullets and cut less relevant ones.
- Reorder bullets within each role so the most relevant lead.
- Rewrite the summary to reflect what this employer values most, drawn only from the selected content.
- Order the skills section to lead with what the ad emphasizes.
- Target one page — if it overflows, cut the lowest-relevance bullets first.

INPUT CV:
${cvTemplate}

JOB AD:
${job.name} at ${job.company}
${job.summary}
${job.location} | ${job.salary} | ${job.companySize}
Fit score: ${fit}%
Values alignment: ${axisScores}

Full job description (from original analysis):
${jobDescription}

Return ONLY a JSON object with this structure:
{
  "summary": "tailored summary paragraph",
  "sections": [
    {
      "role": "Job Title, Company, Dates",
      "bullets": [
        {
          "original": "the original bullet text from the input CV",
          "tailored": "the lightly rephrased version (or same if no change needed)",
          "relevanceScore": 0.9,
          "relevanceReason": "Directly matches requirement for X"
        }
      ]
    }
  ],
  "skills": ["Skill1", "Skill2"],
  "education": "Education line",
  "cut": [
    {
      "original": "bullet text that was cut",
      "relevanceScore": 0.2,
      "reason": "Low relevance to ad requirements"
    }
  ],
  "gaps": [
    {
      "requirement": "What the ad wants",
      "suggestion": "Not found in CV — consider adding if you have relevant experience"
    }
  ]
}`;

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
    stream: true
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error('API error ' + res.status + ': ' + err.substring(0, 300));
    }

    let fullContent = '';
    let isStreaming = false;
    let nonStreamBody = '';

    if (res.body && typeof TextDecoder !== 'undefined') {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('data: ')) {
            isStreaming = true;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) fullContent += delta;
            } catch(e) {}
          }
        }
      }
      if (buffer.trim()) {
        if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(buffer.trim().slice(6));
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) fullContent += delta;
          } catch(e) {}
        } else {
          nonStreamBody = buffer;
        }
      }
    }

    if (!isStreaming) {
      if (nonStreamBody) {
        fullContent = nonStreamBody;
      } else if (!fullContent) {
        const res2 = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, response_format: { type: 'json_object' } })
        });
        const data = await res2.json();
        fullContent = data.choices?.[0]?.message?.content || data.output?.text || '';
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(fullContent);
    } catch(e) {
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response: ' + fullContent.substring(0, 300));
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Cache result
    const cacheKey = 'jfa-cv-tailored-' + jobIndex;
    localStorage.setItem(cacheKey, JSON.stringify(parsed));

    currentTailoredData = parsed;
    document.getElementById('cv-modal-status').textContent = '✓ Done';
    renderTailoredCV(parsed, jobIndex);

  } catch(e) {
    document.getElementById('cv-tailored-output').innerHTML =
      '<div class="cv-error">Generation failed: ' + escapeHtml(e.message) + '</div>';
    document.getElementById('cv-modal-status').textContent = '✗ Error';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderTailoredCV(data, jobIndex) {
  const output = document.getElementById('cv-tailored-output');
  const diffOutput = document.getElementById('cv-diff-output');
  const showScores = document.getElementById('cv-show-scores').checked;

  // Build kept bullets set from cut items that user forced back
  const forcedBullets = new Set(keptBullets);

  // Left column: tailored CV
  let html = '<div class="cv-output-summary">' + escapeHtml(data.summary || '') + '</div>';

  (data.sections || []).forEach(section => {
    html += '<div class="cv-output-section">';
    html += '<div class="cv-output-role">' + escapeHtml(section.role || '') + '</div>';
    (section.bullets || []).forEach((bullet, bIdx) => {
      const score = bullet.relevanceScore || 0;
      const scoreClass = score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low';
      const bulletId = section.role + '::' + bIdx;
      html += '<div class="cv-output-bullet">';
      html += '<span class="relevance-dot ' + scoreClass + '"></span>';
      html += escapeHtml(bullet.tailored || bullet.original || '');
      if (showScores) {
        html += ' <span style="font-size:10px;color:' + (score >= 0.7 ? '#51cf66' : score >= 0.4 ? '#ffc44a' : '#ff6b6b') + '">' + Math.round(score * 100) + '%</span>';
      }
      html += '</div>';
    });
    html += '</div>';
  });

  // Add forced-back bullets at the end
  if (forcedBullets.size > 0 && data.cut) {
    const forcedItems = data.cut.filter((item, idx) => forcedBullets.has('cut::' + idx));
    if (forcedItems.length > 0) {
      html += '<div class="cv-output-section" style="margin-top:12px;padding-top:12px;border-top:1px dashed #333;">';
      html += '<div class="cv-output-role" style="color:#ffc44a;font-size:12px;">Reinstated items</div>';
      forcedItems.forEach(item => {
        html += '<div class="cv-output-bullet cut-back">' + escapeHtml(item.original || '') + '</div>';
      });
      html += '</div>';
    }
  }

  // Skills
  if (data.skills && data.skills.length > 0) {
    html += '<div class="cv-output-skills">';
    data.skills.forEach(s => {
      html += '<span class="cv-output-skill">' + escapeHtml(s) + '</span>';
    });
    html += '</div>';
  }

  // Education
  if (data.education) {
    html += '<div class="cv-output-education">' + escapeHtml(data.education) + '</div>';
  }

  output.innerHTML = html;

  // Right column: diff view
  renderDiffView(data, forcedBullets);
}

function renderDiffView(data, forcedBullets) {
  const diffOutput = document.getElementById('cv-diff-output');
  let html = '';

  // KEPT section
  let keptCount = 0;
  (data.sections || []).forEach(s => { keptCount += (s.bullets || []).length; });
  if (keptCount > 0) {
    html += '<div class="diff-section diff-kept">';
    html += '<div class="diff-section-header" onclick="this.nextElementSibling.classList.toggle(\'open\')"><span>✓ Kept <span class="diff-count">(' + keptCount + ')</span></span><span class="diff-toggle">▶</span></div>';
    html += '<div class="diff-section-body open">';
    (data.sections || []).forEach(section => {
      html += '<div style="font-size:11px;color:#888;font-weight:600;margin-top:8px;">' + escapeHtml(section.role || '') + '</div>';
      (section.bullets || []).forEach(bullet => {
        if (bullet.original !== bullet.tailored && bullet.tailored) {
          html += '<div class="diff-item"><span class="diff-original"><del>' + escapeHtml(bullet.original) + '</del> → <strong>' + escapeHtml(bullet.tailored) + '</strong></span></div>';
        }
      });
    });
    html += '</div></div>';
  }

  // CUT section
  if (data.cut && data.cut.length > 0) {
    const activeCuts = data.cut.filter((_, idx) => !forcedBullets.has('cut::' + idx));
    html += '<div class="diff-section diff-cut">';
    html += '<div class="diff-section-header" onclick="this.nextElementSibling.classList.toggle(\'open\')"><span>✗ Cut <span class="diff-count">(' + activeCuts.length + ')</span></span><span class="diff-toggle">▶</span></div>';
    html += '<div class="diff-section-body open">';
    data.cut.forEach((item, idx) => {
      const isForced = forcedBullets.has('cut::' + idx);
      html += '<div class="diff-item" style="' + (isForced ? 'opacity:0.3;text-decoration:line-through;' : '') + '"><span class="diff-original">' + escapeHtml(item.original || '') + '</span>';
      html += ' <span class="diff-score">' + Math.round((item.relevanceScore || 0) * 100) + '%</span>';
      if (!isForced) {
        html += ' <button class="diff-keep-toggle" onclick="toggleKeepBullet(\'cut::' + idx + '\', this)">Keep anyway</button>';
      } else {
        html += ' <button class="diff-keep-toggle active" onclick="toggleKeepBullet(\'cut::' + idx + '\', this)">Kept</button>';
      }
      if (item.reason) html += '<span class="diff-reason">' + escapeHtml(item.reason) + '</span>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  // GAPS section
  if (data.gaps && data.gaps.length > 0) {
    html += '<div class="diff-section diff-gaps">';
    html += '<div class="diff-section-header" onclick="this.nextElementSibling.classList.toggle(\'open\')"><span>⚠ Gaps <span class="diff-count">(' + data.gaps.length + ')</span></span><span class="diff-toggle">▶</span></div>';
    html += '<div class="diff-section-body">';
    data.gaps.forEach(gap => {
      html += '<div class="diff-item"><span class="diff-gap-req">' + escapeHtml(gap.requirement || '') + '</span>';
      if (gap.suggestion) html += '<span class="diff-gap-sug">' + escapeHtml(gap.suggestion) + '</span>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  diffOutput.innerHTML = html;
}

function toggleKeepBullet(id, btn) {
  if (keptBullets.has(id)) {
    keptBullets.delete(id);
    btn.classList.remove('active');
    btn.textContent = 'Keep anyway';
  } else {
    keptBullets.add(id);
    btn.classList.add('active');
    btn.textContent = 'Kept';
  }
  // Re-render both columns
  if (currentTailoredData && currentTailoredJobIdx !== null) {
    renderTailoredCV(currentTailoredData, currentTailoredJobIdx);
  }
}

function toggleShowScores() {
  const output = document.getElementById('cv-tailored-output');
  const showScores = document.getElementById('cv-show-scores').checked;
  if (showScores) {
    output.classList.add('show-scores');
  } else {
    output.classList.remove('show-scores');
  }
  // Re-render to update score visibility
  if (currentTailoredData && currentTailoredJobIdx !== null) {
    renderTailoredCV(currentTailoredData, currentTailoredJobIdx);
  }
}

function copyTailoredCV() {
  if (!currentTailoredData) return;

  let text = currentTailoredData.summary || '';
  text += '\n\n';

  (currentTailoredData.sections || []).forEach(section => {
    text += section.role + '\n';
    (section.bullets || []).forEach(bullet => {
      text += '• ' + (bullet.tailored || bullet.original) + '\n';
    });
    text += '\n';
  });

  // Add forced-back bullets
  if (keptBullets.size > 0 && currentTailoredData.cut) {
    currentTailoredData.cut.forEach((item, idx) => {
      if (keptBullets.has('cut::' + idx)) {
        text += '• ' + (item.original || '') + '\n';
      }
    });
    text += '\n';
  }

  if (currentTailoredData.skills && currentTailoredData.skills.length > 0) {
    text += 'Skills: ' + currentTailoredData.skills.join(', ') + '\n';
  }
  if (currentTailoredData.education) {
    text += '\n' + currentTailoredData.education + '\n';
  }

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.cv-modal-toolbar .btn');
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

function renderCVTemplateSection() {
  const hasTemplate = loadCVTemplate();
  const textarea = document.getElementById('cv-template');
  const icon = document.getElementById('cv-toggle-icon');
  const body = document.getElementById('cv-template-body');

  textarea.addEventListener('input', updateCVCharCount);

  // Default collapsed if template already saved
  if (!hasTemplate) {
    body.classList.add('open');
    icon.classList.add('open');
  }
}

// Init
load();
renderAxes();
renderCVTemplateSection();
renderHistory();
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function detectLocation() {
  const status = document.getElementById('home-status');
  status.textContent = '…';
  status.style.color = '#ffc44a';
  if (!navigator.geolocation) {
    status.textContent = 'Not supported';
    status.style.color = '#ff6b6b';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&zoom=10`);
        const data = await res.json();
        const city = data.address.city || data.address.town || data.address.village || '';
        const country = data.address.country || '';
        const loc = [city, country].filter(Boolean).join(', ');
        document.getElementById('home-location').value = loc;
        status.textContent = '✓';
        status.style.color = '#51cf66';
        save();
      } catch(e) {
        document.getElementById('home-location').value = pos.coords.latitude.toFixed(2) + ', ' + pos.coords.longitude.toFixed(2);
        status.textContent = '✓ (coords)';
        status.style.color = '#51cf66';
        save();
      }
    },
    (err) => {
      status.textContent = 'Denied';
      status.style.color = '#ff6b6b';
    },
    { timeout: 10000 }
  );
}
