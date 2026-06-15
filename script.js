// --- CONFIGURATION (HARDCORE MODE) ---
const INITIAL_MONEY = 22.00; // Decreased from $30
const INITIAL_COMFORT = 100;

// --- STATE ---
let state = {
    money: INITIAL_MONEY,
    comfort: INITIAL_COMFORT,
    day: 1,
    phase: "morning", // morning, afternoon, night, finished
    currentScenario: null
};

// --- DATA: SCENARIOS (Rebalanced for Difficulty) ---
const SCENARIOS = {
    1: {
        morning: {
            title: "Day 1: The Cold Snap",
            text: "It is freezing inside (-5°C). The kids are shivering violently.",
            opts: [
                { text: "Turn on central heater (Max)", cost: -6.00, comfort: 15 }, // More expensive
                { text: "Wear thick wool sweaters", cost: 0.00, comfort: 2 }, // Less comfort gain
                { text: "Tough it out", cost: 0.00, comfort: -25 } // Higher penalty
            ]
        },
        night: {
            title: "Day 1: Freezing Dinner",
            text: "The family is hungry and the house is losing heat rapidly.",
            opts: [
                { text: "Roast a chicken (Oven)", cost: -4.50, comfort: 15 }, // Inflation
                { text: "Microwave leftovers", cost: -1.50, comfort: 5 },
                { text: "Cold sandwiches", cost: 0.00, comfort: -30 } // Harsh penalty
            ]
        }
    },
    2: {
        morning: {
            title: "Day 2: The Heatwave",
            text: "The sun is glaring. Indoor temperature is climbing to 32°C.",
            opts: [
                { text: "Pre-cool with A/C", cost: -5.00, comfort: 10 }, // Expensive
                { text: "Open cross-breezes", cost: 0.00, comfort: -5 }, // Breezes aren't enough now
                { text: "Ignore it", cost: 0.00, comfort: -20 }
            ]
        },
        night: {
            title: "Day 2: Stifling Night",
            text: "The brick walls are radiating heat. It's impossible to sleep.",
            opts: [
                { text: "Blast A/C all night", cost: -8.00, comfort: 20 }, // Very expensive
                { text: "Window fans", cost: -2.00, comfort: 5 },
                { text: "No airflow", cost: 0.00, comfort: -40 } // Dangerous penalty
            ]
        }
    },
    3: {
        morning: {
            title: "Day 3: The Storm",
            text: "A massive rainstorm creates total darkness inside.",
            opts: [
                { text: "All lights on", cost: -2.50, comfort: 10 },
                { text: "Desk lamps only", cost: -0.50, comfort: 5 },
                { text: "Flashlights only", cost: 0.00, comfort: -15 }
            ]
        },
        night: {
            title: "Day 3: Blackout",
            text: "Infrastructure failed. It is damp and boring.",
            opts: [
                { text: "Gas Generator (TV/Heat)", cost: -7.00, comfort: 20 }, // Huge cost
                { text: "Candles & Board Games", cost: -1.00, comfort: 10 },
                { text: "Sleep early", cost: 0.00, comfort: -20 }
            ]
        }
    }
};

// --- ENGINE ---

function init() {
    renderUI();
}

function renderUI() {
    // 1. Update HUD
    const moneyEl = document.getElementById('val-money');
    const comfortEl = document.getElementById('val-comfort');
    const moneyBar = document.getElementById('bar-money');
    const comfortBar = document.getElementById('bar-comfort');
    const body = document.body;

    moneyEl.innerText = `$${state.money.toFixed(2)}`;
    comfortEl.innerText = `${state.comfort}%`;
    
    // Update Progress Bars (Max money adjusted for visuals)
    moneyBar.max = 30; 
    moneyBar.value = Math.max(0, state.money);
    comfortBar.value = Math.max(0, state.comfort);

    // Visual Alert colors
    if(state.money < 5) moneyBar.classList.add('critical'); else moneyBar.classList.remove('critical');
    if(state.comfort < 30) comfortBar.classList.add('critical'); else comfortBar.classList.remove('critical');

    // 2. Day/Night Cycle
    const dayText = document.getElementById('day-text');
    const dayIcon = document.getElementById('day-icon');
    
    let phaseDisplay = state.phase.charAt(0).toUpperCase() + state.phase.slice(1);
    dayText.innerText = `Day ${state.day}: ${phaseDisplay}`;

    if(state.phase === 'night') {
        body.classList.add('phase-night');
        body.classList.remove('phase-morning');
        dayIcon.innerText = '🌙';
    } else {
        body.classList.add('phase-morning');
        body.classList.remove('phase-night');
        dayIcon.innerText = '☀️';
    }

    // 3. Render Content Area
    if (state.phase === 'finished') return; 

    // Determine Scenario Data
    let data = null;
    if (state.phase === 'morning' || state.phase === 'night') {
        data = SCENARIOS[state.day][state.phase];
    } else if (state.phase === 'afternoon') {
        data = state.currentScenario; 
    }

    document.getElementById('scenario-title').innerText = data.title || "Scenario";
    document.getElementById('scenario-desc').innerText = data.text;

    // Render Buttons
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    data.opts.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        // Sign handling for display (+ or -)
        const costTxt = opt.cost === 0 ? "Free" : `$${Math.abs(opt.cost).toFixed(2)}`;
        const comfSign = opt.comfort >= 0 ? "+" : "";
        
        btn.innerHTML = `
            <strong>${opt.text}</strong>
            <small>${costTxt} | Comfort: ${comfSign}${opt.comfort}</small>
        `;
        btn.onclick = () => handleChoice(opt);
        container.appendChild(btn);
    });
}

