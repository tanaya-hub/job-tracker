(function () {
  const modal = document.getElementById('notesModal');
  const title = document.getElementById('notesTitle');
  const list = document.getElementById('notesList');
  const form = document.getElementById('noteForm');
  const msg = document.getElementById('noteMsg');
  let currentAppId = null;

  const OUTCOMES = ['pending', 'passed', 'failed'];

  function formatDate(value) {
    return value ? String(value).slice(0, 10) : '';
  }

  function noteCardHtml(note) {
    const questions = (note.questions || [])
      .map((q) => `<li>${escapeHtml(q)}</li>`)
      .join('');

    const outcomeOptions = OUTCOMES.map(
      (o) =>
        `<option value="${o}" ${o === note.outcome ? 'selected' : ''}>${o[0].toUpperCase() + o.slice(1)}</option>`
    ).join('');

    return `
      <div class="note-card">
        <div class="note-top">
          <strong>${escapeHtml(note.round)}</strong>
          <span class="tag">${escapeHtml(note.mode)}</span>
          ${note.interviewDate ? `<span class="tag">${escapeHtml(formatDate(note.interviewDate))}</span>` : ''}
        </div>
        ${questions ? `<ul>${questions}</ul>` : ''}
        ${note.notes ? `<p>${escapeHtml(note.notes)}</p>` : ''}
        <div class="note-actions">
          <select class="outcome-select" data-note="${escapeHtml(note._id)}">${outcomeOptions}</select>
          <button class="btn btn-pink btn-small delete-note" data-note="${escapeHtml(note._id)}">Delete</button>
        </div>
      </div>`;
  }

  async function loadNotes() {
    try {
      const notes = await apiRequest(`/applications/${currentAppId}/notes`);
      list.innerHTML = notes.length
        ? notes.map(noteCardHtml).join('')
        : '<p class="empty">No interview notes yet</p>';
    } catch (err) {
      showMessage(msg, err.message, 'error');
    }
  }

  function openModal(button) {
    currentAppId = button.dataset.id;
    const row = button.closest('tr');
    title.textContent = `Interview notes: ${row.children[0].textContent} at ${row.children[1].textContent}`;
    msg.className = 'message';
    form.reset();
    list.innerHTML = '';
    modal.classList.remove('hidden');
    loadNotes();
  }

  function closeModal() {
    modal.classList.add('hidden');
    currentAppId = null;
  }

  document.getElementById('appRows').addEventListener('click', (event) => {
    const button = event.target.closest('.notes-btn');
    if (button) openModal(button);
  });

  document.getElementById('closeNotes').addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const body = {
      round: document.getElementById('noteRound').value.trim(),
      mode: document.getElementById('noteMode').value,
      outcome: document.getElementById('noteOutcome').value,
      questions: document
        .getElementById('noteQuestions')
        .value.split('\n')
        .map((q) => q.trim())
        .filter(Boolean),
      notes: document.getElementById('noteText').value.trim(),
    };

    const date = document.getElementById('noteDate').value;
    if (date) body.interviewDate = date;

    try {
      await apiRequest(`/applications/${currentAppId}/notes`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      form.reset();
      showMessage(msg, 'Note saved', 'success');
      await loadNotes();
    } catch (err) {
      showMessage(msg, err.message, 'error');
    }
  });

  list.addEventListener('change', async (event) => {
    if (!event.target.classList.contains('outcome-select')) return;

    try {
      await apiRequest(`/applications/${currentAppId}/notes/${event.target.dataset.note}`, {
        method: 'PUT',
        body: JSON.stringify({ outcome: event.target.value }),
      });
      showMessage(msg, 'Outcome updated', 'success');
    } catch (err) {
      showMessage(msg, err.message, 'error');
    }
  });

  list.addEventListener('click', async (event) => {
    if (!event.target.classList.contains('delete-note')) return;
    if (!confirm('Delete this note?')) return;

    try {
      await apiRequest(`/applications/${currentAppId}/notes/${event.target.dataset.note}`, {
        method: 'DELETE',
      });
      showMessage(msg, 'Note deleted', 'success');
      await loadNotes();
    } catch (err) {
      showMessage(msg, err.message, 'error');
    }
  });
})();