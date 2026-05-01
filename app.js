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
        <span class="remove" data-idx="${idx}" title="Delete">Del</span>
      </div>
    `;
    item.querySelector('.toggle-btn').addEventListener('click', e => {
      e.stopPropagation();
      jobOverlays[idx].hidden = !jobOverlays[idx].hidden;
      save(); renderHistory(); draw();
    });
    item.querySelector('.remove').addEventListener('click', e => {
      e.stopPropagation();
      jobOverlays.splice(idx, 1);
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
      hidden: false
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

// Init
load();
renderAxes();
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
