if (!getToken()) {
  window.location.href = '/index.html';
}

const state = { page: 1, limit: 5, status: '', search: '' };

const els = {
  greeting: document.getElementById('greeting'),
  logoutBtn: document.getElementById('logoutBtn'),
  companyForm: document.getElementById('companyForm'),
  companyMsg: document.getElementById('companyMsg'),
  appForm: document.getElementById('appForm'),
  appMsg: document.getElementById('appMsg'),
  appCompany: document.getElementById('appCompany'),
  filterForm: document.getElementById('filterForm'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  appRows: document.getElementById('appRows'),
  pageInfo: document.getElementById('pageInfo'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  listMsg: document.getElementById('listMsg'),
};

const STATUS_LABELS = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeLink(url) {
  return /^https?:\/\//i.test(url || '') ? url : null;
}

function statusSelectHtml(id, current) {
  const options = Object.entries(STATUS_LABELS)
    .map(([value, label]) =>
      `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`
    )
    .join('');
  return `<select class="status-select status-${escapeHtml(current)}" data-id="${id}">${options}</select>`;
}

function renderRows(applications) {
  if (applications.length === 0) {
    els.appRows.innerHTML = '<tr><td colspan="6" class="empty">No applications found</td></tr>';
    return;
  }

  els.appRows.innerHTML = applications
    .map((a) => {
      const link = safeLink(a.job_url);
      return `
        <tr>
          <td>${escapeHtml(a.job_title)}</td>
          <td>${escapeHtml(a.company_name)}</td>
          <td>${statusSelectHtml(a.id, a.status)}</td>
          <td>${a.applied_date ? escapeHtml(a.applied_date) : '-'}</td>
          <td>${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener">Open</a>` : '-'}</td>
          <td class="actions">
            <button class="btn btn-mint btn-small notes-btn" data-id="${a.id}">Notes</button>
            <button class="btn btn-pink btn-small delete-btn" data-id="${a.id}">Delete</button>
          </td>
        </tr>`;
    })
    .join('');
}

async function loadCompanies() {
  const companies = await apiRequest('/companies');

  if (companies.length === 0) {
    els.appCompany.innerHTML = '<option value="">Add a company first</option>';
    return;
  }

  els.appCompany.innerHTML = companies
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join('');
}

async function loadStats() {
  try {
    const stats = await apiRequest('/applications/stats');
    Object.keys(stats).forEach((key) => {
      const el = document.getElementById(`stat-${key}`);
      if (el) el.textContent = stats[key];
    });
  } catch (err) {
    // The cards are optional, so a failure here should not break the page
  }
}

async function loadApplications() {
  loadStats();

  const params = new URLSearchParams({ page: state.page, limit: state.limit });
  if (state.status) params.set('status', state.status);
  if (state.search) params.set('search', state.search);

  try {
    const result = await apiRequest(`/applications?${params.toString()}`);

    if (result.data.length === 0 && state.page > 1) {
      state.page -= 1;
      return loadApplications();
    }

    renderRows(result.data);

    els.pageInfo.textContent =
      result.total === 0
        ? 'No results'
        : `Page ${result.page} of ${result.totalPages} (${result.total} total)`;
    els.prevBtn.disabled = result.page <= 1;
    els.nextBtn.disabled = result.page >= result.totalPages;
    els.listMsg.className = 'message';
  } catch (err) {
    showMessage(els.listMsg, err.message, 'error');
  }
}

els.companyForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await apiRequest('/companies', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('companyName').value.trim(),
        location: document.getElementById('companyLocation').value.trim(),
        website: document.getElementById('companyWebsite').value.trim(),
      }),
    });

    els.companyForm.reset();
    showMessage(els.companyMsg, 'Company added', 'success');
    await loadCompanies();
  } catch (err) {
    showMessage(els.companyMsg, err.message, 'error');
  }
});

els.appForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!els.appCompany.value) {
    showMessage(els.appMsg, 'Add a company first', 'error');
    return;
  }

  try {
    await apiRequest('/applications', {
      method: 'POST',
      body: JSON.stringify({
        company_id: Number(els.appCompany.value),
        job_title: document.getElementById('appTitle').value.trim(),
        status: document.getElementById('appStatus').value,
        applied_date: document.getElementById('appDate').value,
        job_url: document.getElementById('appUrl').value.trim(),
      }),
    });

    els.appForm.reset();
    showMessage(els.appMsg, 'Application added', 'success');
    state.page = 1;
    await loadApplications();
  } catch (err) {
    showMessage(els.appMsg, err.message, 'error');
  }
});

els.filterForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.search = els.searchInput.value.trim();
  state.status = els.statusFilter.value;
  state.page = 1;
  loadApplications();
});

els.prevBtn.addEventListener('click', () => {
  state.page -= 1;
  loadApplications();
});

els.nextBtn.addEventListener('click', () => {
  state.page += 1;
  loadApplications();
});

els.appRows.addEventListener('change', async (event) => {
  if (!event.target.classList.contains('status-select')) return;

  try {
    await apiRequest(`/applications/${event.target.dataset.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: event.target.value }),
    });
    await loadApplications();
  } catch (err) {
    showMessage(els.listMsg, err.message, 'error');
  }
});

els.appRows.addEventListener('click', async (event) => {
  if (!event.target.classList.contains('delete-btn')) return;
  if (!confirm('Delete this application?')) return;

  try {
    await apiRequest(`/applications/${event.target.dataset.id}`, { method: 'DELETE' });
    await loadApplications();
  } catch (err) {
    showMessage(els.listMsg, err.message, 'error');
  }
});

els.logoutBtn.addEventListener('click', () => {
  clearSession();
  window.location.href = '/index.html';
});

const user = getUser();
if (user) {
  els.greeting.textContent = `Hello, ${user.name}`;
}

loadCompanies().catch((err) => showMessage(els.companyMsg, err.message, 'error'));
loadApplications();