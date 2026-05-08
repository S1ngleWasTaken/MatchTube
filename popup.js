const settingsPage = document.getElementById('settings-page');
const matchesPage = document.getElementById('matches-page');
const currentVideoPage = document.getElementById('current-video-page');
const currentVideoIconBtn = document.getElementById('current-video-icon-btn');
const matchesIconBtn = document.getElementById('matches-icon-btn');
const settingsIconBtn = document.getElementById('settings-icon-btn');

const findMatchesBtn = document.getElementById('find-matches-btn');

// colors for users :)
const userColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#82E0AA'];

function getUserColor(username) { //random color based on username
    if (!username) return userColors[0];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + 10;
    }
    const index = Math.abs(hash) % userColors.length;
    return userColors[index];
}

chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'username'], (result) => {
    if (result.username) document.getElementById('usernameInput').value = result.username;
    if (result.supabaseUrl) document.getElementById('urlInput').value = result.supabaseUrl;
    if (result.supabaseKey) document.getElementById('keyInput').value = result.supabaseKey;
});

// save configuration button logic
document.getElementById('saveButton').addEventListener('click', () => {
    const dbUrl = document.getElementById('urlInput').value.trim();
    const dbKey = document.getElementById('keyInput').value.trim();
    const username = document.getElementById('usernameInput').value.trim();

    if (dbUrl) {
        chrome.storage.local.set({ supabaseUrl: dbUrl }, () => {
            const btn = document.getElementById('saveButton');
            btn.textContent = '✓ Configuration Saved';
            btn.style.background = '#27ae60';
            setTimeout(() => {
                btn.textContent = 'Save Configuration';
                btn.style.background = '';
            }, 1500);
        });
    }

    if (dbKey) {
        chrome.storage.local.set({ supabaseKey: dbKey }, () => {
            const btn = document.getElementById('saveButton');
            btn.textContent = '✓ Configuration Saved';
            btn.style.background = '#27ae60';
            setTimeout(() => {
                btn.textContent = 'Save Configuration';
                btn.style.background = '';
            }, 1500);
        });
    }

    if (username) {
        chrome.storage.local.set({ username: username }, () => {
            const btn = document.getElementById('saveButton');
            btn.textContent = '✓ Configuration Saved';
            btn.style.background = '#27ae60';
            setTimeout(() => {
                btn.textContent = 'Save Configuration';
                btn.style.background = '';
            }, 1500);
        });
    }
});

// find all matches button logic
findMatchesBtn.addEventListener('click', () => {
    chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'username'], (result) => {
        const { supabaseUrl, supabaseKey, username } = result;

        if (!supabaseUrl || !supabaseKey || !username) {
            document.getElementById('find-matches-status').textContent = 'Please configure settings first.';
            return;
        }

        const headers = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
        };

        findMatchesBtn.disabled = true;
        findMatchesBtn.textContent = 'Searching...';

        chrome.runtime.sendMessage({
            action: "getAllMatches",
            username: username,
            headers: headers,
            supaUrl: supabaseUrl
        }, (response) => {
            findMatchesBtn.disabled = false;
            findMatchesBtn.textContent = 'Refresh All Matches';

            if (chrome.runtime.lastError) {
                document.getElementById('find-matches-status').textContent = 'Error: Service worker unreachable.';
                return;
            }

            if (response && response.success) {
                renderAllMatches(response.matches);
            } else {
                document.getElementById('find-matches-status').textContent = 'Error: ' + (response?.error || 'Unknown');
            }
        });
    });
});

function switchPage(pageId) {
    [settingsPage, matchesPage, currentVideoPage].forEach(p => p.classList.add('hidden'));
    [settingsIconBtn, matchesIconBtn, currentVideoIconBtn].forEach(b => b.classList.remove('active-icon-btn'));

    if (pageId === 'settings') {
        settingsPage.classList.remove('hidden');
        settingsIconBtn.classList.add('active-icon-btn');
    } else if (pageId === 'matches') {
        matchesPage.classList.remove('hidden');
        matchesIconBtn.classList.add('active-icon-btn');
    } else {
        currentVideoPage.classList.remove('hidden');
        currentVideoIconBtn.classList.add('active-icon-btn');
    }
}

currentVideoIconBtn.addEventListener('click', () => switchPage('current'));
matchesIconBtn.addEventListener('click', () => switchPage('matches'));
settingsIconBtn.addEventListener('click', () => switchPage('settings'));

// --- Initial Load ---
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("youtube.com/watch")) {
        const url = new URL(currentTab.url);
        const videoId = url.searchParams.get('v');

        if (videoId) {
            chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'username'], (result) => {
                const { supabaseUrl, supabaseKey, username } = result;

                if (!supabaseUrl || !supabaseKey || !username) {
                    document.getElementById('matchStatus').textContent = 'Please configure settings to see matches.';
                    return;
                }

                const headers = {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                };

                chrome.runtime.sendMessage({
                    action: "findMatches",
                    videoId: videoId,
                    username: username,
                    daysBack: 7,
                    headers: headers,
                    supaUrl: supabaseUrl
                }, (response) => {
                    if (chrome.runtime.lastError || !response || !response.success) {
                        document.getElementById('matchStatus').textContent = 'No active matches found or connection error.';
                        return;
                    }
                    renderCurrentVideoMatches(response.matches);
                });
            });
        }
    } else {
        document.getElementById('matchStatus').textContent = 'Open a YouTube video to see matches.';
    }
});

function createMatchCard(match, viewers = []) {
    // creates a card for a match
    const card = document.createElement('div');
    card.className = 'match-card';

    const thumbContainer = document.createElement('div');
    thumbContainer.className = 'thumbnail-container';
    const thumbnail = document.createElement('img');
    thumbnail.className = 'thumbnail';
    thumbnail.src = `https://img.youtube.com/vi/${match.video_id}/mqdefault.jpg`;
    thumbContainer.appendChild(thumbnail);

    const info = document.createElement('div');
    info.className = 'video-info';

    const title = document.createElement('a');
    title.className = 'video-title';
    title.textContent = match.video_title || 'Untitled Video';
    title.href = `https://www.youtube.com/watch?v=${match.video_id}`;
    title.target = '_blank';

    const pills = document.createElement('div');
    pills.className = 'viewer-pills';

    const viewerList = viewers.length > 0 ? viewers : [match.username];
    viewerList.forEach(name => {
        const pill = document.createElement('span');
        pill.className = 'viewer-pill';
        pill.textContent = name;
        pill.style.backgroundColor = getUserColor(name);
        pills.appendChild(pill);
    });

    info.appendChild(title);
    info.appendChild(pills);
    card.appendChild(thumbContainer);
    card.appendChild(info);

    return card;
}

function renderCurrentVideoMatches(matches) {
    // renders card for current video
    const status = document.getElementById('matchStatus');
    const list = document.getElementById('matchResults');
    list.innerHTML = '';

    if (!matches || matches.length === 0) {
        status.textContent = 'No other friends are watching this right now.';
    } else {
        status.textContent = `${matches.length} friend(s) found!`;
        const card = createMatchCard(matches[0], matches.map(m => m.username));
        list.appendChild(card);
    }
}

function renderAllMatches(matches) {
    // renders cards for all matches
    const status = document.getElementById('find-matches-status');
    const list = document.getElementById('find-matches-results');
    list.innerHTML = '';

    if (!matches || matches.length === 0) {
        status.textContent = 'No common history found yet.';
    } else {
        status.textContent = `${matches.length} shared video(s) detected.`;
        matches.forEach(match => {
            const card = createMatchCard(match, match.viewers);
            list.appendChild(card);
        });
    }
}