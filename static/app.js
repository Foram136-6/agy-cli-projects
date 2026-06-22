/**
 * BigQuery Release Notes Explorer
 * Frontend Controller & UI Coordinator
 * 
 * Organized into logical sections for readability and maintainability.
 */

// ============================================================================
// 1. CONFIGURATION & STATE
// ============================================================================

let releasesData = [];
let activeFilter = 'all';
let searchQuery = '';
let timeframeFilter = 'all';
let sortOrder = 'desc';

// Icons mapping for note types
const badgeIcons = {
    'Feature': 'fa-solid fa-wand-magic-sparkles',
    'Change': 'fa-solid fa-code-compare',
    'Issue': 'fa-solid fa-bug',
    'Breaking': 'fa-solid fa-triangle-exclamation',
    'Announcement': 'fa-solid fa-bullhorn'
};

// ============================================================================
// 2. DOM ELEMENTS
// ============================================================================

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
    
    // Stats dashboard elements
    statFeatures: document.getElementById('stat-features'),
    statIssues: document.getElementById('stat-issues'),
    statChanges: document.getElementById('stat-changes'),
    statSync: document.getElementById('stat-sync'),
    
    // Filter badge count elements
    countAll: document.getElementById('count-all'),
    countFeature: document.getElementById('count-feature'),
    countChange: document.getElementById('count-change'),
    countIssue: document.getElementById('count-issue'),
    countBreaking: document.getElementById('count-breaking'),
    countAnnouncement: document.getElementById('count-announcement'),
    
    // Advanced controls
    timeframeSelect: document.getElementById('timeframe-select'),
    sortSelect: document.getElementById('sort-select'),
    exportMdBtn: document.getElementById('export-md'),
    exportJsonBtn: document.getElementById('export-json')
};

// ============================================================================
// 3. INITIALIZATION & LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

function setupEventListeners() {
    // Refresh & Retry
    elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
    elements.retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Live Search input
    elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        if (searchQuery) {
            elements.clearBtn.classList.remove('hidden');
        } else {
            elements.clearBtn.classList.add('hidden');
        }
        filterAndRender();
    });
    
    // Clear Search Input button
    elements.clearBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        searchQuery = '';
        elements.clearBtn.classList.add('hidden');
        filterAndRender();
    });
    
    // Filter Pills clicks
    elements.filterPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        pill.classList.add('active');
        
        activeFilter = pill.dataset.type;
        filterAndRender();
    });

    // Timeframe select dropdown
    elements.timeframeSelect.addEventListener('change', (e) => {
        timeframeFilter = e.target.value;
        filterAndRender();
    });

    // Sort Order select dropdown
    elements.sortSelect.addEventListener('change', (e) => {
        sortOrder = e.target.value;
        filterAndRender();
    });

    // Export triggers
    elements.exportMdBtn.addEventListener('click', exportToMarkdown);
    elements.exportJsonBtn.addEventListener('click', exportToJson);
}

// ============================================================================
// 4. API & DATA FETCHING
// ============================================================================

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
        
        // Clean & cache data, pre-calculating plain text representation for searching
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

// ============================================================================
// 5. RENDERING & HTML TRAVERSAL ENGINE
// ============================================================================

