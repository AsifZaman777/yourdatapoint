import React, { useState, useEffect, useRef } from 'react';
import { EMAIL_TEMPLATES, EMAIL_PALETTES } from './emailTemplates';
import { WHATSAPP_TEMPLATES } from './whatsappTemplates';
import { TRANSLATIONS } from './translations';
import heroDashboardImg from './assets/hero_dashboard.png';
import bkashLogoImg from './assets/logo/bkash-logo.png';
import pathaoLogoImg from './assets/logo/pathao-pay.png';
import pathaoQrImg from './assets/QR/pathao-qr.jpg';
import {
  BarChart3,
  Database,
  Search,
  Mail,
  MessageSquare,
  Bot,
  Shield,
  ShieldAlert,
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
  MapPin,
  Check,
  Zap,
  Phone,
  Globe,
  ShieldCheck,
  Layers,
  Headphones,
  Clock,
  ChevronRight,
  HelpCircle,
  Briefcase,
  X,
  Info,
  Ban,
  UserCheck,
  UserX,
  QrCode,
  CreditCard,
  ShoppingCart,
  Copy,
  XCircle,
  Inbox,
  FileSpreadsheet,
  FolderKanban,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Eye,
  ChartBarBig
} from 'lucide-react';

const getApiBase = () => {
  const envBase = import.meta.env.VITE_API_BASE;
  const currentHost = window.location.hostname || '127.0.0.1';

  // If accessing on local machine (localhost or 127.0.0.1), route directly to local backend
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return 'http://127.0.0.1:8000';
  }

  // If VITE_API_BASE is explicitly set, use it for custom production/remote domains
  if (envBase) {
    return envBase.replace(/\/$/, '');
  }

  // Fallback to current network hostname on port 8000
  return `http://${currentHost}:8000`;
};
const API_BASE = getApiBase();
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'asifdev777@gmail.com';
const HOTLINE_PHONE = import.meta.env.VITE_HOTLINE_PHONE || '+880 1863443343';
const SUPPORT_HOURS = import.meta.env.VITE_SUPPORT_HOURS || '24/7 Automated System & Live WhatsApp Assistance';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTabState] = useState(() => {
    const saved = localStorage.getItem('currentTab');
    if (saved && saved !== 'home' && saved !== 'auth') return saved;
    return localStorage.getItem('token') ? 'catalog' : 'home';
  });

  const setCurrentTab = (tab) => {
    setCurrentTabState(tab);
    if (tab && tab !== 'home' && tab !== 'auth') {
      localStorage.setItem('currentTab', tab);
    }
  };

  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [authVerificationNotice, setAuthVerificationNotice] = useState('');
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Landing Page & Contact states
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [calcCredits, setCalcCredits] = useState(50);
  const [showLegalModal, setShowLegalModal] = useState(null); // null, 'privacy', 'terms'
  const [warningModalTarget, setWarningModalTarget] = useState(null); // null or { userId, userEmail }
  const [warningType, setWarningType] = useState('Important Information');
  const [warningMsgInput, setWarningMsgInput] = useState('');
  const [securityAlertModal, setSecurityAlertModal] = useState(null); // null or { violationType, time }

  // Scraper Rate Limit 2-minute cooldown timer state
  const [scrapeRateLimit, setScrapeRateLimit] = useState(() => {
    const until = localStorage.getItem('scrapeRateLimitUntil');
    if (until) {
      const remaining = Math.ceil((parseInt(until, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  useEffect(() => {
    let timerId = null;
    if (scrapeRateLimit > 0) {
      timerId = setInterval(() => {
        setScrapeRateLimit((prev) => {
          if (prev <= 1) {
            localStorage.removeItem('scrapeRateLimitUntil');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [scrapeRateLimit]);

  // Dataset Requests Portal states
  const [reqCategoryTags, setReqCategoryTags] = useState([]);
  const [reqCategoryInput, setReqCategoryInput] = useState('');
  const [reqDivision, setReqDivision] = useState('');
  const [reqDistrict, setReqDistrict] = useState('');
  const [reqArea, setReqArea] = useState('');
  const [reqDivisionCustom, setReqDivisionCustom] = useState('');
  const [reqDistrictCustom, setReqDistrictCustom] = useState('');
  const [reqAreaCustom, setReqAreaCustom] = useState('');
  const [reqBusinessName, setReqBusinessName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [myDatasetRequests, setMyDatasetRequests] = useState([]);
  const [adminDatasetRequests, setAdminDatasetRequests] = useState([]);
  const [submittingReq, setSubmittingReq] = useState(false);
  const [requestActionModal, setRequestActionModal] = useState(null);
  const [requestNotifyChannel, setRequestNotifyChannel] = useState('email');
  const [requestCustomMsg, setRequestCustomMsg] = useState('');
  const [updatingReqStatus, setUpdatingReqStatus] = useState(false);

  // Auto-verify email token from URL query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verify_token');
    if (verifyToken) {
      const doVerify = async () => {
        const tokenParam = encodeURIComponent(verifyToken.trim());
        const primaryUrl = `${API_BASE}/api/auth/verify-email?token=${tokenParam}`;
        const host = window.location.hostname || '127.0.0.1';
        const fallbackUrl = `http://${host}:8000/api/auth/verify-email?token=${tokenParam}`;

        try {
          let res = await fetch(primaryUrl).catch(() => null);
          if (!res) {
            res = await fetch(fallbackUrl).catch(() => null);
          }
          if (!res) {
            showToast('Failed to connect to verification server. Please check backend status.', 'error');
            return;
          }
          const data = await res.json();
          if (data.success) {
            showToast(data.message || 'Email verified successfully! You can now log in.', 'success');
            setCurrentTab('auth');
            setAuthView('login');
          } else {
            showToast(data.message || data.detail || 'This verification link is invalid or has already been used.', 'warning');
            setCurrentTab('auth');
            setAuthView('login');
          }
        } catch (err) {
          console.error('Email verification error:', err);
          showToast('Failed to connect to verification server.', 'error');
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      doVerify();
    }
  }, []);

  // 🛡️ Comprehensive Multi-Sensor Screenshot & Snipping Tool Anti-Leak Security Tracker
  useEffect(() => {
    let isMetaPressed = false;
    let isShiftPressed = false;
    let isCtrlPressed = false;
    let lastLoggedTime = 0;

    const logViolation = (type) => {
      const now = Date.now();
      if (now - lastLoggedTime < 800) return;
      lastLoggedTime = now;

      console.warn('🚨 SECURITY SENSOR: Screenshot attempt intercepted:', type);

      setSecurityAlertModal({
        violationType: type,
        time: new Date().toLocaleTimeString()
      });

      showToast(`⚠️ Screenshot Attempt Intercepted (${type})! User IP logged to Security Module.`, 'warning');

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch(`${API_BASE}/api/security/log-violation`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ violation_type: type })
      })
        .then(res => res.json())
        .then(d => {
          console.log('[SECURITY LOG ACKNOWLEDGED]', d);
          // Refresh security violations list for admin
          if (token) {
            fetch(`${API_BASE}/api/admin/violations`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
              .then(r => r.json())
              .then(data => setAdminViolations(Array.isArray(data) ? data : []))
              .catch(() => { });
          }
        })
        .catch(e => console.error('[SECURITY LOG ERROR]', e));
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Meta' || e.key === 'OS' || e.key === 'Win') isMetaPressed = true;
      if (e.key === 'Shift') isShiftPressed = true;
      if (e.key === 'Control') isCtrlPressed = true;

      const rawKey = e.key || '';
      const rawCode = e.code || '';
      const keyLower = rawKey.toLowerCase();
      const codeLower = rawCode.toLowerCase();

      let screenshotType = '';

      // 1. PrintScreen key
      if (keyLower === 'printscreen' || codeLower === 'printscreen' || keyLower === 'prtscn' || rawKey === 'PrintScreen') {
        screenshotType = 'PrintScreen Key (PrtScn / Win+PrtScn)';
      }

      // 2. Win / Cmd + Shift + S
      else if ((e.metaKey || isMetaPressed || e.ctrlKey) && (e.shiftKey || isShiftPressed) && (keyLower === 's' || codeLower === 'keys')) {
        screenshotType = 'Snipping Tool (Win/Cmd + Shift + S)';
      }

      // 3. Cmd / Win + Shift + ANY KEY (Catch Cmd+Shift+3/4/5 and all OS screenshot bindings)
      else if ((e.metaKey || isMetaPressed) && (e.shiftKey || isShiftPressed)) {
        screenshotType = `macOS / OS Screenshot (Cmd/Win + Shift + ${rawKey || rawCode})`;
      }

      if (screenshotType) {
        logViolation(screenshotType);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Meta' || e.key === 'OS' || e.key === 'Win') isMetaPressed = false;
      if (e.key === 'Shift') isShiftPressed = false;
      if (e.key === 'Control') isCtrlPressed = false;

      const keyLower = (e.key || '').toLowerCase();
      const codeLower = (e.code || '').toLowerCase();
      if (keyLower === 'printscreen' || codeLower === 'printscreen' || keyLower === 'prtscn') {
        logViolation("PrintScreen Key Release");
      }
    };

    // 4. WINDOW BLUR SENSOR (Fires when OS Snipping tool overlay or macOS screenshot crosshair grabs focus!)
    const handleWindowBlur = () => {
      if ((isMetaPressed || isCtrlPressed) && isShiftPressed) {
        logViolation("OS Screenshot Overlay Focus Grab (Cmd/Win + Shift)");
      }
    };

    // 5. VISIBILITY CHANGE SENSOR (Fires when screen capture overlays blur document visibility)
    const handleVisibilityChange = () => {
      if (document.hidden && (isMetaPressed || isShiftPressed)) {
        logViolation("Screen Capture Hidden Tab State (Cmd/Win + Shift)");
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);

  // Region configuration from backend
  const [regionsConfig, setRegionsConfig] = useState(null);
  const [categoriesList, setCategoriesList] = useState([]);
  const [contactConfig, setContactConfig] = useState(null);

  // Auth Form states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  // Contact form submission via WhatsApp link
  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) {
      showToast('Please fill in all required contact fields.', 'warning');
      return;
    }

    const cleanWaNumber = HOTLINE_PHONE.replace(/[^0-9]/g, '');
    const waMsg = `Hi MarketingOstad Support,\n\n*Name:* ${contactName}\n*Email:* ${contactEmail}\n*Phone:* ${contactPhone || 'N/A'}\n*Subject:* ${contactSubject || 'General Inquiry'}\n\n*Message:*\n${contactMessage}`;
    const waUrl = `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(waMsg)}`;

    showToast('Opening WhatsApp support chat with your message...', 'success');
    setTimeout(() => {
      window.open(waUrl, '_blank');
    }, 600);

    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setContactSubject('');
    setContactMessage('');
  };

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
  const [catalogTab, setCatalogTab] = useState('public'); // 'public' or 'private'

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
  const [scraperSubTab, setScraperSubTab] = useState('console'); // 'console' or 'requests'
  const scraperTerminalRef = useRef(null);
  // Payment Module states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState({ bkash_number: '', bkash_account_type: '', bkash_qr_url: '', pathao_number: '', pathao_account_type: '', pathao_qr_url: '', packages: [] });
  const [paymentPackages, setPaymentPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [customCredits, setCustomCredits] = useState(100);
  const [myPaymentRequests, setMyPaymentRequests] = useState([]);
  const [adminPaymentRequests, setAdminPaymentRequests] = useState([]);
  const [paymentModalTab, setPaymentModalTab] = useState('buy'); // 'buy' or 'history'

  // Admin Payment Settings States
  const [adminBkashNumber, setAdminBkashNumber] = useState('');
  const [adminBkashAccountType, setAdminBkashAccountType] = useState('');
  const [adminBkashQrFile, setAdminBkashQrFile] = useState(null);
  const [adminPathaoNumber, setAdminPathaoNumber] = useState('');
  const [adminPathaoAccountType, setAdminPathaoAccountType] = useState('');
  const [adminPathaoQrFile, setAdminPathaoQrFile] = useState(null);

  // Stepped Payment Wizard States
  const [paymentStep, setPaymentStep] = useState(1); // 1: Package & Method, 2: Pay & QR, 3: Details & TrxID, 4: Admin Approval
  const [selectedMethod, setSelectedMethod] = useState('bkash'); // 'bkash' or 'pathao_pay'
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [refUserName, setRefUserName] = useState('');
  const [refUserEmail, setRefUserEmail] = useState('');
  const [refUserPhone, setRefUserPhone] = useState('');
  const [refTrxId, setRefTrxId] = useState('');

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
  const [confirmModal, setConfirmModal] = useState(null);

  const showConfirm = (message, onConfirm, onCancel = null, title = "Confirmation Needed") => {
    setConfirmModal({
      title,
      message,
      inputConfig: null,
      onConfirm: () => {
        setConfirmModal(null);
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setConfirmModal(null);
        if (onCancel) onCancel();
      }
    });
  };

  const showPrompt = (title, message, defaultValue, onConfirm, inputType = "text") => {
    setConfirmModal({
      title,
      message,
      inputConfig: { defaultValue, type: inputType },
      onConfirm: (val) => {
        setConfirmModal(null);
        if (onConfirm) onConfirm(val);
      },
      onCancel: () => {
        setConfirmModal(null);
      }
    });
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
  const [paramCompanyName, setParamCompanyName] = useState('MarketingOstad Promo');
  const [paramHeading, setParamHeading] = useState('Save 25% Sitewide');
  const [paramPromoCode, setParamPromoCode] = useState('SAVE25');
  const [paramCtaText, setParamCtaText] = useState('Get Started');
  const [paramCtaLink, setParamCtaLink] = useState('https://marketingostad.com');
  const [paramDescription, setParamDescription] = useState('We discovered your details and wanted to offer our premium services.');

  // Admin Dashboard states
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminAddCreditsUserId, setAdminAddCreditsUserId] = useState('');
  const [adminAddCreditsAmount, setAdminAddCreditsAmount] = useState(10);
  const [promoteJobId, setPromoteJobId] = useState(null);
  const [promoteName, setPromoteName] = useState('');
  const [promoteCategory, setPromoteCategory] = useState('');
  const [adminPromotionRequests, setAdminPromotionRequests] = useState([]);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadPrice, setUploadPrice] = useState(10);
  const [uploadDiv, setUploadDiv] = useState('');
  const [uploadDist, setUploadDist] = useState('');
  const [uploadArea, setUploadArea] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  // General campaigns list
  const [campaignsList, setCampaignsList] = useState([]);

  // Granular lead selection state
  const [groupContacts, setGroupContacts] = useState([]);
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactSelectorModal, setShowContactSelectorModal] = useState(false);

  const loadRecipientContacts = async (groupVal) => {
    if (!groupVal) {
      setGroupContacts([]);
      setSelectedContactIds(new Set());
      return;
    }
    setLoadingContacts(true);
    try {
      const res = await fetch(`${API_BASE}/api/marketing/recipient-contacts?recipient_group=${groupVal}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.contacts) {
        setGroupContacts(data.contacts);
        setSelectedContactIds(new Set(data.contacts.map(c => c.id)));
      } else {
        setGroupContacts([]);
        setSelectedContactIds(new Set());
      }
    } catch {
      setGroupContacts([]);
      setSelectedContactIds(new Set());
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (waRecipientGroup) loadRecipientContacts(waRecipientGroup);
  }, [waRecipientGroup]);

  useEffect(() => {
    if (emailRecipientGroup) loadRecipientContacts(emailRecipientGroup);
  }, [emailRecipientGroup]);

  // Admin sub-tab
  const [adminSubTab, setAdminSubTab] = useState('datasets');
  const [adminViolations, setAdminViolations] = useState([]);
  const loadAdminViolations = () => {
    if (!token) return;
    fetch(`${API_BASE}/api/admin/violations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setAdminViolations(d);
        } else {
          console.error('[VIOLATIONS FETCH ERROR]', d);
          setAdminViolations([]);
        }
      })
      .catch(e => console.error('[VIOLATIONS NETWORK ERROR]', e));
  };

  const handleSeedSecurityLog = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/violations/seed-test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Sample security violation logs inserted.', 'success');
        loadAdminViolations();
      }
    } catch {
      showToast('Error seeding security logs.', 'error');
    }
  };

  const handleBanUser = async (userId, banIp, ipAddress, currentBanStatus) => {
    const isBanning = currentBanStatus !== 1;
    showConfirm(
      `Are you sure you want to ${isBanning ? 'BAN' : 'UNBAN'} user #${userId}?`,
      async () => {
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
          if (res.ok) {
            showToast(isBanning ? 'User has been banned.' : 'User has been unbanned.', 'success');
            loadAdminUsers();
            if (typeof loadAdminViolations === 'function') loadAdminViolations();
          }
        } catch (e) {
          showToast('Error updating ban status', 'error');
        }
      }
    );
  };

  const handleUnregisterUser = async (userId, userEmail) => {
    if (user && user.id === userId) {
      showToast('You cannot unregister your own active admin account.', 'error');
      return;
    }
    showConfirm(
      `⚠️ CRITICAL WARNING: Are you sure you want to PERMANENTLY UNREGISTER user #${userId} (${userEmail})?\n\nThis will HARD DELETE the user account and all associated data permanently from the database!`,
      async () => {
        try {
          const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(`User #${userId} (${userEmail}) permanently deleted from database.`, 'success');
            loadAdminUsers();
            if (typeof loadAdminViolations === 'function') loadAdminViolations();
          } else {
            showToast(data.detail || 'Failed to unregister user.', 'error');
          }
        } catch {
          showToast('Error unregistering user.', 'error');
        }
      }
    );
  };

  const openWarningModal = (userId, userEmail, currentWarning) => {
    setWarningModalTarget({ userId, userEmail });
    setWarningMsgInput(currentWarning || '');
    setWarningType('Important Information');
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    showConfirm(
      `Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`,
      async () => {
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
          showToast('Error updating user role.', 'error');
        }
      }
    );
  };

  const handleQuickAddCredits = (userId, userEmail, currentCredits) => {
    showPrompt(
      "Assign Customer Credits",
      `Assign credits to ${userEmail}\nCurrent balance: ${currentCredits} credits\n\nEnter amount to add (e.g. 50 or 100):`,
      "50",
      async (amountStr) => {
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
      },
      "number"
    );
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
    loadPaymentConfig();
    if (user) {
      loadJobs();
      checkWhatsAppStatus();
      loadCampaigns();
      loadDashboardStats();
      loadMyPaymentRequests();
      if (user && (user.role === 'admin' || user.role === 'superadmin')) {
        loadAdminUsers();
        loadAdminViolations();
        loadAdminPromotionRequests();
        loadAdminPaymentRequests();
      }
    }
  }, [user]);

  // Auto-reload admin violations when switching to security tab
  useEffect(() => {
    if (currentTab === 'security' && user && (user.role === 'admin' || user.role === 'superadmin')) {
      loadAdminViolations();
      loadAdminUsers();
    }
  }, [currentTab, user]);

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
        } catch { }
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
      if (data.contacts) setContactConfig(data.contacts);
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
        setCurrentTabState(prev => {
          if (prev === 'home' || prev === 'auth') {
            const saved = localStorage.getItem('currentTab');
            return (saved && saved !== 'home' && saved !== 'auth') ? saved : 'catalog';
          }
          return prev;
        });
      } else {
        setToken('');
        localStorage.removeItem('token');
        localStorage.removeItem('currentTab');
      }
    } catch {
      setToken('');
      localStorage.removeItem('token');
      localStorage.removeItem('currentTab');
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
    if (scrapeRateLimit > 0) {
      showToast(`Rate limit cooldown active. Please wait ${scrapeRateLimit}s before launching another job.`, 'warning');
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

        // Start 2-minute rate limit timer
        const until = Date.now() + 120000;
        localStorage.setItem('scrapeRateLimitUntil', until.toString());
        setScrapeRateLimit(120);

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

  // Dataset Requests Handlers
  const loadMyDatasetRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/requests/my-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyDatasetRequests(data);
      }
    } catch {
      // silent
    }
  };

  const loadAdminDatasetRequests = async () => {
    if (!token || !user || (user.role !== 'admin' && user.role !== 'superadmin')) return;
    try {
      const res = await fetch(`${API_BASE}/api/requests/admin/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminDatasetRequests(data);
      }
    } catch {
      // silent
    }
  };

  const handleSubmitDatasetRequest = async (e) => {
    e.preventDefault();
    if (!token) {
      showToast('Please login to submit a dataset request.', 'warning');
      return;
    }

    const allQueries = [...reqCategoryTags];
    if (reqCategoryInput.trim() && !allQueries.includes(reqCategoryInput.trim())) {
      allQueries.push(reqCategoryInput.trim());
    }

    if (allQueries.length === 0) {
      showToast('Please add at least one query tag for required data.', 'warning');
      return;
    }
    if (!reqPhone.trim()) {
      showToast('Please enter your contact phone number.', 'warning');
      return;
    }

    const categoryQueryString = allQueries.join(', ');
    setSubmittingReq(true);
    const finalDiv = reqDivision === 'Other' ? reqDivisionCustom : reqDivision;
    const finalDist = reqDistrict === 'Other' ? reqDistrictCustom : reqDistrict;
    const finalArea = reqArea === 'Other' ? reqAreaCustom : reqArea;

    try {
      const res = await fetch(`${API_BASE}/api/requests/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category_query: categoryQueryString,
          division: finalDiv,
          district: finalDist,
          area: finalArea,
          business_name: reqBusinessName.trim(),
          phone: reqPhone.trim(),
          additional_notes: reqNotes.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Dataset request submitted successfully!', 'success');
        setReqCategoryTags([]);
        setReqCategoryInput('');
        setReqDivision('');
        setReqDistrict('');
        setReqArea('');
        setReqDivisionCustom('');
        setReqDistrictCustom('');
        setReqAreaCustom('');
        setReqBusinessName('');
        setReqPhone('');
        setReqNotes('');
        loadMyDatasetRequests();
      } else {
        showToast(data.detail || 'Failed to submit dataset request.', 'error');
      }
    } catch {
      showToast('Error connecting to dataset request portal.', 'error');
    } finally {
      setSubmittingReq(false);
    }
  };

  const openRequestActionModal = (req, targetStatus) => {
    const loc = [req.division, req.district, req.area].filter(Boolean).join(', ') || 'Bangladesh';
    const defaultMsg = targetStatus === 'fulfilled'
      ? `Hello ${req.full_name || 'Valued Customer'},\n\nGreat news! Your dataset request for "${req.category_query}" in ${loc} has been successfully fulfilled!\n\nYou can now access and download this dataset directly from the Public Catalog on yourdatapoint.com.\n\nThank you for choosing MarketingOstad!`
      : `Hello ${req.full_name || 'Valued Customer'},\n\nThank you for submitting your dataset request for "${req.category_query}". Unfortunately, we are unable to fulfill this request at this time because we could not extract enough lead data for this area.\n\nPlease feel free to contact support or submit a new request on yourdatapoint.com.`;

    setRequestCustomMsg(defaultMsg);
    setRequestNotifyChannel('email');
    setRequestActionModal({ request: req, targetStatus });
  };

  const handleConfirmRequestAction = async () => {
    if (!requestActionModal || !token) return;
    const { request, targetStatus } = requestActionModal;

    setUpdatingReqStatus(true);
    try {
      const res = await fetch(`${API_BASE}/api/requests/admin/${request.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: targetStatus,
          admin_notes: requestNotifyChannel !== 'none' ? `Notification sent via ${requestNotifyChannel}` : 'Status updated quietly',
          notify_channel: requestNotifyChannel,
          custom_message: requestCustomMsg
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Request #${request.id} status updated to ${targetStatus}!`, 'success');

        // If fulfill, pre-fill scraper form parameters
        if (targetStatus === 'fulfilled') {
          const parsedQueries = request.category_query.split(',').map(q => q.trim()).filter(Boolean);
          setScrapeQueries(parsedQueries.length > 0 ? parsedQueries : [request.category_query]);
          setScrapeDiv(request.division || '');
          setScrapeDist(request.district || '');
          setScrapeArea(request.area || '');
          setScraperSubTab('console');
        }

        setRequestActionModal(null);
        loadAdminDatasetRequests();
      } else {
        showToast(data.detail || 'Failed to update request status.', 'error');
      }
    } catch {
      showToast('Error updating dataset request.', 'error');
    } finally {
      setUpdatingReqStatus(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'scraper') {
      loadMyDatasetRequests();
      loadJobs();
      if (user && (user.role === 'admin' || user.role === 'superadmin')) {
        loadAdminDatasetRequests();
      }
    }
  }, [currentTab, token, user]);

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
    } catch { }
  };

  const handleDeleteJob = async (jobId, jobQuery) => {
    showConfirm(`Are you sure you want to delete scrape job "${jobQuery || 'Dataset #' + jobId}"?`, async () => {
      try {
        const res = await fetch(`${API_BASE}/api/scraper/jobs/${jobId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          showToast(data.message || 'Scrape job deleted successfully.', 'success');
          loadJobs();
        } else {
          showToast(data.detail || 'Failed to delete job.', 'error');
        }
      } catch {
        showToast('Error deleting scrape job.', 'error');
      }
    });
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

  const startWaStatusPolling = () => {
    let polls = 0;
    const pollTimer = setInterval(async () => {
      polls += 1;
      await checkWhatsAppStatus();
      if (polls > 30) clearInterval(pollTimer);
    }, 3000);
  };

  // Scan WhatsApp session
  const setupWhatsAppSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/marketing/whatsapp-setup-session`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      showToast(data.message, 'info');
      startWaStatusPolling();
    } catch {
      showToast('Connection failed.', 'error');
    }
  };

  // Reset WhatsApp session & scan new account
  const resetWhatsAppSession = async () => {
    showConfirm(
      'Are you sure you want to disconnect the current WhatsApp session and connect a new WhatsApp number? This will clear saved session data.',
      async () => {
        try {
          const res = await fetch(`${API_BASE}/api/marketing/whatsapp-reset-session`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          showToast(data.message || 'WhatsApp session reset. Please scan the QR code in the browser window.', 'info');
          startWaStatusPolling();
        } catch {
          showToast('Failed to reset WhatsApp session.', 'error');
        }
      }
    );
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
    } catch { }
  };

  const triggerWhatsAppCampaign = async (recipientGroupVal = waRecipientGroup, resume = false) => {
    if (!recipientGroupVal) {
      showToast('Please choose a recipient group first.', 'warning');
      return;
    }
    const selectedList = groupContacts.filter(c => selectedContactIds.has(c.id)).map(c => ({ phone: c.phone, name: c.name }));
    if (groupContacts.length > 0 && selectedList.length === 0) {
      showToast('Please select at least 1 contact to send.', 'warning');
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
          start_row: waStartRow > 0 ? waStartRow : null,
          selected_contacts: selectedList.length > 0 && selectedList.length < groupContacts.length ? selectedList : null
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
      } catch { }
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
    } catch { }
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
    } catch { }
  };

  // Load log files list
  const loadLogFiles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/marketing/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setLogFilesList(data);
    } catch { }
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
    } catch { }
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
    } catch { }
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

    const selectedList = groupContacts.filter(c => selectedContactIds.has(c.id)).map(c => ({ email: c.email, name: c.name }));
    if (groupContacts.length > 0 && selectedList.length === 0) {
      showToast('Please select at least 1 contact to send emails to.', 'warning');
      return;
    }

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
          html_code: resolvedHtml,
          selected_contacts: selectedList.length > 0 && selectedList.length < groupContacts.length ? selectedList : null
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
    } catch { }
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

  // Promote / Request Promote scrape results
  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', promoteName);
    formData.append('category', promoteCategory);

    try {
      const res = await fetch(`${API_BASE}/api/scraper/jobs/${promoteJobId}/request-promote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Promotion request processed successfully!', 'success');
        setPromoteJobId(null);
        loadDatasets();
        loadJobs();
        loadAdminPromotionRequests();
      } else {
        showToast(data.detail || 'Promotion failed.', 'error');
      }
    } catch {
      showToast('Error submitting promotion request.', 'error');
    }
  };

  const loadAdminPromotionRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/promotion-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setAdminPromotionRequests(data);
    } catch { }
  };

  const approvePromotionRequest = async (jobId) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/promotion-requests/${jobId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Promotion request approved & dataset published!', 'success');
        loadAdminPromotionRequests();
        loadDatasets();
        loadJobs();
      } else {
        showToast(data.detail || 'Approval failed.', 'error');
      }
    } catch {
      showToast('Error approving promotion request.', 'error');
    }
  };

  const rejectPromotionRequest = async (jobId) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/promotion-requests/${jobId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Promotion request rejected.', 'info');
        loadAdminPromotionRequests();
        loadJobs();
      } else {
        showToast(data.detail || 'Rejection failed.', 'error');
      }
    } catch {
      showToast('Error rejecting request.', 'error');
    }
  };

  // Payment API Loaders & Handlers
  const loadPaymentConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payments/packages-config`);
      const data = await res.json();
      if (res.ok) {
        setPaymentConfig(data);
        if (data.packages && Array.isArray(data.packages)) {
          setPaymentPackages(data.packages);
        }
        setAdminBkashNumber(data.bkash_number || '');
        setAdminBkashAccountType(data.bkash_account_type || '');
        setAdminPathaoNumber(data.pathao_number || '');
        setAdminPathaoAccountType(data.pathao_account_type || '');
      }
    } catch { }
  };

  const handleSavePaymentSettings = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('bkash_number', adminBkashNumber);
    formData.append('bkash_account_type', adminBkashAccountType);
    formData.append('pathao_number', adminPathaoNumber);
    formData.append('pathao_account_type', adminPathaoAccountType);
    if (adminBkashQrFile) formData.append('bkash_qr_file', adminBkashQrFile);
    if (adminPathaoQrFile) formData.append('pathao_qr_file', adminPathaoQrFile);

    try {
      const res = await fetch(`${API_BASE}/api/admin/payment-settings`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Payment gateway settings saved successfully!', 'success');
        loadPaymentConfig();
      } else {
        showToast(data.detail || 'Failed to save payment gateway settings.', 'error');
      }
    } catch {
      showToast('Error saving payment settings.', 'error');
    }
  };

  const loadMyPaymentRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/payments/my-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setMyPaymentRequests(data);
    } catch { }
  };

  const loadAdminPaymentRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/payment-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setAdminPaymentRequests(data);
    } catch { }
  };

  const handlePaymentSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!refUserPhone || !refTrxId) {
      showToast('Please enter your Sender Phone Number and Transaction ID (TrxID).', 'warning');
      return;
    }

    let pkgName = paymentConfig?.custom_package?.name || 'Custom Credit Pack';
    let creds = parseInt(customCredits) || 50;
    let bdt = creds * (paymentConfig?.custom_package?.price_per_credit_bdt || 10);

    if (selectedPackage && selectedPackage !== 'custom') {
      pkgName = selectedPackage.name;
      creds = selectedPackage.credits;
      bdt = selectedPackage.price_bdt;
    }

    try {
      const res = await fetch(`${API_BASE}/api/payments/submit-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          package_name: pkgName,
          credits_requested: creds,
          amount_bdt: bdt,
          payment_method: selectedMethod,
          user_name: refUserName || user?.full_name || user?.email,
          bkash_number: refUserPhone,
          transaction_id: refTrxId
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Payment proof submitted! Moving to verification step.', 'success');
        setPaymentStep(4);
        loadMyPaymentRequests();
      } else {
        showToast(data.detail || 'Submission failed.', 'error');
      }
    } catch {
      showToast('Error submitting payment proof.', 'error');
    }
  };

  const approveAdminPayment = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/payment-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Payment approved & credits added!', 'success');
        loadAdminPaymentRequests();
        loadAdminUsers();
        fetchUserProfile();
      } else {
        showToast(data.detail || 'Approval failed.', 'error');
      }
    } catch {
      showToast('Error approving payment.', 'error');
    }
  };

  const rejectAdminPayment = async (requestId) => {
    showPrompt(
      "Reject Payment Request",
      "Specify rejection reason for customer (e.g., Invalid TrxID or Amount mismatch):",
      "Transaction ID mismatch or invalid payment",
      async (reason) => {
        if (!reason) return;
        const formData = new FormData();
        formData.append('rejection_reason', reason);

        try {
          const res = await fetch(`${API_BASE}/api/admin/payment-requests/${requestId}/reject`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          const data = await res.json();
          if (res.ok) {
            showToast('Payment request rejected.', 'info');
            loadAdminPaymentRequests();
          } else {
            showToast(data.detail || 'Rejection failed.', 'error');
          }
        } catch {
          showToast('Error rejecting payment.', 'error');
        }
      }
    );
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
      } catch { }
    });
  };

  // Auth Handler
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthVerificationNotice('');
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
        if (authView === 'register') {
          showToast(data.message || 'Account created! Please check your email for the verification link.', 'success');
          setAuthVerificationNotice(data.message || 'Account created! Check your email for the activation link.');
          setAuthView('login');
        } else {
          setToken(data.token);
          setUser(data.user);
          if (data.user && data.user.role === 'admin') {
            setCurrentTab('admin');
            setAdminSubTab('datasets');
          } else {
            setCurrentTab('home');
          }
        }
      } else {
        setAuthError(data.detail || 'Authentication failed.');
      }
    } catch {
      setAuthError('Connection server failure.');
    }
  };

  const handleResendVerificationLink = async () => {
    if (!authEmail) {
      showToast('Please enter your email address first.', 'warning');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Verification link sent to your email address!', 'success');
        setAuthVerificationNotice(data.message);
      } else {
        showToast(data.detail || 'Failed to resend verification link.', 'error');
      }
    } catch {
      showToast('Connection error.', 'error');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('currentTab');
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

  // Helper renderer for legal modal
  const renderLegalModal = () => {
    if (!showLegalModal) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
        <div className="card glowing-panel" style={{ width: '100%', maxWidth: '650px', maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '15px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
              <Shield size={20} style={{ color: '#06b6d4' }} /> {showLegalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowLegalModal(null)}><X size={16} /></button>
          </div>

          {showLegalModal === 'privacy' ? (
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '12px' }}><strong>1. Data Protection:</strong> MarketingOstad respects user privacy. User emails and registration details are securely managed.</p>
              <p style={{ marginBottom: '12px' }}><strong>2. Anti-Scraping Security:</strong> Browsing patterns and screenshot key combinations are logged strictly for security enforcement and anti-piracy protection.</p>
              <p style={{ marginBottom: '12px' }}><strong>3. Third-party Sharing:</strong> We never sell user credential data to third-party advertisers.</p>
            </div>
          ) : (
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '12px' }}><strong>1. Terms of Use:</strong> Users must verify their email link before accessing the platform. Misuse of scraped data is strictly prohibited.</p>
              <p style={{ marginBottom: '12px' }}><strong>2. Credit Policy:</strong> Admin-uploaded default datasets are 0 Credits (FREE). Custom scraper runs and marketing dispatches consume credits based on selected packages.</p>
            </div>
          )}

          <div style={{ marginTop: '24px', textAlign: 'right' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowLegalModal(null)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  const renderWarningModal = () => {
    if (!warningModalTarget) return null;

    const handleSaveWarning = async (messageToSave) => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/users/${warningModalTarget.userId}/warning`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ warning_message: messageToSave })
        });
        const data = await res.json();
        if (res.ok) {
          showToast(messageToSave ? `Application warning issued to ${warningModalTarget.userEmail}!` : `Warning cleared for ${warningModalTarget.userEmail}.`, 'success');
          loadAdminUsers();
          setWarningModalTarget(null);
        } else {
          showToast(data.detail || 'Failed to update warning message.', 'error');
        }
      } catch {
        showToast('Network error updating warning message.', 'error');
      }
    };

    return (
      <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>
        <div className="modal-content card" style={{ maxWidth: '580px', width: '92%', border: '1px solid #ffb000', padding: '28px', borderRadius: '12px', background: '#0a0e17' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <h3 style={{ color: '#ffb000', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
              <AlertTriangle size={20} /> Issue Application Warning Notice
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setWarningModalTarget(null)} style={{ border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
          </div>

          <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Target Customer: <strong style={{ color: '#fff' }}>{warningModalTarget.userEmail}</strong> (ID #{warningModalTarget.userId})
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#fff' }}>Warning Notice Category:</label>
            <select
              className="form-control"
              value={warningType}
              onChange={(e) => setWarningType(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="Important Information">ℹ️ Important Information / Action Required</option>
              <option value="Account Audit Warning">⚠️ Account Audit Warning / Security Verification</option>
              <option value="Billing & Credit Policy">💳 Billing & Credit Policy Notice</option>
              <option value="Security Alert">🚨 Security Alert / Suspicious Activity Warning</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#fff' }}>Quick Presets (1-Click Insert):</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                onClick={() => setWarningMsgInput(`[${warningType}] Important: Please verify your account information within 24 hours to maintain uninterrupted access.`)}
              >
                Insert Verification Notice
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                onClick={() => setWarningMsgInput(`[${warningType}] Account Under Review: Our security team detected unusual API requests. Please contact support.`)}
              >
                Insert Security Review Notice
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                onClick={() => setWarningMsgInput(`[${warningType}] Low Balance Alert: Your credits balance is low. Re-charge now to avoid scraper interruption.`)}
              >
                Insert Low Balance Alert
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#fff' }}>Custom Warning Message Text:</label>
            <textarea
              className="form-control"
              rows="4"
              value={warningMsgInput}
              onChange={(e) => setWarningMsgInput(e.target.value)}
              placeholder="Type custom application warning message for this user's dashboard..."
              style={{ width: '100%' }}
            ></textarea>
          </div>

          {/* Live Preview of Dashboard Warning */}
          <div style={{ marginBottom: '24px', background: 'rgba(255, 176, 0, 0.08)', border: '1px dashed #ffb000', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: '#ffb000', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>
              User Dashboard Live Preview:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} style={{ color: '#ffb000', flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                <strong>⚠️ {warningType}:</strong> {warningMsgInput || '(No warning text entered)'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              className="btn btn-danger btn-sm"
              style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444' }}
              onClick={() => handleSaveWarning('')}
            >
              🗑️ Clear Active Warning
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setWarningModalTarget(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                style={{ background: '#ffb000', borderColor: '#ffb000', color: '#000' }}
                onClick={() => handleSaveWarning(warningMsgInput.trim())}
              >
                💾 Issue Warning Notice
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContactSelectorModal = () => {
    if (!showContactSelectorModal) return null;

    const filteredContacts = groupContacts.filter(c =>
      !contactSearch ||
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phone.includes(contactSearch) ||
      c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.area.toLowerCase().includes(contactSearch.toLowerCase())
    );

    return (
      <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>
        <div className="modal-content card" style={{ maxWidth: '850px', width: '95%', maxHeight: '88vh', border: '1px solid #06b6d4', padding: '24px', borderRadius: '12px', background: '#090d16', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ color: '#06b6d4', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
                <User size={20} /> Granular Target Lead Selector & Inspector
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Select exact contacts to receive your message dispatch. You can choose 1, 2, or specific leads.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowContactSelectorModal(false)} style={{ border: 'none', fontSize: '1.4rem', cursor: 'pointer', padding: '0 8px' }}>&times;</button>
          </div>

          {/* Search & Bulk Action Toolbar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '32px', fontSize: '0.85rem', width: '100%' }}
                placeholder="🔍 Search contacts by name, phone, email, or location..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedContactIds(new Set(groupContacts.map(c => c.id)))}
              >
                ✓ Select All ({groupContacts.length})
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedContactIds(new Set())}
              >
                ✕ Deselect All
              </button>
            </div>
          </div>

          {/* Counter Status Pill */}
          <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '8px 14px', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.3)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <span>
              Target Selection: <strong style={{ color: '#06b6d4' }}>{selectedContactIds.size}</strong> out of <strong style={{ color: '#fff' }}>{groupContacts.length}</strong> contacts selected
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {selectedContactIds.size === groupContacts.length ? 'Entire List Selected' : 'Custom Subset Selected'}
            </span>
          </div>

          {/* Contacts Table Container */}
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', marginBottom: '16px' }}>
            <table className="admin-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={groupContacts.length > 0 && selectedContactIds.size === groupContacts.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedContactIds(new Set(groupContacts.map(c => c.id)));
                        else setSelectedContactIds(new Set());
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Row #</th>
                  <th>Contact Name</th>
                  <th>Phone / Email</th>
                  <th>Location / District</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((c) => {
                  const isChecked = selectedContactIds.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => {
                        const next = new Set(selectedContactIds);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        setSelectedContactIds(next);
                      }}
                      style={{
                        cursor: 'pointer',
                        background: isChecked ? 'rgba(6, 182, 212, 0.08)' : 'transparent'
                      }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const next = new Set(selectedContactIds);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            setSelectedContactIds(next);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{c.id + 1}</td>
                      <td><strong style={{ color: isChecked ? '#fff' : 'var(--text-secondary)' }}>{c.name}</strong></td>
                      <td className="digital-text" style={{ fontSize: '0.85rem' }}>
                        {c.phone ? c.phone.replace(/\.0$/, '').replace(/^\+?88001/, '+8801').replace(/^88001/, '+8801') : (c.email || 'N/A')}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{c.area || 'BD'}</td>
                      <td>
                        {isChecked ? (
                          <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ SELECTED</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>EXCLUDED</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredContacts.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No contacts matched your search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Action Controls */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setShowContactSelectorModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => setShowContactSelectorModal(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> Confirm Selection ({selectedContactIds.size} Contacts)
            </button>
          </div>

        </div>
      </div>
    );
  };

  const renderRequestActionModal = () => {
    if (!requestActionModal) return null;
    const { request, targetStatus } = requestActionModal;
    const isFulfill = targetStatus === 'fulfilled';

    return (
      <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>
        <div className="modal-content glowing-panel" style={{ maxWidth: '580px', width: '100%', borderRadius: '12px', padding: '24px', background: '#0a0e17', border: `1px solid ${isFulfill ? '#22c55e' : '#ef4444'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: isFulfill ? '#22c55e' : '#ef4444' }}>
              {isFulfill ? '🚀 Fulfill Request #' + request.id : '❌ Reject Request #' + request.id}
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setRequestActionModal(null)}>✕</button>
          </div>

          {/* User & Request Target Details */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
              <div><strong>User:</strong> {request.full_name}</div>
              <div><strong>Email:</strong> {request.user_email}</div>
              <div><strong>Phone / WA:</strong> <span style={{ color: '#06b6d4' }}>{request.phone}</span></div>
              <div><strong>Business:</strong> {request.business_name || 'N/A'}</div>
            </div>
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <strong>Category Queries:</strong> <span style={{ color: '#eab308' }}>{request.category_query}</span>
              <br />
              <small style={{ color: 'var(--text-muted)' }}>Location: {[request.division, request.district, request.area].filter(Boolean).join(', ') || 'Bangladesh'}</small>
            </div>
          </div>

          {/* Select Notification Channel */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={15} style={{ color: '#06b6d4' }} /> Send Notification to Customer
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className={`btn btn-sm ${requestNotifyChannel === 'email' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 4px', fontSize: '0.75rem' }}
                onClick={() => setRequestNotifyChannel('email')}
              >
                📧 Email Only
              </button>
              <button
                type="button"
                className={`btn btn-sm ${requestNotifyChannel === 'whatsapp' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 4px', fontSize: '0.75rem' }}
                onClick={() => setRequestNotifyChannel('whatsapp')}
              >
                💬 WhatsApp
              </button>
              <button
                type="button"
                className={`btn btn-sm ${requestNotifyChannel === 'both' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 4px', fontSize: '0.75rem' }}
                onClick={() => setRequestNotifyChannel('both')}
              >
                📬 Both
              </button>
              <button
                type="button"
                className={`btn btn-sm ${requestNotifyChannel === 'none' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ padding: '8px 4px', fontSize: '0.75rem' }}
                onClick={() => setRequestNotifyChannel('none')}
              >
                🔕 None
              </button>
            </div>
          </div>

          {/* Custom Editable Message */}
          {requestNotifyChannel !== 'none' && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 'bold' }}>Custom Notification Message</label>
              <textarea
                className="form-control"
                rows="5"
                style={{ fontFamily: 'sans-serif', fontSize: '0.85rem', lineHeight: '1.5' }}
                value={requestCustomMsg}
                onChange={(e) => setRequestCustomMsg(e.target.value)}
              ></textarea>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                You can customize the notification reason or fulfillment message before sending.
              </small>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setRequestActionModal(null)}>Cancel</button>
            <button
              className={`btn ${isFulfill ? 'btn-primary' : 'btn-danger'}`}
              onClick={handleConfirmRequestAction}
              disabled={updatingReqStatus}
            >
              {updatingReqStatus ? 'Processing...' : (isFulfill ? '🚀 Confirm & Fulfill Request' : '❌ Confirm Rejection')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => (
    <footer className="app-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="brand" style={{ marginBottom: '16px', fontSize: '1.3rem' }}>
              <BarChart3 size={24} style={{ color: '#06b6d4' }} /> MARKETING OSTAD
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6', maxWidth: '320px' }}>
              Bangladesh's premier verified lead marketplace, real-time Google Maps scraper, and automated WhatsApp/Email campaign engine.
            </p>
            <div style={{ marginTop: '16px' }}>
              <span style={{ color: 'var(--text-neon)', fontSize: '0.75rem', background: 'rgba(57, 255, 20, 0.1)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(57, 255, 20, 0.3)' }}>
                ● System Active & Online
              </span>
            </div>
          </div>

          <div className="footer-col">
            <h5>Data Categories</h5>
            <ul className="footer-links">
              <li><a onClick={() => { setCurrentTab('catalog'); setSelectedDatasetId(null); setDatasetFilterCat('Coaching Center'); }}>Coaching Centers</a></li>
              <li><a onClick={() => { setCurrentTab('catalog'); setSelectedDatasetId(null); setDatasetFilterCat('Pharmacy'); }}>Pharmacies</a></li>
              <li><a onClick={() => { setCurrentTab('catalog'); setSelectedDatasetId(null); setDatasetFilterCat('Restaurant'); }}>Restaurants</a></li>
              <li><a onClick={() => { setCurrentTab('catalog'); setSelectedDatasetId(null); setDatasetFilterCat('Hospital & Clinic'); }}>Hospitals & Clinics</a></li>
              <li><a onClick={() => { setCurrentTab('catalog'); setSelectedDatasetId(null); setDatasetFilterCat('School & College'); }}>Schools & Colleges</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Pricing (BDT ৳)</h5>
            <ul className="footer-links">
              <li><a onClick={() => { setCurrentTab('home'); setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>Starter Pack (৳200/mo)</a></li>
              <li><a onClick={() => { setCurrentTab('home'); setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>Growth Pack (৳500/mo)</a></li>
              <li><a onClick={() => { setCurrentTab('home'); setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>Credit Packs (from ৳50)</a></li>
              <li><a onClick={() => { setCurrentTab('home'); setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>Enterprise ERP Pack</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Support & Legal</h5>
            <ul className="footer-links">
              <li><a onClick={() => setShowLegalModal('privacy')}>Privacy Policy</a></li>
              <li><a onClick={() => setShowLegalModal('terms')}>Terms of Service</a></li>
              <li><a onClick={() => { setCurrentTab('home'); setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>Contact Sales</a></li>
              <li><a onClick={() => setCurrentTab('auth')}>Login / Register</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>{t.footer.rights}</div>
          <div>{t.footer.designSystem}</div>
        </div>
      </div>
    </footer>
  );

  const isSidebarLayout = !!user && currentTab !== 'home' && currentTab !== 'auth';

  return (
    <>
      {isSidebarLayout ? (
        /* ── LOGGED IN USER LAYOUT (LEFT PANEL SIDEBAR) ── */
        <div className="app-container">
          <aside className="sidebar">
            <div className="sidebar-header brand" style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('catalog')}>
              <BarChart3 size={18} style={{ color: '#06b6d4' }} /> MARKETING OSTAD
              {user.role === 'superadmin' && <span style={{ fontSize: '0.65rem', background: '#a855f7', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px', fontWeight: 'bold' }}>SUPERADMIN</span>}
              {user.role === 'admin' && <span style={{ fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>ADMIN</span>}
            </div>

            <div className="sidebar-menu">
              {(user.role === 'admin' || user.role === 'superadmin') && (
                <>
                  <div className="sidebar-section-title">Administration</div>
                  <div className={`sidebar-item ${currentTab === 'admin' && adminSubTab === 'datasets' ? 'active' : ''}`} onClick={() => { setCurrentTab('admin'); setAdminSubTab('datasets'); }}>
                    <Settings size={16} /> Admin Overview
                  </div>
                  <div className={`sidebar-item ${currentTab === 'admin' && adminSubTab === 'dataset_requests' ? 'active' : ''}`} onClick={() => { setCurrentTab('admin'); setAdminSubTab('dataset_requests'); loadAdminDatasetRequests(); }}>
                    <Inbox size={16} style={{ color: '#eab308' }} /> Dataset Requests ({adminDatasetRequests.filter(r => r.status === 'pending').length})
                  </div>
                  <div className={`sidebar-item ${currentTab === 'admin' && adminSubTab === 'payments' ? 'active' : ''}`} onClick={() => { setCurrentTab('admin'); setAdminSubTab('payments'); loadAdminPaymentRequests(); }}>
                    <Coins size={16} style={{ color: '#eab308' }} /> Payment Verification ({adminPaymentRequests.filter(p => p.status === 'pending').length})
                  </div>
                  <div className={`sidebar-item ${currentTab === 'admin' && adminSubTab === 'gateway' ? 'active' : ''}`} onClick={() => { setCurrentTab('admin'); setAdminSubTab('gateway'); loadPaymentConfig(); }}>
                    <Settings size={16} style={{ color: '#06b6d4' }} /> Gateway & QR Settings
                  </div>
                  <div className={`sidebar-item ${currentTab === 'users' ? 'active' : ''}`} onClick={() => { setCurrentTab('users'); loadAdminUsers(); }}>
                    <User size={16} /> Customers & Credits
                  </div>
                  <div className={`sidebar-item danger ${currentTab === 'security' ? 'active' : ''}`} onClick={() => { setCurrentTab('security'); loadAdminViolations(); loadAdminUsers(); }}>
                    <Shield size={16} /> Security Module
                  </div>
                </>
              )}

              <div className="sidebar-section-title">Main Navigation</div>
              <div className={`sidebar-item ${currentTab === 'catalog' ? 'active' : ''}`} onClick={() => { setCurrentTab('catalog'); setSelectedDatasetId(null); }}>
                <Database size={16} /> Datasets Catalog
              </div>
              <div className={`sidebar-item ${currentTab === 'scraper' ? 'active' : ''}`} onClick={() => { setCurrentTab('scraper'); }}>
                <Search size={16} /> Live Scraper Console
              </div>
              <div className={`sidebar-item ${currentTab === 'marketing' ? 'active' : ''}`} onClick={() => { setCurrentTab('marketing'); }}>
                <Send size={16} /> Marketing Portal
              </div>
              <div className={`sidebar-item ${currentTab === 'upgrade' ? 'active' : ''}`} onClick={() => { setCurrentTab('upgrade'); loadPaymentConfig(); loadMyPaymentRequests(); }}>
                <Zap size={16} style={{ color: '#eab308' }} /> Upgrade Package
              </div>
            </div>

            <div className="sidebar-footer">
              <div style={{ marginBottom: '12px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid rgba(6, 182, 212, 0.4)', background: 'rgba(6, 182, 212, 0.1)', color: '#38bdf8' }}
                  onClick={() => {
                    const nextLang = lang === 'en' ? 'bn' : 'en';
                    setLang(nextLang);
                    localStorage.setItem('lang', nextLang);
                  }}
                >
                  <Globe size={14} /> {lang === 'en' ? '🇧🇩 বাংলা ভাষা' : '🇺🇸 English'}
                </button>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', wordBreak: 'break-all' }}>
                <User size={12} style={{ display: 'inline', opacity: 0.8, marginRight: '4px' }} /> {user.email}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #eab308, #d97706)', color: '#000', fontWeight: 'bold', border: 'none' }}
                  onClick={() => { setShowPaymentModal(true); loadPaymentConfig(); loadMyPaymentRequests(); }}
                >
                  <Coins size={14} /> {user.credits} CR ➕ Buy
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleLogout} title="Logout">
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          </aside>

          <main className="main-content">
            <div className="container" style={{ padding: '40px 0' }}>
              {/* APPLICATION-LEVEL ADMIN WARNING BANNER FOR LOGGED IN USER */}
              {user && user.warning_message && (
                <div style={{
                  background: 'rgba(255, 176, 0, 0.12)',
                  border: '1px solid #ffb000',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  marginBottom: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}>
                  <AlertTriangle size={24} style={{ color: '#ffb000', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#ffb000', fontSize: '0.95rem' }}>
                      ⚠️ Notice from System Administrator
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: '0.85rem', marginTop: '4px' }}>
                      {user.warning_message}
                    </div>
                  </div>
                </div>
              )}

              {renderMainViews()}
            </div>
          </main>
        </div>
      ) : (
        /* ── GUEST / VISITOR LAYOUT (TOP NAVBAR ACROSS TOP) ── */
        <div className="user-layout">
          <header className="top-navbar">
            <div className="top-nav-container">
              <div className="top-nav-logo" onClick={() => setCurrentTab('home')}>
                <BarChart3 size={22} style={{ color: '#06b6d4' }} /> MARKETING OSTAD
              </div>

              <nav className="top-nav-menu">
                <div className={`top-nav-item ${currentTab === 'home' ? 'active' : ''}`} onClick={() => setCurrentTab('home')}>
                  {t.nav.home}
                </div>
                <div className={`top-nav-item ${currentTab === 'catalog' ? 'active' : ''}`} onClick={() => { setCurrentTab('catalog'); setSelectedDatasetId(null); }}>
                  <Database size={14} /> {t.nav.datasets}
                </div>
                <div className="top-nav-item" onClick={() => { setCurrentTab('home'); setTimeout(() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
                  {t.nav.features}
                </div>
                <div className="top-nav-item" onClick={() => { setCurrentTab('home'); setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
                  {t.nav.pricing}
                </div>
                <div className="top-nav-item" onClick={() => { setCurrentTab('home'); setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
                  {t.nav.contact}
                </div>
              </nav>

              <div className="top-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', border: '1px solid rgba(6, 182, 212, 0.4)', background: 'rgba(6, 182, 212, 0.1)', color: '#38bdf8' }}
                  onClick={() => {
                    const nextLang = lang === 'en' ? 'bn' : 'en';
                    setLang(nextLang);
                    localStorage.setItem('lang', nextLang);
                  }}
                >
                  <Globe size={14} /> {lang === 'en' ? '🇧🇩 বাংলা' : '🇺🇸 English'}
                </button>
                <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setCurrentTab('auth')}>
                  <User size={14} /> {t.nav.loginRegister}
                </button>
              </div>
            </div>
          </header>

          <main className="user-main-content">
            <div className="container" style={{ padding: '40px 0' }}>
              {renderMainViews()}
            </div>
            {renderFooter()}
          </main>
        </div>
      )}

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

      {renderLegalModal()}
      {renderWarningModal()}
      {renderContactSelectorModal()}

      {/* 🚨 URGENT SCREENSHOT SECURITY VIOLATION ALERT MODAL */}
      {securityAlertModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999999, padding: '20px' }}>
          <div className="modal-content card" style={{ maxWidth: '520px', width: '92%', border: '2px solid #ef4444', padding: '32px 28px', borderRadius: '16px', background: '#0f0707', boxShadow: '0 0 40px rgba(239, 68, 68, 0.4)', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <ShieldAlert size={36} style={{ color: '#ef4444' }} />
            </div>

            <h2 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '1.4rem', letterSpacing: '0.5px' }}>
              🚨 SECURITY VIOLATION ALERT
            </h2>

            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '0.85rem', color: '#fca5a5' }}>
              <strong>Screenshot Attempt Intercepted:</strong>
              <br />
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{securityAlertModal.violationType}</span> at {securityAlertModal.time}
            </div>

            <p style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '24px' }}>
              Your IP address, browser fingerprint, and session details have been recorded and logged to the <strong>Security Control Module</strong>. Scraping or capturing proprietary leads data is strictly monitored. Continued attempts will result in automatic IP banning and account suspension.
            </p>

            <button
              className="btn btn-danger btn-sm"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', color: "white", fontWeight: 'bold', background: '#ef4444', borderColor: '#ef4444', cursor: 'pointer' }}
              onClick={() => setSecurityAlertModal(null)}
            >
              I Understand & Acknowledge Warning
            </button>
          </div>
        </div>
      )}
    </>
  );

  // Core view router component
  function renderMainViews() {
    return (
      <>
        {/* ══ TAB: HOME ══ */}
        {currentTab === 'home' && (
          <div>
            {/* HERO SECTION */}
            <div className="hero-section">
              <div className="hero-grid">
                <div>
                  <div className="hero-badge-pill">
                    <Zap size={14} /> {t.hero.badge}
                  </div>
                  <h1 className="hero-title">
                    {t.hero.titlePrefix}<span className="digital-text">{t.hero.titleHighlight}</span>{t.hero.titleSuffix}
                  </h1>
                  <p className="hero-subtitle">
                    {t.hero.subtitle}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }} onClick={() => setCurrentTab('catalog')}>
                      <Database size={18} /> {t.hero.btnDatasets}
                    </button>
                    {user ? (
                      <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }} onClick={() => setCurrentTab('scraper')}>
                        <Search size={18} /> {t.hero.btnScraper}
                      </button>
                    ) : (
                      <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }} onClick={() => setCurrentTab('auth')}>
                        <User size={18} /> {t.hero.btnStart}
                      </button>
                    )}
                    <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }} onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                      <Coins size={16} style={{ color: '#eab308' }} /> {t.hero.btnPricing}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="hero-dashboard-frame">
                    <img src={heroDashboardImg} alt="MarketingOstad Marketing Dashboard" className="hero-dashboard-img" />
                    <div style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(4, 6, 11, 0.85)', border: '1px solid var(--text-neon)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', color: 'var(--text-neon)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                      <span className="led-status running"></span> ⚡ {t.hero.statScraper}
                    </div>
                    <div style={{ position: 'absolute', bottom: '24px', left: '24px', background: 'rgba(4, 6, 11, 0.85)', border: '1px solid var(--accent-blue)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                      <CheckCircle2 size={14} /> {t.hero.statAccuracy}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD-BASED FEATURES SECTION */}
            <div id="features" style={{ paddingTop: '60px', marginTop: '40px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 40px auto' }}>
                <span className="pricing-bdt-badge" style={{ marginBottom: '10px' }}>{t.features.badge}</span>
                <h2 style={{ fontSize: '2rem', marginBottom: '12px', marginTop: '8px' }}>
                  {t.features.title}
                </h2>
              </div>

              <div className="feature-cards-grid">
                <div className="feature-card">
                  <div className="feature-card-icon">
                    <Search size={24} />
                  </div>
                  <div>
                    <h4 className="feature-card-title">{t.features.card1Title}</h4>
                    <p className="feature-card-desc">
                      {t.features.card1Desc}
                    </p>
                  </div>
                </div>

                <div className="feature-card neon-accent">
                  <div className="feature-card-icon">
                    <Database size={24} />
                  </div>
                  <div>
                    <h4 className="feature-card-title">{t.features.card2Title}</h4>
                    <p className="feature-card-desc">
                      {t.features.card2Desc}
                    </p>
                  </div>
                </div>

                <div className="feature-card amber-accent">
                  <div className="feature-card-icon">
                    <Send size={24} />
                  </div>
                  <div>
                    <h4 className="feature-card-title">{t.features.card3Title}</h4>
                    <p className="feature-card-desc">
                      {t.features.card3Desc}
                    </p>
                  </div>
                </div>

                <div className="feature-card">
                  <div className="feature-card-icon">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 className="feature-card-title">{t.features.card4Title}</h4>
                    <p className="feature-card-desc">
                      {t.features.card4Desc}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* BDT PRICING SECTION */}
            <div id="pricing" style={{ paddingTop: '80px', marginTop: '60px', borderTop: '1px solid var(--border-subtle)' }}>
              <div className="pricing-header">
                <span className="pricing-bdt-badge">{t.pricing.badge}</span>
                <h2 style={{ fontSize: '2.2rem', marginBottom: '12px', marginTop: '8px' }}>
                  {t.pricing.title}
                </h2>
              </div>

              {/* Dynamic Subscription & Credit Bundles from packages.json */}
              {(() => {
                const displayPackages = (paymentPackages && paymentPackages.length > 0) ? paymentPackages : (paymentConfig?.packages || []);
                return (
                  <>
                    <div className="pricing-grid-3">
                      {displayPackages.map((pkg) => (
                        <div key={pkg.id} className={`pricing-card-bdt ${pkg.popular ? 'popular' : ''}`}>
                          {pkg.popular ? (
                            <span className="popular-ribbon">{pkg.badge || 'MOST POPULAR'}</span>
                          ) : pkg.badge ? (
                            <span style={{ position: 'absolute', top: '-12px', right: '16px', background: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4', fontSize: '0.65rem', fontWeight: '900', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.4)' }}>
                              {pkg.badge}
                            </span>
                          ) : null}

                          <div className="pricing-plan-title" style={{ color: pkg.popular ? 'var(--text-neon)' : '#fff' }}>{pkg.name}</div>
                          <div className="pricing-price-bdt">
                            ৳{pkg.price_bdt} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>BDT / {pkg.credits} CR</span>
                          </div>

                          {pkg.save_badge && (
                            <div style={{ marginBottom: '12px' }}>
                              <span className="animated-save-badge">{pkg.save_badge}</span>
                            </div>
                          )}

                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                            {pkg.description}
                          </p>

                          {pkg.features && pkg.features.length > 0 && (
                            <ul className="pricing-features-list">
                              {pkg.features.map((feat, idx) => (
                                <li key={idx}>
                                  <Check size={16} className="check-icon" /> <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          <button
                            className={`btn ${pkg.popular ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ width: '100%', marginTop: 'auto' }}
                            onClick={() => {
                              if (user) {
                                setCurrentTab('upgrade');
                                setSelectedPackage(pkg);
                                setPaymentStep(1);
                                setShowPaymentModal(true);
                              } else {
                                setCurrentTab('auth');
                              }
                            }}
                          >
                            {user ? `Upgrade to ${pkg.name}` : `Get Started with ${pkg.name}`}
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Pay-as-you-go Credit Packs */}
                    <div style={{ textAlign: 'center', marginTop: '50px', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '1.4rem' }}>Pay-As-You-Go Credit Packs</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Need custom or volume credits? Top up anytime in BDT.</p>
                    </div>

                    <div className="credit-packs-grid">
                      {displayPackages.map((pkg) => (
                        <div key={pkg.id} className="credit-pack-card" style={{ borderColor: pkg.popular ? 'rgba(57, 255, 20, 0.4)' : 'var(--border-subtle)' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{pkg.credits} Credits</div>
                          <div style={{ color: 'var(--text-neon)', fontSize: '1.4rem', fontWeight: 'bold', margin: '8px 0' }}>৳{pkg.price_bdt} BDT</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>৳{(pkg.price_bdt / pkg.credits).toFixed(2)} / Credit</div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}

              {/* Interactive BDT Credit Calculator */}
              {(() => {
                const customRate = paymentConfig?.custom_package?.price_per_credit_bdt || 7.5;
                const minC = paymentConfig?.custom_package?.min_credits || 5;
                const maxC = paymentConfig?.custom_package?.max_credits || 500;
                const totalBDT = (calcCredits * customRate).toFixed(calcCredits * customRate % 1 === 0 ? 0 : 2);

                return (
                  <div className="card glowing-panel" style={{ marginTop: '40px', padding: '30px' }}>
                    <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Coins size={18} style={{ color: '#eab308' }} /> {t.pricing.calcTitle}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                      {t.pricing.calcDesc}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'center' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                          {t.pricing.calcSelectLabel} <strong style={{ color: 'var(--text-neon)', fontSize: '1.1rem' }}>{calcCredits} Credits</strong>
                        </label>
                        <input
                          type="range"
                          min={minC}
                          max={maxC}
                          step="5"
                          value={calcCredits}
                          onChange={(e) => setCalcCredits(Math.max(minC, parseInt(e.target.value) || minC))}
                          style={{ width: '100%', accentColor: 'var(--text-neon)' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <span>{minC} CR</span>
                          <span>{Math.round((maxC + minC) / 2)} CR</span>
                          <span>{maxC} CR</span>
                        </div>
                      </div>

                      <div style={{ background: '#020306', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t.pricing.calcTotalPayable}</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--text-neon)', margin: '4px 0' }}>
                          ৳{totalBDT} BDT
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          @ ৳{customRate} BDT / Credit (Min: {minC} Credits)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* CONTACT US SECTION */}
            <div id="contact" className="contact-section" style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '60px' }}>
              <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 40px auto' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '12px' }}>
                  {t.contact.title}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  {t.contact.subtitle}
                </p>
              </div>

              <div className="contact-grid">
                <div className="card glowing-panel">
                  <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={18} style={{ color: '#06b6d4' }} /> {t.contact.title}
                  </h4>
                  <form onSubmit={handleContactSubmit}>
                    <div className="form-group">
                      <label>{t.contact.nameLabel}</label>
                      <input type="text" className="form-control" value={contactName} onChange={(e) => setContactName(e.target.value)} required placeholder="Your full name" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label>{t.contact.emailLabel}</label>
                        <input type="email" className="form-control" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required placeholder="name@company.com" />
                      </div>
                      <div className="form-group">
                        <label>{t.contact.phoneLabel}</label>
                        <input type="text" className="form-control" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+880 1XXXXXXXXX" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>{t.contact.subjectLabel}</label>
                      <input type="text" className="form-control" value={contactSubject} onChange={(e) => setContactSubject(e.target.value)} placeholder="Pricing, ERP Pack, Scraper inquiry..." />
                    </div>
                    <div className="form-group">
                      <label>{t.contact.messageLabel}</label>
                      <textarea className="form-control" rows="4" value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} required placeholder="Tell us about your lead requirements..."></textarea>
                    </div>
                    <button className="btn btn-primary" type="submit" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Send size={16} /> {t.contact.btnSubmit}
                    </button>
                  </form>
                </div>

                <div className="contact-info-box">
                  <h4 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={18} style={{ color: '#10b981' }} /> {t.contact.channelsTitle}
                  </h4>

                  <div className="contact-item">
                    <div className="contact-icon">
                      <Mail size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>{t.contact.emailTitle}</div>
                      <div style={{ color: 'var(--text-neon)', fontSize: '0.85rem', marginTop: '4px' }}>
                        {SUPPORT_EMAIL}
                      </div>
                    </div>
                  </div>

                  <div className="contact-item">
                    <div className="contact-icon">
                      <Phone size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>{t.contact.hotlineTitle}</div>
                      <a
                        href={`https://wa.me/${HOTLINE_PHONE.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent-blue)', fontSize: '0.85rem', marginTop: '4px', textDecoration: 'none', display: 'inline-block' }}
                      >
                        {HOTLINE_PHONE} <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{t.contact.clickToChat}</span>
                      </a>
                    </div>
                  </div>

                  <div className="contact-item">
                    <div className="contact-icon">
                      <Clock size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>{t.contact.hoursTitle}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                        {SUPPORT_HOURS}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: AUTH (WITH EMAIL LINK VERIFICATION NOTICE) ══ */}
        {currentTab === 'auth' && (
          <div style={{ maxWidth: '440px', margin: '40px auto' }} className="card glowing-panel">
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

            {/* Email Verification Banner */}
            {authVerificationNotice && (
              <div style={{ color: '#39ff14', fontSize: '0.82rem', marginBottom: '16px', background: 'rgba(57, 255, 20, 0.1)', border: '1px solid rgba(57, 255, 20, 0.3)', padding: '12px', borderRadius: '6px', lineHeight: '1.4' }}>
                <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                {authVerificationNotice}
              </div>
            )}

            {authError && (
              <div style={{ color: 'var(--accent-red)', fontSize: '0.82rem', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '6px' }}>
                <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                {authError}
                {authError.includes('Email address not verified') && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', marginTop: '10px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: '#fff' }}
                    type="button"
                    onClick={handleResendVerificationLink}
                  >
                    Resend Verification Link Email
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {authView === 'register' && (
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" className="form-control" value={authName} onChange={(e) => setAuthName(e.target.value)} required placeholder="John Doe" />
                </div>
              )}
              <div className="form-group">
                <label>Email Address *</label>
                <input type="email" className="form-control" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="name@company.com" />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input type="password" className="form-control" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required placeholder="••••••••" />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} type="submit">
                {authView === 'login' ? 'Sign In' : 'Register Account'}
              </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem' }}>
              {authView === 'login' ? (
                <span>No account? <a onClick={() => setAuthView('register')}>Register Here</a></span>
              ) : (
                <span>Already registered? <a onClick={() => setAuthView('login')}>Sign In Here</a></span>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: CATALOG & DETAILS ══ */}
        {currentTab === 'catalog' && (
          <div>
            {!selectedDatasetId ? (
              <div>
                {/* Catalog Sub-Tab Navigation Header */}
                <div className="tabs" style={{ marginBottom: '24px' }}>
                  <button
                    type="button"
                    className={`tab-btn ${catalogTab === 'public' ? 'active' : ''}`}
                    onClick={() => setCatalogTab('public')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}
                  >
                    <Globe size={16} /> Public Datasets Catalog ({datasets.length})
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${catalogTab === 'private' ? 'active' : ''}`}
                    onClick={() => setCatalogTab('private')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}
                  >
                    <Lock size={16} /> My Private Datasets ({scraperJobs.filter(j => j.status === 'done').length})
                  </button>
                </div>

                {/* SUB-TAB 1: PUBLIC DATASETS */}
                {catalogTab === 'public' && (
                  <div>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="text" className="form-control" style={{ flex: '1', minWidth: '200px' }} placeholder="Search public datasets..." value={datasetListSearch} onChange={(e) => setDatasetListSearch(e.target.value)} />

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
                            <button className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => openDatasetDetails(ds.id, 1)}><Eye size={14} /> View Dataset</button>
                          </div>
                        </div>
                      ))}
                      {datasets.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No public datasets match your active filters.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: MY PRIVATE DATASETS */}
                {catalogTab === 'private' && (
                  <div>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-control"
                        style={{ flex: '1' }}
                        placeholder="Search your private datasets..."
                        value={datasetListSearch}
                        onChange={(e) => setDatasetListSearch(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                      {scraperJobs
                        .filter(j => j.status === 'done' && (!datasetListSearch || j.query.toLowerCase().includes(datasetListSearch.toLowerCase())))
                        .map(job => (
                          <div key={job.id} className="card glowing-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Lock size={12} /> PRIVATE SCRAPED LEAD
                                </span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{job.id}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteJob(job.id, job.query)}
                                    title="Delete Scrape Job"
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <h4 style={{ marginBottom: '8px', color: '#fff' }}>{job.query}</h4>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Location: {job.area || job.district || 'BD'}</div>
                              <div style={{ fontSize: '0.8rem', color: '#22c55e', marginTop: '4px', fontWeight: 'bold' }}>Leads parsed: {job.result_count || 0} rows</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                  onClick={() => openDatasetDetails(`job_${job.id}`, 1)}
                                >
                                  <Eye size={13} /> View Dataset
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'rgba(6, 182, 212, 0.12)', borderColor: '#06b6d4', color: '#06b6d4' }}
                                  onClick={() => {
                                    setWaRecipientGroup(`job_${job.id}`);
                                    setEmailRecipientGroup(`job_${job.id}`);
                                    loadRecipientContacts(`job_${job.id}`);
                                    setCurrentTab('marketing');
                                    setMarketingSubTab('whatsapp');
                                    showToast(`Loaded "${job.query}" leads for marketing campaign!`, 'success');
                                  }}
                                >
                                  <Play size={13} /> Use Leads
                                </button>
                              </div>

                              {/* Promotion Request / Promote Controls */}
                              {job.promotion_status === 'pending' ? (
                                <button type="button" className="btn btn-secondary btn-sm" disabled style={{ width: '100%', opacity: 0.8, color: '#eab308', borderColor: '#eab308', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <Clock size={14} /> Promotion Request Pending
                                </button>
                              ) : job.promotion_status === 'approved' ? (
                                <button type="button" className="btn btn-secondary btn-sm" disabled style={{ width: '100%', color: '#22c55e', borderColor: '#22c55e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <CheckCircle2 size={14} /> Published to Public Catalog
                                </button>
                              ) : (user?.role === 'admin' || user?.role === 'superadmin') ? (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                  onClick={() => { setPromoteJobId(job.id); setPromoteName(job.query); }}
                                >
                                  <Database size={14} /> Promote to Public Catalog
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
                                  onClick={() => { setPromoteJobId(job.id); setPromoteName(job.query); }}
                                >
                                  <Send size={14} /> Request Promotion to Catalog
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      {scraperJobs.filter(j => j.status === 'done').length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No private datasets found. Launch a scraping job to collect and manage your private leads here.
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ color: 'var(--text-neon)', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={16} /> Unlocked
                          </div>
                          {user && (user.role === 'admin' || user.role === 'superadmin') && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}></span>
                              <a
                                href={`${API_BASE}/api/datasets/${datasetDetail.dataset.id}/export?format=excel&token=${token}`}
                                download
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', borderColor: '#22c55e', color: '#22c55e' }}
                                title="Export as Excel (.xlsx)"
                              >
                                <FileSpreadsheet size={13} /> Excel
                              </a>
                              <a
                                href={`${API_BASE}/api/datasets/${datasetDetail.dataset.id}/export?format=csv&token=${token}`}
                                download
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', borderColor: '#06b6d4', color: '#38bdf8' }}
                                title="Export as CSV (.csv)"
                              >
                                <FileText size={13} /> CSV
                              </a>
                              <a
                                href={`${API_BASE}/api/datasets/${datasetDetail.dataset.id}/export?format=json&token=${token}`}
                                download
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', borderColor: '#a855f7', color: '#c084fc' }}
                                title="Export as JSON (.json)"
                              >
                                <Database size={13} /> JSON
                              </a>
                              <a
                                href={`${API_BASE}/api/datasets/${datasetDetail.dataset.id}/export?format=pdf&token=${token}`}
                                download
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', borderColor: '#ef4444', color: '#f87171' }}
                                title="Export as PDF (.pdf)"
                              >
                                <Download size={13} /> PDF
                              </a>
                            </div>
                          )}
                        </div>
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

        {/* ══ TAB: SCRAPER & DATASET REQUEST PORTAL ══ */}
        {currentTab === 'scraper' && (
          <div>
            {/* Header Banner */}
            <div className="card glowing-panel" style={{ borderColor: '#06b6d4', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Search size={14} /> REAL-TIME MAPS SCRAPER & DATASET PORTAL
                  </span>
                  <h2 style={{ color: '#fff', marginTop: '10px', marginBottom: '6px' }}>
                    Live Google Maps Scraper & Custom Dataset Requests
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                    {user && (user.role === 'admin' || user.role === 'superadmin')
                      ? 'Launch direct server background Google Maps scrapes (Free for Admin) or fulfill user dataset requests.'
                      : 'Launch automated live Google Maps scrapes directly (20 Credits/Query) or submit custom dataset requests to our data team.'}
                  </p>
                </div>
                {user && (user.role !== 'admin' && user.role !== 'superadmin') && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.3)', textAlign: 'right', boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Available Credits Balance</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#eab308' }}>⚡ {user.credits || 0} Credits</div>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="tabs" style={{ marginBottom: '24px' }}>
              <button
                className={`tab-btn ${scraperSubTab === 'console' ? 'active' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                onClick={() => setScraperSubTab('console')}
              >
                <Search size={16} /> ⚡ Live Scraper Console
              </button>
              <button
                className={`tab-btn ${scraperSubTab === 'requests' ? 'active' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                onClick={() => setScraperSubTab('requests')}
              >
                <Send size={16} /> 📋 Custom Dataset Requests
              </button>
            </div>

            {/* SUB-TAB 1: LIVE SCRAPER CONSOLE */}
            {scraperSubTab === 'console' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '28px' }}>
                {/* Left: Scraper Input Form */}
                <div className="card glowing-panel">
                  <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={18} style={{ color: '#06b6d4' }} /> Initialize Live Maps Scraper
                  </h3>
                  <form onSubmit={handleStartScrape}>
                    <div className="form-group">
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Search Queries *</span>
                        <span style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 'bold' }}>
                          {user && (user.role === 'admin' || user.role === 'superadmin') ? 'Free (Admin)' : '20 Credits / Query'}
                        </span>
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
                              title="Add another query"
                            >+</button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{ padding: '0 14px', fontWeight: 'bold', fontSize: '1.2rem', minWidth: '42px' }}
                              onClick={() => {
                                const newQ = scrapeQueries.filter((_, i) => i !== idx);
                                setScrapeQueries(newQ.length ? newQ : ['']);
                              }}
                              title="Remove query"
                            >×</button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="form-group">
                      <label>Division</label>
                      <select className="form-control" value={scrapeDiv} onChange={(e) => { setScrapeDiv(e.target.value); setScrapeDist(''); setScrapeArea(''); }}>
                        <option value="">-- Select Division --</option>
                        {regionsConfig && Object.keys(regionsConfig).map((div, i) => (
                          <option key={i} value={div}>{div}</option>
                        ))}
                        <option value="Other">Other / Custom...</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>District</label>
                      <select className="form-control" value={scrapeDist} onChange={(e) => { setScrapeDist(e.target.value); setScrapeArea(''); }} disabled={!scrapeDiv && scrapeDiv !== 'Other'}>
                        <option value="">-- Select District --</option>
                        {regionsConfig && scrapeDiv && regionsConfig[scrapeDiv] && Object.keys(regionsConfig[scrapeDiv]).map((dist, i) => (
                          <option key={i} value={dist}>{dist}</option>
                        ))}
                        <option value="Other">Other / Custom...</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Area / Sub-area</label>
                      <select className="form-control" value={scrapeArea} onChange={(e) => setScrapeArea(e.target.value)} disabled={!scrapeDist && scrapeDist !== 'Other'}>
                        <option value="">-- Select Area --</option>
                        {regionsConfig && scrapeDiv && scrapeDist && regionsConfig[scrapeDiv]?.[scrapeDist] && regionsConfig[scrapeDiv][scrapeDist].map((area, i) => (
                          <option key={i} value={area}>{area}</option>
                        ))}
                        <option value="Other">Other / Custom...</option>
                      </select>
                    </div>

                    {scrapeRateLimit > 0 ? (
                      <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'not-allowed', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444', fontWeight: 'bold' }} disabled>
                        <Clock size={16} style={{ color: '#ef4444' }} /> Rate Limit Cooldown ({Math.floor(scrapeRateLimit / 60)}:{scrapeRateLimit % 60 < 10 ? '0' : ''}{scrapeRateLimit % 60} Remaining)
                      </button>
                    ) : (
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Play size={15} /> {user && (user.role === 'admin' || user.role === 'superadmin') ? 'Launch Scraper (Free Admin)' : `Launch Live Scraper (Costs ${20 * scrapeQueries.filter(q => q.trim()).length || 20} Credits)`}
                      </button>
                    )}
                  </form>
                </div>

                {/* Right: Live Scraper Terminal & Debug Stream + Job History */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bot size={18} style={{ color: '#a855f7' }} /> Scraper Execution Terminal</h3>
                    <label className="toggle-switch" title="Show Live Map">
                      <input type="checkbox" checked={showLiveDebug} onChange={(e) => setShowLiveDebug(e.target.checked)} />
                      <span className="toggle-track"></span>
                      <Search size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Debug View
                    </label>
                  </div>

                  {activeJobId && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span className="led-status running"></span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Active Job ID: #{activeJobId}</span>
                      </div>

                      {showLiveDebug && (
                        <div className="map-viewer" style={{ marginBottom: '12px' }}>
                          {liveMapImage ? (
                            <img src={liveMapImage} alt="Live debug view" style={{ width: '100%', borderRadius: '4px' }} />
                          ) : (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              Waiting for live browser screenshot debug stream...
                            </div>
                          )}
                        </div>
                      )}

                      <div className="terminal-box" ref={scraperTerminalRef} style={{ position: 'relative' }}>
                        <div style={{ position: 'sticky', top: 0, zIndex: 5, background: '#0a0e17', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '-12px -12px 10px -12px', borderRadius: '4px 4px 0 0' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 'bold' }}>⚡ Execution Logs</span>
                          <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                            <input type="checkbox" checked={autoScrollScraper} onChange={(e) => setAutoScrollScraper(e.target.checked)} style={{ cursor: 'pointer', accentColor: '#06b6d4' }} />
                            Auto-scroll Logs
                          </label>
                        </div>
                        {activeJobLogs.map((log, index) => (
                          <div key={index} className="terminal-line">{log}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <h4 style={{ margin: '20px 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={16} style={{ color: '#06b6d4' }} /> My Scraped Datasets & Job History
                  </h4>
                  <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '4px' }}>
                    {scraperJobs.map(job => (
                      <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', background: 'rgba(255,255,255,0.02)', margin: '4px 0', borderRadius: '6px' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem' }}><strong>{job.query}</strong></div>
                          <small style={{ color: 'var(--text-muted)' }}>
                            Status: <span style={{ color: job.status === 'done' ? '#22c55e' : job.status === 'failed' ? '#ef4444' : '#eab308', fontWeight: 'bold' }}>{job.status}</span> | {job.result_count || 0} leads extracted
                          </small>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {job.status === 'done' && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                title="Preview Scraped Leads"
                                onClick={() => openDatasetDetails(`job_${job.id}`)}
                              >
                                View Leads
                              </button>
                              <a
                                href={`${API_BASE}/api/datasets/download/job_${job.id}?format=xlsx`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm"
                                title="Download Excel File"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Download size={13} /> Excel
                              </a>
                              {user && (user.role === 'admin' || user.role === 'superadmin') ? (
                                <button className="btn btn-primary btn-sm" title="Promote to Public Catalog" onClick={() => { setPromoteJobId(job.id); setPromoteName(job.query); }}>
                                  <Database size={13} /> Drop to Catalog
                                </button>
                              ) : job.promotion_status === 'approved' ? (
                                <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 'bold' }}>✓ In Catalog</span>
                              ) : job.promotion_status === 'pending' ? (
                                <span style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 'bold' }}>⏳ Drop Requested</span>
                              ) : (
                                <button className="btn btn-secondary btn-sm" title="Request Admin to Drop to Public Catalog" onClick={() => { setPromoteJobId(job.id); setPromoteName(job.query); }}>
                                  <Database size={13} /> Request Catalog Drop
                                </button>
                              )}
                            </>
                          )}
                          <button className="btn btn-danger btn-sm" title="Delete job" onClick={() => handleDeleteJob(job.id, job.query)}>
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {scraperJobs.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No scraper runs initiated yet. Fill the form on the left to launch your first Google Maps scrape!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: CUSTOM DATASET REQUESTS */}
            {scraperSubTab === 'requests' && (
              <div>
                {/* IF ADMIN: SHOW ADMIN REQUEST MANAGER AT TOP */}
                {user && (user.role === 'admin' || user.role === 'superadmin') ? (
                  <div>
                    <div className="card glowing-panel" style={{ marginBottom: '30px' }}>
                      <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Send size={18} style={{ color: '#06b6d4' }} /> Custom Dataset Requests Manager (Admin View)
                      </h3>
                      <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Req ID</th>
                              <th>User Email</th>
                              <th>Category Queries</th>
                              <th>Location</th>
                              <th>Business & Phone</th>
                              <th>Notes</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adminDatasetRequests.map(r => (
                              <tr key={r.id}>
                                <td><strong>#{r.id}</strong></td>
                                <td><span style={{ fontSize: '0.85rem' }}>{r.email}</span></td>
                                <td><strong style={{ color: '#06b6d4' }}>{r.category_query}</strong></td>
                                <td style={{ fontSize: '0.85rem' }}>{[r.division, r.district, r.area].filter(Boolean).join(', ') || 'All BD'}</td>
                                <td>
                                  <div>{r.business_name || '—'}</div>
                                  <small style={{ color: 'var(--text-muted)' }}>{r.phone}</small>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.notes || '—'}</td>
                                <td>
                                  <span style={{
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    background: r.status === 'fulfilled' ? 'rgba(34, 197, 94, 0.15)' : r.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                    color: r.status === 'fulfilled' ? '#22c55e' : r.status === 'rejected' ? '#ef4444' : '#eab308'
                                  }}>
                                    {r.status}
                                  </span>
                                </td>
                                <td>
                                  {r.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button className="btn btn-primary btn-sm" title="Pre-fill Admin Scraper to fulfill" onClick={() => handleFulfillDatasetRequest(r)}>
                                        Fulfill Scrape
                                      </button>
                                      <button className="btn btn-danger btn-sm" title="Reject Request" onClick={() => handleRejectDatasetRequest(r.id)}>
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {adminDatasetRequests.length === 0 && (
                              <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                  No pending dataset requests submitted by users yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* USER OR ADMIN SUBMIT REQUEST FORM & MY REQUESTS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px' }}>
                  {/* Form Card */}
                  <div className="card glowing-panel">
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Send size={18} style={{ color: '#06b6d4' }} /> Submit Custom Dataset Request
                    </h3>
                    <form onSubmit={handleSubmitDatasetRequest}>
                      <div className="form-group">
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Required Data / Search Query Tags *</span>
                          <span style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 'bold' }}>
                            {reqCategoryTags.length} Tag{reqCategoryTags.length !== 1 ? 's' : ''} Added
                          </span>
                        </label>

                        {/* Interactive Tag Input Box */}
                        <div
                          style={{
                            border: '1px solid var(--border-subtle)',
                            background: 'rgba(15, 23, 42, 0.6)',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            alignItems: 'center',
                            minHeight: '44px',
                            cursor: 'text'
                          }}
                          onClick={() => {
                            const inputEl = document.getElementById('req-category-tag-input');
                            if (inputEl) inputEl.focus();
                          }}
                        >
                          {reqCategoryTags.map((tag, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: 'rgba(6, 182, 212, 0.15)',
                                border: '1px solid rgba(6, 182, 212, 0.4)',
                                color: '#06b6d4',
                                padding: '3px 10px',
                                borderRadius: '16px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)'
                              }}
                            >
                              {tag}
                              <X
                                size={13}
                                style={{ cursor: 'pointer', color: '#ef4444' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReqCategoryTags(reqCategoryTags.filter((_, i) => i !== idx));
                                }}
                              />
                            </span>
                          ))}

                          <input
                            id="req-category-tag-input"
                            type="text"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: '#fff',
                              flex: '1',
                              minWidth: '150px',
                              fontSize: '0.85rem',
                              padding: '4px'
                            }}
                            placeholder={reqCategoryTags.length === 0 ? "Type query & press comma (,) or Enter..." : "Add another query tag..."}
                            value={reqCategoryInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.includes(',')) {
                                const parts = val.split(',');
                                const newTags = [...reqCategoryTags];
                                parts.forEach(p => {
                                  const trimmed = p.trim();
                                  if (trimmed && !newTags.includes(trimmed)) newTags.push(trimmed);
                                });
                                setReqCategoryTags(newTags);
                                setReqCategoryInput('');
                              } else {
                                setReqCategoryInput(val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const trimmed = reqCategoryInput.trim();
                                if (trimmed && !reqCategoryTags.includes(trimmed)) {
                                  setReqCategoryTags([...reqCategoryTags, trimmed]);
                                  setReqCategoryInput('');
                                }
                              } else if (e.key === 'Backspace' && !reqCategoryInput && reqCategoryTags.length > 0) {
                                setReqCategoryTags(reqCategoryTags.slice(0, -1));
                              }
                            }}
                            onBlur={() => {
                              const trimmed = reqCategoryInput.trim();
                              if (trimmed && !reqCategoryTags.includes(trimmed)) {
                                setReqCategoryTags([...reqCategoryTags, trimmed]);
                                setReqCategoryInput('');
                              }
                            }}
                          />
                        </div>

                        <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '6px', display: 'block' }}>
                          ⚡ Type any search category (e.g. <i>Pharmacy</i>) and press <b>comma (,)</b> or <b>Enter</b> to convert it into a tag badge!
                        </small>
                      </div>

                      <div className="form-group">
                        <label>Division</label>
                        <select className="form-control" value={reqDivision} onChange={(e) => { setReqDivision(e.target.value); setReqDistrict(''); setReqArea(''); }}>
                          <option value="">-- Select Division --</option>
                          {regionsConfig && Object.keys(regionsConfig).map((div, i) => (
                            <option key={i} value={div}>{div}</option>
                          ))}
                          <option value="Other">Other / Custom...</option>
                        </select>
                        {reqDivision === 'Other' && (
                          <input type="text" className="form-control" style={{ marginTop: '8px' }} placeholder="Type custom division..." value={reqDivisionCustom} onChange={(e) => setReqDivisionCustom(e.target.value)} />
                        )}
                      </div>

                      <div className="form-group">
                        <label>District</label>
                        <select className="form-control" value={reqDistrict} onChange={(e) => { setReqDistrict(e.target.value); setReqArea(''); }} disabled={!reqDivision && reqDivision !== 'Other'}>
                          <option value="">-- Select District --</option>
                          {regionsConfig && reqDivision && regionsConfig[reqDivision] && Object.keys(regionsConfig[reqDivision]).map((dist, i) => (
                            <option key={i} value={dist}>{dist}</option>
                          ))}
                          <option value="Other">Other / Custom...</option>
                        </select>
                        {reqDistrict === 'Other' && (
                          <input type="text" className="form-control" style={{ marginTop: '8px' }} placeholder="Type custom district..." value={reqDistrictCustom} onChange={(e) => setReqDistrictCustom(e.target.value)} />
                        )}
                      </div>

                      <div className="form-group">
                        <label>Area / Sub-area</label>
                        <select className="form-control" value={reqArea} onChange={(e) => setReqArea(e.target.value)} disabled={!reqDistrict && reqDistrict !== 'Other'}>
                          <option value="">-- Select Area --</option>
                          {regionsConfig && reqDivision && reqDistrict && regionsConfig[reqDivision]?.[reqDistrict] && regionsConfig[reqDivision][reqDistrict].map((area, i) => (
                            <option key={i} value={area}>{area}</option>
                          ))}
                          <option value="Other">Other / Custom...</option>
                        </select>
                        {reqArea === 'Other' && (
                          <input type="text" className="form-control" style={{ marginTop: '8px' }} placeholder="Type custom area..." value={reqAreaCustom} onChange={(e) => setReqAreaCustom(e.target.value)} />
                        )}
                      </div>

                      <div className="form-group">
                        <label>Your Business Name / Industry</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Ostad Marketing Agency / Software Solutions"
                          value={reqBusinessName}
                          onChange={(e) => setReqBusinessName(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Contact Mobile / WhatsApp Number *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="+8801700000000"
                          value={reqPhone}
                          onChange={(e) => setReqPhone(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Additional Notes / Specific Requirements</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          placeholder="Any extra info (e.g. need 500+ verified mobile contacts)..."
                          value={reqNotes}
                          onChange={(e) => setReqNotes(e.target.value)}
                        ></textarea>
                      </div>

                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} type="submit" disabled={submittingReq}>
                        {submittingReq ? 'Submitting...' : '🚀 Submit Dataset Request'}
                      </button>
                    </form>
                  </div>

                  {/* My Requests Card */}
                  <div className="card">
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <History size={18} style={{ color: '#a855f7' }} /> My Submitted Dataset Requests
                    </h3>
                    <div style={{ maxHeight: '550px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Req ID</th>
                            <th>Category & Location</th>
                            <th>Business & Phone</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myDatasetRequests.map(r => (
                            <tr key={r.id}>
                              <td><strong>#{r.id}</strong></td>
                              <td>
                                <div><strong>{r.category_query}</strong></div>
                                <small style={{ color: 'var(--text-muted)' }}>{[r.division, r.district, r.area].filter(Boolean).join(', ') || 'Bangladesh'}</small>
                              </td>
                              <td>
                                <div>{r.business_name || '—'}</div>
                                <small style={{ color: '#06b6d4', fontFamily: 'monospace' }}>{r.phone}</small>
                              </td>
                              <td>
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  background: r.status === 'fulfilled' ? 'rgba(34, 197, 94, 0.15)' : r.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                  color: r.status === 'fulfilled' ? '#22c55e' : r.status === 'rejected' ? '#ef4444' : '#eab308'
                                }}>
                                  {r.status === 'fulfilled' ? '✓ Dropped in Catalog' : r.status === 'rejected' ? 'Rejected' : 'Pending'}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {new Date(r.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                          {myDatasetRequests.length === 0 && (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                No dataset requests submitted yet. Use the portal form on the left to request custom lead datasets!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                      {[{ label: 'Done', color: '#06b6d4' },
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

                  {/* Granular Contact Selector Component */}
                  {groupContacts.length > 0 && waRecipientGroup && (
                    <div style={{ marginTop: '12px', marginBottom: '16px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', borderColor: 'rgba(6, 182, 212, 0.4)', background: 'rgba(6, 182, 212, 0.08)', padding: '10px 14px' }}
                        onClick={() => setShowContactSelectorModal(true)}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#06b6d4' }}>
                          <User size={16} /> Filter & Select Target Leads
                        </span>
                        <span style={{ fontSize: '0.78rem', background: '#06b6d4', color: '#000', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                          {selectedContactIds.size} / {groupContacts.length} Selected
                        </span>
                      </button>
                    </div>
                  )}

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
                    <div style={{ border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '8px', marginBottom: '20px', background: 'rgba(0,0,0,0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Session Connection Status:</span><br />
                          <span className="digital-text" style={{ fontSize: '1rem', fontWeight: 'bold', color: waSessionStatus === 'Session Active' ? '#10b981' : '#f59e0b' }}>
                            {waSessionStatus === 'Session Active' ? '● SESSION ACTIVE (Logged In)' : '○ NO ACTIVE SESSION (Scan Required)'}
                          </span>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={checkWhatsAppStatus} title="Refresh Status">
                          🔄 Check
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={setupWhatsAppSession} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }}>
                          <QrCode size={15} /> Launch / Verify Session
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={resetWhatsAppSession} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }}>
                          <RefreshCw size={15} /> Switch / New QR Code
                        </button>
                      </div>
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

                  {/* Anti-Ban Protection Protocol Panel */}
                  <div className="card glowing-panel" style={{ marginTop: '20px', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(6, 78, 59, 0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ margin: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                        <ShieldCheck size={18} /> Active Anti-Ban Protection Protocol
                      </h3>
                      <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '3px 8px', borderRadius: '12px', border: '1px solid #059669', fontWeight: 'bold' }}>
                        ● 100% PROTECTED
                      </span>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '15px', lineHeight: '1.4' }}>
                      Our automated dispatch engine executes strict anti-ban algorithms to protect your WhatsApp number from spam filters and rate-limiting blocks:
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 'bold', color: '#6ee7b7', marginBottom: '3px' }}>
                          <Clock size={14} /> Human Jitter Delays
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Randomized 15s to 45s typing interval between every message dispatch.
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 'bold', color: '#6ee7b7', marginBottom: '3px' }}>
                          <Sparkles size={14} /> Spintax & Personalization
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Dynamic name substitution prevents uniform bulk message fingerprinting.
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 'bold', color: '#6ee7b7', marginBottom: '3px' }}>
                          <Activity size={14} /> Batch Rate Limiting
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Enforces 50 messages/hour cap with automatic cool-down breaks.
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 'bold', color: '#6ee7b7', marginBottom: '3px' }}>
                          <Bot size={14} /> Auto-Pause Safeguard
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Instantly pauses campaign if WhatsApp socket detects connection instability.
                        </div>
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

                  {/* Granular Contact Selector Component for Email */}
                  {groupContacts.length > 0 && emailRecipientGroup && (
                    <div style={{ marginTop: '12px', marginBottom: '16px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', borderColor: 'rgba(129, 140, 248, 0.4)', background: 'rgba(129, 140, 248, 0.08)', padding: '10px 14px' }}
                        onClick={() => setShowContactSelectorModal(true)}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#818cf8' }}>
                          <User size={16} /> Filter & Select Target Leads
                        </span>
                        <span style={{ fontSize: '0.78rem', background: '#818cf8', color: '#000', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                          {selectedContactIds.size} / {groupContacts.length} Selected
                        </span>
                      </button>
                    </div>
                  )}

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

            {/* Pane: Dataset Requests Manager */}
            {adminSubTab === 'dataset_requests' && (
              <div className="card glowing-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Inbox size={20} style={{ color: '#eab308' }} /> User Dataset Requests Console ({adminDatasetRequests.filter(r => r.status === 'pending').length} Pending)
                  </h3>
                  <button className="btn btn-secondary btn-sm" onClick={loadAdminDatasetRequests}>
                    <RefreshCw size={13} /> Refresh Requests
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Req ID</th>
                        <th>User / Email</th>
                        <th>Phone</th>
                        <th>Business Name</th>
                        <th>Category / Location</th>
                        <th>Notes</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminDatasetRequests.map(req => (
                        <tr key={req.id}>
                          <td><strong>#{req.id}</strong></td>
                          <td>
                            <div><strong>{req.full_name}</strong></div>
                            <small style={{ color: 'var(--text-muted)' }}>{req.user_email}</small>
                          </td>
                          <td className="digital-text" style={{ color: '#06b6d4' }}>{req.phone}</td>
                          <td>{req.business_name || '—'}</td>
                          <td>
                            <div><strong>{req.category_query}</strong></div>
                            <small style={{ color: 'var(--text-muted)' }}>{[req.division, req.district, req.area].filter(Boolean).join(', ') || 'Bangladesh'}</small>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>{req.additional_notes || '—'}</td>
                          <td>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              background: req.status === 'fulfilled' ? 'rgba(34, 197, 94, 0.15)' : req.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                              color: req.status === 'fulfilled' ? '#22c55e' : req.status === 'rejected' ? '#ef4444' : '#eab308'
                            }}>
                              {req.status === 'fulfilled' ? 'Fulfilled' : req.status === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                title="Fulfill request and send notification"
                                onClick={() => openRequestActionModal(req, 'fulfilled')}
                              >
                                🚀 Fulfill
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                title="Reject request and send notification"
                                onClick={() => openRequestActionModal(req, 'rejected')}
                              >
                                ❌ Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {adminDatasetRequests.length === 0 && (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No dataset requests submitted by users yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pane: Payment Approvals */}
            {adminSubTab === 'payments' && (
              <div className="card">
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💳 bKash & Pathao Pay Payment Approval Queue
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Customer</th>
                        <th>Method</th>
                        <th>Package</th>
                        <th>Credits</th>
                        <th>Amount BDT</th>
                        <th>Sender Phone</th>
                        <th>TrxID</th>
                        <th>Status</th>
                        <th>Submitted At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminPaymentRequests.map((req) => (
                        <tr key={req.id}>
                          <td>#{req.id}</td>
                          <td>
                            <div><strong>{req.user_name || req.full_name}</strong></div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.email}</div>
                          </td>
                          <td>
                            <span style={{
                              background: (req.payment_method || 'bkash') === 'bkash' ? 'rgba(226, 19, 110, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: (req.payment_method || 'bkash') === 'bkash' ? '#e2136e' : '#ef4444',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>
                              {(req.payment_method || 'bkash').toUpperCase()}
                            </span>
                          </td>
                          <td>{req.package_name}</td>
                          <td><span className="digital-text" style={{ color: '#eab308' }}>+{req.credits_requested}</span> CR</td>
                          <td><strong>৳{req.amount_bdt}</strong></td>
                          <td>{req.bkash_number}</td>
                          <td><strong style={{ color: '#06b6d4', letterSpacing: '1px' }}>{req.transaction_id}</strong></td>
                          <td>
                            {req.status === 'pending' ? (
                              <span style={{ color: '#eab308', background: 'rgba(234, 179, 8, 0.15)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>⏳ Pending</span>
                            ) : req.status === 'approved' ? (
                              <span style={{ color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>✅ Approved</span>
                            ) : (
                              <span style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>❌ Rejected</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.created_at}</td>
                          <td>
                            {req.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => approveAdminPayment(req.id)}
                                >
                                  ✅ Approve & Add Credits
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => rejectAdminPayment(req.id)}
                                >
                                  ❌ Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Processed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {adminPaymentRequests.length === 0 && (
                        <tr>
                          <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No payment requests found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pane: Payment Gateway & QR Settings */}
            {adminSubTab === 'gateway' && (
              <div className="card">
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#06b6d4' }}>
                  ⚙️ Payment Gateway Numbers, Account Types & QR Code Uploader
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Configure live bKash and Pathao Pay numbers, account types, and upload custom QR code images for your customers.
                </p>

                <form onSubmit={handleSavePaymentSettings}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    {/* bKash Settings Box */}
                    <div style={{ background: 'rgba(226, 19, 110, 0.05)', border: '1px solid #e2136e', padding: '20px', borderRadius: '12px' }}>
                      <h4 style={{ color: '#e2136e', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={bkashLogoImg} alt="bKash" style={{ height: '24px' }} /> bKash Gateway Settings
                      </h4>

                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <label>bKash Phone Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={adminBkashNumber}
                          onChange={(e) => setAdminBkashNumber(e.target.value)}
                          placeholder="Enter bKash phone number..."
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <label>bKash Account Type</label>
                        <input
                          type="text"
                          className="form-control"
                          value={adminBkashAccountType}
                          onChange={(e) => setAdminBkashAccountType(e.target.value)}
                          placeholder="e.g. Personal (Send Money)"
                        />
                      </div>

                      <div className="form-group">
                        <label>Upload New bKash QR Code (Image)</label>
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          onChange={(e) => setAdminBkashQrFile(e.target.files[0])}
                        />
                        {paymentConfig.bkash_qr_url && (
                          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#22c55e' }}>
                            ✓ Current QR: <a href={`${API_BASE}${paymentConfig.bkash_qr_url}`} target="_blank" rel="noreferrer" style={{ color: '#06b6d4' }}>View Current bKash QR Image</a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pathao Pay Settings Box */}
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid #ef4444', padding: '20px', borderRadius: '12px' }}>
                      <h4 style={{ color: '#ef4444', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={pathaoLogoImg} alt="Pathao Pay" style={{ height: '24px' }} /> Pathao Pay Gateway Settings
                      </h4>

                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <label>Pathao Pay Phone Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={adminPathaoNumber}
                          onChange={(e) => setAdminPathaoNumber(e.target.value)}
                          placeholder="Enter Pathao Pay phone number..."
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <label>Pathao Pay Account Type</label>
                        <input
                          type="text"
                          className="form-control"
                          value={adminPathaoAccountType}
                          onChange={(e) => setAdminPathaoAccountType(e.target.value)}
                          placeholder="e.g. Personal / Merchant"
                        />
                      </div>

                      <div className="form-group">
                        <label>Upload New Pathao Pay QR Code (Image)</label>
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          onChange={(e) => setAdminPathaoQrFile(e.target.files[0])}
                        />
                        {paymentConfig.pathao_qr_url && (
                          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#22c55e' }}>
                            ✓ Current QR: <a href={`${API_BASE}${paymentConfig.pathao_qr_url}`} target="_blank" rel="noreferrer" style={{ color: '#06b6d4' }}>View Current Pathao QR Image</a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button className="btn btn-primary" style={{ padding: '12px 30px', fontSize: '1rem' }} type="submit">
                    💾 Save Payment Gateway Settings & QR Codes
                  </button>
                </form>
              </div>
            )}

            {/* Pane: Promotion Requests */}
            {adminSubTab === 'requests' && (
              <div className="card">
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📥 Dataset Promotion Requests Queue
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Job ID</th>
                        <th>User Email</th>
                        <th>Original Query</th>
                        <th>Proposed Name</th>
                        <th>Proposed Category</th>
                        <th>Total Rows</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminPromotionRequests.map((req) => (
                        <tr key={req.id}>
                          <td>#{req.id}</td>
                          <td>{req.user_email || 'Unknown User'}</td>
                          <td><strong>{req.query}</strong></td>
                          <td><span style={{ color: '#06b6d4' }}>{req.proposed_name || req.query}</span></td>
                          <td><span style={{ color: '#eab308' }}>{req.proposed_category || 'General'}</span></td>
                          <td><span className="digital-text">{req.row_count}</span> rows</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => approveAdminPromotionRequest(req.id)}
                              >
                                ✅ Approve & Publish
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => rejectAdminPromotionRequest(req.id)}
                              >
                                ❌ Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {adminPromotionRequests.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No dataset promotion requests pending approval.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
                      <label>Upload Dataset File *</label>
                      <input type="file" className="form-control" onChange={(e) => setUploadFile(e.target.files[0])} required />
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} type="submit">Upload Dataset</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: UPGRADE PACKAGE MODULE ══ */}
        {currentTab === 'upgrade' && (
          <div>
            {/* Header Banner */}
            <div className="card glowing-panel" style={{ borderColor: '#eab308', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid rgba(234, 179, 8, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} /> UPGRADE MEMBERSHIP & CREDITS
                  </span>
                  <h2 style={{ color: '#fff', marginTop: '10px', marginBottom: '6px' }}>
                    Scale Your Lead Scraper & Outreach Campaigns
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                    Purchase credit packages to unlock full dataset phone numbers, build private lead catalogues, and launch automated WhatsApp/Email campaigns.
                  </p>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CURRENT BALANCE</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#eab308', margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Coins size={22} /> {user?.credits || 0} CR
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Account Active
                  </div>
                </div>
              </div>
            </div>

            {/* Package Selection Grid */}
            <h3 style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShoppingCart size={22} style={{ color: '#06b6d4' }} /> Select Your Preferred Upgrade Package
            </h3>

            {/* 3-Column Standard Package Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              {paymentConfig.packages?.map(pkg => (
                <div
                  key={pkg.id}
                  className={`card ${pkg.popular ? 'glowing-panel' : ''}`}
                  style={{
                    border: pkg.popular ? '2px solid #eab308' : '1px solid var(--border-subtle)',
                    background: pkg.popular ? 'rgba(234, 179, 8, 0.05)' : 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    padding: '24px'
                  }}
                >
                  {pkg.popular && (
                    <span style={{ position: 'absolute', top: '-12px', right: '16px', background: '#eab308', color: '#000', fontSize: '0.7rem', fontWeight: '900', padding: '3px 10px', borderRadius: '12px' }}>
                      MOST POPULAR
                    </span>
                  )}

                  <div>
                    <h4 style={{ color: '#fff', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{pkg.name}</span>
                      {pkg.badge && !pkg.popular && (
                        <span style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                          {pkg.badge}
                        </span>
                      )}
                    </h4>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: '#eab308', margin: '10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Coins size={24} /> {pkg.credits} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Credits</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>
                      ৳{pkg.price_bdt} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>BDT</span>
                    </div>
                    {pkg.save_badge && (
                      <div style={{ marginBottom: '12px' }}>
                        <span className="animated-save-badge">{pkg.save_badge}</span>
                      </div>
                    )}
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
                      {pkg.description}
                    </p>

                    {pkg.features && pkg.features.length > 0 && (
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pkg.features.map((feat, idx) => (
                          <li key={idx} style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={14} style={{ color: '#22c55e', flexShrink: 0 }} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px', background: pkg.popular ? 'linear-gradient(135deg, #eab308, #d97706)' : 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: pkg.popular ? '#000' : '#fff', fontWeight: 'bold', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => {
                      setSelectedPackage(pkg);
                      setPaymentStep(1);
                      setShowPaymentModal(true);
                    }}
                  >
                    <Sparkles size={16} /> Upgrade to {pkg.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Dedicated Custom Upgrade Section Below */}
            {(() => {
              const customCfg = paymentConfig?.custom_package || {};
              const customRate = customCfg.price_per_credit_bdt || 7.5;
              const minC = customCfg.min_credits || 5;
              const maxC = customCfg.max_credits || 500;
              const stepC = customCfg.step || 10;
              const customName = customCfg.name || 'Custom Upgrade';
              const customDesc = customCfg.description || 'Select the exact credit amount your team requires:';
              const customFeats = customCfg.features || [];

              return (
                <div className="card glowing-panel" style={{ border: '1px solid #06b6d4', background: 'rgba(6, 182, 212, 0.04)', padding: '28px', marginBottom: '32px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={20} style={{ color: '#06b6d4' }} /> {customName}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                        {customDesc}
                      </p>

                      <div className="form-group" style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>Select Custom Credits:</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number"
                              className="form-control"
                              style={{ width: '110px', padding: '6px 10px', textAlign: 'center', fontWeight: 'bold', color: '#06b6d4', fontSize: '1rem' }}
                              value={customCredits}
                              onChange={(e) => setCustomCredits(Math.max(minC, parseInt(e.target.value) || minC))}
                              min={minC}
                              max={maxC * 2}
                            />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>CR</span>
                          </div>
                        </div>

                        {/* Interactive Range Seekbar */}
                        <input
                          type="range"
                          min={minC}
                          max={maxC}
                          step={stepC}
                          value={customCredits}
                          onChange={(e) => setCustomCredits(parseInt(e.target.value))}
                          style={{
                            width: '100%',
                            height: '8px',
                            borderRadius: '4px',
                            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${Math.min(100, (customCredits / maxC) * 100)}%, rgba(255,255,255,0.1) ${Math.min(100, (customCredits / maxC) * 100)}%, rgba(255,255,255,0.1) 100%)`,
                            outline: 'none',
                            cursor: 'pointer',
                            margin: '14px 0 10px 0',
                            accentColor: '#06b6d4'
                          }}
                        />

                        {/* Quick Seekbar Presets */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                          {[10, 50, 100, 200, 500].map((val) => (
                            <button
                              key={val}
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{
                                padding: '4px 12px',
                                fontSize: '0.8rem',
                                background: parseInt(customCredits) === val ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255,255,255,0.03)',
                                borderColor: parseInt(customCredits) === val ? '#06b6d4' : 'var(--border-subtle)',
                                color: parseInt(customCredits) === val ? '#06b6d4' : 'var(--text-secondary)'
                              }}
                              onClick={() => setCustomCredits(val)}
                            >
                              {val} CR
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Pricing Summary & Benefits */}
                    <div style={{ background: 'rgba(10, 14, 23, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                          Custom Order Total
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: '#06b6d4', marginBottom: '4px' }}>
                          ৳{(parseInt(customCredits) || 0) * customRate} BDT
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                          @ ৳{customRate} BDT / Credit ({customCredits} Credits)
                        </div>

                        {customFeats && customFeats.length > 0 && (
                          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {customFeats.map((feat, idx) => (
                              <li key={idx} style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={14} style={{ color: '#06b6d4', flexShrink: 0 }} />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', fontWeight: 'bold', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        onClick={() => {
                          setSelectedPackage('custom');
                          setPaymentStep(1);
                          setShowPaymentModal(true);
                        }}
                      >
                        <Zap size={16} /> Purchase Custom Credits (৳{(parseInt(customCredits) || 0) * customRate} BDT)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Package Benefits & Instructions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '20px' }}>
                <h4 style={{ color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} style={{ color: '#22c55e' }} /> Package Member Benefits
                </h4>
                <ul style={{ paddingLeft: '0', listStyle: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '2' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={15} style={{ color: '#22c55e', flexShrink: 0 }} /> Unlock full leads catalog with real phone numbers</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={15} style={{ color: '#22c55e', flexShrink: 0 }} /> Save custom scraped leads directly into private datasets</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={15} style={{ color: '#22c55e', flexShrink: 0 }} /> Send automated WhatsApp marketing messages</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={15} style={{ color: '#22c55e', flexShrink: 0 }} /> Send custom HTML email marketing campaigns</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={15} style={{ color: '#22c55e', flexShrink: 0 }} /> Credits never expire and roll over automatically</li>
                </ul>
              </div>

              <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '20px' }}>
                <h4 style={{ color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} style={{ color: '#06b6d4' }} /> Secure Instant Verification
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  Payments are accepted via <strong>bKash Send Money</strong> and <strong>Pathao Pay</strong> with official QR codes. Once you submit your Transaction ID (TrxID), our Superadmin team verifies and credits your account balance.
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => { setPaymentModalTab('history'); setShowPaymentModal(true); loadMyPaymentRequests(); }}
                >
                  <History size={15} /> Track My Submitted Upgrade Requests
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: CUSTOMERS & CREDITS MANAGER ══ */}
        {(currentTab === 'users' || (currentTab === 'admin' && adminSubTab === 'users')) && user && (user.role === 'admin' || user.role === 'superadmin') && (
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
                        {u.warning_message && (
                          <div style={{ fontSize: '0.75rem', color: '#ffb000', marginTop: '2px', fontWeight: 'bold' }}>
                            ⚠️ Warning: "{u.warning_message}"
                          </div>
                        )}
                        {u.created_at && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joined: {u.created_at.split(' ')[0]}</div>}
                      </td>
                      <td>
                        <select
                          className="form-control"
                          style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem', background: u.role === 'superadmin' ? 'rgba(168, 85, 247, 0.15)' : u.role === 'admin' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', borderColor: u.role === 'superadmin' ? '#a855f7' : u.role === 'admin' ? '#3b82f6' : 'var(--border-subtle)' }}
                          value={u.role}
                          disabled={user.role === 'admin' && (u.role === 'admin' || u.role === 'superadmin')}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          {user.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
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
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            className={`btn btn-sm ${u.is_banned === 1 ? 'btn-primary' : 'btn-danger'}`}
                            style={{ background: u.is_banned === 1 ? '#22c55e' : undefined, borderColor: u.is_banned === 1 ? '#22c55e' : undefined, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            disabled={user.role === 'admin' && (u.role === 'admin' || u.role === 'superadmin')}
                            onClick={() => handleBanUser(u.id, false, "", u.is_banned)}
                            title={user.role === 'admin' && (u.role === 'admin' || u.role === 'superadmin') ? "Admins cannot ban other Admins or Superadmins" : u.is_banned === 1 ? "Unban User Account" : "Ban User Account"}
                          >
                            {u.is_banned === 1 ? <UserCheck size={16} /> : <Ban size={16} />}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ background: '#7f1d1d', borderColor: '#b91c1c', color: '#fca5a5', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handleUnregisterUser(u.id, u.email)}
                            title="Permanently delete user account from DB"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ borderColor: u.warning_message ? '#ffb000' : 'var(--border-subtle)', color: u.warning_message ? '#ffb000' : '#fff', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => openWarningModal(u.id, u.email, u.warning_message)}
                            title={u.warning_message ? "Warning Active (Click to edit or clear)" : "Issue Application Warning Banner"}
                          >
                            <AlertTriangle size={16} />
                          </button>
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
        {currentTab === 'security' && user && (user.role === 'admin' || user.role === 'superadmin') && (
          <div>
            <div className="card glowing-panel" style={{ borderColor: 'rgba(239, 68, 68, 0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Shield size={24} /> Security Control & Anti-Leak Module
                </h2>
                <button className="btn btn-secondary btn-sm" onClick={() => { loadAdminViolations(); loadAdminUsers(); }} title="Fetch and reload latest security violations">
                  🔄 Fetch Violations
                </button>
              </div>
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
                  {adminViolations.map(v => {
                    const targetUserObj = adminUsers.find(u => u.id === v.user_id);
                    const isTargetBanned = targetUserObj ? targetUserObj.is_banned === 1 : false;
                    const isTargetAdmin = targetUserObj ? (targetUserObj.role === 'admin' || targetUserObj.role === 'superadmin') : false;
                    const canBanTarget = user.role === 'superadmin' || !isTargetAdmin;

                    return (
                      <tr key={v.id}>
                        <td>{v.created_at ? new Date(v.created_at.includes('T') ? v.created_at : v.created_at.replace(' ', 'T')).toLocaleString() : 'N/A'}</td>
                        <td><strong>{v.email}</strong></td>
                        <td style={{ color: '#ef4444' }}>{v.violation_type}</td>
                        <td className="digital-text">{v.ip_address}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              className={`btn btn-sm ${isTargetBanned ? 'btn-primary' : 'btn-danger'}`}
                              style={{ background: isTargetBanned ? '#22c55e' : undefined, borderColor: isTargetBanned ? '#22c55e' : undefined, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              disabled={!canBanTarget}
                              onClick={() => handleBanUser(v.user_id, true, v.ip_address, isTargetBanned ? 1 : 0)}
                              title={!canBanTarget ? "Admins cannot ban other Admins or Superadmins" : isTargetBanned ? "Unban account & remove IP ban" : `Ban IP address (${v.ip_address}) & account`}
                            >
                              {isTargetBanned ? <UserCheck size={16} /> : <Ban size={16} />}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ background: '#7f1d1d', borderColor: '#b91c1c', color: '#fca5a5', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              disabled={!canBanTarget}
                              onClick={() => handleUnregisterUser(v.user_id, v.email)}
                              title="Permanently delete user account from database"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ borderColor: '#ffb000', color: '#ffb000', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => openWarningModal(v.user_id, v.email, '')}
                              title="Issue application-level warning banner"
                            >
                              <AlertTriangle size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {adminViolations.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <Shield size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
                        <br />
                        No security violations logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ STEPPED PAYMENT & PACKAGE PURCHASE MODAL ══ */}
        {showPaymentModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>
            <div className="card glowing-panel" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #06b6d4', padding: '28px', borderRadius: '16px', background: '#090d16' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CreditCard size={22} style={{ color: '#06b6d4' }} /> Buy Credits & Payment Gateway
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Instant bKash / Pathao Pay manual payment & Superadmin credit assignment
                  </span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPaymentModal(false)}>✕ Close</button>
              </div>

              {/* Top Tabs */}
              <div className="tabs" style={{ marginBottom: '24px' }}>
                <button
                  className={`tab-btn ${paymentModalTab === 'buy' ? 'active' : ''}`}
                  onClick={() => setPaymentModalTab('buy')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ShoppingCart size={15} /> Purchase Wizard (4 Steps)
                </button>
                <button
                  className={`tab-btn ${paymentModalTab === 'history' ? 'active' : ''}`}
                  onClick={() => { setPaymentModalTab('history'); loadMyPaymentRequests(); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <History size={15} /> My Submissions & Order Tracker ({myPaymentRequests.length})
                </button>
              </div>

              {paymentModalTab === 'buy' && (
                <div>
                  {/* Stepper Progress Bar Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', position: 'relative', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ position: 'absolute', top: '18px', left: '10%', right: '10%', height: '2px', background: 'var(--border-subtle)', zIndex: 1 }} />
                    <div style={{ position: 'absolute', top: '18px', left: '10%', width: paymentStep === 1 ? '0%' : paymentStep === 2 ? '33%' : paymentStep === 3 ? '66%' : '80%', height: '2px', background: '#06b6d4', transition: 'all 0.3s ease', zIndex: 1 }} />

                    {[
                      { step: 1, label: '1. Package & Method' },
                      { step: 2, label: '2. Pay & QR Code' },
                      { step: 3, label: '3. Details & TrxID' },
                      { step: 4, label: '4. Admin Approval' }
                    ].map((s) => (
                      <div key={s.step} style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => { if (s.step < paymentStep) setPaymentStep(s.step); }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: paymentStep >= s.step ? '#06b6d4' : '#1e293b',
                          color: paymentStep >= s.step ? '#000' : 'var(--text-muted)',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: paymentStep === s.step ? '3px solid #fff' : 'none',
                          boxShadow: paymentStep >= s.step ? '0 0 12px rgba(6,182,212,0.5)' : 'none'
                        }}>
                          {paymentStep > s.step ? <Check size={16} /> : s.step}
                        </div>
                        <span style={{ fontSize: '0.75rem', marginTop: '6px', color: paymentStep >= s.step ? '#fff' : 'var(--text-muted)', fontWeight: paymentStep === s.step ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* STEP 1: Select Package & Payment Method */}
                  {paymentStep === 1 && (
                    <div>
                      <h4 style={{ marginBottom: '14px', color: '#fff' }}>Step 1: Choose Credit Package & Payment Method</h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        {paymentConfig.packages?.map(pkg => (
                          <div
                            key={pkg.id}
                            onClick={() => setSelectedPackage(pkg)}
                            className="card"
                            style={{
                              cursor: 'pointer',
                              border: selectedPackage?.id === pkg.id ? '2px solid #eab308' : '1px solid var(--border-subtle)',
                              background: selectedPackage?.id === pkg.id ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255,255,255,0.02)',
                              position: 'relative',
                              padding: '16px'
                            }}
                          >
                            {pkg.popular && (
                              <span style={{ position: 'absolute', top: '-10px', right: '12px', background: '#eab308', color: '#000', fontSize: '0.65rem', fontWeight: '900', padding: '2px 8px', borderRadius: '10px' }}>
                                BEST VALUE
                              </span>
                            )}
                            <h5 style={{ margin: '0 0 8px 0', color: '#fff' }}>{pkg.name}</h5>
                            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#eab308', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Coins size={18} /> {pkg.credits} Credits
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#fff', marginTop: '6px' }}>
                              ৳{pkg.price_bdt} BDT
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', marginBottom: 0 }}>
                              {pkg.description}
                            </p>
                          </div>
                        ))}

                        {/* Custom Amount Option */}
                        <div
                          onClick={() => setSelectedPackage('custom')}
                          className="card"
                          style={{
                            cursor: 'pointer',
                            border: selectedPackage === 'custom' ? '2px solid #06b6d4' : '1px solid var(--border-subtle)',
                            background: selectedPackage === 'custom' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255,255,255,0.02)',
                            padding: '16px'
                          }}
                        >
                          <h5 style={{ margin: '0 0 8px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}><Settings size={16} /> Custom Amount</h5>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', marginBottom: '6px' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Select Credits:</label>
                            <input
                              type="number"
                              className="form-control"
                              style={{ width: '80px', padding: '2px 6px', textAlign: 'center', fontWeight: 'bold', color: '#06b6d4', fontSize: '0.85rem' }}
                              value={customCredits}
                              onChange={(e) => { setCustomCredits(Math.max(10, parseInt(e.target.value) || 10)); setSelectedPackage('custom'); }}
                              min="10"
                            />
                          </div>

                          <input
                            type="range"
                            min="10"
                            max="5000"
                            step="10"
                            value={customCredits}
                            onChange={(e) => { setCustomCredits(parseInt(e.target.value)); setSelectedPackage('custom'); }}
                            style={{
                              width: '100%',
                              height: '6px',
                              borderRadius: '3px',
                              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${Math.min(100, (customCredits / 5000) * 100)}%, rgba(255,255,255,0.1) ${Math.min(100, (customCredits / 5000) * 100)}%, rgba(255,255,255,0.1) 100%)`,
                              outline: 'none',
                              cursor: 'pointer',
                              margin: '8px 0',
                              accentColor: '#06b6d4'
                            }}
                          />

                          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#06b6d4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <span>৳{(parseInt(customCredits) || 0) * (paymentConfig?.custom_package?.price_per_credit_bdt || 10)} BDT</span>
                            <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{customCredits} CR (@ ৳{paymentConfig?.custom_package?.price_per_credit_bdt || 10}/CR)</small>
                          </div>
                        </div>
                      </div>

                      {/* Payment Method Selector */}
                      <h5 style={{ marginBottom: '12px', color: '#fff' }}>Select Payment Method:</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        <div
                          onClick={() => setSelectedMethod('bkash')}
                          style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: selectedMethod === 'bkash' ? '2px solid #e2136e' : '1px solid var(--border-subtle)',
                            background: selectedMethod === 'bkash' ? 'rgba(226, 19, 110, 0.14)' : 'rgba(255,255,255,0.02)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ width: '60px', height: '44px', borderRadius: '8px', background: '#fff', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(226, 19, 110, 0.3)' }}>
                            <img src={bkashLogoImg} alt="bKash Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>bKash Send Money</div>
                            <div style={{ fontSize: '0.75rem', color: '#e2136e', fontWeight: 'bold' }}>Personal / Send Money</div>
                          </div>
                        </div>

                        <div
                          onClick={() => setSelectedMethod('pathao_pay')}
                          style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: selectedMethod === 'pathao_pay' ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
                            background: selectedMethod === 'pathao_pay' ? 'rgba(239, 68, 68, 0.14)' : 'rgba(255,255,255,0.02)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ width: '60px', height: '44px', borderRadius: '8px', background: '#fff', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
                            <img src={pathaoLogoImg} alt="Pathao Pay Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>Pathao Pay</div>
                            <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>Personal / Merchant</div>
                          </div>
                        </div>
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        onClick={() => {
                          if (!selectedPackage) setSelectedPackage('custom');
                          setPaymentStep(2);
                        }}
                      >
                        Proceed to Step 2: Payment Details <ArrowRight size={16} />
                      </button>
                    </div>
                  )}

                  {/* STEP 2: Pay & QR Code */}
                  {paymentStep === 2 && (
                    <div>
                      <h4 style={{ marginBottom: '14px', color: '#fff' }}>
                        Step 2: Pay via {selectedMethod === 'bkash' ? 'bKash' : 'Pathao Pay'} QR & Number
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        {/* Account Details Box */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', padding: '20px', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <div style={{ width: '40px', height: '30px', background: '#fff', borderRadius: '6px', padding: '2px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                              <img src={selectedMethod === 'bkash' ? bkashLogoImg : pathaoLogoImg} alt={selectedMethod} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            </div>
                            <div style={{ fontSize: '0.75rem', color: selectedMethod === 'bkash' ? '#e2136e' : '#ef4444', fontWeight: 'bold', textTransform: 'uppercase' }}>
                              Official {selectedMethod === 'bkash' ? 'bKash' : 'Pathao Pay'} Number
                            </div>
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', margin: '8px 0', letterSpacing: '1px' }}>
                            {selectedMethod === 'bkash' ? paymentConfig.bkash_number : paymentConfig.pathao_number}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            Account Type: <strong>{selectedMethod === 'bkash' ? paymentConfig.bkash_account_type : paymentConfig.pathao_account_type}</strong>
                          </div>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{
                              width: '100%',
                              background: copiedNumber ? '#22c55e' : (selectedMethod === 'bkash' ? '#e2136e' : '#ef4444'),
                              color: '#fff',
                              borderColor: copiedNumber ? '#22c55e' : (selectedMethod === 'bkash' ? '#e2136e' : '#ef4444'),
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              whiteSpace: 'nowrap'
                            }}
                            onClick={() => {
                              const numToCopy = selectedMethod === 'bkash' ? paymentConfig.bkash_number : paymentConfig.pathao_number;
                              navigator.clipboard.writeText((numToCopy || '').replace(/[^0-9+]/g, ''));
                              setCopiedNumber(true);
                              showToast('Number copied to clipboard!', 'success');
                              setTimeout(() => setCopiedNumber(false), 3000);
                            }}
                          >
                            {copiedNumber ? <><CheckCircle2 size={15} /> Copied to Clipboard!</> : <><Copy size={15} /> Copy Number</>}
                          </button>
                        </div>

                        {/* QR Code Container */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', padding: '20px', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <h5 style={{ margin: '0 0 10px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}><QrCode size={16} /> Scan {selectedMethod === 'bkash' ? 'bKash' : 'Pathao Pay'} QR Code</h5>

                          <div style={{ width: '160px', height: '160px', background: '#fff', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
                            {selectedMethod === 'bkash' ? (
                              paymentConfig.bkash_qr_url ? (
                                <img
                                  src={`${API_BASE}${paymentConfig.bkash_qr_url}`}
                                  alt="bKash QR Code"
                                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                />
                              ) : (
                                <div style={{ color: '#e2136e', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold' }}>
                                  <QrCode size={24} style={{ marginBottom: '4px' }} /><br />
                                  bKash QR<br />
                                  <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 'normal' }}>
                                    Use Send Money to:<br />
                                    <strong style={{ color: '#e2136e' }}>{paymentConfig.bkash_number}</strong>
                                  </span>
                                </div>
                              )
                            ) : (
                              paymentConfig.pathao_qr_url ? (
                                <img
                                  src={`${API_BASE}${paymentConfig.pathao_qr_url}`}
                                  alt="Pathao Pay QR Code"
                                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                />
                              ) : (
                                <img
                                  src={pathaoQrImg}
                                  alt="Pathao Pay QR Code"
                                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                />
                              )
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            {selectedMethod === 'pathao_pay' ? 'Scan with Pathao Pay App' : 'Send Money via bKash App'}
                          </span>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(6, 182, 212, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.3)', marginBottom: '24px', fontSize: '0.85rem' }}>
                        Payable Amount: <strong style={{ color: '#06b6d4', fontSize: '1.1rem' }}>৳{selectedPackage && selectedPackage !== 'custom' ? selectedPackage.price_bdt : (parseInt(customCredits) || 0) * 10} BDT</strong> for <strong>{selectedPackage && selectedPackage !== 'custom' ? selectedPackage.credits : customCredits} Credits</strong>.
                      </div>

                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap' }} onClick={() => setPaymentStep(1)}>
                          <ArrowLeft size={16} /> Back to Step 1
                        </button>
                        <button className="btn btn-primary" style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', whiteSpace: 'nowrap' }} onClick={() => setPaymentStep(3)}>
                          Payment Complete <ArrowRight size={16} /> Move to Step 3 for Transaction ID
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Reference & User Details */}
                  {paymentStep === 3 && (
                    <div>
                      <h4 style={{ marginBottom: '14px', color: '#fff' }}>Step 3: Reference & Transaction Details</h4>

                      <form onSubmit={handlePaymentSubmit} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                          <div className="form-group">
                            <label>Customer Full Name *</label>
                            <input
                              type="text"
                              className="form-control"
                              value={refUserName}
                              onChange={(e) => setRefUserName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Customer Email Address *</label>
                            <input
                              type="email"
                              className="form-control"
                              value={refUserEmail}
                              onChange={(e) => setRefUserEmail(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Sender Phone Number *</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. 01824500704"
                              value={refUserPhone}
                              onChange={(e) => setRefUserPhone(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>{selectedMethod === 'bkash' ? 'bKash' : 'Pathao Pay'} Transaction ID (TrxID) *</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. 8N7A6B5C4D"
                              value={refTrxId}
                              onChange={(e) => setRefTrxId(e.target.value)}
                              required
                              style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                            />
                          </div>
                        </div>

                        <div style={{ background: 'rgba(234, 179, 8, 0.08)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.3)', marginBottom: '20px', fontSize: '0.85rem', color: '#eab308' }}>
                          Reference Summary: Requesting <strong>{selectedPackage && selectedPackage !== 'custom' ? selectedPackage.credits : customCredits} Credits</strong> via <strong>{selectedMethod.toUpperCase()}</strong> (TrxID: <strong>{refTrxId || '---'}</strong>)
                        </div>

                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <button type="button" className="btn btn-secondary" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap' }} onClick={() => setPaymentStep(2)}>
                            <ArrowLeft size={16} /> Back to Step 2
                          </button>
                          <button type="submit" className="btn btn-primary" style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg, #e2136e, #be123c)', borderColor: '#e2136e', fontSize: '1rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            Submit for Verification <ArrowRight size={16} />
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* STEP 4: Admin Verification & Status */}
                  {paymentStep === 4 && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.2)', border: '2px solid #eab308', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                        <Clock size={36} />
                      </div>

                      <h3 style={{ color: '#fff', marginBottom: '8px' }}>Step 4: Pending Admin Verification</h3>
                      <p style={{ color: 'var(--text-secondary)', maxWidth: '550px', margin: '0 auto 24px auto', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Your payment reference proof has been recorded successfully. Superadmin is reviewing your Transaction ID (TrxID) and will assign <strong>{selectedPackage && selectedPackage !== 'custom' ? selectedPackage.credits : customCredits} Credits</strong> to your account shortly.
                      </p>

                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', padding: '20px', borderRadius: '12px', maxWidth: '500px', margin: '0 auto 28px auto', textAlign: 'left' }}>
                        <div style={{ fontSize: '0.85rem', marginBottom: '6px' }}>Customer Name: <strong>{refUserName}</strong></div>
                        <div style={{ fontSize: '0.85rem', marginBottom: '6px' }}>Payment Method: <strong>{selectedMethod.toUpperCase()}</strong></div>
                        <div style={{ fontSize: '0.85rem', marginBottom: '6px' }}>Sender Number: <strong>{refUserPhone}</strong></div>
                        <div style={{ fontSize: '0.85rem', marginBottom: '6px' }}>Transaction ID: <strong style={{ color: '#06b6d4', letterSpacing: '1px' }}>{refTrxId}</strong></div>
                        <div style={{ fontSize: '0.85rem' }}>Credits Requested: <strong style={{ color: '#eab308' }}>+{selectedPackage && selectedPackage !== 'custom' ? selectedPackage.credits : customCredits} CR</strong></div>
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ padding: '12px 30px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => { setPaymentModalTab('history'); loadMyPaymentRequests(); }}
                      >
                        <History size={16} /> Track Order Status in Submissions Log
                      </button>
                    </div>
                  )}
                </div>
              )}

              {paymentModalTab === 'history' && (
                <div>
                  <h4 style={{ marginBottom: '16px', color: '#fff' }}>Your Payment Submissions & Order Tracker</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {myPaymentRequests.map(req => (
                      <div key={req.id} className="card" style={{ padding: '20px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <strong style={{ color: '#fff', fontSize: '1rem' }}>{req.package_name}</strong>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '10px' }}>Request #{req.id}</span>
                          </div>
                          <div>
                            {req.status === 'pending' ? (
                              <span style={{ color: '#eab308', background: 'rgba(234, 179, 8, 0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> Pending Admin Verification</span>
                            ) : req.status === 'approved' ? (
                              <span style={{ color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={13} /> Approved & Credited</span>
                            ) : (
                              <span style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={13} /> Rejected ({req.rejection_reason || 'Invalid TrxID'})</span>
                            )}
                          </div>
                        </div>

                        {/* Interactive Step Line Tracker */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.75rem' }}>
                          <div style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> Step 1: Method</div>
                          <div style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> Step 2: Payment Sent</div>
                          <div style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> Step 3: TrxID: {req.transaction_id}</div>
                          <div style={{ color: req.status === 'approved' ? '#22c55e' : req.status === 'rejected' ? '#ef4444' : '#eab308', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {req.status === 'approved' ? <><Check size={13} /> Step 4: Approved</> : req.status === 'rejected' ? <><XCircle size={13} /> Step 4: Rejected</> : <><Clock size={13} /> Step 4: Verifying...</>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>Method: <strong style={{ color: '#fff' }}>{(req.payment_method || 'bkash').toUpperCase()}</strong> | Sender: <strong>{req.bkash_number}</strong></span>
                          <span>Credits: <strong style={{ color: '#eab308' }}>+{req.credits_requested} CR</strong> (৳{req.amount_bdt} BDT)</span>
                        </div>
                      </div>
                    ))}
                    {myPaymentRequests.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No payment submissions found. Click "Purchase Wizard" above to select a package and pay.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ══ CUSTOM CONFIRMATION & PROMPT MODAL ══ */}
        {confirmModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999999, padding: '20px' }}>
            <div className="card glowing-panel" style={{ maxWidth: '440px', width: '100%', border: '1px solid #06b6d4', padding: '24px', borderRadius: '12px', background: '#090d16' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <AlertTriangle size={22} style={{ color: '#06b6d4' }} />
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>{confirmModal.title || 'Confirmation Needed'}</h3>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                {confirmModal.message}
              </p>

              {confirmModal.inputConfig && (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <input
                    type={confirmModal.inputConfig.type || 'text'}
                    className="form-control"
                    style={{ width: '100%', fontSize: '0.95rem' }}
                    defaultValue={confirmModal.inputConfig.defaultValue}
                    autoFocus
                    id="confirm-modal-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const inputEl = document.getElementById('confirm-modal-input');
                        const val = inputEl ? inputEl.value : true;
                        confirmModal.onConfirm(val);
                      }
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={confirmModal.onCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const inputEl = document.getElementById('confirm-modal-input');
                    const val = inputEl ? inputEl.value : true;
                    confirmModal.onConfirm(val);
                  }}
                >
                  Confirm & Proceed
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ POPUP FORM: PROMOTE JOB ══ */}
        {promoteJobId && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
            <div className="card glowing-panel" style={{ width: '100%', maxWidth: '420px' }}>
              <h3 style={{ marginBottom: '8px' }}>
                {(user?.role === 'admin' || user?.role === 'superadmin') ? '📁 Promote Scraped Job to Public Catalog' : '📥 Request Dataset Promotion'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                {(user?.role === 'admin' || user?.role === 'superadmin')
                  ? 'Promote this dataset directly to the public catalog for all users.'
                  : 'Submit a request to Admin to publish this dataset in the public catalog.'}
              </p>
              <form onSubmit={handlePromoteSubmit}>
                <div className="form-group">
                  <label>Proposed Dataset Name</label>
                  <input type="text" className="form-control" value={promoteName} onChange={(e) => setPromoteName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Proposed Category</label>
                  <select className="form-control" value={promoteCategory} onChange={(e) => setPromoteCategory(e.target.value)} required>
                    <option value="">-- Choose Category --</option>
                    {categoriesList.map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                  <button className="btn btn-primary" type="submit" style={{ flex: '1' }}>
                    {(user?.role === 'admin' || user?.role === 'superadmin') ? 'Confirm & Publish' : 'Submit Request'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setPromoteJobId(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {renderRequestActionModal()}
      </>
    );
  }
}
