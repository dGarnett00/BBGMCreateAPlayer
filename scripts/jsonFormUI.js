// --- Artistic JSON Form UI Renderer ---

import { DEFAULT_PLAYER_TEMPLATE } from './constants.js';

let readOnlyOptionsMap = {};

export function setReadOnlyOptionsMap(optionsMap) {
  readOnlyOptionsMap = optionsMap || {};
}

function getOptions(name, path, value) {
  let options = [];
  if (readOnlyOptionsMap[path]) {
    options = readOnlyOptionsMap[path];
  } else if (readOnlyOptionsMap[name]) {
    options = readOnlyOptionsMap[name];
  } else {
    options = [value];
  }
  return Array.from(new Set(options.filter(v => v !== undefined && v !== null)));
}

function styleInput(input, readOnly = false) {
  input.className = 'json-input';
  input.style.borderRadius = "5px";
  input.style.border = "1px solid #444";
  input.style.padding = "0.4em 0.7em";
  input.style.margin = "0.2em 0";
  
  if (readOnly) {
    input.style.background = "#232526";
    input.style.color = "#b0c4de";
    input.style.opacity = "0.7";
  } else {
    input.style.background = "#181a1b";
    input.style.color = "#e0e6ed";
  }
}

function styleSelect(select) {
  select.className = 'json-input';
  select.style.background = "#232526";
  select.style.color = "#b0c4de";
  select.style.opacity = "0.95";
  select.style.borderRadius = "5px";
  select.style.border = "1px solid #444";
  select.style.padding = "0.4em 0.7em";
  select.style.margin = "0.2em 0";
}

function createInput(name, value, path, readOnly = false) {
  if (
    (name === "version" || name === "startingSeason") &&
        (path === "version" || path === "startingSeason")
    ) {
        const input = document.createElement('input');
        styleInput(input, true);
        input.name = path;
        input.value = value;
        input.type = typeof value === 'number' ? 'number' : 'text';
        input.readOnly = true;
        input.disabled = true;
        input.tabIndex = -1;
        return input;
    }

    if (name === "tid" || path.endsWith(".tid")) {
        const select = document.createElement('select');
        styleSelect(select);
        select.name = path;
        select.disabled = false;
        getOptions(name, path, value).forEach(optVal => {
            const option = document.createElement('option');
            option.value = optVal;
            option.textContent = optVal;
            if (String(optVal) === String(value)) option.selected = true;
            select.appendChild(option);
        });
        return select;
    }

    if (readOnly) {
        const select = document.createElement('select');
        styleSelect(select);
        select.name = path;
        select.disabled = false;
        getOptions(name, path, value).forEach(optVal => {
            const option = document.createElement('option');
            option.value = optVal;
            option.textContent = optVal;
            if (String(optVal) === String(value)) option.selected = true;
            select.appendChild(option);
        });
        return select;
    }

    const input = document.createElement('input');
    styleInput(input);
    input.name = path;
    input.value = value;
    input.type = typeof value === 'number' ? 'number' : 'text';
    if (typeof value === 'boolean') {
        input.type = 'checkbox';
        input.checked = value;
        input.value = 'true';
        input.addEventListener('change', () => {
            input.value = input.checked ? 'true' : 'false';
        });
    }
    return input;
}

const readOnlyKeys = [
    "version",
    "tid", "relatives", "fuzz", "imgURL", "imageURL", "originalTid",
    "round",
    "pick",
    "injury.type",
    "injury.gamesRemaining",
    "ratings.0.season",
    "draft.year"
];

function isReadOnly(key, path) {
    if (path.includes('.face') || path === 'face') return true;
    if (readOnlyKeys.includes(key) || readOnlyKeys.includes(path)) return true;
    if (path.endsWith('.injury.type') || path === 'injury.type') return true;
    if (path.endsWith('.injury.gamesRemaining') || path === 'injury.gamesRemaining') return true;
    if (path.endsWith('.relatives') || path.match(/\.relatives\.\[\d+\]$/)) return true;
    if (path === 'ratings.0.season' || path.endsWith('.ratings.0.season')) return true;
    if (path === 'draft.year' || path.endsWith('.draft.year')) return true;
    return false;
}

