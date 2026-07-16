/**
 * Shared logic for Admin and Audience views.
 * Differentiates behavior based on the loaded document body class.
 */

// Core State Data Structure
let state = {
    teams: [],
    matches: [],
    config: { defaultTimerMs: 150000 }, // 2 mins 30 secs
    currentMatchId: null,
    timerState: { running: false, remaining: 150000, targetEndTime: 0 }
};

const STORAGE_KEY = 'FLL_Tournament_Data';
const AVAILABLE_ICONS = ["Gear", "Wrench", "Lightning", "Star", "Shield", "Rocket", "Atom"];

// ----------------------------------------------------
// Core Functions
// ----------------------------------------------------
function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse local storage data.");
        }
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Utility to resolve a team's display name, handling the "Winner of Match X" dependency
function resolveTeamName(teamRef) {
    if (!teamRef) return "TBD";
    if (teamRef.startsWith("winner_")) {
        const matchNum = parseInt(teamRef.split("_")[1]);
        const refMatch = state.matches.find(m => m.matchNum === matchNum);
        if (refMatch && refMatch.status === "Played") {
            const s1 = parseInt(refMatch.score1) || 0;
            const s2 = parseInt(refMatch.score2) || 0;
            if (s1 > s2) return resolveTeamName(refMatch.team1Id);
            if (s2 > s1) return resolveTeamName(refMatch.team2Id);
            return "Tie (M" + matchNum + ")";
        }
        return "Winner of Match " + matchNum;
    }
    const team = state.teams.find(t => t.id === teamRef);
    return team ? team.name : "Unknown Team";
}

function formatTime(ms) {
    if (ms < 0) ms = 0;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);
    
    return String(minutes).padStart(2, '0') + ":" + 
           String(seconds).padStart(2, '0') + "." + 
           String(milliseconds).padStart(3, '0');
}

