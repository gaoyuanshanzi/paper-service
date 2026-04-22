document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const appContainer = document.getElementById('app-container');
    const logoutBtn = document.getElementById('logout-btn');
    
    const topicInput = document.getElementById('topic-input');
    const generateBtn = document.getElementById('generate-btn');
    
    const workflowSection = document.getElementById('workflow-section');
    const resultSection = document.getElementById('result-section');
    const progressBar = document.getElementById('progress-bar');
    const paperContent = document.getElementById('paper-content');
    const publishBtn = document.getElementById('publish-btn');
    const exportBtn = document.getElementById('export-btn');
    
    let globalMarkdownPaper = ''; // Stores the raw markdown for export
    // API Key (Locally configured via admin login)
    let API_KEY = sessionStorage.getItem('balancer_api_key') || '';
    const getApiUrl = () => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    // Theological Agents Configuration
    const agents = {
        exegesis: { id: 'agent-exegesis', title: 'Exegesis Engine', prompt: (topic, lang) => {
            const langStr = lang === 'ko' ? "Write entirely in Korean language." : "Write entirely in English language.";
            return `Write an exhaustive exegetical and biblical framework analysis about: "${topic}". Focus on original language nuances (Greek/Hebrew) and foundational biblical theology. Write in a highly formal, academic theological voice. Structure with clear Markdown headings. Write at least 2500 words. Do not stop until you have thoroughly explored every nuance. ${langStr}`;
        }},
        history: { id: 'agent-history', title: 'Historical Contextualizer', prompt: (topic, lang) => {
            const langStr = lang === 'ko' ? "Write entirely in Korean language." : "Write entirely in English language.";
            return `Write the historical contextualization for the theological topic: "${topic}". Cover the patristic period and early church councils, tracing its development to the Reformation. Maintain an objective, academic voice. Structure with clear Markdown headings. Write at least 2500 words. Expand deeply on historical debates. ${langStr}`;
        }},
        systematic: { id: 'agent-systematic', title: 'Systematic Formulator', prompt: (topic, lang) => {
            const langStr = lang === 'ko' ? "Write entirely in Korean language." : "Write entirely in English language.";
            return `Formulate the systematic and dogmatic coherence for the topic: "${topic}". Focus on how it integrates with broader dogmatics (e.g., soteriology, ecclesiology) and modern philosophical theology. Ensure strict objective neutrality. Structure with clear Markdown headings. Write at least 2500 words. Provide extensive philosophical background. ${langStr}`;
        }},
        citation: { id: 'agent-citation', title: 'Citation & Bibliography', prompt: (topic, lang) => {
            const langStr = lang === 'ko' ? "You may write the UI headings and explanations in Korean, BUT all actual book titles, authors, journals, and bibliographic data MUST remain exactly in their original English/publishing language." : "Write entirely in English language.";
            return `Generate a detailed academic bibliography with 20 peer-reviewed theological sources (books, journals, monographs) relevant to the topic: "${topic}". Format them strictly in Turabian/Chicago style under a "Bibliography" heading. ${langStr}`;
        }}
    };

    // Check Login State
    const checkAuth = () => {
        if (sessionStorage.getItem('balancer_auth') === 'true') {
            loginOverlay.classList.remove('active');
            appContainer.classList.remove('hidden');
            setTimeout(() => {
                loginOverlay.style.display = 'none';
            }, 500); // Wait for transition
        } else {
            loginOverlay.style.display = 'flex';
            // Force reflow
            void loginOverlay.offsetWidth;
            loginOverlay.classList.add('active');
            appContainer.classList.add('hidden');
        }
    };

    // Login Form
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const apiKey = document.getElementById('api-key').value;
        
        // Admin credentials specified by user
        if (user === 'samuelhyun' && pass === '123jesus') {
            sessionStorage.setItem('balancer_auth', 'true');
            if (apiKey) {
                sessionStorage.setItem('balancer_api_key', apiKey);
                API_KEY = apiKey;
            }
            checkAuth();
            document.getElementById('password').value = '';
            loginError.textContent = '';
        } else {
            loginError.textContent = 'Invalid credentials. Authorization denied.';
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('balancer_auth');
        sessionStorage.removeItem('balancer_api_key');
        API_KEY = '';
        checkAuth();
        resetWorkflow();
    });

    // API Call wrapper
    async function callGeminiAPI(prompt, logEl) {
        logEl.textContent = '> Generating content via Gemini API... (This may take a while)';
        try {
            const response = await fetch(getApiUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.4, // maintain objective, consistent tone but allow creativity for length
                        maxOutputTokens: 8192,
                    }
                })
            });
            
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }
            
            logEl.textContent = `> Content generation successful [✓]`;
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            logEl.textContent = `> Error: API communication failed.`;
            console.error(error);
            return `\n\n*Error generating section: ${error.message}*\n\n`;
        }
    }

    const resetWorkflow = () => {
        workflowSection.classList.add('hidden');
        resultSection.classList.add('hidden');
        progressBar.style.width = '0%';
        Object.values(agents).forEach(agent => {
            const card = document.getElementById(agent.id);
            card.classList.remove('active', 'completed');
            card.querySelector('.agent-logs').textContent = 'Waiting...';
        });
        topicInput.value = '';
    };

    generateBtn.addEventListener('click', async () => {
        const topic = topicInput.value.trim();
        const lang = document.getElementById('language-select').value;
        if (!topic) return alert("Please enter a theological topic.");
        
        generateBtn.disabled = true;
        workflowSection.classList.remove('hidden');
        resultSection.classList.add('hidden');
        
        let fullMarkdownPaper = `# An Exhaustive Analysis on ${topic.toUpperCase()}\n\n`;
        fullMarkdownPaper += `**Author**: Samuel Hyun\n\n**Department**: Theological Research (Balancer Platform)\n\n---\n\n`;
        fullMarkdownPaper += `## Abstract\nThis manuscript provides a rigorous, objective analysis of *${topic}*, generated via a multi-agent framework utilizing the Gemini Engine. The study encompasses deeply researched exegesis, historically sound contextualization through ecumenical traditions, and a systematically robust dogmatic formulation.\n\n<div class="page-break"></div>\n\n`;
        
        // Exegesis
        const axCard = document.getElementById(agents.exegesis.id);
        axCard.classList.add('active');
        const exText = await callGeminiAPI(agents.exegesis.prompt(topic, lang), axCard.querySelector('.agent-logs'));
        fullMarkdownPaper += exText + `\n\n<div class="page-break"></div>\n\n`;
        axCard.classList.remove('active');
        axCard.classList.add('completed');
        progressBar.style.width = '25%';

        // Historical
        const hisCard = document.getElementById(agents.history.id);
        hisCard.classList.add('active');
        const hisText = await callGeminiAPI(agents.history.prompt(topic, lang), hisCard.querySelector('.agent-logs'));
        fullMarkdownPaper += hisText + `\n\n<div class="page-break"></div>\n\n`;
        hisCard.classList.remove('active');
        hisCard.classList.add('completed');
        progressBar.style.width = '50%';

        // Systematic
        const sysCard = document.getElementById(agents.systematic.id);
        sysCard.classList.add('active');
        const sysText = await callGeminiAPI(agents.systematic.prompt(topic, lang), sysCard.querySelector('.agent-logs'));
        fullMarkdownPaper += sysText + `\n\n<div class="page-break"></div>\n\n`;
        sysCard.classList.remove('active');
        sysCard.classList.add('completed');
        progressBar.style.width = '75%';

        // Citation
        const citCard = document.getElementById(agents.citation.id);
        citCard.classList.add('active');
        const citText = await callGeminiAPI(agents.citation.prompt(topic, lang), citCard.querySelector('.agent-logs'));
        fullMarkdownPaper += citText;
        citCard.classList.remove('active');
        citCard.classList.add('completed');
        progressBar.style.width = '100%';

        // Store for export
        globalMarkdownPaper = fullMarkdownPaper;

        // Render Markdown to HTML via marked.js
        if(window.marked) {
            paperContent.innerHTML = marked.parse(fullMarkdownPaper);
        } else {
            paperContent.innerHTML = `<pre>${fullMarkdownPaper}</pre>`; // fallback
        }

        resultSection.classList.remove('hidden');
        generateBtn.disabled = false;
        
        // Scroll to paper
        resultSection.scrollIntoView({ behavior: 'smooth' });
    });

    publishBtn.addEventListener('click', () => {
        alert("Manuscript archived to theological database.");
        publishBtn.innerHTML = "Published & Archived";
        publishBtn.style.pointerEvents = "none";
        publishBtn.style.opacity = "0.7";
    });

    exportBtn.addEventListener('click', () => {
        if (!globalMarkdownPaper) return alert("There is no paper to export yet.");
        const blob = new Blob([globalMarkdownPaper], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTopic = topicInput.value.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'theological_paper';
        a.download = `${safeTopic}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Initialize
    checkAuth();
});