function renderField(key, value, path) {
    const wrapper = document.createElement('div');
    wrapper.className = 'json-field';
    wrapper.style.marginBottom = "0.7em";
    wrapper.style.transition = "background 0.2s";

    if (path.endsWith('.injury.type') || path === 'injury.type') {
        const label = document.createElement('label');
        label.textContent = key;
        label.htmlFor = path;
        label.className = "json-label";
        wrapper.appendChild(label);
        wrapper.appendChild(createInput(key, "Healthy", path, true));
        return wrapper;
    }
    if (path.endsWith('.injury.gamesRemaining') || path === 'injury.gamesRemaining') {
        const label = document.createElement('label');
        label.textContent = key;
        label.htmlFor = path;
        label.className = "json-label";
        wrapper.appendChild(label);
        wrapper.appendChild(createInput(key, 0, path, true));
        return wrapper;
    }

    if (isReadOnly(key, path)) {
        if ((path.includes('.face') || path === 'face') && Array.isArray(value) && (value.length === 0 || typeof value[0] !== 'object')) {
            const label = document.createElement('label');
            label.textContent = key;
            label.htmlFor = path;
            label.className = "json-label";
            wrapper.appendChild(label);
            wrapper.appendChild(createInput(key, value.join(', '), path, true));
            return wrapper;
        }
        if ((path.includes('.face') || path === 'face') && typeof value === 'object' && value !== null) {
            return createCollapsibleSection(key, value, path, true);
        }
        if (typeof value === 'object' && value !== null) {
            const label = document.createElement('label');
            label.textContent = key;
            label.htmlFor = path;
            label.className = "json-label";
            wrapper.appendChild(label);

            const pre = document.createElement('pre');
            pre.style.background = "#232526";
            pre.style.color = "#b0c4de";
            pre.style.padding = "0.7em";
            pre.style.borderRadius = "6px";
            pre.style.fontSize = "0.98em";
            pre.style.margin = "0.2em 0 1em 0";
            pre.style.overflowX = "auto";
            pre.textContent = JSON.stringify(value, null, 2);
            wrapper.appendChild(pre);
            return wrapper;
        }
        const label = document.createElement('label');
        label.textContent = key;
        label.htmlFor = path;
        label.className = "json-label";
        wrapper.appendChild(label);
        wrapper.appendChild(createInput(key, value, path, true));
        return wrapper;
    }

    if (Array.isArray(value) && (value.length === 0 || typeof value[0] !== 'object')) {
        const label = document.createElement('label');
        label.textContent = key;
        label.htmlFor = path;
        label.className = "json-label";
        wrapper.appendChild(label);
        const input = createInput(key, value.join(', '), path);
        input.placeholder = 'Comma separated values';
        wrapper.appendChild(input);
        return wrapper;
    }

    if ((Array.isArray(value) && value.length > 0) || (typeof value === 'object' && value !== null && Object.keys(value).length > 0)) {
        return createCollapsibleSection(key, value, path, false);
    }

    if (typeof value === 'object' && value !== null) {
        const label = document.createElement('label');
        label.textContent = key;
        label.htmlFor = path;
        label.className = "json-label";
        wrapper.appendChild(label);
        wrapper.appendChild(document.createTextNode(Array.isArray(value) ? '[ ]' : '{ }'));
        return wrapper;
    }

    const label = document.createElement('label');
    label.textContent = key;
    label.htmlFor = path;
    label.className = "json-label";
    wrapper.appendChild(label);
    wrapper.appendChild(createInput(key, value, path));
    return wrapper;
}