// ----------------------------------------------------
// Admin Application Logic
// ----------------------------------------------------
if (document.body.classList.contains('admin-body')) {
    
    let timerRAF; // requestAnimationFrame reference

    function initAdmin() {
        loadState();
        setupNavigation();
        renderTeamsPage();
        renderSchedulePage();
        renderScoringPage();
        renderSystemPage();
        
        // Ensure timer visually updates if page reloaded while running
        if (state.timerState.running) adminTimerTick();
        else document.getElementById('admin-timer').textContent = formatTime(state.timerState.remaining);
    }

    function setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.target).classList.add('active');
                
                // Refresh relevant panels when navigated to
                if(e.target.dataset.target === 'schedule-page') renderSchedulePage();
                if(e.target.dataset.target === 'scoring-page') renderScoringPage();
            });
        });
    }

    // --- Teams Page ---
    function renderTeamsPage() {
        const container = document.getElementById('teams-container');
        container.innerHTML = '';
        state.teams.forEach(team => container.appendChild(createTeamElement(team)));

        document.getElementById('add-team-btn').onclick = () => {
            const newTeam = { id: generateId(), name: "", icon: AVAILABLE_ICONS[0], students: [""] };
            state.teams.push(newTeam);
            container.appendChild(createTeamElement(newTeam));
        };

        document.getElementById('save-teams-btn').onclick = () => {
            updateTeamsFromDOM();
            saveState();
            alert("Teams Saved Successfully.");
        };
    }

    function createTeamElement(team) {
        const div = document.createElement('div');
        div.className = 'team-entry';
        div.dataset.id = team.id;
        
        let iconOptions = AVAILABLE_ICONS.map(i => `<option value="${i}" ${team.icon === i ? 'selected' : ''}>${i}</option>`).join('');
        
        div.innerHTML = `
            <div style="display: flex; gap: 15px; margin-bottom: 10px;">
                <input type="text" class="team-name-input" placeholder="Team Name" value="${team.name}" style="flex: 1; font-weight: bold;">
                <select class="team-icon-select">${iconOptions}</select>
                <button class="btn danger remove-team-btn">Delete Team</button>
            </div>
            <p>Students:</p>
            <div class="student-list"></div>
            <button class="btn secondary add-student-btn" style="margin-top: 10px; font-size: 12px;">Add Student</button>
        `;

        const studentList = div.querySelector('.student-list');
        team.students.forEach(student => addStudentInput(studentList, student));

        div.querySelector('.add-student-btn').onclick = () => addStudentInput(studentList, "");
        div.querySelector('.remove-team-btn').onclick = () => {
            state.teams = state.teams.filter(t => t.id !== team.id);
            div.remove();
        };

        return div;
    }

    function addStudentInput(container, value) {
        const group = document.createElement('div');
        group.className = 'student-input-group';
        group.innerHTML = `
            <input type="text" class="student-input" placeholder="Student Name" value="${value}">
            <button class="btn danger remove-student-btn">X</button>
        `;
        group.querySelector('.remove-student-btn').onclick = () => group.remove();
        container.appendChild(group);
    }

    function updateTeamsFromDOM() {
        state.teams = Array.from(document.querySelectorAll('.team-entry')).map(entry => {
            return {
                id: entry.dataset.id,
                name: entry.querySelector('.team-name-input').value,
                icon: entry.querySelector('.team-icon-select').value,
                students: Array.from(entry.querySelectorAll('.student-input')).map(inp => inp.value).filter(v => v.trim() !== '')
            };
        });
    }

    // --- Schedule Page ---
    function renderSchedulePage() {
        const tbody = document.getElementById('schedule-tbody');
        tbody.innerHTML = '';
        
        state.matches.forEach((match, index) => {
            match.matchNum = index + 1; // Auto-number matches
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>Match ${match.matchNum}</td>
                <td><select class="team1-select red-text"></select></td>
                <td><select class="team2-select blue-text"></select></td>
                <td>${match.status}</td>
                <td>${match.status === 'Played' ? `${match.score1} - ${match.score2}` : '-'}</td>
                <td><button class="btn danger remove-match-btn">Remove</button></td>
            `;

            populateTeamDropdown(tr.querySelector('.team1-select'), match.team1Id, match.matchNum);
            populateTeamDropdown(tr.querySelector('.team2-select'), match.team2Id, match.matchNum);

            tr.querySelector('.team1-select').onchange = (e) => match.team1Id = e.target.value;
            tr.querySelector('.team2-select').onchange = (e) => match.team2Id = e.target.value;
            tr.querySelector('.remove-match-btn').onclick = () => {
                state.matches.splice(index, 1);
                renderSchedulePage();
            };

            tbody.appendChild(tr);
        });

        document.getElementById('add-match-btn').onclick = () => {
            state.matches.push({
                id: generateId(),
                matchNum: state.matches.length + 1,
                team1Id: "", team2Id: "",
                status: "Unplayed", score1: null, score2: null
            });
            renderSchedulePage();
        };

        document.getElementById('save-schedule-btn').onclick = () => {
            saveState();
            alert("Schedule Saved Successfully.");
            renderScoringPage(); // Update scoring page lists
        };
    }

    function populateTeamDropdown(select, selectedValue, currentMatchNum) {
        select.innerHTML = '<option value="">Select Team</option>';
        
        // Add direct teams
        const optgroupTeams = document.createElement('optgroup');
        optgroupTeams.label = "Registered Teams";
        state.teams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            if (t.id === selectedValue) opt.selected = true;
            optgroupTeams.appendChild(opt);
        });
        select.appendChild(optgroupTeams);

        // Add "Winner of Match X" options (only previous matches)
        const optgroupWinners = document.createElement('optgroup');
        optgroupWinners.label = "Previous Winners";
        state.matches.forEach(m => {
            if (m.matchNum < currentMatchNum) {
                const opt = document.createElement('option');
                const val = "winner_" + m.matchNum;
                opt.value = val;
                opt.textContent = "Winner of Match " + m.matchNum;
                if (val === selectedValue) opt.selected = true;
                optgroupWinners.appendChild(opt);
            }
        });
        select.appendChild(optgroupWinners);
    }

    // --- Scoring Page ---
    function renderScoringPage() {
        const listDiv = document.getElementById('scoring-match-list');
        listDiv.innerHTML = '';
        
        if (state.matches.length === 0) {
            listDiv.innerHTML = '<p>No matches scheduled.</p>';
            return;
        }

        state.matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'match-item';
            div.innerHTML = `
                <div>
                    <strong>Match ${match.matchNum}</strong><br>
                    <span style="font-size:12px; color:var(--text-muted)">${match.status}</span>
                </div>
                <button class="btn ${state.currentMatchId === match.id ? 'success' : 'secondary'} set-current-btn">
                    ${state.currentMatchId === match.id ? 'Current' : 'Set Current'}
                </button>
            `;
            div.querySelector('.set-current-btn').onclick = () => {
                state.currentMatchId = match.id;
                saveState();
                renderScoringPage();
            };
            listDiv.appendChild(div);
        });

        renderCurrentMatchArea();
    }

    function renderCurrentMatchArea() {
        const area = document.getElementById('current-match-display');
        const currentMatch = state.matches.find(m => m.id === state.currentMatchId);

        if (!currentMatch) {
            area.innerHTML = '<p class="no-match-selected">Select a match from the left to begin scoring.</p>';
            return;
        }

        const t1Name = resolveTeamName(currentMatch.team1Id);
        const t2Name = resolveTeamName(currentMatch.team2Id);

        area.innerHTML = `
            <div class="score-entry-grid">
                <div class="score-box red-side">
                    <h3>${t1Name}</h3>
                    <input type="number" id="input-score-1" class="score-input" value="${currentMatch.score1 !== null ? currentMatch.score1 : 0}">
                </div>
                <div style="font-size: 24px; font-weight: bold;">VS</div>
                <div class="score-box blue-side">
                    <h3>${t2Name}</h3>
                    <input type="number" id="input-score-2" class="score-input" value="${currentMatch.score2 !== null ? currentMatch.score2 : 0}">
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button id="push-score-btn" class="btn primary">Save & Push Score</button>
            </div>
        `;

        document.getElementById('push-score-btn').onclick = () => {
            currentMatch.score1 = parseInt(document.getElementById('input-score-1').value) || 0;
            currentMatch.score2 = parseInt(document.getElementById('input-score-2').value) || 0;
            currentMatch.status = "Played";
            saveState();
            renderScoringPage(); // Refresh left panel
            alert("Score saved and pushed to audience.");
        };
    }

    // --- Admin Timer Logic ---
    function adminTimerTick() {
        if (!state.timerState.running) return;
        
        const now = Date.now();
        state.timerState.remaining = state.timerState.targetEndTime - now;

        if (state.timerState.remaining <= 0) {
            state.timerState.remaining = 0;
            state.timerState.running = false;
            saveState();
        }

        document.getElementById('admin-timer').textContent = formatTime(state.timerState.remaining);
        
        if (state.timerState.running) {
            timerRAF = requestAnimationFrame(adminTimerTick);
        }
    }

    document.getElementById('timer-start').onclick = () => {
        if (!state.timerState.running && state.timerState.remaining > 0) {
            state.timerState.running = true;
            state.timerState.targetEndTime = Date.now() + state.timerState.remaining;
            saveState();
            adminTimerTick();
        }
    };

    document.getElementById('timer-pause').onclick = () => {
        if (state.timerState.running) {
            state.timerState.running = false;
            cancelAnimationFrame(timerRAF);
            // Recalculate strict remaining just to be safe
            state.timerState.remaining = state.timerState.targetEndTime - Date.now();
            if(state.timerState.remaining < 0) state.timerState.remaining = 0;
            saveState();
            document.getElementById('admin-timer').textContent = formatTime(state.timerState.remaining);
        }
    };

    document.getElementById('timer-reset').onclick = () => {
        state.timerState.running = false;
        cancelAnimationFrame(timerRAF);
        state.timerState.remaining = state.config.defaultTimerMs;
        saveState();
        document.getElementById('admin-timer').textContent = formatTime(state.timerState.remaining);
    };


    // --- System Page ---
    function renderSystemPage() {
        const totalSecs = state.config.defaultTimerMs / 1000;
        document.getElementById('config-mins').value = Math.floor(totalSecs / 60);
        document.getElementById('config-secs').value = Math.floor(totalSecs % 60);

        document.getElementById('save-config-btn').onclick = () => {
            const m = parseInt(document.getElementById('config-mins').value) || 0;
            const s = parseInt(document.getElementById('config-secs').value) || 0;
            state.config.defaultTimerMs = (m * 60 + s) * 1000;
            saveState();
            alert("Configuration Saved. Reset timer to apply.");
        };

        document.getElementById('export-data-btn').onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", "fll_tournament_backup.json");
            dlAnchorElem.click();
        };

        document.getElementById('import-data-btn').onclick = () => {
            document.getElementById('import-file').click();
        };

        document.getElementById('import-file').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const importedObj = JSON.parse(event.target.result);
                    if (importedObj && importedObj.teams && importedObj.matches) {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(importedObj));
                        alert("Data imported successfully! The page will now reload.");
                        location.reload();
                    } else {
                        alert("Invalid file format.");
                    }
                } catch (err) {
                    alert("Error parsing file.");
                }
            };
            reader.readAsText(file);
        };

        document.getElementById('launch-audience-btn').onclick = () => {
            window.open('audience.html', 'AudienceView', 'width=1280,height=720,fullscreen=yes');
        };
    }

    // Initialize Admin
    document.addEventListener('DOMContentLoaded', initAdmin);
}


// ----------------------------------------------------
// Audience Application Logic
// ----------------------------------------------------
if (document.body.classList.contains('audience-body')) {
    
    let audienceTimerRAF;

    function initAudience() {
        loadState();
        updateAudienceUI();
        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEY) {
                loadState();
                updateAudienceUI();
            }
        });
    }

    function getHighScore() {
        let high = 0;
        state.matches.forEach(m => {
            if (m.status === "Played") {
                if (m.score1 > high) high = m.score1;
                if (m.score2 > high) high = m.score2;
            }
        });
        return high;
    }

    function getNextMatch(currentMatchNum) {
        // Find the first match that is unplayed and is after the current match
        const next = state.matches.find(m => m.status === "Unplayed" && m.matchNum > currentMatchNum);
        if (next) {
            return `Match ${next.matchNum}: ${resolveTeamName(next.team1Id)} vs ${resolveTeamName(next.team2Id)}`;
        }
        return "None Scheduled";
    }

    function audienceTimerTick() {
        if (!state.timerState.running) return;
        
        let remaining = state.timerState.targetEndTime - Date.now();
        if (remaining <= 0) {
            remaining = 0;
            state.timerState.running = false;
        }

        document.getElementById('aud-timer').textContent = formatTime(remaining);
        
        if (state.timerState.running) {
            audienceTimerRAF = requestAnimationFrame(audienceTimerTick);
        }
    }

    function updateAudienceUI() {
        const currentMatch = state.matches.find(m => m.id === state.currentMatchId);

        if (currentMatch) {
            document.getElementById('aud-match-title').textContent = "MATCH " + currentMatch.matchNum;
            document.getElementById('aud-team1-name').textContent = resolveTeamName(currentMatch.team1Id);
            document.getElementById('aud-team2-name').textContent = resolveTeamName(currentMatch.team2Id);
            
            if (currentMatch.status === "Played") {
                document.getElementById('aud-team1-score').textContent = currentMatch.score1;
                document.getElementById('aud-team2-score').textContent = currentMatch.score2;
            } else {
                document.getElementById('aud-team1-score').textContent = "-";
                document.getElementById('aud-team2-score').textContent = "-";
            }

            document.getElementById('aud-next-match').textContent = getNextMatch(currentMatch.matchNum);
        } else {
            document.getElementById('aud-match-title').textContent = "WAITING FOR MATCH";
            document.getElementById('aud-team1-name').textContent = "---";
            document.getElementById('aud-team2-name').textContent = "---";
            document.getElementById('aud-team1-score').textContent = "-";
            document.getElementById('aud-team2-score').textContent = "-";
            document.getElementById('aud-next-match').textContent = getNextMatch(0);
        }

        document.getElementById('aud-high-score').textContent = getHighScore();

        // Timer Sync Logic
        cancelAnimationFrame(audienceTimerRAF);
        if (state.timerState.running) {
            audienceTimerTick();
        } else {
            document.getElementById('aud-timer').textContent = formatTime(state.timerState.remaining);
        }
    }

    // Initialize Audience
    document.addEventListener('DOMContentLoaded', initAudience);
}
