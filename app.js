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
  
  // Grid rings
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
      ctx.fillStyle = '#444';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ring, cx + 10, cy - r + 2);
    }
  }

  // Axis lines and labels
  const bcolors = ['#4a9eff','#ffc44a','#555'];
  AXES.forEach((axis, i) => {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const x = cx + R * Math.cos(angle);
    const y = cy + R * Math.sin(angle);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y);
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
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
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
    drawPoly(AXES.map(a => job.scores[a.id] || 0), job.color + '18', job.color, 1.5);
  });

  // Legend
  ctx.font = 'bold 12px -apple-system, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#4a9eff';
  ctx.fillText('● Your Profile', 12, 12);
  jobOverlays.forEach((job, idx) => {
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
    const meta = [job.company, job.location, job.salary].filter(Boolean).join(' · ');
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="job-info">
        <div class="job-title" style="color:${job.color}">${job.name}</div>
        ${meta ? '<div class="job-meta">' + meta + '</div>' : ''}
      </div>
      <span class="fit-score" style="color:${fitColor}">${fit}%</span>
      <span class="remove" data-idx="${idx}">✕</span>
    `;
    item.querySelector('.remove').addEventListener('click', e => {
      e.stopPropagation();
      jobOverlays.splice(idx, 1);
      save(); renderHistory(); draw();
    });
    list.appendChild(item);
  });
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
  status.textContent = 'Analyzing…';
  
  const axisList = AXES.map(a => `"${a.id}": integer 1-5 (${a.label}: ${a.low} → ${a.high})`).join(', ');
  
  const prompt = `You are a job-fit analyst. Analyze this job listing and return structured data.

Axes (score each 1-5):
- salary: 1=below market, 5=top of market
- growth (Tech Growth): 1=no learning path, 5=strong growth trajectory
- impact: 1=cog in a machine, 5=significant ownership and influence
- culture (Team Culture): 1=red flags/toxic, 5=great team culture signals
- autonomy: 1=micro-managed/rigid, 5=high autonomy/flexible
- mission: 1=actively harmful to society or planet, 2=net negative, 3=neutral/no impact, 4=positive contribution, 5=strong mission you can believe in
- stability: 1=very risky/short-term/frequent layoffs, 5=very secure/permanent
- location: 1=strict on-site required/no flexibility, 2=mostly on-site, 3=hybrid (2-3 days office), 4=mostly remote with occasional office, 5=fully remote/location-independent
- brand: 1=unknown, 5=top-tier recognizable brand
- management (Leadership): 1=no management path, 5=clear leadership track

Also extract: job title, company name, salary/compensation, location/work arrangement, company size.

${url ? 'Job URL: ' + url : ''}
${text ? 'Job description:\\n' + text : ''}

You MUST respond with ONLY valid JSON matching this exact schema. No markdown, no explanation, no code fences.`;

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" }
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      const err = await res.text();
      throw new Error('API error ' + res.status + ': ' + err.substring(0, 200));
    }
    
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || data.output?.text || '';
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch(e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response: ' + content.substring(0, 200));
      parsed = JSON.parse(jsonMatch[0]);
    }
    
    // Validate required fields
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
      summary: parsed.summary || ''
    });
    
    save();
    renderHistory();
    draw();
    status.textContent = '✓ ' + (parsed.name || 'Job') + ' — ' + (parsed.summary || '');
    status.style.color = '#51cf66';
    document.getElementById('job-url').value = '';
    document.getElementById('job-text').value = '';
  } catch (e) {
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
