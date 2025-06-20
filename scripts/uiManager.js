// UI Manager for handling DOM interactions and updates

class UIManager {
  static STYLES = {
    seasonWrapper: 'margin: 1em 0; display: flex; align-items: center; gap: 0.7em;',
    seasonLabel: 'font-weight: bold; color: #b0c4de;',
    seasonInput: 'width: 7em; border-radius: 5px; border: 1px solid #444; padding: 0.4em 0.7em; background: #181a1b; color: #e0e6ed;'
  };

  static SORT_COLUMNS = ['pos', 'skills', 'ovr', 'pot'];
  static BUTTON_CONFIGS = [
    { count: 5, text: 'Generate 5 Players' },
    { count: 20, text: 'Generate 20 Players' },
    { count: 40, text: 'Generate 40 Players' }
  ];

  constructor(playerManager, eventBus) {
    this.playerManager = playerManager;
    this.eventBus = eventBus;
    this.elements = {};
    this.sortState = { column: null, direction: 1 };
    
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    const elementIds = [
      'jsonFormContainer', 'saveJsonBtn', 'outputSection', 'outputJson',
      'generateRandomPlayerBtn', 'playerTableContainer', 'totalPlayersDisplay', 'jsonInput'
    ];
    
    elementIds.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }

  setupEventListeners() {
    const eventMappings = [
      { element: 'saveBtn', event: 'click', handler: () => this.eventBus.emit('player:save') },
      { element: 'generateRandomPlayerBtn', event: 'click', handler: () => this.eventBus.emit('player:generateRandom', 1) },
      { element: 'jsonInput', event: 'change', handler: (e) => this.eventBus.emit('file:import', e.target.files[0]) }
    ];

    eventMappings.forEach(({ element, event, handler }) => {
      this.elements[element]?.addEventListener(event, handler);
    });
  }

  createStartingSeasonInput(initialSeason, onSeasonChange) {
    const wrapper = this.createElement('div', { style: UIManager.STYLES.seasonWrapper });
    const label = this.createElement('label', {
      textContent: 'Starting Season:',
      htmlFor: 'startingSeasonInput',
      style: UIManager.STYLES.seasonLabel
    });
    const input = this.createElement('input', {
      type: 'number',
      id: 'startingSeasonInput',
      value: initialSeason,
      min: 1900,
      max: 3000,
      style: UIManager.STYLES.seasonInput
    });

    wrapper.append(label, input);
    this.insertBeforeElement(wrapper, this.elements.jsonFormContainer);

    this.setupSeasonChangeHandler(input, initialSeason, onSeasonChange);
    return { wrapper, input };
  }

  setupSeasonChangeHandler(input, initialSeason, onSeasonChange) {
    let isLocked = false;
    input.addEventListener('change', () => {
      if (!isLocked) {
        const newSeason = Number(input.value) || initialSeason;
        onSeasonChange(newSeason);
        input.disabled = true;
        isLocked = true;
      }
    });
  }

  createBulkGenerationButtons() {
    const buttons = UIManager.BUTTON_CONFIGS.map(config => 
      this.createGenerationButton(config)
    );

    const parent = this.elements.generateRandomPlayerBtn?.parentNode;
    if (parent) {
      const nextSibling = this.elements.generateRandomPlayerBtn.nextSibling;
      buttons.forEach(button => parent.insertBefore(button, nextSibling));
    }

    return buttons;
  }

  createGenerationButton(config) {
    const button = this.createElement('button', {
      textContent: config.text,
      className: 'primary-btn',
      style: 'margin-left: 0.5em'
    });
    
    button.addEventListener('click', () => {
      this.eventBus.emit('player:generateRandom', config.count);
    });

    return button;
  }

  createPlayersTable() {
    const table = this.createElement('table', { className: 'players-table' });
    table.innerHTML = this.getTableHTML();

    this.insertBeforeElement(table, this.elements.outputSection);
    this.setupSortHandlers(table);
    
    return table;
  }

  getTableHTML() {
    const sortHeaders = UIManager.SORT_COLUMNS.map(col => 
      `<th id="sort-${col}" style="cursor:pointer;">${this.capitalizeFirst(col)}</th>`
    ).join('');

    return `
      <thead>
        <tr>
          <th>#</th><th>Name</th><th>pid</th>
          ${sortHeaders}
          <th><input type="checkbox" id="selectAllPlayers" aria-label="Select all players"></th>
        </tr>
      </thead>
      <tbody></tbody>
      <tfoot>
        <tr><td colspan="8" style="text-align:right;font-weight:bold;">Total Players: 0</td></tr>
      </tfoot>
    `;
  }

  setupSortHandlers(table) {
    UIManager.SORT_COLUMNS.forEach(column => {
      const header = table.querySelector(`#sort-${column}`);
      header?.addEventListener('click', () => this.handleSort(column));
    });
  }

  handleSort(column) {
    this.sortState.direction = this.sortState.column === column ? -this.sortState.direction : 1;
    this.sortState.column = column;
    this.eventBus.emit('table:sort', { column, direction: this.sortState.direction });
  }