function createCollapsibleSection(key, value, path, readOnlySection = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'json-collapsible-section';
    wrapper.style.marginBottom = "0.7em";
    wrapper.style.borderRadius = "8px";
    wrapper.style.background = "linear-gradient(90deg, #232526 0%, #2c3e50 100%)";
    wrapper.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";

    const collapsible = document.createElement('div');
    collapsible.className = 'collapsible';

    const content = document.createElement('div');
    content.className = 'collapsible-content';
    content.style.padding = "0.5em 1.2em 0.7em 1.2em";

    if (Array.isArray(value)) {
        const arrWrapper = document.createElement('div');
        arrWrapper.className = 'json-array';
        value.forEach((item, idx) => {
            arrWrapper.appendChild(renderField(`[${idx}]`, item, `${path}.${idx}`));
        });
        content.appendChild(arrWrapper);
    } else {
        const objWrapper = document.createElement('div');
        objWrapper.className = 'json-object';
        Object.entries(value).forEach(([k, v]) => {
            objWrapper.appendChild(renderField(k, v, `${path}.${k}`));
        });
        content.appendChild(objWrapper);
    }
    collapsible.appendChild(content);

    const autoExpandKeys = [
        "players", "[0]", "born", "draft", "injury", "ratings"
    ];
    const shouldExpand = autoExpandKeys.some(
        k => key === k || path.endsWith(`.${k}`) || path === k
    );
    if (shouldExpand) {
        collapsible.classList.add('open');
    } else {
        collapsible.classList.remove('open');
    }

    const label = document.createElement('div');
    label.textContent = key;
    label.className = 'collapsible-label';
    label.style.cursor = 'pointer';
    label.style.flex = '1 1 auto';
    label.style.userSelect = 'none';
    label.style.padding = '10px 0 10px 18px';
    label.style.fontWeight = "bold";
    label.style.fontSize = "1.08em";
    label.style.letterSpacing = "0.03em";
    label.style.color = readOnlySection ? "#b0c4de" : "#e0e6ed";
    label.style.background = "transparent";
    label.style.border = "none";
    label.style.transition = "background 0.2s, color 0.2s";
    label.addEventListener('mouseover', () => {
        label.style.background = "rgba(255,255,255,0.03)";
    });
    label.addEventListener('mouseout', () => {
        label.style.background = "transparent";
    });

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'collapse-toggle-btn';
    btn.innerHTML = '<span class="collapse-arrow">&#9654;</span>';
    btn.style.marginLeft = '8px';
    btn.style.background = 'none';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.padding = '0';
    btn.style.fontSize = "1.1em";
    btn.style.color = "inherit";
    btn.style.transition = "transform 0.2s";

    function updateArrow() {
        btn.querySelector('.collapse-arrow').style.transform =
            collapsible.classList.contains('open') ? 'rotate(90deg)' : '';
    }
    function toggleCollapse() {
        collapsible.classList.toggle('open');
        label.classList.toggle('collapsed');
        updateArrow();
    }
    label.addEventListener('click', toggleCollapse);
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse();
    });

    const labelWrapper = document.createElement('div');
    labelWrapper.style.display = 'flex';
    labelWrapper.style.alignItems = 'center';
    labelWrapper.style.padding = "0 1.2em";
    labelWrapper.style.borderBottom = "1px solid #2c3e50";
    labelWrapper.appendChild(label);
    labelWrapper.appendChild(btn);

    wrapper.appendChild(labelWrapper);
    wrapper.appendChild(collapsible);

    updateArrow();
    return wrapper;
}

export function renderJsonForm(jsonObj, container) {
    container.innerHTML = '';
    const form = document.createElement('form');
    form.id = 'jsonDynamicForm';
    form.style.background = "linear-gradient(90deg, #181a1b 0%, #232526 100%)";
    form.style.borderRadius = "12px";
    form.style.boxShadow = "0 4px 24px rgba(0,0,0,0.13)";
    form.style.padding = "2.2em 2.5em";
    form.style.margin = "2em auto";
    form.style.maxWidth = "900px";
    form.style.color = "#e0e6ed";
    form.style.fontFamily = "'Segoe UI', 'Roboto', 'Arial', sans-serif";
    form.style.fontSize = "1.06em";
    
    // Convert null values to empty strings for form fields
    const preparedObj = prepareObjectForForm(jsonObj);
    
    // Only use fields from the template, never extra fields
    const ordered = orderByTemplate(DEFAULT_PLAYER_TEMPLATE, preparedObj);
    Object.entries(ordered).forEach(([key, value]) => {
        form.appendChild(renderField(key, value, key));
    });
    container.appendChild(form);
}

// Helper function to prepare object for form rendering
function prepareObjectForForm(obj) {
    if (!obj) return obj;
    
    // Clone the object to avoid modifying the original
    const result = JSON.parse(JSON.stringify(obj));
    
    // Function to recursively convert null values to empty strings
    function convertNullsToEmptyStrings(object) {
        if (!object || typeof object !== 'object') return;
        
        Object.keys(object).forEach(key => {
            if (object[key] === null) {
                object[key] = '';
            } else if (Array.isArray(object[key])) {
                object[key].forEach(item => {
                    if (typeof item === 'object' && item !== null) {
                        convertNullsToEmptyStrings(item);
                    }
                });
            } else if (typeof object[key] === 'object') {
                convertNullsToEmptyStrings(object[key]);
            }
        });
    }
    
    convertNullsToEmptyStrings(result);
    return result;
}