function handleChoice(option) {
    // Apply changes
    state.money += option.cost;
    state.comfort = Math.min(100, state.comfort + option.comfort);
    
    // Log it
    addToLog(`> Selected: ${option.text} (Cost: $${Math.abs(option.cost).toFixed(2)})`);

    // Check Loss
    if (checkGameOver()) return;

    // Advance Phase
    advancePhase();
}

function advancePhase() {
    if (state.phase === 'morning') {
        // Trigger Afternoon Event
        triggerRandomEvent();
    } else if (state.phase === 'afternoon') {
        // Go to Night
        state.phase = 'night';
        renderUI();
    } else if (state.phase === 'night') {
        // End of Day
        if (state.day < 3) {
            state.day++;
            state.phase = 'morning';
            addToLog(`--- Day ${state.day} Begins ---`);
            renderUI();
        } else {
            endGame(true);
        }
    }
}

// --- RANDOM EVENTS (Now harder) ---
function triggerRandomEvent() {
    state.phase = 'afternoon';
    
    // 40% Bad (Heatwave), 40% Bad (Vampire), 20% Good (Wind)
    const roll = Math.random();
    let type = '';
    
    if (roll < 0.4) type = 'heatwave';
    else if (roll < 0.8) type = 'vampire';
    else type = 'wind';

    let eventData = { title: "⚠️ Random Event!", text: "", opts: [] };

    if (type === 'heatwave') {
        eventData.text = "CRITICAL: Regional power spike! Rates have doubled this afternoon.";
        eventData.opts = [
            { text: "Pay emergency surge pricing", cost: -5.00, comfort: 0 }, // Cost increased
            { text: "Cut main breaker (No Fridge)", cost: 0.00, comfort: -20 } // Penalty increased
        ];
    } else if (type === 'vampire') {
        eventData.text = "You found the kids mining crypto on their gaming PCs!";
        eventData.opts = [
            { text: "Shut it down immediately", cost: 0.00, comfort: -10 }, // Penalty increased
            { text: "Ignore it (High Energy Cost)", cost: -3.00, comfort: 5 } // Cost increased
        ];
    } else {
        // Wind is still a free pass
        state.comfort = Math.min(100, state.comfort + 10);
        addToLog("⚠️ Lucky wind! +10 Comfort.");
        // Skip interaction for wind, go straight to night
        state.phase = 'night'; 
        renderUI();
        return;
    }

    state.currentScenario = eventData;
    renderUI();
}

function addToLog(msg) {
    const list = document.getElementById('log-list');
    const li = document.createElement('li');
    li.innerText = msg;
    list.prepend(li);
}

function checkGameOver() {
    if (state.money < 0) {
        endGame(false, "Bankruptcy! You cannot pay the energy bills.");
        return true;
    }
    if (state.comfort <= 0) {
        endGame(false, "Mutiny! The family left for a hotel.");
        return true;
    }
    return false;
}

function endGame(survived, reason="") {
    state.phase = 'finished';
    const overlay = document.getElementById('overlay');
    const title = document.getElementById('end-title');
    const desc = document.getElementById('end-desc');

    overlay.classList.remove('hidden');
    document.getElementById('end-money').innerText = `$${state.money.toFixed(2)}`;
    document.getElementById('end-comfort').innerText = `${state.comfort}%`;

    if (survived) {
        // Harder win condition
        if (state.money >= 10 && state.comfort >= 60) {
            title.innerText = "🏆 Eco-Master!";
            title.style.color = "#22c55e";
            desc.innerText = "You survived with savings! Impressive management.";
        } else {
            title.innerText = "👍 Scraped By";
            title.style.color = "#eab308";
            desc.innerText = "You survived, but it was ugly.";
        }
    } else {
        title.innerText = "💀 Game Over";
        title.style.color = "#ef4444";
        desc.innerText = reason;
    }
}

function resetGame() {
    state.money = INITIAL_MONEY;
    state.comfort = INITIAL_COMFORT;
    state.day = 1;
    state.phase = 'morning';
    state.currentScenario = null;
    
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('log-list').innerHTML = '<li>Game Reset. Good luck!</li>';
    
    renderUI();
}

// Start
init();
