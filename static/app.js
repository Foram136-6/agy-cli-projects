// Global state
let releasesData = [];
let activeFilter = 'all';
let searchQuery = '';

// Icons mapping for note types
const badgeIcons = {
    'Feature': 'fa-solid fa-wand-magic-sparkles',
    'Change': 'fa-solid fa-code-compare',
    'Issue': 'fa-solid fa-bug',
    'Breaking': 'fa-solid fa-triangle-exclamation',
    'Announcement': 'fa-solid fa-bullhorn'
};

// DOM elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    spinner: document.getElementById('spinner'),
    searchInput: document.getElementById('search-input'),
    clearBtn: document.getElementById('search-clear'),
    filterPills: document.getElementById('filter-pills'),
    notesList: document.getElementById('notes-list'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    emptyState: document.getElementById('empty-state'),
    retryBtn: document.getElementById('retry-btn'),
    // Stats elements
    statFeatures: document.getElementById('stat-features'),
    statIssues: document.getElementById('stat-issues'),
    statChanges: document.getElementById('stat-changes'),
    statSync: document.getElementById('stat-sync'),
    // Pill counts
    countAll: document.getElementById('count-all'),
    countFeature: document.getElementById('count-feature'),
    countChange: document.getElementById('count-change'),
    countIssue: document.getElementById('count-issue'),
    countBreaking: document.getElementById('count-breaking'),
    countAnnouncement: document.getElementById('count-announcement')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Fetch Release Notes from API
async function fetchReleases(forceRefresh = false) {
    showLoading();
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Pre-calculate plain text content for search optimization
        const tempDiv = document.createElement('div');
        releasesData = data.map(entry => {
            entry.notes = entry.notes.map(note => {
                tempDiv.innerHTML = note.content;
                note.plainText = (tempDiv.textContent || tempDiv.innerText || "").replace(/\s+/g, ' ').trim();
                return note;
            });
            return entry;
        });
        
        updateLastSyncTime();
        filterAndRender();
        showContent();
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showError(error.message);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
    elements.retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Live Search
    elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        if (searchQuery) {
            elements.clearBtn.classList.remove('hidden');
        } else {
            elements.clearBtn.classList.add('hidden');
        }
        filterAndRender();
    });
    
    // Clear Search Input
    elements.clearBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        searchQuery = '';
        elements.clearBtn.classList.add('hidden');
        filterAndRender();
    });
    
    // Filter pills click
    elements.filterPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        // Remove active class from all pills
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked pill
        pill.classList.add('active');
        
        activeFilter = pill.dataset.type;
        filterAndRender();
    });
}