function setValueAtPath(obj, path, value) {
    const keys = path.split('.').map(k => (k.match(/^\d+$/) ? Number(k) : k));
    let curr = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (curr[keys[i]] === undefined) {
            curr[keys[i]] = typeof keys[i + 1] === 'number' ? [] : {};
        }
        curr = curr[keys[i]];
    }
    curr[keys[keys.length - 1]] = value;
}

// Enhance orderByTemplate to handle different data structures better
function orderByTemplate(template, data) {
    if (!data) {
        return JSON.parse(JSON.stringify(template));
    }
    
    if (Array.isArray(template)) {
        if (!Array.isArray(data) || data.length === 0) {
            return [orderByTemplate(template[0], {})];
        }
        return data.map((item) => orderByTemplate(template[0], item));
    } else if (template && typeof template === "object") {
        const ordered = {};
        
        // First, copy the template structure
        Object.keys(template).forEach(key => {
            if (data && Object.prototype.hasOwnProperty.call(data, key)) {
                // Special case for nested objects that need thorough processing
                if (key === 'born' && typeof data[key] === 'object') {
                    ordered[key] = { 
                        year: data[key].year || template[key].year || '',
                        loc: data[key].loc || template[key].loc || ''
                    };
                } 
                else if (key === 'face' && typeof data[key] === 'object') {
                    // Handle face object specially to keep deep structure
                    ordered[key] = deepMerge(template[key], data[key]);
                }
                else if (key === 'ratings' && Array.isArray(data[key])) {
                    // Ensure ratings array has at least one rating object
                    if (data[key].length > 0) {
                        ordered[key] = [
                            {
                                ...template[key][0],
                                ...data[key][0],
                                // Make sure skills is an array
                                skills: Array.isArray(data[key][0].skills) ? data[key][0].skills : []
                            }
                        ];
                    } else {
                        ordered[key] = [{ ...template[key][0] }];
                    }
                }
                else if (key === 'draft' && typeof data[key] === 'object') {
                    // Handle draft data carefully
                    ordered[key] = {
                        ...template[key],
                        ...data[key]
                    };
                    
                    // Ensure specific fields are set
                    if (!ordered[key].tid) ordered[key].tid = -1;
                    if (!ordered[key].originalTid) ordered[key].originalTid = -1;
                    if (!ordered[key].skills) ordered[key].skills = [];
                }
                else {
                    // Regular nested field processing
                    ordered[key] = orderByTemplate(template[key], data[key]);
                }
            } else {
                // For missing fields, look in common alternative locations
                if (key === 'pos' && data) {
                    // Look for position in various places with more thorough checks
                    ordered[key] = findValueInPaths(data, [
                        'pos', 
                        'ratings.0.pos', 
                        'draft.pos'
                    ]) || template[key];
                } else if ((key === 'ovr' || key === 'pot') && data) {
                    // Look for ovr or pot in various places with more thorough checks
                    ordered[key] = findValueInPaths(data, [
                        `${key}`, 
                        `ratings.0.${key}`, 
                        `draft.${key}`
                    ]) || template[key];
                } else if (key === 'skills' && data) {
                    // Look for skills in various places with more thorough checks
                    ordered[key] = findValueInPaths(data, [
                        'skills', 
                        'ratings.0.skills', 
                        'draft.skills'
                    ]) || template[key];
                } else if (key === 'firstName' || key === 'lastName') {
                    // Make sure first and last name are properly extracted
                    ordered[key] = data[key] || '';
                } else if (key === 'college') {
                    // Make sure college is properly extracted
                    ordered[key] = data[key] || '';
                } else if (key === 'pid') {
                    // Make sure pid is properly extracted
                    ordered[key] = data[key] || '';
                } else {
                    ordered[key] = template[key];
                }
            }
        });
        return ordered;
    }
    return data;
}

// Helper function to find values in common paths
function findValueInPaths(obj, paths) {
    for (const path of paths) {
        const value = getValueByPath(obj, path);
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }
    return undefined;
}

