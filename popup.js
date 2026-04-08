let settingsPage = document.getElementById('settings-page');
let matchesPage = document.getElementById('matches-page');
let settingsIconBtn = document.getElementById('settings-icon-btn');
let matchesIconBtn = document.getElementById('matches-icon-btn');

const userColors = ['#e4431aff', '#00ff59ff', '#0088ffff', '#fff710ff', '#ffb700ff', '#00ff8cff']

chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'username'], (result) => { // sets defaul input values
    const supaUrl = result.supabaseUrl;
    const supaKey = result.supabaseKey;
    const username = result.username;

    if (username === undefined) {
        document.getElementById('usernameInput').value = '';
    } else {
        document.getElementById('usernameInput').value = username;
    }

    if (supaUrl === undefined) {
        document.getElementById('urlInput').value = '';
    } else {
        document.getElementById('urlInput').value = supaUrl;
    }

    if (supaKey === undefined) {
        document.getElementById('keyInput').value = '';
    } else {
        document.getElementById('keyInput').value = supaKey;
    }
});

document.getElementById('saveButton').addEventListener('click', () => { //saves supabase url and key to local storage
    const dbUrl = document.getElementById('urlInput').value;
    const dbKey = document.getElementById('keyInput').value;
    const username = document.getElementById('usernameInput').value;

    chrome.storage.local.set({ supabaseUrl: dbUrl, supabaseKey: dbKey, username: username }, () => {
        //save button confirmation
        document.getElementById('saveButton').textContent = 'Saved';
        setTimeout(() => {
            document.getElementById('saveButton').textContent = 'Save';
            // Reload matches if settings changed
            location.reload();
        }, 2000);
    });
});

matchesIconBtn.addEventListener('click', () => {
    settingsPage.classList.add('hidden');
    matchesPage.classList.remove('hidden');
    matchesIconBtn.classList.add('active-icon-btn');
    settingsIconBtn.classList.remove('active-icon-btn');
});

settingsIconBtn.addEventListener('click', () => {
    settingsPage.classList.remove('hidden');
    matchesPage.classList.add('hidden');
    settingsIconBtn.classList.add('active-icon-btn');
    matchesIconBtn.classList.remove('active-icon-btn');
});

// --- Matching Logic ---
// Current video matches
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (currentTab && currentTab.url && currentTab.url.includes("youtube.com/watch")) {
        const url = new URL(currentTab.url);
        const videoId = url.searchParams.get('v');

        if (videoId) {
            chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'username'], (result) => {
                const { supabaseUrl, supabaseKey, username } = result;

                if (!supabaseUrl || !supabaseKey || !username) {
                    document.getElementById('matchStatus').textContent = 'Please set your username and credentials.';
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
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                        document.getElementById('matchStatus').textContent = 'Error: Background script not ready.';
                        return;
                    }

                    if (response && response.success) {
                        renderCurrentVideoMatches(response.matches)
                        // renderAllMatches(response.matches);
                    } else {
                        document.getElementById('matchStatus').textContent = 'Error: ' + (response?.error || 'Unknown');
                    }
                });
            });
        }
    } else {
        document.getElementById('matchStatus').textContent = 'Open a YouTube video to see matches.';
    }
});



function renderCurrentVideoMatches(matches) {
    const status = document.getElementById('matchStatus');
    const list = document.getElementById('matchResults');
    list.innerHTML = '';

    if (!matches || matches.length === 0) {
        status.textContent = 'No other matches found yet.';
    } else {
        status.textContent = `${matches.length} matcher(s) found!`;
        let match = matches[0];
        const div = document.createElement('div');
        const thumbnail = document.createElement('img');
        const videoInfoDiv = document.createElement('div');
        const userMatchesDiv = document.createElement('div');
        const videoTitleLink = document.createElement('a');

        thumbnail.src = `https://img.youtube.com/vi/${match.video_id}/default.jpg`;
        thumbnail.height = 50;

        videoTitleLink.textContent = match.video_title;
        videoTitleLink.href = `https://www.youtube.com/watch?v=${match.video_id}`;
        videoTitleLink.target = '_blank';

        videoInfoDiv.style.color = "#000";
        videoInfoDiv.style.display = 'flex';
        videoInfoDiv.style.flexDirection = 'column';
        videoInfoDiv.style.gap = '8px'
        videoInfoDiv.appendChild(videoTitleLink);
        videoInfoDiv.appendChild(userMatchesDiv);

        userMatchesDiv.style.display = 'flex'
        userMatchesDiv.style.flexWrap = 'wrap'
        userMatchesDiv.style.rowGap = '4px'


        // user matches
        matches.forEach(m => {
            const userSpan = document.createElement('span');

            userSpan.style.padding = '4px';
            userSpan.style.borderRadius = '4px';
            userSpan.style.backgroundColor = userColors[Math.floor(Math.random() * userColors.length)];
            userSpan.style.marginLeft = '4px';

            userSpan.textContent = m.username;
            userMatchesDiv.appendChild(userSpan);
        });

        div.style.padding = '8px';
        div.style.margin = '4px 0';
        div.style.backgroundColor = '#f9f9f9';
        div.style.borderRadius = '4px';
        div.style.fontSize = '14px';
        div.style.color = '#000';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '8px';
        div.appendChild(thumbnail);
        div.appendChild(videoInfoDiv);

        list.appendChild(div);
    }
}

function renderAllMatches(matches) {
    const status = document.getElementById('matchStatus');
    const list = document.getElementById('matchResults');
    list.innerHTML = '';

    if (!matches || matches.length === 0) {
        status.textContent = 'No other matches found yet.';
    } else {
        status.textContent = `${matches.length} matcher(s) found!`;
        matches.forEach(match => {
            const div = document.createElement('div');
            const li = document.createElement('li');
            const videoLink = document.createElement('a');

            div.style.padding = '8px';
            div.style.margin = '4px 0';
            div.style.backgroundColor = '#f9f9f9';
            div.style.borderRadius = '4px';
            div.style.fontSize = '14px';
            div.style.color = '#000'

            li.textContent = `👤 ${match.username}`;
            videoLink.textContent = `https://www.youtube.com/watch?v=${match.video_id}`;
            videoLink.href = `https://www.youtube.com/watch?v=${match.video_id}`;
            videoLink.target = '_blank';

            div.appendChild(li);
            div.appendChild(videoLink);
            list.appendChild(div);
        });
    }
}