// UI Manager for handling DOM interactions and updates

class UIManager {
  constructor(playerManager, eventBus) {
    this.playerManager = playerManager;
    this.eventBus = eventBus;
    this.elements = {};
    this.sortState = {
      column: null,
      direction: 1
    };
    
    this.initializeElements();
    this.setupEventListeners();
  }

  // Initialize DOM element references
  initializeElements() {
    this.elements = {
      jsonFormContainer: document.getElementById('jsonFormContainer'),
      saveBtn: document.getElementById('saveJsonBtn'),
      outputSection: document.getElementById('outputSection'),
      outputJson: document.getElementById('outputJson'),
      generateRandomPlayerBtn: document.getElementById('generateRandomPlayerBtn'),
      playerTableContainer: document.getElementById('playerTableContainer'),
      totalPlayersDisplay: document.getElementById('totalPlayersDisplay'),
      jsonInput: document.getElementById('jsonInput')
    };
  }

  // Setup event listeners
  setupEventListeners() {
    // Save button
    if (this.elements.saveBtn) {
      this.elements.saveBtn.addEventListener('click', () => {
        this.eventBus.emit('player:save');
      });
    }

    // Generate random player button
    if (this.elements.generateRandomPlayerBtn) {
      this.elements.generateRandomPlayerBtn.addEventListener('click', () => {
        this.eventBus.emit('player:generateRandom', 1);
      });
    }

    // File input
    if (this.elements.jsonInput) {
      this.elements.jsonInput.addEventListener('change', (e) => {
        this.eventBus.emit('file:import', e.target.files[0]);
      });
    }
  }

  // Create and setup starting season input
  createStartingSeasonInput(initialSeason, onSeasonChange) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin: 1em 0;
      display: flex;
      align-items: center;
      gap: 0.7em;
    `;

    const label = document.createElement('label');
    label.textContent = "Starting Season:";
    label.setAttribute('for', 'startingSeasonInput');
    label.style.cssText = `
      font-weight: bold;
      color: #b0c4de;
    `;

    const input = document.createElement('input');
    input.type = "number";
    input.id = "startingSeasonInput";
    input.value = initialSeason;
    input.min = 1900;
    input.max = 3000;
    input.style.cssText = `
      width: 7em;
      border-radius: 5px;
      border: 1px solid #444;
      padding: 0.4em 0.7em;
      background: #181a1b;
      color: #e0e6ed;
    `;

    wrapper.appendChild(label);
    wrapper.appendChild(input);

    // Insert before form container
    if (this.elements.jsonFormContainer && this.elements.jsonFormContainer.parentNode) {
      this.elements.jsonFormContainer.parentNode.insertBefore(wrapper, this.elements.jsonFormContainer);
    }

    // Setup change handler
    let isLocked = false;
    input.addEventListener('change', () => {
      if (!isLocked) {
        const newSeason = Number(input.value) || initialSeason;
        onSeasonChange(newSeason);
        input.disabled = true;
        isLocked = true;
      }
    });

    return { wrapper, input };
  }

  // Create bulk generation buttons
  createBulkGenerationButtons() {
    const buttonConfigs = [
      { count: 5, text: 'Generate 5 Players' },
      { count: 20, text: 'Generate 20 Players' },
      { count: 40, text: 'Generate 40 Players' }
    ];

    const buttons = buttonConfigs.map(config => {
      const button = document.createElement('button');
      button.textContent = config.text;
      button.className = 'primary-btn';
      button.setAttribute('aria-label', `Generate ${config.count} random players`);
      button.style.marginLeft = '0.5em';
      
      button.addEventListener('click', () => {
        this.eventBus.emit('player:generateRandom', config.count);
      });

      return button;
    });

    // Insert buttons after the generate random player button
    if (this.elements.generateRandomPlayerBtn && this.elements.generateRandomPlayerBtn.parentNode) {
      const parent = this.elements.generateRandomPlayerBtn.parentNode;
      buttons.forEach(button => {
        parent.insertBefore(button, this.elements.generateRandomPlayerBtn.nextSibling);
      });
    }

    return buttons;
  }

  // Create players table
  createPlayersTable() {
    const table = document.createElement('table');
    table.className = 'players-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>pid</th>
          <th id="sort-pos" style="cursor:pointer;">Pos</th>
          <th id="sort-skills" style="cursor:pointer;">Skills</th>
          <th id="sort-ovr" style="cursor:pointer;">Ovr</th>
          <th id="sort-pot" style="cursor:pointer;">Pot</th>
          <th>
            <input type="checkbox" id="selectAllPlayers" aria-label="Select all players for batch actions">
          </th>
        </tr>
      </thead>
      <tbody></tbody>
      <tfoot>
        <tr>
          <td colspan="8" style="text-align:right;font-weight:bold;">
            Total Players: 0
          </td>
        </tr>
      </tfoot>
    `;