// Update last fetched timestamp
function updateLastSyncTime() {
    const now = new Date();
    elements.statSync.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Render counts dynamically based on search query
function renderStats() {
    let featuresCount = 0;
    let issuesCount = 0;
    let changesCount = 0;
    let breakingCount = 0;
    let announcementsCount = 0;
    
    releasesData.forEach(entry => {
        entry.notes.forEach(note => {
            // Filter by search query only (not active filter) for pill counts
            const textToSearch = `${entry.date} ${note.type} ${note.plainText}`.toLowerCase();
            const matchesSearch = textToSearch.includes(searchQuery);
            
            if (matchesSearch) {
                if (note.type === 'Feature') featuresCount++;
                else if (note.type === 'Issue') issuesCount++;
                else if (note.type === 'Breaking') breakingCount++;
                else if (note.type === 'Change') changesCount++;
                else if (note.type === 'Announcement') announcementsCount++;
            }
        });
    });
    
    // Update Dashboard Cards
    elements.statFeatures.textContent = featuresCount;
    elements.statIssues.textContent = issuesCount + breakingCount;
    elements.statChanges.textContent = changesCount + announcementsCount;
    
    // Update Pill Badge counts
    elements.countAll.textContent = featuresCount + issuesCount + breakingCount + changesCount + announcementsCount;
    elements.countFeature.textContent = featuresCount;
    elements.countChange.textContent = changesCount;
    elements.countIssue.textContent = issuesCount;
    elements.countBreaking.textContent = breakingCount;
    elements.countAnnouncement.textContent = announcementsCount;
}

// Filter notes and Render to DOM
function filterAndRender() {
    // Dynamic updates of stats and pill counts based on search query
    renderStats();
    
    elements.notesList.innerHTML = '';
    let renderedCount = 0;
    
    releasesData.forEach(entry => {
        // Filter subnotes of this entry
        const filteredNotes = entry.notes.filter(note => {
            // Check note type
            const matchesFilter = activeFilter === 'all' || note.type === activeFilter;
            
            // Check search query (using HTML-stripped plainText)
            const textToSearch = `${entry.date} ${note.type} ${note.plainText}`.toLowerCase();
            const matchesSearch = textToSearch.includes(searchQuery);
            
            return matchesFilter && matchesSearch;
        });
        
        // If there are notes matching after filtering, render the release card
        if (filteredNotes.length > 0) {
            renderedCount++;
            const entryCard = createEntryCard(entry, filteredNotes);
            elements.notesList.appendChild(entryCard);
        }
    });
    
    // Toggle empty state
    if (renderedCount === 0) {
        elements.emptyState.classList.remove('hidden');
    } else {
        elements.emptyState.classList.add('hidden');
    }
}

// Create DOM Node for each Release Group Entry
function createEntryCard(entry, filteredNotes) {
    const card = document.createElement('div');
    card.className = 'release-group';
    
    const header = document.createElement('div');
    header.className = 'release-header';
    header.innerHTML = `
        <div class="release-date">
            <i class="fa-regular fa-calendar-check"></i>
            <span>${entry.date}</span>
        </div>
        <a href="${entry.link}" target="_blank" class="release-link" title="View official release notes">
            <span>Official Page</span>
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
    `;
    
    card.appendChild(header);
    
    // Render filtered sub-notes inside the group card
    filteredNotes.forEach(note => {
        const subNote = document.createElement('div');
        subNote.className = 'sub-note';
        
        const noteHeader = document.createElement('div');
        noteHeader.className = 'sub-note-header';
        
        const iconClass = badgeIcons[note.type] || 'fa-solid fa-info';
        
        noteHeader.innerHTML = `
            <span class="badge badge-${note.type.toLowerCase()}">
                <i class="${iconClass}"></i>
                <span>${note.type}</span>
            </span>
            <div class="sub-note-actions">
                <button class="action-btn copy-btn" title="Copy to clipboard">
                    <i class="fa-regular fa-copy"></i>
                    <span>Copy</span>
                </button>
                <button class="action-btn tweet-btn" title="Tweet this update">
                    <i class="fa-brands fa-x-twitter"></i>
                    <span>Tweet</span>
                </button>
            </div>
        `;
        
        // Add event listeners to action buttons
        const copyBtn = noteHeader.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            copyUpdate(entry.date, note.type, note.plainText, entry.link);
        });
        
        const tweetBtn = noteHeader.querySelector('.tweet-btn');
        tweetBtn.addEventListener('click', () => {
            tweetUpdate(entry.date, note.type, note.plainText, entry.link);
        });
        
        const noteBody = document.createElement('div');
        noteBody.className = 'note-body';
        noteBody.innerHTML = note.content;
        
        subNote.appendChild(noteHeader);
        subNote.appendChild(noteBody);
        card.appendChild(subNote);
    });
    
    return card;
}

// Copy update text to clipboard
async function copyUpdate(date, type, plainText, link) {
    const textToCopy = `BigQuery Update [${date}] • ${type}\n\n${plainText}\n\nRead more: ${link}`;
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast('Copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy text: ', err);
        // Fallback for older browsers or insecure contexts
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!');
        } catch (copyErr) {
            console.error('Fallback copy failed: ', copyErr);
        }
        document.body.removeChild(textarea);
    }
}

// Formats the update text and opens a Twitter/X share intent
function tweetUpdate(date, type, plainText, link) {
    const prefix = `BigQuery Update [${date}] • ${type}\n\n`;
    
    // Twitter limit: 280 chars. 
    // Links count as 23 characters automatically.
    const prefixLen = prefix.length;
    const linkLen = 23; 
    const buffer = 10;
    
    const maxTextLen = 280 - prefixLen - linkLen - buffer;
    
    let textContent = plainText;
    if (textContent.length > maxTextLen) {
        textContent = textContent.substring(0, maxTextLen - 3) + "...";
    }
    
    const tweetText = `${prefix}${textContent}`;
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(link)}`;
    
    window.open(twitterIntentUrl, '_blank');
}

// Toast Notification System
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <i class="fa-solid fa-circle-check" style="color: var(--color-feature);"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remove toast after animation completes (3 seconds)
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Display UI helper states
function showLoading() {
    elements.spinner.classList.add('spinning');
    elements.refreshBtn.disabled = true;
    elements.loadingState.classList.remove('hidden');
    elements.errorState.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
}

// Show standard content state
function showContent() {
    elements.spinner.classList.remove('spinning');
    elements.refreshBtn.disabled = false;
    elements.loadingState.classList.add('hidden');
}

// Show error state
function showError(msg) {
    elements.spinner.classList.remove('spinning');
    elements.refreshBtn.disabled = false;
    elements.loadingState.classList.add('hidden');
    elements.notesList.innerHTML = '';
    elements.errorMessage.textContent = msg;
    elements.errorState.classList.remove('hidden');
}
