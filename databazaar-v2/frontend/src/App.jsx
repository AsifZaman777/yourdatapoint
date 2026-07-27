import React, { useState, useEffect, useRef } from 'react';
import { EMAIL_TEMPLATES, EMAIL_PALETTES } from './emailTemplates';
import { WHATSAPP_TEMPLATES } from './whatsappTemplates';
import { 
  BarChart3, 
  Database, 
  Search, 
  Mail, 
  MessageSquare, 
  Bot, 
  Shield, 
  Unlock, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  Download, 
  RefreshCw, 
  Sparkles, 
  MessageCircle, 
  Send, 
  Lock, 
  Play, 
  AlertTriangle, 
  Activity, 
  FileText, 
  History, 
  Coins, 
  User,
  CheckCircle2,
  MapPin
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';



export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('home');
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  
  // Background Security Tracker
  useEffect(() => {
    if (!token) return;
    const logViolation = (type) => {
      fetch(`${API_BASE}/api/security/log-violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ violation_type: type })
      }).catch(e => console.error(e));
    };

    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        logViolation("Screenshot attempt (PrintScreen)");
      }
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        logViolation(`Screenshot attempt (Cmd+Shift+${e.key})`);
      }
      if (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        logViolation("Screenshot attempt (Win+Shift+S)");
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [token]);
  
  // Region configuration from backend
  const [regionsConfig, setRegionsConfig] = useState(null);
  const [categoriesList, setCategoriesList] = useState([]);

  // Auth Form states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  // Datasets states
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(null);
  const [datasetDetail, setDatasetDetail] = useState(null);
  const [datasetPage, setDatasetPage] = useState(1);
  const [datasetSearch, setDatasetSearch] = useState('');
  const [datasetFilterCat, setDatasetFilterCat] = useState('');
  const [datasetFilterDiv, setDatasetFilterDiv] = useState('');
  const [datasetFilterDist, setDatasetFilterDist] = useState('');
  const [datasetFilterArea, setDatasetFilterArea] = useState('');
  const [datasetListSearch, setDatasetListSearch] = useState('');

  // Scraper dropdown/input states
  const [scrapeQuery, setScrapeQuery] = useState('');
  const [scrapeQueries, setScrapeQueries] = useState(['']);
  const [showLiveDebug, setShowLiveDebug] = useState(true);
  const [scrapeDiv, setScrapeDiv] = useState('');
  const [scrapeDist, setScrapeDist] = useState('');
  const [scrapeArea, setScrapeArea] = useState('');
  const [scrapeDivCustom, setScrapeDivCustom] = useState('');
  const [scrapeDistCustom, setScrapeDistCustom] = useState('');
  const [scrapeAreaCustom, setScrapeAreaCustom] = useState('');
  const [datasetFilterDivCustom, setDatasetFilterDivCustom] = useState('');
  const [datasetFilterDistCustom, setDatasetFilterDistCustom] = useState('');
  const [datasetFilterAreaCustom, setDatasetFilterAreaCustom] = useState('');
  const [uploadDivCustom, setUploadDivCustom] = useState('');
  const [uploadDistCustom, setUploadDistCustom] = useState('');
  const [uploadAreaCustom, setUploadAreaCustom] = useState('');
  const [scraperJobs, setScraperJobs] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);
  const [activeJobLogs, setActiveJobLogs] = useState([]);
  const [liveMapImage, setLiveMapImage] = useState(null);
  const [autoScrollScraper, setAutoScrollScraper] = useState(true);
  const scraperTerminalRef = useRef(null);
  // Marketing states
  const [recipientGroups, setRecipientGroups] = useState([]);
  const [waRecipientGroup, setWaRecipientGroup] = useState('');
  const [waTemplate, setWaTemplate] = useState(`আসসালামু আলাইকুম স্যার/ম্যাডাম,
আমরা {name} এর জন্য বিশেষ একটি ডেমো দেখাতে চাই। 
Demo Link: demo.campusbaba.com
ধন্যবাদ!`);
  const [waSessionStatus, setWaSessionStatus] = useState('Checking...');
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [campaignProgress, setCampaignProgress] = useState(null);
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [waStartRow, setWaStartRow] = useState(0);
  const [selectedGroupRowCount, setSelectedGroupRowCount] = useState(0);
  
  // Marketing sub-tab (React state, no DOM manipulation)
  const [marketingSubTab, setMarketingSubTab] = useState('dashboard');
  
  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState(null);
  
  // Campaign Log expansion
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);
  const [expandedCampaignLogs, setExpandedCampaignLogs] = useState([]);
  
  // Log files
  const [logFilesList, setLogFilesList] = useState([]);
  const [selectedLogDate, setSelectedLogDate] = useState('');
  const [logFileContent, setLogFileContent] = useState(null);
  
  // Custom Toast Notifications
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'info', onConfirm = null, onCancel = null) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, onConfirm, onCancel }]);
    if (!onConfirm) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    }
  };
  const showConfirm = (message, onConfirm, onCancel = null) => {
    showToast(message, 'warning', onConfirm, onCancel);
  };
  
  const handleAiRedirect = (platform) => {
    const promptText = `Please edit/improve this HTML email template for me according to these preferences:
- Company/Brand Name: ${paramCompanyName}
- Heading: ${paramHeading}
- Coupon Code: ${paramPromoCode}
- Button CTA Text: ${paramCtaText}
- Button Link: ${paramCtaLink}
- Details: ${paramDescription}

Here is the template HTML code:
\`\`\`html
${emailHtml}
\`\`\`

Please return ONLY the updated HTML code in a clean markdown code block.`;

    navigator.clipboard.writeText(promptText)
      .then(() => {
        showToast(`HTML code and prompt copied to clipboard! Opening ${platform}...`, 'success');
        setTimeout(() => {
          if (platform === 'Gemini') {
            window.open('https://gemini.google.com/app', '_blank');
          } else if (platform === 'Claude') {
            window.open('https://claude.ai', '_blank');
          } else if (platform === 'ChatGPT') {
            window.open('https://chatgpt.com', '_blank');
          }
        }, 1200);
      })
      .catch(() => {
        showToast('Failed to copy prompt to clipboard.', 'error');
      });
  };

  const handleWaAiRedirect = (platform) => {
    const promptText = `Please edit/improve this WhatsApp campaign message template for me according to these preferences:
- Company/Brand Name: ${paramCompanyName}
- Heading: ${paramHeading}
- Coupon Code: ${paramPromoCode}
- Button/CTA Text: ${paramCtaText}
- Link: ${paramCtaLink}
- Details: ${paramDescription}

Here is the WhatsApp message template:
\`\`\`
${waTemplate}
\`\`\`

Please return ONLY the updated template text.`;

    navigator.clipboard.writeText(promptText)
      .then(() => {
        showToast(`WhatsApp template & prompt copied to clipboard! Opening ${platform}...`, 'success');
        setTimeout(() => {
          if (platform === 'Gemini') {
            window.open('https://gemini.google.com/app', '_blank');
          } else if (platform === 'Claude') {
            window.open('https://claude.ai', '_blank');
          } else if (platform === 'ChatGPT') {
            window.open('https://chatgpt.com', '_blank');
          }
        }, 1200);
      })
      .catch(() => {
        showToast('Failed to copy prompt to clipboard.', 'error');
      });
  };
  
  const [emailRecipientGroup, setEmailRecipientGroup] = useState('');
  const [emailSubject, setEmailSubject] = useState('Special marketing offer!');
  const [emailPalette, setEmailPalette] = useState(EMAIL_PALETTES[0]);
  const [emailHtml, setEmailHtml] = useState(`<html>
  <body style="font-family: sans-serif; padding: 20px; background: [BG_COLOR];">
    <div style="background: [CARD_BG]; padding: 30px; border-radius: 8px; max-width: 600px; margin: auto; border: 1px solid [BORDER_COLOR];">
      <h2 style="color: [PRIMARY_COLOR];">Hello {name},</h2>
      <p style="color: [TEXT_COLOR];">We discovered your business details and wanted to offer our premium services.</p>
      <p style="color: [TEXT_COLOR];">Click below to schedule a demo.</p>
      <a href="#" style="background: [PRIMARY_COLOR]; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Get Started</a>
    </div>
  </body>
</html>`);
  const [emailPreviewContent, setEmailPreviewContent] = useState('');

  // Parameterized email template builder states
  const [paramCompanyName, setParamCompanyName] = useState('DataBazaar Promo');
  const [paramHeading, setParamHeading] = useState('Save 25% Sitewide');
  const [paramPromoCode, setParamPromoCode] = useState('SAVE25');
  const [paramCtaText, setParamCtaText] = useState('Get Started');
  const [paramCtaLink, setParamCtaLink] = useState('https://databazaar.com');
  const [paramDescription, setParamDescription] = useState('We discovered your details and wanted to offer our premium services.');

  // Admin Dashboard states
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminAddCreditsUserId, setAdminAddCreditsUserId] = useState('');
  const [adminAddCreditsAmount, setAdminAddCreditsAmount] = useState(10);
  const [promoteJobId, setPromoteJobId] = useState(null);
  const [promoteName, setPromoteName] = useState('');
  const [promoteCategory, setPromoteCategory] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadPrice, setUploadPrice] = useState(10);
  const [uploadDiv, setUploadDiv] = useState('');
  const [uploadDist, setUploadDist] = useState('');
  const [uploadArea, setUploadArea] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  // General campaigns list
  const [campaignsList, setCampaignsList] = useState([]);
  
  // Admin sub-tab
  const [adminSubTab, setAdminSubTab] = useState('datasets');
  const [adminViolations, setAdminViolations] = useState([]);
  const loadAdminViolations = () => {
    fetch(`${API_BASE}/api/admin/violations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setAdminViolations(Array.isArray(d) ? d : []))
      .catch(e => console.error(e));
  };
  
  const handleBanUser = async (userId, banIp, ipAddress, currentBanStatus) => {
    const isBanning = currentBanStatus !== 1;
    if(!window.confirm(`Are you sure you want to ${isBanning ? 'BAN' : 'UNBAN'} this user?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          is_banned: isBanning ? 1 : 0, 
          warning_message: "Your account has been suspended for violating security policies.", 
          ban_ip: banIp, 
          ip_address: ipAddress || "" 
        })
      });
      if(res.ok) {
        showToast(isBanning ? 'User has been banned.' : 'User has been unbanned.', 'success');
        loadAdminUsers();
      }
    } catch(e) {
      showToast('Error updating ban status', 'error');
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        showToast(`User role updated to ${newRole}!`, 'success');
        loadAdminUsers();
      } else {
        showToast('Failed to update role.', 'error');
      }
    } catch {
      showToast('Error updating role.', 'error');
    }
  };

  const handleQuickAddCredits = async (userId, userEmail, currentCredits) => {
    const amountStr = window.prompt(`Assign credits to ${userEmail} (Current balance: ${currentCredits}):\n\nEnter amount to add (e.g. 50 or 100):`, "50");
    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount === 0) {
      showToast('Please enter a valid non-zero number.', 'warning');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/add-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userId,
          amount: amount
        })
      });
      if (res.ok) {
        showToast(`Successfully assigned ${amount} credits to ${userEmail}!`, 'success');
        loadAdminUsers();
      } else {
        const data = await res.json();
        showToast(data.detail || 'Failed to assign credits.', 'error');
      }
    } catch {
      showToast('Error assigning credits.', 'error');
    }
  };

  // Timeouts / Ref
  const logsInterval = useRef(null);
  const campaignInterval = useRef(null);
  const mapInterval = useRef(null);
  const dashboardInterval = useRef(null);

  // Security Measures Blockers
  useEffect(() => {
    // 1. Disable Right Click Context Menu
    const disableContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', disableContextMenu);

    // 2. Disable Ctrl Key combinations (Ctrl+C, Ctrl+A, Ctrl+S, Ctrl+U, Ctrl+P, F12, Ctrl+Shift+I)
    const disableKeyShortcuts = (e) => {
      if (
        (e.ctrlKey && ['c', 'a', 's', 'u', 'p'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i')
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', disableKeyShortcuts);

    // 3. Disable print stylesheets override
    const style = document.createElement('style');
    style.innerHTML = `@media print { body { display: none !important; } }`;
    document.head.appendChild(style);

    // 4. Anti-Devtools debugger loop
    const dbgLoop = setInterval(() => {
      const start = new Date().getTime();
      debugger;
      const end = new Date().getTime();
      if (end - start > 100) {
        console.clear();
      }
    }, 500);

    return () => {
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('keydown', disableKeyShortcuts);
      document.head.removeChild(style);
      clearInterval(dbgLoop);
    };
  }, []);

  useEffect(() => {
    if (autoScrollScraper && scraperTerminalRef.current) {
      scraperTerminalRef.current.scrollTop = scraperTerminalRef.current.scrollHeight;
    }
  }, [activeJobLogs, autoScrollScraper]);

  // Initialize Auth
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile();
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  // Load configs and datasets
  useEffect(() => {
    loadConfig();
    loadDatasets();
    if (user) {
      loadJobs();
      checkWhatsAppStatus();
      loadCampaigns();
      loadDashboardStats();
      if (user.role === 'admin') {
        loadAdminUsers();
      }
    }
  }, [user]);

  // Reload datasets upon catalog filters change
  useEffect(() => {
    loadDatasets();
  }, [datasetFilterCat, datasetFilterDiv, datasetFilterDist, datasetFilterArea, datasetListSearch]);

  // Sync email template rendering with placeholders resolution
  useEffect(() => {
    let rendered = emailHtml.replace(/{name}/g, 'ABC Enterprise');
    if (emailPalette) {
      rendered = rendered
        .replace(/\[PRIMARY_COLOR\]/g, emailPalette.primary)
        .replace(/\[SECONDARY_COLOR\]/g, emailPalette.secondary)
        .replace(/\[BG_COLOR\]/g, emailPalette.bg)
        .replace(/\[TEXT_COLOR\]/g, emailPalette.text)
        .replace(/\[CARD_BG\]/g, emailPalette.cardBg)
        .replace(/\[BORDER_COLOR\]/g, emailPalette.borderColor);
    }
    // Parameters resolution
    rendered = rendered
      .replace(/\[COMPANY_NAME\]/g, paramCompanyName)
      .replace(/\[OFFER_HEADING\]/g, paramHeading)
      .replace(/\[OFFER_CODE\]/g, paramPromoCode)
      .replace(/\[CTA_TEXT\]/g, paramCtaText)
      .replace(/\[CTA_LINK\]/g, paramCtaLink)
      .replace(/\[OFFER_DESCRIPTION\]/g, paramDescription);
    setEmailPreviewContent(rendered);
  }, [emailHtml, emailPalette, paramCompanyName, paramHeading, paramPromoCode, paramCtaText, paramCtaLink, paramDescription]);
  
  // Auto-refresh dashboard when on dashboard tab
  useEffect(() => {
    if (currentTab === 'marketing' && marketingSubTab === 'dashboard' && user) {
      loadDashboardStats();
      dashboardInterval.current = setInterval(loadDashboardStats, 5000);
    }
    return () => {
      if (dashboardInterval.current) clearInterval(dashboardInterval.current);
    };
  }, [currentTab, marketingSubTab, user]);

  // Live debug tool stream polling
  useEffect(() => {
    let interval;
    if (showLiveDebug && activeJobId) {
      const fetchScreenshot = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/scraper/jobs/${activeJobId}/screenshot`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.available) {
            setLiveMapImage(data.image);
          }
        } catch {}
      };
      fetchScreenshot();
      interval = setInterval(fetchScreenshot, 2000);
    } else {
      setLiveMapImage(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showLiveDebug, activeJobId, token]);

  // Fetch Config
  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config/regions`);
      const data = await res.json();
      setRegionsConfig(data.regions);
      setCategoriesList(data.categories);
    } catch (e) {
      console.error('Failed to load regions configurations', e);
    }
  };

  // Profile check
  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
      } else {
        setToken('');
      }
    } catch {
      setToken('');
    }
  };

  // Datasets Loader
  const loadDatasets = async () => {
    try {
      const finalDiv = datasetFilterDiv === 'Other' ? datasetFilterDivCustom : datasetFilterDiv;
      const finalDist = datasetFilterDist === 'Other' ? datasetFilterDistCustom : datasetFilterDist;
      const finalArea = datasetFilterArea === 'Other' ? datasetFilterAreaCustom : datasetFilterArea;

      let url = `${API_BASE}/api/datasets?`;
      if (datasetFilterCat) url += `category=${encodeURIComponent(datasetFilterCat)}&`;
      if (finalDiv) url += `division=${encodeURIComponent(finalDiv)}&`;
      if (finalDist) url += `district=${encodeURIComponent(finalDist)}&`;
      if (finalArea) url += `area=${encodeURIComponent(finalArea)}&`;
      if (datasetListSearch) url += `search=${encodeURIComponent(datasetListSearch)}&`;
      
      const res = await fetch(url);
      const data = await res.json();
      setDatasets(data);
      setRecipientGroups(data);
    } catch (e) {
      console.error('Failed to load datasets', e);
    }
  };

  // Open dataset
  const openDatasetDetails = async (id, pageNum = 1) => {
    if (id !== selectedDatasetId) {
      setDatasetDetail(null);
    }
    setSelectedDatasetId(id);
    setDatasetPage(pageNum);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/datasets/${id}?page=${pageNum}&search=${datasetSearch}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setDatasetDetail(data);
      } else {
        showToast(data.detail || 'Failed to read dataset.', 'error');
      }
    } catch {
      showToast('Error fetching details.', 'error');
    }
  };

  // Unlock dataset
  const unlockDataset = async (id) => {
    if (!token) {
      showToast('Please login to unlock datasets.', 'warning');
      return;
    }
    showConfirm('Unlock this dataset for ' + datasetDetail?.dataset.price_credits + ' credits?', async () => {
      try {
        const res = await fetch(`${API_BASE}/api/datasets/${id}/unlock`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Dataset unlocked successfully!', 'success');
          fetchUserProfile();
          openDatasetDetails(id, 1);
        } else {
          showToast(data.detail || 'Unlock failed.', 'error');
        }
      } catch {
        showToast('Error unlocking dataset.', 'error');
      }
    });
  };

  // Submit Scraper
  const handleStartScrape = async (e) => {
    e.preventDefault();
    if (!token) {
      showToast('Please login to initiate custom scraper.', 'warning');
      return;
    }
    const validQueries = scrapeQueries.map(q => q.trim()).filter(q => q);
    if (validQueries.length === 0 && !scrapeQuery.trim()) {
      showToast('Please enter at least one search query.', 'warning');
      return;
    }
    const queriesToSend = validQueries.length > 0 ? validQueries : [scrapeQuery.trim()];
    const finalDiv = scrapeDiv === 'Other' ? scrapeDivCustom : scrapeDiv;
    const finalDist = scrapeDist === 'Other' ? scrapeDistCustom : scrapeDist;
    const finalArea = scrapeArea === 'Other' ? scrapeAreaCustom : scrapeArea;

    try {
      const res = await fetch(`${API_BASE}/api/scraper/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          queries: queriesToSend,
          query: queriesToSend[0],
          division: finalDiv,
          district: finalDist,
          area: finalArea,
          headless: !showLiveDebug
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Scrape job launched for ${queriesToSend.length} query(s)!`, 'success');
        setScrapeQueries(['']);
        setScrapeQuery('');
        setScrapeDiv('');
        setScrapeDist('');
        setScrapeArea('');
        setScrapeDivCustom('');
        setScrapeDistCustom('');
        setScrapeAreaCustom('');
        loadJobs();
        pollScrapeJob(data.job_id);
      } else {
        showToast(data.detail || 'Failed to launch scraper.', 'error');
      }
    } catch {
      showToast('Error connecting to backend scraper.', 'error');
    }
  };

  // Poll Scraper logs
  const pollScrapeJob = (jobId) => {
    setActiveJobId(jobId);
    if (logsInterval.current) clearInterval(logsInterval.current);
    logsInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/scraper/jobs/${jobId}/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setActiveJobLogs(data.logs);
          if (data.job.status === 'done' || data.job.status === 'failed') {
            clearInterval(logsInterval.current);
            loadJobs();
          }
        }
      } catch {
        clearInterval(logsInterval.current);
      }
    }, 2000);
  };

  // Load jobs list
  const loadJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/scraper/jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setScraperJobs(data);
      }
    } catch {}
  };

  // WhatsApp status
  const checkWhatsAppStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/marketing/whatsapp-status`);
      const data = await res.json();
      setWaSessionStatus(data.session_active ? 'Session Active' : 'No Active Session');
    } catch {
      setWaSessionStatus('Error');
    }
  };

  // Scan WhatsApp session
  const setupWhatsAppSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/marketing/whatsapp-setup-session`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      showToast(data.message, 'info');
    } catch {
      showToast('Connection failed.', 'error');
    }
  };

  // Check progress on recipient group select
  const handleWaRecipientChange = async (val) => {
    setWaRecipientGroup(val);
    setWaStartRow(0);
    if (!val) {
      setSelectedGroupRowCount(0);
      return;
    }
    // Find the row count of the selected group
    const ds = recipientGroups.find(d => `dataset_${d.id}` === val);
    if (ds) {
      setSelectedGroupRowCount(ds.row_count || 0);
    }
    try {
      const res = await fetch(`${API_BASE}/api/marketing/whatsapp-progress?recipient_group=${val}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.last_index > 0) {
        showConfirm(
          `Found progress pointer!\nYou already dispatched to ${data.last_index} contacts in this group.\n\nDo you want to RESUME sending starting from #${data.last_index + 1}?`,
          () => {
            setWaStartRow(data.last_index);
          }
        );
      }
    } catch {}
  };

  // Trigger WhatsApp dispatch
  const triggerWhatsAppCampaign = async (recipientGroupVal = waRecipientGroup, resume = false) => {
    if (!recipientGroupVal) {
      showToast('Please choose a recipient group first.', 'warning');
      return;
    }
    const resolvedTemplate = waTemplate
      .replace(/\[COMPANY_NAME\]/g, paramCompanyName)
      .replace(/\[OFFER_HEADING\]/g, paramHeading)
      .replace(/\[OFFER_CODE\]/g, paramPromoCode)
      .replace(/\[CTA_TEXT\]/g, paramCtaText)
      .replace(/\[CTA_LINK\]/g, paramCtaLink)
      .replace(/\[OFFER_DESCRIPTION\]/g, paramDescription);

    try {
      const res = await fetch(`${API_BASE}/api/marketing/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipient_group: recipientGroupVal,
          message_template: resolvedTemplate,
          resume: resume,
          start_row: waStartRow > 0 ? waStartRow : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('WhatsApp campaign launched successfully!', 'success');
        pollCampaign(data.campaign_id);
        loadDashboardStats();
      } else {
        showToast(data.detail || 'Dispatch failed.', 'error');
      }
    } catch {
      showToast('Failed to connect campaign server.', 'error');
    }
  };

  // Poll Campaign progress
  const pollCampaign = (campaignId) => {
    setActiveCampaignId(campaignId);
    if (campaignInterval.current) clearInterval(campaignInterval.current);
    campaignInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/marketing/whatsapp-campaign/${campaignId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setCampaignProgress(data);
          setCampaignLogs(data.logs);
          if (data.status === 'done' || data.status === 'failed' || data.status === 'stopped') {
            clearInterval(campaignInterval.current);
            loadCampaigns();
            loadDashboardStats();
          }
        }
      } catch {
        clearInterval(campaignInterval.current);
      }
    }, 3000);
  };

  // Terminate campaign
  const terminateCampaign = async (id) => {
    showConfirm('Are you sure you want to stop this campaign dispatch?', async () => {
      try {
        const res = await fetch(`${API_BASE}/api/marketing/whatsapp-campaign/${id}/stop`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          showToast('Stop signal dispatched successfully.', 'success');
          loadCampaigns();
          loadDashboardStats();
        }
      } catch {}
    });
  };

  // Load campaigns history
  const loadCampaigns = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/marketing/campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCampaignsList(data);
    } catch {}
  };
  
  // Load dashboard stats
  const loadDashboardStats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/marketing/dashboard-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDashboardStats(data);
        setCampaignsList(data.campaigns || []);
      }
    } catch {}
  };
  
  // Load log files list
  const loadLogFiles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/marketing/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setLogFilesList(data);
    } catch {}
  };
  
  // Load specific log file content
  const loadLogFileContent = async (date) => {
    setSelectedLogDate(date);
    try {
      const res = await fetch(`${API_BASE}/api/marketing/logs/${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setLogFileContent(data);
    } catch {}
  };
  
  // Load campaign detail logs (for expandable rows)
  const loadCampaignDetailLogs = async (campaignId) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
      setExpandedCampaignLogs([]);
      return;
    }
    setExpandedCampaignId(campaignId);
    try {
      const res = await fetch(`${API_BASE}/api/marketing/whatsapp-campaign/${campaignId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setExpandedCampaignLogs(data.logs || []);
      }
    } catch {}
  };

  // Email campaign submit
  const submitEmailCampaign = async () => {
    if (!emailRecipientGroup) {
      showToast('Choose target leads.', 'warning');
      return;
    }
    const resolvedHtml = emailHtml
      .replace(/\[PRIMARY_COLOR\]/g, emailPalette.primary)
      .replace(/\[SECONDARY_COLOR\]/g, emailPalette.secondary)
      .replace(/\[BG_COLOR\]/g, emailPalette.bg)
      .replace(/\[TEXT_COLOR\]/g, emailPalette.text)
      .replace(/\[CARD_BG\]/g, emailPalette.cardBg)
      .replace(/\[BORDER_COLOR\]/g, emailPalette.borderColor)
      .replace(/\[COMPANY_NAME\]/g, paramCompanyName)
      .replace(/\[OFFER_HEADING\]/g, paramHeading)
      .replace(/\[OFFER_CODE\]/g, paramPromoCode)
      .replace(/\[CTA_TEXT\]/g, paramCtaText)
      .replace(/\[CTA_LINK\]/g, paramCtaLink)
      .replace(/\[OFFER_DESCRIPTION\]/g, paramDescription);

    try {
      const res = await fetch(`${API_BASE}/api/marketing/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipient_group: emailRecipientGroup,
          subject: emailSubject,
          html_code: resolvedHtml
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Email campaign dispatched successfully!', 'success');
        fetchUserProfile();
        loadCampaigns();
        loadDashboardStats();
      } else {
        showToast(data.detail || 'Email delivery failed.', 'error');
      }
    } catch {
      showToast('Error triggering email dispatch.', 'error');
    }
  };

  // Admin user list loader
  const loadAdminUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAdminUsers(data);
    } catch {}
  };

  // Add credits
  const handleAddCreditsSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/add-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: parseInt(adminAddCreditsUserId),
          amount: parseInt(adminAddCreditsAmount)
        })
      });
      if (res.ok) {
        showToast('Credits added successfully!', 'success');
        setAdminAddCreditsUserId('');
        loadAdminUsers();
      } else {
        const data = await res.json();
        showToast(data.detail || 'Failed.', 'error');
      }
    } catch {
      showToast('Error writing credits.', 'error');
    }
  };

  // Promote scrape results to catalog
  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', promoteName);
    formData.append('category', promoteCategory);

    try {
      const res = await fetch(`${API_BASE}/api/scraper/jobs/${promoteJobId}/promote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Job promoted successfully!', 'success');
        setPromoteJobId(null);
        loadDatasets();
        loadJobs();
      } else {
        showToast(data.detail || 'Promotion failed.', 'error');
      }
    } catch {
      showToast('Error promoting job.', 'error');
    }
  };

  // Admin upload dataset
  const handleAdminUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Upload target file.', 'warning');
      return;
    }
    const finalDiv = uploadDiv === 'Other' ? uploadDivCustom : uploadDiv;
    const finalDist = uploadDist === 'Other' ? uploadDistCustom : uploadDist;
    const finalArea = uploadArea === 'Other' ? uploadAreaCustom : uploadArea;

    const formData = new FormData();
    formData.append('name', uploadName);
    formData.append('category', uploadCategory);
    formData.append('price_credits', uploadPrice);
    if (finalDiv) formData.append('division', finalDiv);
    if (finalDist) formData.append('district', finalDist);
    if (finalArea) formData.append('area', finalArea);
    formData.append('file', uploadFile);

    try {
      const res = await fetch(`${API_BASE}/api/admin/datasets/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        showToast('Dataset created successfully!', 'success');
        setUploadName('');
        setUploadCategory('');
        setUploadPrice(10);
        setUploadDiv('');
        setUploadDist('');
        setUploadArea('');
        setUploadDivCustom('');
        setUploadDistCustom('');
        setUploadAreaCustom('');
        setUploadFile(null);
        loadDatasets();
      } else {
        const data = await res.json();
        showToast(data.detail || 'Upload failed.', 'error');
      }
    } catch {
      showToast('Server upload failure.', 'error');
    }
  };

  // Admin delete dataset
  const deleteDataset = async (id) => {
    showConfirm('Are you sure you want to delete this dataset?', async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/datasets/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          showToast('Dataset deleted.', 'info');
          loadDatasets();
        }
      } catch {}
    });
  };

  // Auth Handler
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authView === 'login' ? 'login' : 'register';
    const body = authView === 'login'
      ? { email: authEmail, password: authPassword }
      : { email: authEmail, full_name: authName, password: authPassword };

    try {
      const res = await fetch(`${API_BASE}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        setCurrentTab('home');
      } else {
        setAuthError(data.detail || 'Authentication failed.');
      }
    } catch {
      setAuthError('Connection server failure.');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setCurrentTab('home');
  };
  
  // Helper: get badge class for status
  const getStatusBadge = (status) => {
    const map = {
      'running': 'badge badge-running',
      'done': 'badge badge-done',
      'failed': 'badge badge-failed',
      'stopped': 'badge badge-stopped',
      'stopping': 'badge badge-stopped'
    };
    return map[status] || 'badge';
  };

  return (
    <div className="app-container">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header brand" style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('home')}>
          <BarChart3 size={18} style={{ color: '#06b6d4' }} /> DATABAZAAR
        </div>
        
        <div className="sidebar-menu">
          <div className="sidebar-section-title">Main</div>
          <div className={`sidebar-item ${currentTab === 'home' || currentTab === 'catalog' ? 'active' : ''}`} onClick={() => { setCurrentTab('catalog'); setSelectedDatasetId(null); }}>
            <Database size={16} /> Datasets
          </div>
          {user && (
            <>
              <div className={`sidebar-item ${currentTab === 'scraper' ? 'active' : ''}`} onClick={() => setCurrentTab('scraper')}>
                <Search size={16} /> Custom Scraper
              </div>
              <div className={`sidebar-item ${currentTab === 'marketing' ? 'active' : ''}`} onClick={() => setCurrentTab('marketing')}>
                <Send size={16} /> Marketing Portal
              </div>
            </>
          )}

          {user && user.role === 'admin' && (
            <>
              <div className="sidebar-section-title">Administration</div>
              <div className={`sidebar-item ${currentTab === 'admin' ? 'active' : ''}`} onClick={() => { setCurrentTab('admin'); setAdminSubTab('datasets'); }}>
                <Settings size={16} /> Admin Panel
              </div>
              <div className={`sidebar-item ${currentTab === 'users' ? 'active' : ''}`} onClick={() => { setCurrentTab('users'); loadAdminUsers(); }}>
                <User size={16} /> Customers & Credits
              </div>
              <div className={`sidebar-item danger ${currentTab === 'security' ? 'active' : ''}`} onClick={() => { setCurrentTab('security'); loadAdminViolations(); loadAdminUsers(); }}>
                <Shield size={16} /> Security Module
              </div>
            </>
          )}
          
          {!user && (
            <div className={`sidebar-item ${currentTab === 'auth' ? 'active' : ''}`} onClick={() => setCurrentTab('auth')} style={{ marginTop: '20px' }}>
              <User size={16} /> Login / Register
            </div>
          )}
        </div>

        {user && (
          <div className="sidebar-footer">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', wordBreak: 'break-all' }}>
              <User size={12} style={{ display: 'inline', opacity: 0.8, marginRight: '4px' }} /> {user.email}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem' }}>
                <Coins size={14} style={{ color: '#eab308', verticalAlign: 'middle', marginRight: '4px' }} /> <strong className="digital-text">{user.credits}</strong> cr
              </span>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout} title="Logout">
                <LogOut size={13} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Content Area ── */}
      <main className="main-content">
      <div className="container" style={{ padding: '40px 0' }}>
        
        {/* ══ TAB: HOME ══ */}
        {currentTab === 'home' && (
          <div>
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>
                Verified Leads Marketplace & <span className="digital-text">Scraper v2</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 40px auto' }}>
                Premium data catalog covering Pharmacy, Medicine shops, Coaching centers, Restaurants, and key local channels in Bangladesh.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => setCurrentTab('catalog')}>
                  <Database size={16} /> Browse Database
                </button>
                {user ? (
                  <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => setCurrentTab('scraper')}>
                    <Search size={16} /> Run Scraper
                  </button>
                ) : (
                  <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => setCurrentTab('auth')}>
                    <User size={16} /> Get Started
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '40px' }}>
              <div className="card glowing-panel">
                <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={16} style={{ color: '#ec4899' }} /> Protected Lead Previews
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Anti-copy headers, selection block filters, mask overlays protect direct scrape lists from redistribution.
                </p>
              </div>
              <div className="card glowing-panel">
                <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} style={{ color: '#eab308' }} /> Live Dispatch Campaign Logs
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Track active WhatsApp and Email sends with visual LED progress monitors and background console logging.
                </p>
              </div>
              <div className="card glowing-panel">
                <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} style={{ color: '#10b981' }} /> Humanized Sends Protections
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Randomized typewriter loops, cooldown segments, automatic progress checkpoints safeguard session channels.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: AUTH ══ */}
        {currentTab === 'auth' && (
          <div style={{ maxWidth: '400px', margin: '40px auto' }} className="card glowing-panel">
            <h3 style={{ marginBottom: '20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {authView === 'login' ? (
                <>
                  <Lock size={20} style={{ color: '#06b6d4' }} /> Sign In
                </>
              ) : (
                <>
                  <FileText size={20} style={{ color: '#10b981' }} /> Create Account
                </>
              )}
            </h3>
            {authError && (
              <div style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '4px' }}>
                {authError}
              </div>
            )}
            <form onSubmit={handleAuthSubmit}>
              {authView === 'register' && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-control" value={authName} onChange={(e) => setAuthName(e.target.value)} required />
                </div>
              )}
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="form-control" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" className="form-control" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} type="submit">
                {authView === 'login' ? 'Login' : 'Register'}
              </button>
            </form>
            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem' }}>
              {authView === 'login' ? (
                <span>No account? <a onClick={() => setAuthView('register')}>Register Here</a></span>
              ) : (
                <span>Has an account? <a onClick={() => setAuthView('login')}>Login Here</a></span>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: CATALOG & DETAILS ══ */}
        {currentTab === 'catalog' && (
          <div>
            {!selectedDatasetId ? (
              <div>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" className="form-control" style={{ flex: '1', minWidth: '200px' }} placeholder="Search datasets..." value={datasetListSearch} onChange={(e) => setDatasetListSearch(e.target.value)} />
                  
                  {/* Category Dropdown */}
                  <select className="form-control" style={{ width: '180px' }} value={datasetFilterCat} onChange={(e) => setDatasetFilterCat(e.target.value)}>
                    <option value="">-- Categories --</option>
                    {categoriesList.map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                  
                  {/* Bangladesh Division Select Dropdown */}
                  <select className="form-control" style={{ width: '180px' }} value={datasetFilterDiv} onChange={(e) => { setDatasetFilterDiv(e.target.value); setDatasetFilterDist(''); setDatasetFilterArea(''); }}>
                    <option value="">-- Divisions --</option>
                    {regionsConfig && Object.keys(regionsConfig).map((div, i) => (
                      <option key={i} value={div}>{div}</option>
                    ))}
                    <option value="Other">Other / Custom...</option>
                  </select>
                  {datasetFilterDiv === 'Other' && (
                    <input type="text" className="form-control" style={{ width: '150px' }} placeholder="Type division..." value={datasetFilterDivCustom} onChange={(e) => setDatasetFilterDivCustom(e.target.value)} />
                  )}
                  
                  {/* Bangladesh District Select Dropdown */}
                  <select className="form-control" style={{ width: '180px' }} value={datasetFilterDist} onChange={(e) => { setDatasetFilterDist(e.target.value); setDatasetFilterArea(''); }} disabled={!datasetFilterDiv && datasetFilterDiv !== 'Other'}>
                    <option value="">-- Districts --</option>
                    {regionsConfig && datasetFilterDiv && regionsConfig[datasetFilterDiv] && Object.keys(regionsConfig[datasetFilterDiv]).map((dist, i) => (
                      <option key={i} value={dist}>{dist}</option>
                    ))}
                    <option value="Other">Other / Custom...</option>
                  </select>
                  {datasetFilterDist === 'Other' && (
                    <input type="text" className="form-control" style={{ width: '150px' }} placeholder="Type district..." value={datasetFilterDistCustom} onChange={(e) => setDatasetFilterDistCustom(e.target.value)} />
                  )}

                  {/* Area / City Select Dropdown */}
                  <select className="form-control" style={{ width: '180px' }} value={datasetFilterArea} onChange={(e) => setDatasetFilterArea(e.target.value)} disabled={!datasetFilterDist && datasetFilterDist !== 'Other'}>
                    <option value="">-- Area / City --</option>
                    {regionsConfig && datasetFilterDiv && datasetFilterDist && regionsConfig[datasetFilterDiv]?.[datasetFilterDist] && regionsConfig[datasetFilterDiv][datasetFilterDist].map((area, i) => (
                      <option key={i} value={area}>{area}</option>
                    ))}
                    <option value="Other">Other / Custom...</option>
                  </select>
                  {datasetFilterArea === 'Other' && (
                    <input type="text" className="form-control" style={{ width: '150px' }} placeholder="Type area..." value={datasetFilterAreaCustom} onChange={(e) => setDatasetFilterAreaCustom(e.target.value)} />
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  {datasets.map(ds => (
                    <div key={ds.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>{ds.category}</div>
                        <h4 style={{ marginBottom: '10px' }}>{ds.name}</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Covering: {ds.area || ds.district || ds.division || 'Bangladesh'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Leads parsed: {ds.row_count} rows</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                        <span className="digital-text" style={{ fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Coins size={15} style={{ color: '#eab308' }} /> {ds.price_credits}</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => openDatasetDetails(ds.id, 1)}>View Dataset</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Dataset Details Protected View
              <div>
                <button className="btn btn-secondary btn-sm" style={{ marginBottom: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setSelectedDatasetId(null)}>← Back to catalog</button>
                {datasetDetail && (
                  <div className="card glowing-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                      <div>
                        <h2>{datasetDetail.dataset.name}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                          Category: {datasetDetail.dataset.category} | Leads: {datasetDetail.dataset.row_count} rows | Region: {datasetDetail.dataset.area || datasetDetail.dataset.district || 'BD'}
                        </p>
                      </div>
                      {!datasetDetail.unlocked ? (
                        <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => unlockDataset(datasetDetail.dataset.id)}>
                          <Unlock size={16} /> Unlock Full Leads (<Coins size={14} style={{ color: '#eab308' }} /> {datasetDetail.dataset.price_credits} credits)
                        </button>
                      ) : (
                        <div style={{ color: 'var(--text-neon)', fontSize: '0.9rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={16} /> Unlocked</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                      <input type="text" className="form-control" style={{ maxWidth: '300px' }} placeholder="Search leads inside..." value={datasetSearch} onChange={(e) => setDatasetSearch(e.target.value)} />
                      <button className="btn btn-secondary btn-sm" onClick={() => openDatasetDetails(selectedDatasetId, 1)}>Search</button>
                    </div>

                    {/* Masked/Unmasked protected content container */}
                    <div className="protected-view" style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                      {/* Watermark overlay if unlocked */}
                      {datasetDetail.unlocked && user && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden', opacity: 0.15, fontSize: '0.85rem', color: '#fff', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '40px', padding: '20px', userSelect: 'none' }}>
                          {Array(50).fill(user.email).map((mail, idx) => (
                            <div key={idx} style={{ transform: 'rotate(-25deg)', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                              <div>{mail}</div>
                              <div style={{ fontSize: '0.65rem' }}>{new Date().toLocaleString()}</div>
                              <div style={{ fontSize: '0.65rem', color: '#ef4444' }}>UNAUTHORIZED SCREENSHOT</div>
                            </div>
                          ))}
                        </div>
                      )}

                      <table className="admin-table" style={{ userSelect: 'none' }}>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Contact / Mobile</th>
                            <th>Address</th>
                            <th>Website</th>
                            <th>Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datasetDetail.leads && datasetDetail.leads.length > 0 ? (
                            datasetDetail.leads.map((row, idx) => {
                              const nameVal = row.Name || row.name || row['Business Name'] || row['Company Name'] || '—';
                              const phoneVal = row.Phone || row.phone || row['Contact'] || row['Mobile'] || row['Contact / Mobile'] || 'No contact';
                              const addressVal = row.Address || row.address || row['Location'] || '—';
                              const websiteVal = row.Website || row.website || row['URL'] || '';
                              const ratingVal = row.Rating || row.rating || row['Reviews'] || '—';
                              return (
                                <tr key={idx}>
                                  <td><strong>{nameVal}</strong></td>
                                  <td className="digital-text" style={{ fontStyle: !datasetDetail.unlocked ? 'italic' : 'normal' }}>
                                    {phoneVal}
                                  </td>
                                  <td>{addressVal}</td>
                                  <td>{websiteVal ? <a href={websiteVal} target="_blank" rel="noreferrer">URL</a> : '—'}</td>
                                  <td>{ratingVal}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                No records found in this dataset.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {datasetDetail.unlocked && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
                        <button className="btn btn-secondary btn-sm" disabled={datasetPage <= 1} onClick={() => openDatasetDetails(selectedDatasetId, datasetPage - 1)}>Prev</button>
                        <span style={{ fontSize: '0.85rem' }}>Page {datasetPage} of {datasetDetail.pages_count}</span>
                        <button className="btn btn-secondary btn-sm" disabled={datasetPage >= datasetDetail.pages_count} onClick={() => openDatasetDetails(selectedDatasetId, datasetPage + 1)}>Next</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: SCRAPER ══ */}
        {currentTab === 'scraper' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <div className="card glowing-panel">
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><Search size={18} style={{ color: '#06b6d4' }} /> Initialize Custom Maps Scraper</h3>
              <form onSubmit={handleStartScrape}>
                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Search Queries *</span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal' }}>Combined into 1 Excel</span>
                  </label>
                  {scrapeQueries.map((q, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Query #${idx + 1} (e.g. Pharmacy Mirpur Dhaka)`}
                        value={q}
                        onChange={(e) => {
                          const newQ = [...scrapeQueries];
                          newQ[idx] = e.target.value;
                          setScrapeQueries(newQ);
                        }}
                        required={idx === 0 && !scrapeQuery}
                      />
                      {idx === scrapeQueries.length - 1 ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0 14px', fontWeight: 'bold', fontSize: '1.2rem', minWidth: '42px' }}
                          onClick={() => setScrapeQueries([...scrapeQueries, ''])}
                          title="Add another search query field"
                        >
                          +
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '0 14px', fontWeight: 'bold', fontSize: '1.2rem', minWidth: '42px' }}
                          onClick={() => {
                            const newQ = scrapeQueries.filter((_, i) => i !== idx);
                            setScrapeQueries(newQ.length ? newQ : ['']);
                          }}
                          title="Remove query field"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Division Select Dropdown */}
                <div className="form-group">
                  <label>Division</label>
                  <select className="form-control" value={scrapeDiv} onChange={(e) => { setScrapeDiv(e.target.value); setScrapeDist(''); setScrapeArea(''); }}>
                    <option value="">-- Select Division --</option>
                    {regionsConfig && Object.keys(regionsConfig).map((div, i) => (
                      <option key={i} value={div}>{div}</option>
                    ))}
                    <option value="Other">Other / Custom (Type manually)...</option>
                  </select>
                  {scrapeDiv === 'Other' && (
                    <input type="text" className="form-control" style={{ marginTop: '8px' }} placeholder="Type custom division name..." value={scrapeDivCustom} onChange={(e) => setScrapeDivCustom(e.target.value)} required />
                  )}
                </div>
                
                {/* District Select Dropdown */}
                <div className="form-group">
                  <label>District</label>
                  <select className="form-control" value={scrapeDist} onChange={(e) => { setScrapeDist(e.target.value); setScrapeArea(''); }} disabled={!scrapeDiv && scrapeDiv !== 'Other'}>
                    <option value="">-- Select District --</option>
                    {regionsConfig && scrapeDiv && regionsConfig[scrapeDiv] && Object.keys(regionsConfig[scrapeDiv]).map((dist, i) => (
                      <option key={i} value={dist}>{dist}</option>
                    ))}
                    <option value="Other">Other / Custom (Type manually)...</option>
                  </select>
                  {scrapeDist === 'Other' && (
                    <input type="text" className="form-control" style={{ marginTop: '8px' }} placeholder="Type custom district name..." value={scrapeDistCustom} onChange={(e) => setScrapeDistCustom(e.target.value)} required />
                  )}
                </div>
                
                {/* Area Select Dropdown */}
                <div className="form-group">
                  <label>Area / Sub-area</label>
                  <select className="form-control" value={scrapeArea} onChange={(e) => setScrapeArea(e.target.value)} disabled={!scrapeDist && scrapeDist !== 'Other'}>
                    <option value="">-- Select Area / Zone --</option>
                    {regionsConfig && scrapeDiv && scrapeDist && regionsConfig[scrapeDiv]?.[scrapeDist] && regionsConfig[scrapeDiv][scrapeDist].map((area, i) => (
                      <option key={i} value={area}>{area}</option>
                    ))}
                    <option value="Other">Other / Custom (Type manually)...</option>
                  </select>
                  {scrapeArea === 'Other' && (
                    <input type="text" className="form-control" style={{ marginTop: '8px' }} placeholder="Type custom area or sub-area name..." value={scrapeAreaCustom} onChange={(e) => setScrapeAreaCustom(e.target.value)} required />
                  )}
                </div>



                <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} type="submit">
                  <Play size={15} /> Launch Scraper (Costs {20 * (scrapeQueries.filter(q => q.trim()).length || 1)} Credits)
                </button>
              </form>
            </div>

            {/* Live scraper logs view */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bot size={18} style={{ color: '#a855f7' }} /> Background Scraper Jobs</h3>
                <label className="toggle-switch" title="When ON, scraping opens a visible Chrome browser window for live debugging. Independent of active jobs.">
                  <input type="checkbox" checked={showLiveDebug} onChange={(e) => setShowLiveDebug(e.target.checked)} />
                  <span className="toggle-track"></span>
                  <Search size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Show Live Map (Debug Tool)
                </label>
              </div>
              
              {activeJobId && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignContent: 'center', gap: '10px' }}>
                      <span className="led-status running"></span>
                      <span style={{ fontSize: '0.85rem' }}>Active Job ID: #{activeJobId}</span>
                    </div>
                    <label className="toggle-switch" title="When ON, logs automatically scroll to the newest entry.">
                      <input type="checkbox" checked={autoScrollScraper} onChange={(e) => setAutoScrollScraper(e.target.checked)} />
                      <span className="toggle-track"></span>
                      <span style={{ fontSize: '0.75rem' }}>Auto-scroll Logs</span>
                    </label>
                  </div>
                  
                  {/* Embedded Live Debug View (Screenshot Stream) */}
                  {showLiveDebug && (
                    <div className="map-viewer" style={{ marginBottom: '12px' }}>
                      {liveMapImage ? (
                        <>
                          <img src={liveMapImage} alt="Live debug view" style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--border-subtle)' }} />
                          <div className="map-viewer-overlay">
                            <div className="map-viewer-badge">
                              <span className="led-status running" style={{ width: '6px', height: '6px' }}></span>
                              LIVE DEBUG VIEW
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Waiting for live debug tool stream... (Chrome is running headlessly in background)
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="terminal-box" ref={scraperTerminalRef}>
                    {activeJobLogs.map((log, index) => (
                      <div key={index} className="terminal-line">{log}</div>
                    ))}
                  </div>
                </div>
              )}

              <h4 style={{ margin: '20px 0 10px 0' }}>Job History</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {scraperJobs.map(job => (
                  <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem' }}><strong>Query: {job.query}</strong></div>
                      <small style={{ color: 'var(--text-muted)' }}>Status: {job.status} | Rows: {job.result_count}</small>
                    </div>
                    <div>
                      {job.status === 'running' ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => pollScrapeJob(job.id)}>Logs</button>
                      ) : job.status === 'done' && user.role === 'admin' ? (
                        <button className="btn btn-primary btn-sm" onClick={() => { setPromoteJobId(job.id); setPromoteName(job.query); }}>Promote</button>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Finished</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: MARKETING ══ */}
        {currentTab === 'marketing' && (
          <div>
            <div className="tabs">
              <button className={`tab-btn ${marketingSubTab === 'dashboard' ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => { setMarketingSubTab('dashboard'); loadDashboardStats(); }}>
                <BarChart3 size={15} /> Live Dashboard
              </button>
              <button className={`tab-btn ${marketingSubTab === 'whatsapp' ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setMarketingSubTab('whatsapp')}>
                <MessageSquare size={15} /> WhatsApp Dispatch
              </button>
              <button className={`tab-btn ${marketingSubTab === 'email' ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setMarketingSubTab('email')}>
                <Mail size={15} /> HTML Email Builder
              </button>
              <button className={`tab-btn ${marketingSubTab === 'logs' ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => { setMarketingSubTab('logs'); loadCampaigns(); loadLogFiles(); }}>
                <FileText size={15} /> Campaign Log
              </button>
            </div>

            {/* ── Sub-tab: LIVE DASHBOARD ── */}
            {marketingSubTab === 'dashboard' && (
              <div className="fade-in">
                {/* Stat Cards */}
                <div className="stat-cards-grid">
                  <div className="stat-card">
                    <div className="stat-card-label">Total Campaigns</div>
                    <div className="stat-card-value">{dashboardStats?.total_campaigns || 0}</div>
                    <div className="stat-card-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <MessageSquare size={12} style={{ color: '#06b6d4' }} /> {dashboardStats?.whatsapp_count || 0} WA · 
                      <Mail size={12} style={{ color: '#a855f7' }} /> {dashboardStats?.email_count || 0} Email
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-label">Messages Sent</div>
                    <div className="stat-card-value cyan">{dashboardStats?.total_sent || 0}</div>
                    <div className="stat-card-sub">of {dashboardStats?.total_contacts || 0} total contacts</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-label">Success Rate</div>
                    <div className="stat-card-value">{dashboardStats?.success_rate || 0}%</div>
                    <div className="stat-card-sub">Campaigns completed</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-label">Active Now</div>
                    <div className="stat-card-value amber">{dashboardStats?.active_count || 0}</div>
                    <div className="stat-card-sub">Running campaigns</div>
                  </div>
                </div>

                {/* Charts */}
                <div className="charts-grid">
                  {/* SVG Pie Chart: Campaign Status Distribution */}
                  <div className="chart-panel">
                    <h5>Campaign Status Distribution</h5>
                    <svg width="220" height="220" viewBox="0 0 220 220">
                      {(() => {
                        const sc = dashboardStats?.status_counts || {};
                        const total = Object.values(sc).reduce((a, b) => a + b, 0) || 1;
                        const slices = [
                          { key: 'done', color: '#06b6d4', count: sc.done || 0 },
                          { key: 'running', color: '#39ff14', count: sc.running || 0 },
                          { key: 'failed', color: '#ef4444', count: sc.failed || 0 },
                          { key: 'stopped', color: '#ffb000', count: sc.stopped || 0 },
                          { key: 'stopping', color: '#8b5cf6', count: sc.stopping || 0 },
                        ].filter(s => s.count > 0);

                        if (slices.length === 0) {
                          return (
                            <>
                              <circle cx="110" cy="110" r="80" fill="none" stroke="#222" strokeWidth="30" />
                              <text x="110" y="115" fill="#475569" fontSize="14" fontFamily="monospace" textAnchor="middle">No data</text>
                            </>
                          );
                        }

                        let offset = 0;
                        const circumference = 2 * Math.PI * 80;
                        return slices.map((slice, i) => {
                          const pct = slice.count / total;
                          const dashLength = circumference * pct;
                          const dashGap = circumference - dashLength;
                          const rotation = (offset * 360) - 90;
                          offset += pct;
                          return (
                            <circle key={i} cx="110" cy="110" r="80" fill="none"
                              stroke={slice.color} strokeWidth="30"
                              strokeDasharray={`${dashLength} ${dashGap}`}
                              transform={`rotate(${rotation} 110 110)`}
                              style={{ transition: 'stroke-dasharray 0.6s ease' }}
                            />
                          );
                        });
                      })()}
                      <circle cx="110" cy="110" r="55" fill="#020306" />
                      <text x="110" y="105" fill="#fff" fontSize="22" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                        {dashboardStats?.total_campaigns || 0}
                      </text>
                      <text x="110" y="125" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">
                        TOTAL
                      </text>
                    </svg>
                    {/* Legend */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {[                        { label: 'Done', color: '#06b6d4' },
                        { label: 'Running', color: '#39ff14' },
                        { label: 'Failed', color: '#ef4444' },
                        { label: 'Stopped', color: '#ffb000' },
                      ].map((l, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }}></div>
                          {l.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SVG Bar Chart: Messages by Campaign Type */}
                  <div className="chart-panel">
                    <h5>Dispatch Volume by Type</h5>
                    <svg width="280" height="200" viewBox="0 0 280 200">
                      {(() => {
                        const waSent = (dashboardStats?.campaigns || [])
                          .filter(c => c.campaign_type === 'whatsapp')
                          .reduce((sum, c) => sum + (c.sent_count || 0), 0);
                        const emailSent = (dashboardStats?.campaigns || [])
                          .filter(c => c.campaign_type === 'email')
                          .reduce((sum, c) => sum + (c.sent_count || 0), 0);
                        const maxVal = Math.max(waSent, emailSent, 1);
                        const waWidth = Math.max(5, (waSent / maxVal) * 200);
                        const emailWidth = Math.max(5, (emailSent / maxVal) * 200);

                        return (
                          <>
                            <text x="10" y="45" fill="#94a3b8" fontSize="11" fontFamily="monospace">💬 WhatsApp</text>
                            <rect x="10" y="55" width={waWidth} height="30" fill="#39ff14" rx="3" opacity="0.85" style={{ transition: 'width 0.6s ease' }} />
                            <text x={waWidth + 18} y="75" fill="#39ff14" fontSize="14" fontFamily="monospace" fontWeight="bold">{waSent}</text>

                            <text x="10" y="125" fill="#94a3b8" fontSize="11" fontFamily="monospace">✉️ Email</text>
                            <rect x="10" y="135" width={emailWidth} height="30" fill="#6366f1" rx="3" opacity="0.85" style={{ transition: 'width 0.6s ease' }} />
                            <text x={emailWidth + 18} y="155" fill="#6366f1" fontSize="14" fontFamily="monospace" fontWeight="bold">{emailSent}</text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* Quick Summary */}
                {dashboardStats && (
                  <div className="summary-bar" style={{ marginTop: '24px' }}>
                    <div className="summary-bar-item">
                      <span>📤</span>
                      <span className="count digital-text">{dashboardStats.total_sent}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>sent</span>
                    </div>
                    <div className="summary-bar-item">
                      <span>⏳</span>
                      <span className="count remaining-highlight">{dashboardStats.total_remaining}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>remaining</span>
                    </div>
                    <div className="summary-bar-item">
                      <span>❌</span>
                      <span className="count" style={{ color: 'var(--accent-red)', fontWeight: 900 }}>{dashboardStats.total_failed}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>failed</span>
                    </div>
                    <div style={{ flex: 1 }}></div>
                    <div className="progress-bar-container progress-bar-lg" style={{ maxWidth: '300px', flex: 1 }}>
                      <div className="progress-bar-fill" style={{ width: `${dashboardStats.total_contacts > 0 ? Math.round((dashboardStats.total_sent / dashboardStats.total_contacts) * 100) : 0}%` }}></div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {dashboardStats.total_contacts > 0 ? Math.round((dashboardStats.total_sent / dashboardStats.total_contacts) * 100) : 0}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── Sub-tab: WHATSAPP ── */}
            {marketingSubTab === 'whatsapp' && (
              <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div className="card glowing-panel">
                  <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} style={{ color: '#06b6d4' }} /> Launch WhatsApp Campaign
                  </h3>
                  <div className="form-group">
                    <label>Recipient Lead Group</label>
                    <select className="form-control" value={waRecipientGroup} onChange={(e) => handleWaRecipientChange(e.target.value)}>
                      <option value="">-- Choose target leads list --</option>
                      {recipientGroups.map(ds => (
                        <option key={ds.id} value={`dataset_${ds.id}`}>{ds.name} ({ds.row_count} contacts)</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Start Row Selector */}
                  {waRecipientGroup && selectedGroupRowCount > 0 && (
                    <div className="start-row-container">
                      <div className="start-row-header">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} style={{ color: '#ec4899' }} /> Start from Row
                        </label>
                        <span className="row-indicator">Row {waStartRow} of {selectedGroupRowCount}</span>
                      </div>
                      <input
                        type="number"
                        className="start-row-input"
                        min="0"
                        max={selectedGroupRowCount}
                        value={waStartRow}
                        onChange={(e) => setWaStartRow(Math.min(Math.max(0, parseInt(e.target.value) || 0), selectedGroupRowCount))}
                      />
                      <div className="progress-bar-container" style={{ marginTop: '10px' }}>
                        <div className="progress-bar-fill" style={{ width: `${(waStartRow / selectedGroupRowCount) * 100}%` }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>Start</span>
                        <span>{selectedGroupRowCount - waStartRow} contacts will be targeted</span>
                        <span>End</span>
                      </div>
                    </div>
                  )}
                  {/* Pre-built WhatsApp Template Selector */}
                  <div className="form-group" style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', marginTop: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#818cf8', margin: 0 }}>
                      <FileText size={16} /> Load Pre-built WhatsApp Template
                    </label>
                    <select
                      className="form-control"
                      style={{ marginTop: '8px' }}
                      defaultValue=""
                      onChange={(e) => {
                        const idx = e.target.value;
                        if (idx !== "") {
                          const tmpl = WHATSAPP_TEMPLATES[idx];
                          const selectEl = e.target;
                          showConfirm(
                            `Load the "${tmpl.name}" template? This will overwrite your current template text.`,
                            () => {
                              setWaTemplate(tmpl.text);
                              selectEl.value = "";
                            },
                            () => {
                              selectEl.value = "";
                            }
                          );
                        }
                      }}
                    >
                      <option value="">-- Choose Template --</option>
                      {WHATSAPP_TEMPLATES.map((tmpl, idx) => (
                        <option key={idx} value={idx}>{tmpl.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Parameterized Details Editor */}
                  <div className="form-group" style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)', marginTop: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#4ade80', marginBottom: '12px' }}>
                      <Settings size={16} /> Parameterized Details Editor (No Code skills needed)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Company Name</label>
                        <input type="text" className="form-control" style={{ fontSize: '0.8rem', padding: '6px' }} value={paramCompanyName} onChange={(e) => setParamCompanyName(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Offer Heading</label>
                        <input type="text" className="form-control" style={{ fontSize: '0.8rem', padding: '6px' }} value={paramHeading} onChange={(e) => setParamHeading(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Coupon / Promo Code</label>
                        <input type="text" className="form-control" style={{ fontSize: '0.8rem', padding: '6px' }} value={paramPromoCode} onChange={(e) => setParamPromoCode(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CTA Button Text</label>
                        <input type="text" className="form-control" style={{ fontSize: '0.8rem', padding: '6px' }} value={paramCtaText} onChange={(e) => setParamCtaText(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CTA Button Link</label>
                      <input type="text" className="form-control" style={{ fontSize: '0.8rem', padding: '6px' }} value={paramCtaLink} onChange={(e) => setParamCtaLink(e.target.value)} />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Description / Main Content</label>
                      <textarea className="form-control" rows={3} style={{ fontSize: '0.8rem', padding: '6px', resize: 'vertical' }} value={paramDescription} onChange={(e) => setParamDescription(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Personalized Message Template</label>
                    <textarea className="form-control" style={{ minHeight: '150px' }} value={waTemplate} onChange={(e) => setWaTemplate(e.target.value)} />
                  </div>

                  {/* AI Template Customizer Redirect */}
                  <div className="form-group" style={{ background: 'rgba(168, 85, 247, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)', marginTop: '16px', marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#c084fc', margin: 0 }}>
                      <Bot size={16} /> AI Template Customizer
                    </label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 10px 0' }}>
                      Click any platform to copy text/prompts and launch the assistant to modify layouts.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleWaAiRedirect('Gemini')}
                        className="btn"
                        style={{ background: '#1e1b4b', border: '1px solid #4f46e5', color: '#e0e7ff', fontSize: '0.75rem', padding: '8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                      >
                        <Sparkles size={12} /> Gemini
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWaAiRedirect('Claude')}
                        className="btn"
                        style={{ background: '#1c1917', border: '1px solid #d97706', color: '#fef3c7', fontSize: '0.75rem', padding: '8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                      >
                        <Sparkles size={12} style={{ color: '#d97706' }} /> Claude
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWaAiRedirect('ChatGPT')}
                        className="btn"
                        style={{ background: '#022c22', border: '1px solid #059669', color: '#ecfdf5', fontSize: '0.75rem', padding: '8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                      >
                        <MessageCircle size={12} /> ChatGPT
                      </button>
                    </div>
                  </div>

                  <button className="btn btn-primary" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => triggerWhatsAppCampaign(waRecipientGroup, false)}>
                    <Send size={15} /> Launch Campaign (Costs 5 Credits)
                  </button>
                </div>

                <div>
                  <div className="card">
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield size={18} style={{ color: '#10b981' }} /> WhatsApp Session setup & Logs
                    </h3>
                    <div style={{ border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Session Verification:</span><br />
                        <span className="digital-text" style={{ fontSize: '1rem', fontWeight: 'bold' }}>{waSessionStatus}</span>
                      </div>
                      {user.role === 'admin' && (
                        <button className="btn btn-secondary btn-sm" onClick={setupWhatsAppSession}>Scan QR Code</button>
                      )}
                    </div>

                    {activeCampaignId && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.85rem' }}>Active Campaign ID: <code>{activeCampaignId}</code></span>
                          <button className="btn btn-danger btn-sm" onClick={() => terminateCampaign(activeCampaignId)}>Stop Campaign</button>
                        </div>
                        {campaignProgress && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                              <span className={`led-status ${campaignProgress.status === 'running' ? 'running' : 'done'}`}></span>
                              <span>Progress: {campaignProgress.sent} / {campaignProgress.total}</span>
                              {campaignProgress.failed > 0 && (
                                <span style={{ color: 'var(--accent-red)', fontSize: '0.8rem' }}>(❌ {campaignProgress.failed} failed)</span>
                              )}
                            </div>
                            <div className="progress-bar-container progress-bar-lg">
                              <div className="progress-bar-fill" style={{ width: `${campaignProgress.total > 0 ? Math.round((campaignProgress.sent / campaignProgress.total) * 100) : 0}%` }}></div>
                            </div>
                          </div>
                        )}
                        <div className="terminal-box">
                          {campaignLogs.map((log, index) => (
                            <div key={index} className="terminal-line">{log}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Real-time WhatsApp Message Preview */}
                  <div className="card" style={{ marginTop: '20px', background: '#075e54', border: '1px solid #128c7e' }}>
                    <h3 style={{ marginBottom: '15px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MessageSquare size={16} /> Live Message Preview (Recipient View)
                    </h3>
                    <div style={{ background: '#e5ddd5', padding: '16px', borderRadius: '8px', color: '#000000', fontSize: '0.9rem', minHeight: '120px', whiteSpace: 'pre-wrap', position: 'relative', fontFamily: 'sans-serif', border: '1px solid #ced4da' }}>
                      <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #ced4da', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
                        {waTemplate
                          .replace(/\[COMPANY_NAME\]/g, paramCompanyName)
                          .replace(/\[OFFER_HEADING\]/g, paramHeading)
                          .replace(/\[OFFER_CODE\]/g, paramPromoCode)
                          .replace(/\[CTA_TEXT\]/g, paramCtaText)
                          .replace(/\[CTA_LINK\]/g, paramCtaLink)
                          .replace(/\[OFFER_DESCRIPTION\]/g, paramDescription)
                          .replace(/\{name\}/g, 'ABC Enterprise')
                          .split('\n').map((line, i) => {
                            let formatted = line;
                            const regex = /\*(.*?)\*/g;
                            const parts = [];
                            let lastIdx = 0;
                            let match;
                            while ((match = regex.exec(formatted)) !== null) {
                              parts.push(formatted.substring(lastIdx, match.index));
                              parts.push(<strong key={match.index}>{match[1]}</strong>);
                              lastIdx = regex.lastIndex;
                            }
                            parts.push(formatted.substring(lastIdx));
                            return <div key={i}>{parts.length > 1 ? parts : line}</div>;
                          })
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Sub-tab: EMAIL (Unchanged) ── */}
            {marketingSubTab === 'email' && (
              <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div className="card">
                  <h3 style={{ marginBottom: '20px' }}>✉️ Email Template Builder</h3>
                  <div className="form-group">
                    <label>Recipient Group</label>
                    <select className="form-control" value={emailRecipientGroup} onChange={(e) => setEmailRecipientGroup(e.target.value)}>
                      <option value="">-- Choose target leads list --</option>
                      {recipientGroups.map(ds => (
                        <option key={ds.id} value={`dataset_${ds.id}`}>{ds.name} ({ds.row_count} contacts)</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Pre-built Email Template Selector */}
                  <div className="form-group" style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#818cf8', margin: 0 }}>
                      📋 Load Pre-built Template
                    </label>
                    <select
                      className="form-control"
                      style={{ marginTop: '8px' }}
                      defaultValue=""
                      onChange={(e) => {
                        const idx = e.target.value;
                        if (idx !== "") {
                          const tmpl = EMAIL_TEMPLATES[idx];
                          const selectEl = e.target;
                          showConfirm(
                            `Load the "${tmpl.name}" template? This will overwrite your current subject and HTML code.`,
                            () => {
                              setEmailSubject(tmpl.subject);
                              setEmailHtml(tmpl.html);
                              selectEl.value = "";
                            },
                            () => {
                              selectEl.value = "";
                            }
                          );
                        }
                      }}
                    >
                      <option value="">-- Choose Template --</option>
                      {EMAIL_TEMPLATES.map((tmpl, idx) => (
                        <option key={idx} value={idx}>{tmpl.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Email Color Palette Theme Selector */}
                  <div className="form-group" style={{ background: 'rgba(6, 182, 212, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#22d3ee', margin: 0 }}>
                      🎨 Choose Template Theme (Color Palette)
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                      {EMAIL_PALETTES.map((pal, idx) => {
                        const isSelected = emailPalette.name === pal.name;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEmailPalette(pal)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: isSelected ? '2px solid #22d3ee' : '1px solid rgba(255, 255, 255, 0.1)',
                              background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                              color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              transition: 'all 0.2s ease',
                              fontFamily: 'inherit'
                            }}
                          >
                            <span style={{ display: 'flex', gap: '2px' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: pal.primary }}></span>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: pal.secondary }}></span>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: pal.bg }}></span>
                            </span>
                            {pal.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Parameterized Details Editor */}
                  <div className="form-group" style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)', marginTop: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#4ade80', marginBottom: '12px' }}>
                      ✍️ Parameterized Details Editor (No HTML skills needed)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Company Name</label>
                        <input type="text" className="form-control" style={{ fontSize: '0.8rem', padding: '6px' }} value={paramCompanyName} onChange={(e) => setParamCompanyName(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Offer Heading</label>
                        <input type="text" className="form-control" style={{ fontSize: '0.8rem', padding: '6px' }} value={paramHeading} onChange={(e) => setParamHeading(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Coupon / Promo Code</label>
                        <input type="text" className="form-control" style={{ fontSize: '0.8rem', padding: '6px' }} value={paramPromoCode} onChange={(e) => setParamPromoCode(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CTA Button Text</label>
                        <input type="text" className="form-control" style={{ fontSize: '0.8rem', padding: '6px' }} value={paramCtaText} onChange={(e) => setParamCtaText(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CTA Button Link</label>
                      <input type="text" className="form-control" style={{ fontSize: '0.8rem', padding: '6px' }} value={paramCtaLink} onChange={(e) => setParamCtaLink(e.target.value)} />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Description / Main Content</label>
                      <textarea className="form-control" rows={3} style={{ fontSize: '0.8rem', padding: '6px', resize: 'vertical' }} value={paramDescription} onChange={(e) => setParamDescription(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Email Subject</label>
                    <input type="text" className="form-control" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                  </div>
                  
                  <div className="form-group">
                    <label>HTML Code</label>
                    <textarea className="form-control" style={{ minHeight: '220px', fontFamily: 'monospace', fontSize: '0.8rem' }} value={emailHtml} onChange={(e) => setEmailHtml(e.target.value)} />
                  </div>

                  {/* AI Template Customizer Redirect */}
                  <div className="form-group" style={{ background: 'rgba(168, 85, 247, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)', marginTop: '16px', marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#c084fc', margin: 0 }}>
                      🤖 AI Template Customizer
                    </label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 10px 0' }}>
                      Click any platform to copy code/prompts and launch the assistant to modify layouts.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleAiRedirect('Gemini')}
                        className="btn"
                        style={{ background: '#1e1b4b', border: '1px solid #4f46e5', color: '#e0e7ff', fontSize: '0.75rem', padding: '8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                      >
                        ✨ Gemini
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiRedirect('Claude')}
                        className="btn"
                        style={{ background: '#1c1917', border: '1px solid #d97706', color: '#fef3c7', fontSize: '0.75rem', padding: '8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                      >
                        🤎 Claude
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiRedirect('ChatGPT')}
                        className="btn"
                        style={{ background: '#022c22', border: '1px solid #059669', color: '#ecfdf5', fontSize: '0.75rem', padding: '8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                      >
                        💬 ChatGPT
                      </button>
                    </div>
                  </div>

                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={submitEmailCampaign}>
                    ✉️ Dispatch Campaign (Costs 1 Credit)
                  </button>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ marginBottom: '20px' }}>👁️ Preview Frame</h3>
                  <div style={{ flex: '1', minHeight: '300px', background: 'white', borderRadius: '4px', overflow: 'hidden' }}>
                    <iframe srcDoc={emailPreviewContent} style={{ width: '100%', height: '100%', border: 'none' }} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Sub-tab: CAMPAIGN LOG ── */}
            {marketingSubTab === 'logs' && (
              <div className="fade-in">
                {/* Summary Bar */}
                <div className="summary-bar">
                  <div className="summary-bar-item">
                    <span>📤</span>
                    <span className="count digital-text">{campaignsList.reduce((s, c) => s + (c.sent_count || 0), 0)}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>sent</span>
                  </div>
                  <div className="summary-bar-item">
                    <span>⏳</span>
                    <span className="count remaining-highlight">{campaignsList.reduce((s, c) => s + (c.total_count || 0) - (c.sent_count || 0), 0)}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>remaining</span>
                  </div>
                  <div className="summary-bar-item">
                    <span>❌</span>
                    <span className="count" style={{ color: 'var(--accent-red)', fontWeight: 900 }}>{campaignsList.reduce((s, c) => s + (c.failed_count || 0), 0)}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>failed</span>
                  </div>
                  <div className="summary-bar-item">
                    <span>📊</span>
                    <span className="count" style={{ color: 'var(--accent-blue)', fontWeight: 900 }}>{campaignsList.length}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>campaigns</span>
                  </div>
                </div>

                {/* Campaign Table */}
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <h4>📋 Campaign History</h4>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <div className="campaign-log-row header">
                      <div>#</div>
                      <div>Type</div>
                      <div>Status</div>
                      <div>Recipient Group</div>
                      <div>Sent</div>
                      <div>Failed</div>
                      <div>Remaining</div>
                      <div>Start</div>
                      <div>Date</div>
                    </div>
                    {campaignsList.map((c, index) => {
                      const remaining = (c.total_count || 0) - (c.sent_count || 0);
                      const percent = c.total_count > 0 ? Math.round((c.sent_count / c.total_count) * 100) : 0;
                      const isEmail = c.campaign_type === 'email';
                      return (
                        <React.Fragment key={c.id || index}>
                          <div className="campaign-log-row" onClick={() => loadCampaignDetailLogs(c.id)}>
                            <div style={{ color: 'var(--text-muted)' }}>{index + 1}</div>
                            <div style={{ fontWeight: 'bold', color: isEmail ? '#6366f1' : '#39ff14' }}>
                              {isEmail ? '✉️' : '💬'} {c.campaign_type?.toUpperCase()}
                            </div>
                            <div>
                              <span className={getStatusBadge(c.status)}>
                                <span className={`led-status ${c.status === 'running' ? 'running' : c.status === 'done' ? 'done' : 'failed'}`} style={{ width: '6px', height: '6px' }}></span>
                                {c.status?.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.recipient_group}</div>
                            <div>
                              <span className="digital-text">{c.sent_count || 0}</span>
                              <span style={{ color: 'var(--text-muted)' }}> / {c.total_count || 0}</span>
                            </div>
                            <div style={{ color: (c.failed_count || 0) > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                              {c.failed_count || 0}
                            </div>
                            <div className="remaining-highlight">{remaining}</div>
                            <div style={{ color: 'var(--text-muted)' }}>{c.start_row || 0}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{c.created_at}</div>
                          </div>
                          {/* Progress bar under each row */}
                          <div style={{ padding: '0 16px 8px 16px' }}>
                            <div className="progress-bar-container">
                              <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                          {/* Expandable detail logs */}
                          {expandedCampaignId === c.id && (
                            <div className="campaign-detail-expand">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  Campaign Logs — <code>{c.id}</code>
                                </span>
                                {c.status === 'running' && (
                                  <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); terminateCampaign(c.id); }}>Stop</button>
                                )}
                              </div>
                              <div className="terminal-box" style={{ height: '200px' }}>
                                {expandedCampaignLogs.map((log, li) => (
                                  <div key={li} className="terminal-line">{log}</div>
                                ))}
                                {expandedCampaignLogs.length === 0 && (
                                  <div style={{ color: 'var(--text-muted)', padding: '10px' }}>No logs available for this campaign.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {campaignsList.length === 0 && (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No campaigns found. Launch your first campaign from the WhatsApp or Email tab.
                      </div>
                    )}
                  </div>
                </div>

                {/* Day-wise Log Files */}
                <div className="card" style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4>📁 Day-wise Log Files</h4>
                    <select className="form-control" style={{ width: '200px' }} value={selectedLogDate} onChange={(e) => loadLogFileContent(e.target.value)}>
                      <option value="">-- Select Date --</option>
                      {logFilesList.map((lf, i) => (
                        <option key={i} value={lf.date}>{lf.date} ({(lf.size_bytes / 1024).toFixed(1)} KB)</option>
                      ))}
                    </select>
                  </div>
                  {logFileContent ? (
                    <div className="log-viewer">
                      {logFileContent.lines.map((line, i) => (
                        <div key={i} className="log-viewer-line">{line}</div>
                      ))}
                      {logFileContent.lines.length === 0 && (
                        <div style={{ color: 'var(--text-muted)' }}>Empty log file.</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px', fontSize: '0.85rem' }}>
                      Select a date above to view its campaign logs.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: ADMIN PANEL ══ */}
        {currentTab === 'admin' && (
          <div>
            <div className="tabs">
              <button className={`tab-btn ${adminSubTab === 'datasets' ? 'active' : ''}`} onClick={() => setAdminSubTab('datasets')}>📁 Manage Datasets</button>
              <button className={`tab-btn ${adminSubTab === 'users' ? 'active' : ''}`} onClick={() => { setAdminSubTab('users'); loadAdminUsers(); }}>👥 Customers & Credits</button>
            </div>

            {/* Pane: Manage Datasets */}
            {adminSubTab === 'datasets' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                <div className="card">
                  <h3 style={{ marginBottom: '20px' }}>📁 Datasets Catalog</h3>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Credits</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datasets.map(ds => (
                        <tr key={ds.id}>
                          <td><strong>{ds.name}</strong></td>
                          <td>{ds.category}</td>
                          <td>🪙 {ds.price_credits}</td>
                          <td>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteDataset(ds.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="card glowing-panel">
                  <h3 style={{ marginBottom: '20px' }}>📁 Upload New Dataset</h3>
                  <form onSubmit={handleAdminUploadSubmit}>
                    <div className="form-group">
                      <label>Dataset Name *</label>
                      <input type="text" className="form-control" value={uploadName} onChange={(e) => setUploadName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Category *</label>
                      <select className="form-control" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} required>
                        <option value="">-- Select Category --</option>
                        {categoriesList.map((cat, i) => (
                          <option key={i} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Unlock Pricing Credits *</label>
                      <input type="number" className="form-control" value={uploadPrice} onChange={(e) => setUploadPrice(e.target.value)} required />
                    </div>
                    
                    {/* Region dropdowns for Admin upload */}
                    <div className="form-group">
                      <label>Division</label>
                      <select className="form-control" value={uploadDiv} onChange={(e) => { setUploadDiv(e.target.value); setUploadDist(''); setUploadArea(''); }}>
                        <option value="">-- Select Division --</option>
                        {regionsConfig && Object.keys(regionsConfig).map((div, i) => (
                          <option key={i} value={div}>{div}</option>
                        ))}
                        <option value="Other">Other / Custom...</option>
                      </select>
                      {uploadDiv === 'Other' && (
                        <input type="text" className="form-control" style={{ marginTop: '8px' }} placeholder="Type division..." value={uploadDivCustom} onChange={(e) => setUploadDivCustom(e.target.value)} />
                      )}
                    </div>
                    <div className="form-group">
                      <label>District</label>
                      <select className="form-control" value={uploadDist} onChange={(e) => { setUploadDist(e.target.value); setUploadArea(''); }} disabled={!uploadDiv && uploadDiv !== 'Other'}>
                        <option value="">-- Select District --</option>
                        {regionsConfig && uploadDiv && regionsConfig[uploadDiv] && Object.keys(regionsConfig[uploadDiv]).map((dist, i) => (
                          <option key={i} value={dist}>{dist}</option>
                        ))}
                        <option value="Other">Other / Custom...</option>
                      </select>
                      {uploadDist === 'Other' && (
                        <input type="text" className="form-control" style={{ marginTop: '8px' }} placeholder="Type district..." value={uploadDistCustom} onChange={(e) => setUploadDistCustom(e.target.value)} />
                      )}
                    </div>
                    <div className="form-group">
                      <label>Area</label>
                      <select className="form-control" value={uploadArea} onChange={(e) => setUploadArea(e.target.value)} disabled={!uploadDist && uploadDist !== 'Other'}>
                        <option value="">-- Select Area --</option>
                        {regionsConfig && uploadDiv && uploadDist && regionsConfig[uploadDiv]?.[uploadDist] && regionsConfig[uploadDiv][uploadDist].map((area, i) => (
                          <option key={i} value={area}>{area}</option>
                        ))}
                        <option value="Other">Other / Custom...</option>
                      </select>
                      {uploadArea === 'Other' && (
                        <input type="text" className="form-control" style={{ marginTop: '8px' }} placeholder="Type area..." value={uploadAreaCustom} onChange={(e) => setUploadAreaCustom(e.target.value)} />
                      )}
                    </div>

                    <div className="form-group">
                      <label>Excel File *</label>
                      <input type="file" className="form-control" onChange={(e) => setUploadFile(e.target.files[0])} required />
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} type="submit">Upload Dataset</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: CUSTOMERS & CREDITS MANAGER ══ */}
        {(currentTab === 'users' || (currentTab === 'admin' && adminSubTab === 'users')) && user && user.role === 'admin' && (
          <div>
            <div className="card glowing-panel" style={{ borderColor: 'rgba(59, 130, 246, 0.5)', marginBottom: '25px' }}>
              <h2 style={{ marginBottom: '10px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                👥 Registered Customer Directory & Account Control
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                View all registered customers, control account permissions, ban/unban users, and instantly assign credits to their balance.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTAL REGISTERED</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{adminUsers.length}</div>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ACTIVE ACCOUNTS</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>{adminUsers.filter(u => u.is_banned !== 1).length}</div>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SUSPENDED / BANNED</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>{adminUsers.filter(u => u.is_banned === 1).length}</div>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTAL CREDITS IN CIRCULATION</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-amber)' }}>🪙 {adminUsers.reduce((sum, u) => sum + (u.credits || 0), 0)}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3>📋 Customer Account Control Table</h3>
                <button className="btn btn-secondary btn-sm" onClick={loadAdminUsers}>🔄 Refresh List</button>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer Info</th>
                    <th>Role (Control)</th>
                    <th>Credit Balance & Assign</th>
                    <th>Status</th>
                    <th>Account Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map(u => (
                    <tr key={u.id} style={{ background: u.is_banned === 1 ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                      <td><strong>#{u.id}</strong></td>
                      <td>
                        <div><strong>{u.full_name || 'No Name Provided'}</strong></div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                        {u.created_at && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joined: {u.created_at.split(' ')[0]}</div>}
                      </td>
                      <td>
                        <select
                          className="form-control"
                          style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem', background: u.role === 'admin' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', borderColor: u.role === 'admin' ? '#3b82f6' : 'var(--border-subtle)' }}
                          value={u.role}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="digital-text" style={{ fontSize: '1.1rem', minWidth: '70px', display: 'inline-block' }}>🪙 {u.credits}</span>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#22c55e', borderColor: '#22c55e' }}
                            onClick={() => handleQuickAddCredits(u.id, u.email, u.credits)}
                            title="Instantly add credits to this user's balance"
                          >
                            + Assign Credits
                          </button>
                        </div>
                      </td>
                      <td>
                        {u.is_banned === 1 ? (
                          <span className="led-status error" style={{ display: 'inline-block', marginRight: '6px' }}></span>
                        ) : (
                          <span className="led-status running" style={{ display: 'inline-block', marginRight: '6px' }}></span>
                        )}
                        <span style={{ fontWeight: 'bold', color: u.is_banned === 1 ? '#ef4444' : '#22c55e' }}>
                          {u.is_banned === 1 ? 'BANNED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className={`btn btn-sm ${u.is_banned === 1 ? 'btn-primary' : 'btn-danger'}`}
                            onClick={() => handleBanUser(u.id, false, "", u.is_banned)}
                          >
                            {u.is_banned === 1 ? '✅ Unban Account' : '🚫 Ban Account'}
                          </button>
                          <a
                            href={`mailto:${u.email}?subject=Important Notice Regarding Your DataBazaar Account`}
                            className="btn btn-secondary btn-sm"
                            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                          >
                            ✉️ Email Warning
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ TAB: SECURITY MODULE ══ */}
        {currentTab === 'security' && user && user.role === 'admin' && (
          <div>
            <div className="card glowing-panel" style={{ borderColor: 'rgba(239, 68, 68, 0.5)' }}>
              <h2 style={{ marginBottom: '10px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={24} /> Security Module
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>
                This dashboard logs attempts by users to screenshot data using keyboard shortcuts. Violators can be instantly banned by IP and Account.
              </p>
              
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Email</th>
                    <th>Violation Type</th>
                    <th>IP Address</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {adminViolations.map(v => (
                    <tr key={v.id}>
                      <td>{new Date(v.created_at).toLocaleString()}</td>
                      <td><strong>{v.email}</strong></td>
                      <td style={{ color: '#ef4444' }}>{v.violation_type}</td>
                      <td className="digital-text">{v.ip_address}</td>
                      <td>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => handleBanUser(v.user_id, true, v.ip_address, 0)}
                        >
                          Ban IP & Account
                        </button>
                        <a href={`mailto:${v.email}?subject=Security Violation Notice`} className="btn btn-secondary btn-sm" style={{ marginLeft: '8px' }}>
                          Email Warning
                        </a>
                      </td>
                    </tr>
                  ))}
                  {adminViolations.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <Shield size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
                        <br/>
                        No security violations logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ POPUP FORM: PROMOTE JOB ══ */}
        {promoteJobId && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
            <div className="card glowing-panel" style={{ width: '100%', maxWidth: '400px' }}>
              <h3 style={{ marginBottom: '20px' }}>📁 Promote Scraped Job to Catalog</h3>
              <form onSubmit={handlePromoteSubmit}>
                <div className="form-group">
                  <label>Dataset Name</label>
                  <input type="text" className="form-control" value={promoteName} onChange={(e) => setPromoteName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select className="form-control" value={promoteCategory} onChange={(e) => setPromoteCategory(e.target.value)} required>
                    <option value="">-- Choose Category --</option>
                    {categoriesList.map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                  <button className="btn btn-primary" type="submit" style={{ flex: '1' }}>Confirm Promote</button>
                  <button className="btn btn-secondary" type="button" onClick={() => setPromoteJobId(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Floating Toast Notification Panel */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} style={{ paddingBottom: t.onConfirm ? '18px' : '14px' }}>
            <span className="toast-icon" style={{ alignSelf: t.onConfirm ? 'flex-start' : 'center', marginTop: t.onConfirm ? '2px' : '0' }}>
              {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1' }}>
              <span className="toast-msg">{t.message}</span>
              {t.onConfirm && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '4px 10px', fontSize: '0.75rem', marginTop: '2px', background: 'var(--text-amber)', borderColor: 'var(--text-amber)', color: '#000000' }}
                    onClick={() => {
                      t.onConfirm();
                      setToasts(prev => prev.filter(x => x.id !== t.id));
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.75rem', marginTop: '2px' }}
                    onClick={() => {
                      if (t.onCancel) t.onCancel();
                      setToasts(prev => prev.filter(x => x.id !== t.id));
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <button className="toast-close" style={{ alignSelf: t.onConfirm ? 'flex-start' : 'center' }} onClick={() => {
              if (t.onCancel) t.onCancel();
              setToasts(prev => prev.filter(x => x.id !== t.id));
            }}>&times;</button>
            {!t.onConfirm && <div className="toast-progress"></div>}
          </div>
        ))}
      </div>
      </main>
    </div>
  );
}