// Utility function to deep merge objects
function deepMerge(target, source) {
    // If source is not an object or is null, return target
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
        return target;
    }
    
    const output = {...target};
    
    Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            // If value is an object, recurse
            if (output[key] && typeof output[key] === 'object' && !Array.isArray(output[key])) {
                output[key] = deepMerge(output[key], source[key]);
            } else {
                output[key] = {...source[key]};
            }
        } else if (Array.isArray(source[key])) {
            // If value is an array, copy it
            output[key] = [...source[key]];
        } else if (source[key] !== undefined) {
            // For all other values, copy directly
            output[key] = source[key];
        }
    });
    
    return output;
}

// Helper function to get a value by a dot-notation path
function getValueByPath(obj, path) {
    if (!obj || !path) {
        return undefined;
    }
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        
        // Handle array notation like ratings[0] as well as ratings.0
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
            const arrayName = arrayMatch[1];
            const arrayIndex = parseInt(arrayMatch[2], 10);
            
            if (!current[arrayName] || !Array.isArray(current[arrayName])) {
                return undefined;
            }
            
            current = current[arrayName][arrayIndex];
        } else if (part.match(/^\d+$/)) {
            // Array index
            current = current[parseInt(part, 10)];
        } else {
            // Object property
            current = current[part];
        }
    }
    
    return current;
}

export function getFormData(container, template) {
    const form = container.querySelector('#jsonDynamicForm');
    const data = {};
    if (!form) return data;

    // First, collect all form values
    Array.from(form.elements).forEach(el => {
        if (!el.name) return;
        let val = el.type === 'checkbox' ? el.checked : el.value;
        if (el.placeholder === 'Comma separated values') {
            val = el.value.split(',').map(s => s.trim()).filter(Boolean);
        } else if (el.type === 'number') {
            val = val === '' ? null : Number(val);
        }
        if (val === 'true') val = true;
        if (val === 'false') val = false;
        setValueAtPath(data, el.name, val);
    });
    
    // Order data according to template
    const ordered = orderByTemplate(template, data);
    
    // Post-process to convert empty strings to null for numeric fields
    convertEmptyStringsToNull(ordered);
    
    return ordered;
}

// Helper function to convert empty strings to null for numeric fields
function convertEmptyStringsToNull(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    // Define paths that should be null when empty
    const numericPaths = [
        'hgt', 'pid', 'tid', 'weight',
        'born.year',
        'draft.round', 'draft.pick', 'draft.tid', 'draft.originalTid', 'draft.year', 'draft.pot', 'draft.ovr',
        'face.fatness',
        'face.body.size', 'face.ear.size', 'face.smileLine.size',
        'face.eye.angle', 'face.eyebrow.angle', 'face.hair.flip',
        'face.mouth.flip', 'face.nose.flip', 'face.nose.size',
        'injury.gamesRemaining'
    ];
    
    // Add all rating numeric fields
    if (obj.ratings && obj.ratings.length > 0) {
        const ratingNumericFields = [
            'stre', 'spd', 'jmp', 'endu', 'ins',
            'dnk', 'ft', 'fg', 'tp', 'oiq', 'diq',
            'drb', 'pss', 'reb', 'hgt', 'fuzz',
            'ovr', 'pot', 'season'
        ];
        
        ratingNumericFields.forEach(field => {
            numericPaths.push(`ratings.0.${field}`);
        });
    }
    
    // Function to get value by path
    function getValueByPath(obj, path) {
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            
            if (part.match(/^\d+$/)) {
                // Array index
                current = current[parseInt(part, 10)];
            } else {
                // Object property
                current = current[part];
            }
        }
        
        return current;
    }
    
    // Function to set value by path
    function setValueByPath(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (part.match(/^\d+$/)) {
                const index = parseInt(part, 10);
                if (!Array.isArray(current) || current.length <= index) {
                    return;  // Path doesn't exist
                }
                current = current[index];
            } else {
                if (current[part] === undefined) {
                    return;  // Path doesn't exist
                }
                current = current[part];
            }
        }
        
        const lastPart = parts[parts.length - 1];
        if (lastPart.match(/^\d+$/)) {
            const index = parseInt(lastPart, 10);
            if (Array.isArray(current) && current.length > index) {
                current[index] = value;
            }
        } else {
            current[lastPart] = value;
        }
    }
    
    // Check and convert all numeric paths
    numericPaths.forEach(path => {
        const value = getValueByPath(obj, path);
        if (value === '') {
            setValueByPath(obj, path, null);
        }
    });
      return obj;
}