  createBatchActionBar() {
    const batchBar = this.createElement('div');
    const buttonConfigs = [
      { id: 'batchDeleteBtn', text: 'Delete Selected', event: 'players:deleteSelected' },
      { id: 'batchExportBtn', text: 'Export Selected', event: 'players:exportSelected' },
      { id: 'undoBtn', text: 'Undo', event: 'players:undo' },
      { id: 'redoBtn', text: 'Redo', event: 'players:redo' }
    ];

    batchBar.innerHTML = buttonConfigs.map(btn => 
      `<button id="${btn.id}" class="primary-btn">${btn.text}</button>`
    ).join('');

    this.setupBatchActionHandlers(batchBar, buttonConfigs);
    return batchBar;
  }

  setupBatchActionHandlers(container, configs) {
    configs.forEach(({ id, event }) => {
      container.querySelector(`#${id}`)?.addEventListener('click', () => {
        this.eventBus.emit(event);
      });
    });
  }

  updatePlayersTable(players, sortConfig = null) {
    const table = document.querySelector('.players-table');
    if (!table) return;

    const { tbody, tfoot } = this.getTableElements(table);
    if (!tbody) return;

    const displayPlayers = this.getSortedPlayers(players, sortConfig);
    
    this.renderTableBody(tbody, displayPlayers);
    this.updateTableFooter(tfoot, players.length);
    this.setupCheckboxListeners();
  }

  getTableElements(table) {
    return {
      tbody: table.querySelector('tbody'),
      tfoot: table.querySelector('tfoot')
    };
  }

  getSortedPlayers(players, sortConfig) {
    return sortConfig ? 
      this.sortPlayers([...players], sortConfig.column, sortConfig.direction) : 
      [...players];
  }

  renderTableBody(tbody, players) {
    const fragment = document.createDocumentFragment();
    
    players.forEach((player, index) => {
      fragment.appendChild(this.createPlayerTableRow(player, index));
    });
    
    tbody.replaceChildren(fragment);
  }

  updateTableFooter(tfoot, playerCount) {
    if (!tfoot) return;
    
    const footerCell = tfoot.querySelector('td');
    if (footerCell) {
      footerCell.textContent = `Total Players: ${playerCount}`;
    }
  }

  createPlayerTableRow(player, index) {
    const row = this.createElement('tr');
    const playerData = this.extractPlayerData(player);

    row.innerHTML = this.getRowHTML(playerData, index);
    this.setupRowEventHandlers(row, index);
    
    return row;
  }

  extractPlayerData(player) {
    const rating = player.ratings?.[0] || {};
    const draft = player.draft || {};
    
    return {
      fullName: `${player.firstName || ''} ${player.lastName || ''}`.trim(),
      pid: player.pid || '',
      pos: player.pos || rating.pos || draft.pos || '',
      skills: this.formatSkills(rating.skills || player.skills || draft.skills),
      ovr: rating.ovr || draft.ovr || player.ovr || '',
      pot: rating.pot || draft.pot || player.pot || ''
    };
  }

  getRowHTML(data, index) {
    return `
      <td>${index + 1}</td>
      <td>${data.fullName}</td>
      <td>${data.pid}</td>
      <td>${data.pos}</td>
      <td>${data.skills}</td>
      <td>${data.ovr}</td>
      <td>${data.pot}</td>
      <td>
        <button class="edit-btn" data-idx="${index}">Edit</button>
        <button class="delete-btn" data-idx="${index}">Delete</button>
        <input type="checkbox" class="batch-select" data-idx="${index}">
      </td>
    `;
  }

  setupRowEventHandlers(row, index) {
    const editBtn = row.querySelector('.edit-btn');
    const deleteBtn = row.querySelector('.delete-btn');
    
    editBtn?.addEventListener('click', () => this.eventBus.emit('player:edit', index));
    deleteBtn?.addEventListener('click', () => this.eventBus.emit('player:delete', index));
  }

  formatSkills(skills) {
    return Array.isArray(skills) ? skills.join(', ') : '';
  }

  sortPlayers(players, column, direction) {
    return players.sort((a, b) => {
      const aVal = this.getColumnValue(a, column);
      const bVal = this.getColumnValue(b, column);

      if (column === 'ovr' || column === 'pot') {
        return ((Number(aVal) || 0) - (Number(bVal) || 0)) * direction;
      }
      
      return aVal.localeCompare(bVal) * direction;
    });
  }

  getColumnValue(player, column) {
    const rating = player.ratings?.[0] || {};
    const draft = player.draft || {};
    
    switch (column) {
      case 'pot': return rating.pot || draft.pot || player.pot || '';
      case 'ovr': return rating.ovr || draft.ovr || player.ovr || '';
      case 'pos': return player.pos || rating.pos || draft.pos || '';
      case 'skills': return this.formatSkills(rating.skills || player.skills || draft.skills);
      default: return '';
    }
  }

  setupCheckboxListeners() {
    const selectAllCheckbox = document.getElementById('selectAllPlayers');
    const individualCheckboxes = document.querySelectorAll('.batch-select');

    this.attachIndividualCheckboxListeners(individualCheckboxes);
    this.attachSelectAllListener(selectAllCheckbox);
    this.syncSelectAllCheckbox();
  }