function filterAndRender() {
    renderStats();
    
    elements.notesList.innerHTML = '';
    let renderedCount = 0;
    
    // Apply sorting
    const sortedEntries = [...releasesData].sort((a, b) => {
        const dateA = new Date(a.updated);
        const dateB = new Date(b.updated);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    sortedEntries.forEach(entry => {
        // Timeframe boundary checks
        if (!matchesTimeframe(entry.updated)) return;

        // Note type & query matching
        const filteredNotes = entry.notes.filter(note => {
            const matchesFilter = activeFilter === 'all' || note.type === activeFilter;
            const textToSearch = `${entry.date} ${note.type} ${note.plainText}`.toLowerCase();
            const matchesSearch = textToSearch.includes(searchQuery);
            return matchesFilter && matchesSearch;
        });
        
        if (filteredNotes.length > 0) {
            renderedCount++;
            const entryCard = createEntryCard(entry, filteredNotes);
            elements.notesList.appendChild(entryCard);
        }
    });
    
    // Toggle Empty State UI
    if (renderedCount === 0) {
        elements.emptyState.classList.remove('hidden');
    } else {
        elements.emptyState.classList.add('hidden');
    }
}

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
        
        // Clipboard action listener
        const copyBtn = noteHeader.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            copyUpdate(entry.date, note.type, note.plainText, entry.link);
        });
        
        // Twitter sharing listener with visual click feedback
        const tweetBtn = noteHeader.querySelector('.tweet-btn');
        tweetBtn.addEventListener('click', () => {
            const originalHTML = tweetBtn.innerHTML;
            tweetBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Sharing...</span>`;
            tweetBtn.disabled = true;
            
            tweetUpdate(entry.date, note.type, note.plainText, entry.link);
            
            setTimeout(() => {
                tweetBtn.innerHTML = originalHTML;
                tweetBtn.disabled = false;
            }, 1500);
        });
        
        const noteBody = document.createElement('div');
        noteBody.className = 'note-body';
        
        // Format launch stages (GA/Preview) and apply search text highlighting safely
        const formattedHtml = formatLaunchStages(note.content);
        noteBody.innerHTML = highlightHTML(formattedHtml, searchQuery);
        
        subNote.appendChild(noteHeader);
        subNote.appendChild(noteBody);
        card.appendChild(subNote);
    });
    
    return card;
}

// HTML-safe Launch Stage badge formatting via DOM node traversal
function formatLaunchStages(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    function traverse(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            let val = node.nodeValue;
            let changed = false;
            
            if (/Preview/g.test(val)) {
                val = val.replace(/Preview/g, '<span class="stage-badge stage-preview"><i class="fa-solid fa-flask"></i> Preview</span>');
                changed = true;
            }
            
            if (/generally available \(GA\)/gi.test(val)) {
                val = val.replace(/generally available \(GA\)/gi, '<span class="stage-badge stage-ga"><i class="fa-solid fa-circle-check"></i> GA</span>');
                changed = true;
            } else if (/generally available/gi.test(val)) {
                val = val.replace(/generally available/gi, '<span class="stage-badge stage-ga"><i class="fa-solid fa-circle-check"></i> GA</span>');
                changed = true;
            } else if (/\bGA\b/g.test(val)) {
                val = val.replace(/\bGA\b/g, '<span class="stage-badge stage-ga"><i class="fa-solid fa-circle-check"></i> GA</span>');
                changed = true;
            }
            
            if (changed) {
                const span = document.createElement('span');
                span.innerHTML = val;
                node.parentNode.replaceChild(span, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Skip traversing already formatted stage badges
            if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && !node.classList.contains('stage-badge')) {
                const children = Array.from(node.childNodes);
                for (const child of children) {
                    traverse(child);
                }
            }
        }
    }
    traverse(temp);
    return temp.innerHTML;
}

// HTML-safe query match highlighting via DOM node traversal
function highlightHTML(html, query) {
    if (!query) return html;
    
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    
    function traverse(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const val = node.nodeValue;
            if (val.toLowerCase().includes(query.toLowerCase())) {
                const span = document.createElement('span');
                span.innerHTML = val.replace(regex, '<mark class="highlight">$1</mark>');
                node.parentNode.replaceChild(span, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                const children = Array.from(node.childNodes);
                for (const child of children) {
                    traverse(child);
                }
            }
        }
    }
    
    traverse(temp);
    return temp.innerHTML;
}

// ============================================================================
// 6. ACTIONS & SHARE FEATURES
// ============================================================================

async function copyUpdate(date, type, plainText, link) {
    const textToCopy = `BigQuery Update [${date}] • ${type}\n\n${plainText}\n\nRead more: ${link}`;
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast('Copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy text: ', err);
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

function tweetUpdate(date, type, plainText, link) {
    const hashtags = ' #BigQuery #GoogleCloud #GCP';
    const prefix = `BigQuery Update [${date}] • ${type}\n\n`;
    
    // Character boundaries (Twitter limit: 280, t.co link counts as 23 characters)
    const prefixLen = prefix.length;
    const linkLen = 23; 
    const tagsLen = hashtags.length;
    const buffer = 10;
    
    const maxTextLen = 280 - prefixLen - linkLen - tagsLen - buffer;
    
    let textContent = plainText;
    if (textContent.length > maxTextLen) {
        textContent = textContent.substring(0, maxTextLen - 3) + "...";
    }
    
    const tweetText = `${prefix}${textContent}${hashtags}`;
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(link)}`;
    
    window.open(twitterIntentUrl, '_blank');
}

function getFilteredData() {
    const filtered = [];
    const sortedEntries = [...releasesData].sort((a, b) => {
        const dateA = new Date(a.updated);
        const dateB = new Date(b.updated);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    sortedEntries.forEach(entry => {
        if (!matchesTimeframe(entry.updated)) return;

        const filteredNotes = entry.notes.filter(note => {
            const matchesFilter = activeFilter === 'all' || note.type === activeFilter;
            const textToSearch = `${entry.date} ${note.type} ${note.plainText}`.toLowerCase();
            const matchesSearch = textToSearch.includes(searchQuery);
            return matchesFilter && matchesSearch;
        });

        if (filteredNotes.length > 0) {
            filtered.push({
                date: entry.date,
                updated: entry.updated,
                link: entry.link,
                notes: filteredNotes.map(n => ({ type: n.type, content: n.content, plainText: n.plainText }))
            });
        }
    });

    return filtered;
}

function exportToMarkdown() {
    const data = getFilteredData();
    if (data.length === 0) {
        showToast('No data to export!');
        return;
    }

    let md = `# BigQuery Release Notes Export\n`;
    md += `Generated on: ${new Date().toLocaleString()}\n`;
    md += `Filters - Search: "${searchQuery || 'None'}", Type: "${activeFilter}", Timeframe: "${timeframeFilter}"\n\n`;
    md += `---\n\n`;

    data.forEach(entry => {
        md += `## 📅 ${entry.date}\n`;
        md += `*Official Link: [Google Cloud Release Notes](${entry.link})*\n\n`;
        
        entry.notes.forEach(note => {
            md += `### 🏷️ ${note.type}\n`;
            md += `${note.plainText}\n\n`;
        });
        
        md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    triggerDownload(blob, `bigquery_release_notes_${getTimestamp()}.md`);
    showToast('Markdown exported!');
}

function exportToJson() {
    const data = getFilteredData();
    if (data.length === 0) {
        showToast('No data to export!');
        return;
    }

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    triggerDownload(blob, `bigquery_release_notes_${getTimestamp()}.json`);
    showToast('JSON exported!');
}

// ============================================================================
// 7. UI STATE UTILITIES
// ============================================================================

function matchesTimeframe(entryUpdated) {
    if (timeframeFilter === 'all') return true;
    const now = new Date();
    const entryDate = new Date(entryUpdated);
    const diffDays = Math.ceil((now - entryDate) / (1000 * 60 * 60 * 24));
    return diffDays <= parseInt(timeframeFilter);
}

function updateLastSyncTime() {
    const now = new Date();
    elements.statSync.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderStats() {
    let featuresCount = 0;
    let issuesCount = 0;
    let changesCount = 0;
    let breakingCount = 0;
    let announcementsCount = 0;
    
    releasesData.forEach(entry => {
        if (!matchesTimeframe(entry.updated)) return;

        entry.notes.forEach(note => {
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
    
    elements.statFeatures.textContent = featuresCount;
    elements.statIssues.textContent = issuesCount + breakingCount;
    elements.statChanges.textContent = changesCount + announcementsCount;
    
    elements.countAll.textContent = featuresCount + issuesCount + breakingCount + changesCount + announcementsCount;
    elements.countFeature.textContent = featuresCount;
    elements.countChange.textContent = changesCount;
    elements.countIssue.textContent = issuesCount;
    elements.countBreaking.textContent = breakingCount;
    elements.countAnnouncement.textContent = announcementsCount;
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function getTimestamp() {
    return new Date().toISOString().split('T')[0];
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showLoading() {
    elements.spinner.classList.add('spinning');
    elements.refreshBtn.disabled = true;
    elements.loadingState.classList.remove('hidden');
    elements.notesList.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
}

function showContent() {
    elements.spinner.classList.remove('spinning');
    elements.refreshBtn.disabled = false;
    elements.loadingState.classList.add('hidden');
    elements.notesList.classList.remove('hidden');
}

function showError(msg) {
    elements.spinner.classList.remove('spinning');
    elements.refreshBtn.disabled = false;
    elements.loadingState.classList.add('hidden');
    elements.notesList.innerHTML = '';
    elements.notesList.classList.add('hidden');
    elements.errorMessage.textContent = msg;
    elements.errorState.classList.remove('hidden');
}
