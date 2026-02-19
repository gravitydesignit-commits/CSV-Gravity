document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        titleInput: document.getElementById('title-input'),
        keywordsInput: document.getElementById('keywords-input'),
        assetType: document.getElementById('asset-type'),
        titleCount: document.getElementById('title-count'),
        keywordCount: document.getElementById('keyword-count'),
        
        // Settings
        maxTags: document.getElementById('max-tags'),
        maxTitleLength: document.getElementById('max-title-length'),
        prefix: document.getElementById('prefix-input'),
        suffix: document.getElementById('suffix-input'),
        negativeKeywords: document.getElementById('negative-keywords'),
        negativeTitleWords: document.getElementById('negative-title-words'),

        // Buttons
        copyTitleBtn: document.getElementById('copy-title-btn'),
        copyKeywordsBtn: document.getElementById('copy-keywords-btn'),
        formatBtn: document.getElementById('format-btn'),
        downloadCsvBtn: document.getElementById('download-csv-btn')
    };

    // --- helper functions ---

    const updateCounts = () => {
        // Title Count
        const titleLen = elements.titleInput.value.length;
        const maxTitle = parseInt(elements.maxTitleLength.value) || 200;
        elements.titleCount.textContent = `${titleLen} / ${maxTitle} chars`;
        elements.titleCount.style.color = titleLen > maxTitle ? 'var(--danger-color)' : 'var(--text-secondary)';

        // Keyword Count
        const keywords = elements.keywordsInput.value.split(',').filter(k => k.trim() !== '');
        const count = keywords.length;
        const maxKwd = parseInt(elements.maxTags.value) || 50;
        elements.keywordCount.textContent = `${count} / ${maxKwd} tags`;
        elements.keywordCount.style.color = count > maxKwd ? 'var(--danger-color)' : 'var(--text-secondary)';
    };

    const processText = () => {
        // 1. Get raw values
        let title = elements.titleInput.value.trim();
        let keywordsStr = elements.keywordsInput.value;
        const prefix = elements.prefix.value.trim();
        const suffix = elements.suffix.value.trim();
        const negKeywords = elements.negativeKeywords.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const negTitleWords = elements.negativeTitleWords.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const maxTags = parseInt(elements.maxTags.value) || 50;
        const maxTitleLen = parseInt(elements.maxTitleLength.value) || 200;

        // 2. Process Title
        // Remove negative words from title (case-insensitive replace)
        if (negTitleWords.length > 0) {
            const regex = new RegExp(`\\b(${negTitleWords.join('|')})\\b`, 'gi');
            title = title.replace(regex, '').replace(/\s+/g, ' ').trim();
        }

        // Apply Prefix/Suffix if title exists
        if (title) {
            if (prefix) title = `${prefix} ${title}`;
            if (suffix) title = `${title} ${suffix}`;
        }
        
        // Enforce Title Length (simple truncation for now, though ideally user should edit)
        // We won't auto-truncate destructive-ly on "format", just warn, OR we can truncate if user wants "Clean".
        // Let's just strict enforce on Generate/Format for the output, but maybe update UI to show it?
        // The prompt says "enforce length limits". Let's truncate to be safe if it exceeds.
        if (title.length > maxTitleLen) {
            title = title.substring(0, maxTitleLen);
        }

        // 3. Process Keywords
        let keywords = keywordsStr.split(',')
            .map(k => k.trim())
            .filter(k => k !== '');

        // Remove negative keywords
        if (negKeywords.length > 0) {
            keywords = keywords.filter(k => !negKeywords.includes(k.toLowerCase()));
        }

        // Apply Prefix/Suffix to keywords? Usually not standard for keywords, 
        // but prompt says "Suffix & Prefix fields (To add text before/after title or keywords)".
        // It's ambiguous if it applies to BOTH or one. Usually it applies to Title. 
        // Let's apply to Title only as per standard stock workflow, 
        // OR we can add them as extra keywords? 
        // "Title Input... Keyword Input... Suffix & Prefix fields".
        // Let's stick to Title for prefix/suffix as that's the common use case (e.g. "Generative AI" suffix).
        // If the user meant keywords, they can clarify.

        // Enforce Tag Limit
        if (keywords.length > maxTags) {
            keywords = keywords.slice(0, maxTags);
        }

        return { title, keywords: keywords.join(', ') };
    };

    // --- Event Listeners ---

    // Live update counts
    elements.titleInput.addEventListener('input', updateCounts);
    elements.keywordsInput.addEventListener('input', updateCounts);
    elements.maxTags.addEventListener('input', updateCounts);
    elements.maxTitleLength.addEventListener('input', updateCounts);

    // Format Button
    elements.formatBtn.addEventListener('click', () => {
        const processed = processText();
        elements.titleInput.value = processed.title;
        elements.keywordsInput.value = processed.keywords;
        updateCounts();
    });

    // Copy Buttons
    const copyToClipboard = async (text, btn) => {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = originalText, 2000);
        } catch (err) {
            console.error('Failed to copy works', err);
        }
    };

    elements.copyTitleBtn.addEventListener('click', () => {
        copyToClipboard(elements.titleInput.value, elements.copyTitleBtn);
    });

    elements.copyKeywordsBtn.addEventListener('click', () => {
        copyToClipboard(elements.keywordsInput.value, elements.copyKeywordsBtn);
    });

    // Download CSV
    elements.downloadCsvBtn.addEventListener('click', () => {
        // Run process one last time to ensure we get custom constraints applied if user didn't click Format
        // Or simply take current values if they are happy with them?
        // Better to take current values BUT apply the hidden constraints (like negative words) if they haven't?
        // Let's just use processText() which reads form current values and applies constraints.
        const { title, keywords } = processText(); 
        const category = elements.assetType.value;
        const filename = "Image_01.jpg"; // Dummy filename placeholder

        // CSV Headers for Adobe Stock / Shutterstock
        // Shutterstock: Filename, Description, Keywords, Categories
        // Adobe Stock: Filename, Title, Keywords, Category
        // We'll use a standard set: Filename, Title, Keywords, Category
        const headers = ["Filename", "Title", "Keywords", "Category"];
        
        // Escape quotes for CSV (double double-quotes)
        const safeTitle = `"${title.replace(/"/g, '""')}"`;
        const safeKeywords = `"${keywords.replace(/"/g, '""')}"`;
        const safeCategory = `"${category}"`;
        const safeFilename = `"${filename}"`;

        const csvContent = [
            headers.join(','),
            `${safeFilename},${safeTitle},${safeKeywords},${safeCategory}`
        ].join('\n');

        // Create Blob and Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'metadata.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Initial count update
    updateCounts();
});