  attachIndividualCheckboxListeners(checkboxes) {
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => this.syncSelectAllCheckbox());
    });
  }

  attachSelectAllListener(selectAllCheckbox) {
    if (!selectAllCheckbox) return;
    
    selectAllCheckbox.removeEventListener('change', this.handleSelectAllChange);
    selectAllCheckbox.addEventListener('change', this.handleSelectAllChange.bind(this));
  }

  syncSelectAllCheckbox() {
    const checkboxData = this.getCheckboxData();
    const selectAllCheckbox = document.getElementById('selectAllPlayers');

    if (selectAllCheckbox) {
      this.updateSelectAllState(selectAllCheckbox, checkboxData.total, checkboxData.checked);
    }
  }

  getCheckboxData() {
    const allCheckboxes = Array.from(document.querySelectorAll('.batch-select'));
    const checkedCount = allCheckboxes.filter(cb => cb.checked).length;
    
    return {
      total: allCheckboxes.length,
      checked: checkedCount
    };
  }

  updateSelectAllState(selectAllCheckbox, totalCount, checkedCount) {
    selectAllCheckbox.disabled = totalCount === 0;
    
    if (checkedCount === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === totalCount) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }

  handleSelectAllChange() {
    const selectAllCheckbox = document.getElementById('selectAllPlayers');
    const isChecked = selectAllCheckbox?.checked || false;
    
    document.querySelectorAll('.batch-select').forEach(checkbox => {
      checkbox.checked = isChecked;
    });
  }

  getSelectedPlayerIndices() {
    return Array.from(document.querySelectorAll('.batch-select:checked'))
      .map(checkbox => Number(checkbox.dataset.idx));
  }

  renderPlayerTable(players) {
    if (!this.elements.playerTableContainer) return;

    if (!players.length) {
      this.elements.playerTableContainer.innerHTML = '<p>No players yet.</p>';
      return;
    }

    const tableHTML = this.generatePlayerTableHTML(players);
    this.elements.playerTableContainer.innerHTML = tableHTML;
  }

  generatePlayerTableHTML(players) {
    const headers = ['#', 'First Name', 'Last Name', 'Position', 'College', 'Born', 'Ovr', 'Pot', 'pid'];
    const headerRow = headers.map(h => `<th>${h}</th>`).join('');
    
    const rows = players.map((player, idx) => {
      // Debug: Log player structure for first few players
      if (idx < 3) {
        console.log(`Player ${idx}:`, player);
      }

      const rating = player.ratings?.[0] || {};
      const draft = player.draft || {};
      const born = player.born || {};
      
      // Comprehensive data extraction with multiple fallback paths
      const extractedData = {
        firstName: player.firstName || '',
        lastName: player.lastName || '',
        pos: player.pos || rating.pos || draft.pos || '',
        college: player.college || '',
        bornInfo: this.formatBornInfo(born),
        ovr: rating.ovr || draft.ovr || player.ovr || '',
        pot: rating.pot || draft.pot || player.pot || '',
        pid: player.pid || ''
      };

      // Debug: Log extracted data for first few players
      if (idx < 3) {
        console.log(`Extracted data ${idx}:`, extractedData);
      }

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${extractedData.firstName}</td>
          <td>${extractedData.lastName}</td>
          <td>${extractedData.pos}</td>
          <td>${extractedData.college}</td>
          <td>${extractedData.bornInfo}</td>
          <td>${extractedData.ovr}</td>
          <td>${extractedData.pot}</td>
          <td>${extractedData.pid}</td>
        </tr>
      `;
    }).join('');

    return `
      <table class="player-table">
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  formatBornInfo(born) {
    if (!born) return '';
    
    if (typeof born === 'string') return born;
    
    if (typeof born === 'object') {
      const parts = [];
      if (born.loc) parts.push(born.loc);
      if (born.year) parts.push(`(${born.year})`);
      return parts.join(' ');
    }
    
    return '';
  }

  // Utility methods
  createElement(tag, attributes = {}) {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'style') {
        element.style.cssText = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else if (key === 'className') {
        element.className = value;
      } else if (key === 'htmlFor') {
        element.setAttribute('for', value);
      } else {
        element.setAttribute(key, value);
      }
    });
    return element;
  }

  insertBeforeElement(newElement, referenceElement) {
    const parent = referenceElement?.parentNode;
    if (parent) {
      parent.insertBefore(newElement, referenceElement);
    }
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Public interface methods
  updateTotalPlayersDisplay(count) {
    if (this.elements.totalPlayersDisplay) {
      this.elements.totalPlayersDisplay.textContent = `Total players in output: ${count}`;
    }
  }

  toggleOutputSection(show) {
    if (this.elements.outputSection) {
      this.elements.outputSection.style.display = show ? 'block' : 'none';
    }
  }

  updateOutputJson(jsonData) {
    if (this.elements.outputJson) {
      this.elements.outputJson.textContent = JSON.stringify(jsonData, null, 2);
    }
  }

  showAlert(message) {
    alert(message);
  }

  showConfirm(message) {
    return confirm(message);
  }
}

export default UIManager;
