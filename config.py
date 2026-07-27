"""
DataBazaar — Configuration
"""
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# ── Flask Config ─────────────────────────────────────────
SECRET_KEY = os.environ.get("SECRET_KEY", "databazaar-secret-key-change-in-production")
DATABASE_PATH = os.path.join(BASE_DIR, "databazaar.db")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
SCRAPE_RESULTS_FOLDER = os.path.join(BASE_DIR, "scrape_results")
ALLOWED_EXTENSIONS = {"xlsx", "xls", "csv"}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload

# ── Pagination ───────────────────────────────────────────
ROWS_PER_PAGE = 25
PREVIEW_ROWS = 5

# ── Rate Limiting ────────────────────────────────────────
MAX_VIEWS_PER_HOUR = 100

# ── Dataset Categories ───────────────────────────────────
CATEGORIES = [
    "Coaching Center",
    "Pharmacy",
    "Medicine Store",
    "Hospital & Clinic",
    "Restaurant",
    "School & College",
    "Grocery Store",
    "Real Estate",
    "Gym & Fitness",
    "Salon & Beauty",
    "Other",
]

# ── Bangladesh Region Hierarchy ──────────────────────────
# Division → District → Sub-areas
REGIONS = {
    "Dhaka": {
        "Dhaka City": [
            "Mirpur", "Mirpur 1", "Mirpur 2", "Mirpur 10",
            "Mirpur 11", "Mirpur 12", "Mirpur 13", "Mirpur 14",
            "Pallabi", "Kafrul", "Shah Ali",
            "Uttara", "Uttara Sector 1-6", "Uttara Sector 7-14",
            "Dhanmondi", "Lalmatia", "Jigatola",
            "Gulshan", "Banani", "Baridhara",
            "Mohammadpur", "Adabor", "Shyamoli",
            "Motijheel", "Paltan", "Wari",
            "Farmgate", "Tejgaon", "Karwan Bazar",
            "Old Dhaka", "Lalbagh", "Hazaribagh",
            "Basundhara", "Badda", "Rampura",
            "Khilgaon", "Mugda", "Demra",
            "Jatrabari", "Jurain", "Postogola",
        ],
        "Gazipur": ["Tongi", "Gazipur Sadar", "Kaliakair", "Kapasia", "Sreepur"],
        "Narayanganj": ["Narayanganj Sadar", "Siddhirganj", "Fatulla", "Sonargaon", "Rupganj"],
        "Manikganj": ["Manikganj Sadar", "Singair", "Saturia", "Harirampur"],
        "Narsingdi": ["Narsingdi Sadar", "Palash", "Shibpur", "Monohardi"],
    },
    "Chittagong": {
        "Chittagong City": [
            "Agrabad", "Nasirabad", "GEC Circle", "Halishahar",
            "Pahartali", "Patenga", "Kotwali", "Chawkbazar",
        ],
        "Cox's Bazar": ["Cox's Bazar Sadar", "Teknaf", "Ukhia", "Ramu"],
        "Comilla": ["Comilla Sadar", "Daudkandi", "Muradnagar", "Laksam"],
    },
    "Rajshahi": {
        "Rajshahi City": ["Boalia", "Rajpara", "Motihar", "Shah Makhdum"],
        "Bogra": ["Bogra Sadar", "Sherpur", "Shibganj", "Gabtali"],
        "Rangpur": ["Rangpur Sadar", "Mithapukur", "Pirganj", "Badarganj"],
    },
    "Khulna": {
        "Khulna City": ["Khalishpur", "Sonadanga", "Boyra", "Daulatpur"],
        "Jessore": ["Jessore Sadar", "Benapole", "Jhikargachha", "Manirampur"],
    },
    "Sylhet": {
        "Sylhet City": ["Zindabazar", "Amberkhana", "Subid Bazar", "Kumargaon"],
        "Habiganj": ["Habiganj Sadar", "Chunarughat", "Madhabpur"],
    },
    "Barisal": {
        "Barisal City": ["Barisal Sadar", "Kotwali", "Band Road"],
        "Patuakhali": ["Patuakhali Sadar", "Kuakata", "Galachipa"],
    },
    "Mymensingh": {
        "Mymensingh City": ["Mymensingh Sadar", "Trishal", "Muktagachha"],
        "Jamalpur": ["Jamalpur Sadar", "Sherpur", "Islampur"],
    },
}


def allowed_file(filename):
    """Check if uploaded file has an allowed extension"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