    // Insert before output section
    if (this.elements.outputSection) {
      document.querySelector('main').insertBefore(table, this.elements.outputSection);
    }

    // Setup sort handlers
    this.setupSortHandlers(table);
    
    return table;
  }

  // Setup table sorting
  setupSortHandlers(table) {
    const sortColumns = ['pos', 'skills', 'ovr', 'pot'];
    
    sortColumns.forEach(column => {
      const header = table.querySelector(`#sort-${column}`);
      if (header) {
        header.addEventListener('click', () => {
          this.sortState.direction = this.sortState.column === column ? -this.sortState.direction : 1;
          this.sortState.column = column;
          this.eventBus.emit('table:sort', { column, direction: this.sortState.direction });
        });
      }
    });
  }

  // Create batch action bar
  createBatchActionBar() {
    const batchBar = document.createElement('div');
    batchBar.innerHTML = `
      <button id="batchDeleteBtn" class="primary-btn">Delete Selected</button>
      <button id="batchExportBtn" class="primary-btn">Export Selected</button>
      <button id="undoBtn" class="primary-btn">Undo</button>
      <button id="redoBtn" class="primary-btn">Redo</button>
    `;

    // Setup event handlers
    batchBar.querySelector('#batchDeleteBtn').addEventListener('click', () => {
      this.eventBus.emit('players:deleteSelected');
    });

    batchBar.querySelector('#batchExportBtn').addEventListener('click', () => {
      this.eventBus.emit('players:exportSelected');
    });

    batchBar.querySelector('#undoBtn').addEventListener('click', () => {
      this.eventBus.emit('players:undo');
    });

    batchBar.querySelector('#redoBtn').addEventListener('click', () => {
      this.eventBus.emit('players:redo');
    });

    return batchBar;
  }

  // Update players table
  updatePlayersTable(players, sortConfig = null) {
    const table = document.querySelector('.players-table');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    const tfoot = table.querySelector('tfoot');
    
    if (!tbody) return;

    // Apply sorting if specified
    let displayPlayers = [...players];
    if (sortConfig) {
      displayPlayers = this.sortPlayers(displayPlayers, sortConfig.column, sortConfig.direction);
    }

    // Clear existing rows
    tbody.innerHTML = '';

    // Generate table rows
    displayPlayers.forEach((player, index) => {
      const row = this.createPlayerTableRow(player, index);
      tbody.appendChild(row);
    });

    // Update footer
    if (tfoot) {
      tfoot.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:right;font-weight:bold;">
            Total Players: ${players.length}
          </td>
        </tr>
      `;
    }

    // Setup checkbox listeners
    this.setupCheckboxListeners();
  }

  // Create individual player table row
  createPlayerTableRow(player, index) {
    const row = document.createElement('tr');
    
    const ovr = player.ratings?.[0]?.ovr || '';
    const pot = player.ratings?.[0]?.pot || '';
    const pos = player.pos || player.ratings?.[0]?.pos || '';
    const skills = this.formatSkills(player.ratings?.[0]?.skills || player.skills);

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${player.firstName} ${player.lastName}</td>
      <td>${player.pid}</td>
      <td>${pos}</td>
      <td>${skills}</td>
      <td>${ovr}</td>
      <td>${pot}</td>
      <td>
        <button class="edit-btn" data-idx="${index}">Edit</button>
        <button class="delete-btn" data-idx="${index}">Delete</button>
        <input type="checkbox" class="batch-select" data-idx="${index}">
      </td>
    `;

    // Setup row event listeners
    row.querySelector('.edit-btn').addEventListener('click', () => {
      this.eventBus.emit('player:edit', index);
    });

    row.querySelector('.delete-btn').addEventListener('click', () => {
      this.eventBus.emit('player:delete', index);
    });

    return row;
  }

  // Format skills array for display
  formatSkills(skills) {
    if (Array.isArray(skills)) {
      return skills.join(', ');
    }
    return '';
  }

  // Sort players array
  sortPlayers(players, column, direction) {
    return [...players].sort((a, b) => {
      let aVal, bVal;
      
      switch (column) {
        case 'pot':
          aVal = a.ratings?.[0]?.pot ?? '';
          bVal = b.ratings?.[0]?.pot ?? '';
          break;
        case 'ovr':
          aVal = a.ratings?.[0]?.ovr ?? '';
          bVal = b.ratings?.[0]?.ovr ?? '';
          break;
        case 'pos':
          aVal = a.pos ?? '';
          bVal = b.pos ?? '';
          break;
        case 'skills':
          aVal = this.formatSkills(a.ratings?.[0]?.skills);
          bVal = this.formatSkills(b.ratings?.[0]?.skills);
          break;
        default:
          return 0;
      }

      // Numeric sort for ovr/pot, string sort for pos/skills
      if (column === 'ovr' || column === 'pot') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
        return (aVal - bVal) * direction;
      } else {
        return aVal.localeCompare(bVal) * direction;
      }
    });
  }

  // Setup checkbox event listeners
  setupCheckboxListeners() {
    const selectAllCheckbox = document.getElementById('selectAllPlayers');
    const individualCheckboxes = document.querySelectorAll('.batch-select');

    // Individual checkbox change handler
    individualCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.syncSelectAllCheckbox();
      });
    });

    // Select all checkbox handler
    if (selectAllCheckbox) {
      selectAllCheckbox.removeEventListener('change', this.handleSelectAllChange);
      selectAllCheckbox.addEventListener('change', this.handleSelectAllChange.bind(this));
    }

    this.syncSelectAllCheckbox();
  }

  // Sync select all checkbox state
  syncSelectAllCheckbox() {
    const allCheckboxes = Array.from(document.querySelectorAll('.batch-select'));
    const checkedCheckboxes = allCheckboxes.filter(cb => cb.checked);
    const selectAllCheckbox = document.getElementById('selectAllPlayers');

    if (!selectAllCheckbox) return;

    if (allCheckboxes.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      selectAllCheckbox.disabled = true;
    } else {
      selectAllCheckbox.disabled = false;
      
      if (checkedCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      } else if (checkedCheckboxes.length === allCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
      } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
      }
    }
  }

  // Handle select all checkbox change
  handleSelectAllChange() {
    const selectAllCheckbox = document.getElementById('selectAllPlayers');
    const allCheckboxes = document.querySelectorAll('.batch-select');
    
    allCheckboxes.forEach(checkbox => {
      checkbox.checked = selectAllCheckbox.checked;
    });
  }

  // Get selected player indices
  getSelectedPlayerIndices() {
    return Array.from(document.querySelectorAll('.batch-select:checked'))
      .map(checkbox => Number(checkbox.dataset.idx));
  }

  // Update total players display
  updateTotalPlayersDisplay(count) {
    if (this.elements.totalPlayersDisplay) {
      this.elements.totalPlayersDisplay.textContent = `Total players in output: ${count}`;
    }
  }

  // Show/hide output section
  toggleOutputSection(show) {
    if (this.elements.outputSection) {
      this.elements.outputSection.style.display = show ? 'block' : 'none';
    }
  }

  // Update output JSON display
  updateOutputJson(jsonData) {
    if (this.elements.outputJson) {
      this.elements.outputJson.textContent = JSON.stringify(jsonData, null, 2);
    }
  }

  // Render player table in output section
  renderPlayerTable(players) {
    if (!this.elements.playerTableContainer) return;

    if (!players.length) {
      this.elements.playerTableContainer.innerHTML = '<p>No players yet.</p>';
      return;
    }

    let html = `
      <table class="player-table">
        <thead>
          <tr>
            <th>#</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Position</th>
            <th>Ovr</th>
            <th>Pot</th>
            <th>pid</th>
          </tr>
        </thead>
        <tbody>`;

    players.forEach((player, idx) => {
      html += `
        <tr>
          <td>${idx + 1}</td>
          <td>${player.firstName || ''}</td>
          <td>${player.lastName || ''}</td>
          <td>${player.pos || ''}</td>
          <td>${(player.ratings && player.ratings[0] && player.ratings[0].ovr) || ''}</td>
          <td>${(player.ratings && player.ratings[0] && player.ratings[0].pot) || ''}</td>
          <td>${player.pid || ''}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    this.elements.playerTableContainer.innerHTML = html;
  }

  // Show alert message
  showAlert(message) {
    alert(message);
  }

  // Show confirmation dialog
  showConfirm(message) {
    return confirm(message);
  }
}

export default UIManager;
