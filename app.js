// Load environment (.env) with override to avoid stale shell vars
require('dotenv').config({ override: true });
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');
const path = require('path');
const { exec } = require('child_process');
const flash = require('connect-flash');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');

// mongodb+srv://mesum357:pDliM118811@cluster0.h3knh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

// Import Mongoose models from db.js
const { User, Gallery, TourPackage, Hiking, Review, Booking, PaymentRequest } = require('./db');

// Stripe removed - manual payments only

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Use admin panel's uploads directory for shared access
        const uploadDir = path.join(__dirname, '..', 'Tourist Website Admin panel', 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit per file
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Authentication middleware
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    
    // If it's an API request, return JSON error
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // For page requests, redirect to login with a message
    req.flash('error', 'Please log in to access the payment page');
    res.redirect('/login');
}

app.use(express.json());

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded images from shared uploads directory (admin panel's uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'Tourist Website Admin panel', 'public', 'uploads')));

// Expose admin panel base URL for uploaded assets to all views
app.use(function(req, res, next) {
    // Resolve admin panel base URL for assets (uploads)
    // Priority: ENV override → request-aware default (prod domain unless localhost)
    const isLocalReq = /^(localhost|127\.0\.0\.1)$/i.test(req.hostname || '');
    const defaultAdminBase = isLocalReq
        ? 'http://localhost:5000'
        : 'https://adminmagpietrekandtours.online';
    res.locals.adminBaseUrl = process.env.ADMIN_BASE_URL || defaultAdminBase;
    next();
});

// Trust proxy in production (needed for secure cookies behind Vercel/NGINX)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
}));

app.use(flash());

// Flash messages middleware
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    next();
});

// Log minimal email config presence at startup (no secrets)
console.log('Email config presence:', {
    EMAIL_USER: Boolean(process.env.EMAIL_USER),
    EMAIL_PASS: Boolean(process.env.EMAIL_PASS),
    EMAIL_TO: Boolean(process.env.EMAIL_TO)
});

app.use(passport.initialize());
app.use(passport.session());

// MONGOOSE
const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

if (process.env.NODE_ENV === 'production') {
    mongooseOptions.ssl = true;
    mongooseOptions.tls = true;
    mongooseOptions.tlsAllowInvalidCertificates = true;
    mongooseOptions.tlsAllowInvalidHostnames = true;
}

// Get MongoDB URI from environment or fall back to local
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tourist_website';

mongoose.connect(mongoURI, mongooseOptions)
    .then(() => {
        console.log("Connected to MongoDB ");
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB Atlas:", err);
        process.exit(1);
    });

// Passport configuration
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});





// Routes

// Homepage route - accessible to everyone
app.get('/', async function(req, res) {
    try {
        // Fetch tour packages for the slider (limit to 6 for performance)
        const tourPackages = await TourPackage.find({ active: true })
            .sort({ featured: -1, createdAt: -1 })
            .limit(6);
        try {
            // Debug: log adminBaseUrl and how image URLs will resolve
            const base = res.locals.adminBaseUrl;
            const preview = Array.isArray(tourPackages) ? tourPackages.map(t => ({
                id: t?._id,
                title: t?.title,
                rawImageUrl: t?.imageUrl,
                resolved: t?.imageUrl
                    ? (t.imageUrl.startsWith('http')
                        ? t.imageUrl
                        : base + (t.imageUrl.startsWith('/') ? '' : '/') + t.imageUrl)
                    : '(fallback to /images/hero-img1.webp)'
            })) : [];
            console.log('[home] adminBaseUrl:', base);
            console.log('[home] tourPackages found:', tourPackages.length);
            console.table(preview);
        } catch (dbgErr) {
            console.warn('[home] preview logging failed:', dbgErr?.message);
        }
            
        res.render('index', { 
            user: req.user,
            isAuthenticated: req.isAuthenticated(),
            tourPackages: tourPackages,
            currentPage: 'home'
        });
    } catch (error) {
        console.error('Error fetching tour packages:', error);
        res.render('index', { 
            user: req.user,
            isAuthenticated: req.isAuthenticated(),
            tourPackages: [],
            currentPage: 'home'
        });
    }
});

// Debug dropdown route
app.get('/debug-dropdown', function(req, res) {
    res.render('debug-dropdown', { 
        user: req.user,
        isAuthenticated: req.isAuthenticated(),
        currentPage: 'debug'
    });
});

// Login page route
app.get('/login', function(req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('login', { 
        user: req.user,
        isAuthenticated: req.isAuthenticated(),
        error: req.query.error,
        success: req.query.success,
        currentPage: 'login'
    });
});

// Register page route
app.get('/register', function(req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('register', { 
        user: req.user,
        isAuthenticated: req.isAuthenticated(),
        error: req.query.error,
        success: req.query.success,
        currentPage: 'register'
    });
});

app.post("/register", function(req, res) {
    const { username, email, password, confirmPassword, fullName } = req.body;
    
    // Validation
    if (!username || !email || !password || !confirmPassword || !fullName) {
        return res.redirect('/register?error=All fields are required');
    }
    if (password !== confirmPassword) {
        return res.redirect('/register?error=Passwords do not match');
    }
    if (password.length < 6) {
        return res.redirect('/register?error=Password must be at least 6 characters long');
    }
    
    User.register({ 
        username: username, 
        email: email, 
        fullName: fullName 
    }, password, function(err, user) {
        if (err) {
            console.error(err);
            let errorMessage = 'Registration failed';
            if (err.name === 'UserExistsError') {
                errorMessage = 'User already exists with this email';
            }
            return res.redirect(`/register?error=${encodeURIComponent(errorMessage)}`);
        }
        req.login(user, function(err) {
            if (err) {
                console.error(err);
                return res.redirect('/register?error=Login failed after registration');
            }
            res.redirect('/?success=Account created successfully');
        });
    });
});

app.post("/login", function(req, res, next) {
    // Map email field to username for passport authentication
    req.body.username = req.body.email;
    
    passport.authenticate("local", function(err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect('/login?error=Invalid email or password');
        }
        req.logIn(user, function(err) {
            if (err) {
                return next(err);
            }
            return res.redirect('/?success=Welcome back');
        });
    })(req, res, next);
});


app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// Public routes - accessible to everyone
app.get("/about", function(req, res) {
    res.render("about", { 
        user: req.user,
        isAuthenticated: req.isAuthenticated(),
        currentPage: 'about'
    });
});

app.get("/contact", function(req, res) {
    res.render("contact", { 
        user: req.user,
        isAuthenticated: req.isAuthenticated(),
        currentPage: 'contact'
    });
});

app.get("/gallery", async function(req, res) {
    try {
        // Fetch gallery images from database
        const galleryImages = await Gallery.find()
            .sort({ featured: -1, createdAt: -1 });
            
        res.render("gallery", { 
            user: req.user,
            isAuthenticated: req.isAuthenticated(),
            galleryImages: galleryImages,
            currentPage: 'gallery'
        });
    } catch (error) {
        console.error('Error fetching gallery images:', error);
        res.render("gallery", { 
            user: req.user,
            isAuthenticated: req.isAuthenticated(),
            galleryImages: [],
            currentPage: 'gallery'
        });
    }
});

app.get("/faq", function(req, res) {
    res.render("faq", { 
        user: req.user,
        isAuthenticated: req.isAuthenticated(),
        currentPage: 'faq'
    });
});

app.get("/hiking", async function(req, res) {
    try {
        // Get search parameters from query string
        const { location, activity, startDate, guests } = req.query;
        
        // Build search filter
        let filter = { active: true };
        
        // Add location filter if provided
        if (location && location.trim() !== '') {
            filter.location = { $regex: location, $options: 'i' };
        }
        
        // Add activity filter if provided
        if (activity && activity.trim() !== '') {
            filter.activity = activity;
        }
        
        console.log('Search filter:', filter);
        
        // Fetch hiking trails from database with search filter
        const hikingTrails = await Hiking.find(filter)
            .sort({ featured: -1, createdAt: -1 });
            
        console.log(`Found ${hikingTrails.length} hiking trails matching search criteria`);
            
        res.render("hiking", { 
            user: req.user,
            isAuthenticated: req.isAuthenticated(),
            hikingTrails: hikingTrails,
            currentPage: 'hiking',
            searchParams: {
                location: location || '',
                activity: activity || '',
                startDate: startDate || '',
                guests: guests || '2'
            }
        });
    } catch (error) {
        console.error('Error fetching hiking trails:', error);
        res.render("hiking", { 
            user: req.user,
            isAuthenticated: req.isAuthenticated(),
            hikingTrails: [],
            currentPage: 'hiking',
            searchParams: {
                location: '',
                activity: '',
                startDate: '',
                guests: '2'
            }
        });
    }
});

app.get("/debug", function(req, res) {
    res.render("debug", { 
        user: req.user,
        isAuthenticated: req.isAuthenticated(),
        currentPage: 'debug'
    });
});

// Payment page route
app.get('/payment/:id', ensureAuthenticated, async function(req, res) {
    try {
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).render('error', {
                message: 'Invalid tour package id',
                user: req.user,
                isAuthenticated: req.isAuthenticated()
            });
        }

        // Try to find a Tour Package first
        let tourPackage = await TourPackage.findById(req.params.id);

        // If not found, try Hiking trail and map to package-like shape
        if (!tourPackage) {
            const hikingTrail = await Hiking.findById(req.params.id);
            if (!hikingTrail) {
                return res.status(404).render('error', {
                    message: 'Tour not found',
                    user: req.user,
                    isAuthenticated: req.isAuthenticated()
                });
            }

            // Map hiking to a compatible object shape used by the payment view
            tourPackage = {
                _id: hikingTrail._id,
                title: hikingTrail.title,
                description: hikingTrail.description,
                location: hikingTrail.location,
                duration: hikingTrail.duration,
                imageUrl: hikingTrail.imageUrl || '',
                gallery: Array.isArray(hikingTrail.gallery) ? hikingTrail.gallery : [],
                stars: hikingTrail.stars || 5,
                reviews: hikingTrail.reviews || 0,
                price: typeof hikingTrail.price === 'number' ? hikingTrail.price : 0,
                featured: hikingTrail.featured || false,
                isHiking: true
            };

            // Build related items from Hiking as "relatedPackages" with compatible fields
            const relatedHiking = await Hiking.find({
                _id: { $ne: hikingTrail._id },
                active: true,
                $or: [
                    { location: hikingTrail.location },
                    { featured: true }
                ]
            })
            .sort({ featured: -1, createdAt: -1 })
            .limit(4);

            const relatedPackages = relatedHiking.map(h => ({
                _id: h._id,
                title: h.title,
                location: h.location,
                price: typeof h.price === 'number' ? h.price : 0,
                imageUrl: h.imageUrl || '',
                featured: h.featured || false,
                stars: h.stars || 5
            }));

            // For hiking, reviews in current implementation are only for Tour Packages
            const reviews = [];

            console.log('[payment] hiking fallback', req.params.id, 'gallery items:', Array.isArray(tourPackage.gallery) ? tourPackage.gallery.length : 0);

            return res.render('payment', {
                user: req.user,
                isAuthenticated: req.isAuthenticated(),
                tourPackage: tourPackage,
                reviews: reviews,
                relatedPackages: relatedPackages,
                currentPage: 'payment'
            });
        }

        // Get reviews for this tour package
        const reviews = await Review.find({ $or: [ { tourPackageId: req.params.id }, { hikingId: req.params.id } ] })
            .sort({ createdAt: -1 })
            .limit(10);

        // Log gallery info for diagnostics
        console.log('[payment] package', req.params.id, 'gallery items:', Array.isArray(tourPackage.gallery) ? tourPackage.gallery.length : 0, 'imageUrl:', tourPackage.imageUrl);

        // Get related tour packages (same location or similar)
        const relatedPackages = await TourPackage.find({ 
            _id: { $ne: req.params.id },
            active: true,
            $or: [
                { location: tourPackage.location },
                { featured: true }
            ]
        })
        .sort({ featured: -1, createdAt: -1 })
        .limit(4);

        res.render('payment', {
            user: req.user,
            isAuthenticated: req.isAuthenticated(),
            tourPackage: tourPackage,
            reviews: reviews,
            relatedPackages: relatedPackages,
            currentPage: 'payment'
        });
    } catch (error) {
        console.error('Error fetching tour package:', error);
        res.status(500).render('error', { 
            message: 'Error loading tour package',
            user: req.user,
            isAuthenticated: req.isAuthenticated()
        });
    }
});
// Manual payment submission (no Stripe)
app.post('/api/manual-payment', ensureAuthenticated, upload.single('paymentScreenshot'), async function(req, res) {
    try {
        const { 
            tourPackageId, 
            hikingId, 
            amount, 
            currency = 'USD', 
            paymentMethod = 'bank_transfer', 
            transactionId, 
            notes,
            customerInfo,
            travelInfo
        } = req.body;
        
        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }
        
        // Handle uploaded payment screenshot
        let proofImageUrl = '';
        if (req.file) {
            proofImageUrl = `/uploads/${req.file.filename}`;
            console.log('Payment screenshot uploaded:', {
                filename: req.file.filename,
                path: req.file.path,
                proofImageUrl: proofImageUrl
            });
        } else {
            console.log('No payment screenshot uploaded');
        }
        
        // Create booking first with pending status
        let booking = null;
        if (customerInfo && travelInfo) {
            // Parse customer info and travel info if they're strings
            const parsedCustomerInfo = typeof customerInfo === 'string' ? JSON.parse(customerInfo) : customerInfo;
            const parsedTravelInfo = typeof travelInfo === 'string' ? JSON.parse(travelInfo) : travelInfo;
            
            // Generate booking number
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const bookingNumber = `MTT${timestamp}${random}`;
            
            booking = new Booking({
                userId: req.user._id,
                tourPackageId: tourPackageId || undefined,
                hikingId: hikingId || undefined,
                bookingNumber: bookingNumber,
                customerInfo: parsedCustomerInfo,
                travelInfo: {
                    ...parsedTravelInfo,
                    departureDate: new Date(parsedTravelInfo.departureDate),
                    returnDate: new Date(parsedTravelInfo.returnDate)
                },
                paymentInfo: {
                    amount: Number(amount),
                    currency,
                    stripePaymentIntentId: 'manual_payment',
                    stripeChargeId: 'manual_payment',
                    paymentStatus: 'pending'
                },
                bookingStatus: 'pending' // Set to pending until payment is approved
            });
            
            await booking.save();
        }
        
        // Create payment request linked to booking
        const request = new PaymentRequest({
            userId: req.user ? req.user._id : undefined,
            userEmail: req.user?.email || req.user?.username || 'unknown@user',
            userName: req.user?.fullName || req.user?.username || '',
            tourPackageId: tourPackageId || undefined,
            hikingId: hikingId || undefined,
            bookingId: booking ? booking._id : undefined,
            amount: Number(amount),
            currency,
            paymentMethod,
            transactionId: transactionId || '',
            proofImageUrl: proofImageUrl,
            notes: notes || ''
        });
        
        console.log('Creating payment request with proofImageUrl:', proofImageUrl);
        await request.save();
        console.log('Payment request saved with ID:', request._id, 'proofImageUrl:', request.proofImageUrl);
        
        return res.json({ 
            success: true, 
            requestId: request._id,
            bookingId: booking ? booking._id : null
        });
    } catch (e) {
        console.error('Manual payment request failed:', e);
        return res.status(500).json({ error: 'Failed to submit payment request' });
    }
});

// API Routes
// Contact form - public endpoint to send email via SMTP
app.post('/api/contact', async function(req, res) {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required' });
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please provide a valid email address' });
        }

        // Gmail-only configuration (EMAIL_USER, EMAIL_PASS, EMAIL_TO)
        const gmailUser = (process.env.EMAIL_USER || '').trim();
        const gmailPass = (process.env.EMAIL_PASS || '').trim();
        const emailTo = (process.env.EMAIL_TO || '').trim();

        if (!gmailUser || !gmailPass) {
            console.error('Email not configured. Set EMAIL_USER and EMAIL_PASS (Gmail App Password) in .env');
            return res.status(500).json({ error: 'Email service not configured' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: gmailUser, pass: gmailPass },
            // Tolerate local/self-signed certs (common in dev or corporate proxies)
            tls: { rejectUnauthorized: false }
        });

        const toAddress = (emailTo || gmailUser).trim();

        const info = await transporter.sendMail({
            from: gmailUser,
            replyTo: `${name} <${email}>`,
            to: toAddress,
            subject: subject && subject.trim() ? subject.trim() : 'New Contact Form Submission',
            text: message,
            html: `<div>
                    <h3>New Contact Message</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
                    <p><strong>Message:</strong></p>
                    <p style="white-space:pre-wrap">${message}</p>
                   </div>`
        });

        return res.json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Contact form error:', error);
        return res.status(500).json({ error: 'Failed to send message' });
    }
});

// Debug: inspect detected email configuration
app.get('/api/email-config', function(req, res) {
    const gmailUser = process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.EMAIL;
    const gmailPass = process.env.EMAIL_PASS || process.env.GMAIL_PASS || process.env.APP_PASSWORD;
    const useGmail = Boolean(gmailUser && gmailPass);
    const useSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    const toAddress = process.env.CONTACT_TO || process.env.EMAIL_TO || (useGmail ? gmailUser : process.env.SMTP_USER);
    res.json({
        useGmail,
        useSmtp,
        gmailUserPresent: Boolean(gmailUser),
        gmailPassPresent: Boolean(gmailPass),
        smtpHostPresent: Boolean(process.env.SMTP_HOST),
        smtpUserPresent: Boolean(process.env.SMTP_USER),
        smtpPassPresent: Boolean(process.env.SMTP_PASS),
        toAddressPresent: Boolean(toAddress)
    });
});
app.get('/api/hiking', async function(req, res) {
    try {
        const hikingTrails = await Hiking.find({ active: true })
            .sort({ featured: -1, createdAt: -1 });
        res.json(hikingTrails);
    } catch (err) {
        console.error('Error fetching hiking trails:', err);
        res.status(500).json({ error: 'Failed to fetch hiking trails' });
    }
});

// Profile page with bookings
app.get('/profile', ensureAuthenticated, async function(req, res) {
    try {
        // Fetch user's bookings with proper population
        const bookings = await Booking.find({ userId: req.user._id })
            .populate({
                path: 'tourPackageId',
                select: 'title location imageUrl price'
            })
            .populate({
                path: 'hikingId', 
                select: 'title location imageUrl price'
            })
            .sort({ createdAt: -1 });

        res.render('profile', { 
            user: req.user, 
            isAuthenticated: req.isAuthenticated(),
            bookings: bookings,
            currentPage: 'profile'
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).render('error', { 
            message: 'Error loading profile',
            user: req.user,
            isAuthenticated: req.isAuthenticated()
        });
    }
});

// Bookings page - dedicated page for viewing booking history
app.get('/bookings', ensureAuthenticated, async function(req, res) {
    try {
        // Fetch user's bookings with proper population
        const bookings = await Booking.find({ userId: req.user._id })
            .populate({
                path: 'tourPackageId',
                select: 'title location imageUrl price'
            })
            .populate({
                path: 'hikingId', 
                select: 'title location imageUrl price'
            })
            .sort({ createdAt: -1 });

        // Log for debugging
        console.log(`Found ${bookings.length} bookings for user ${req.user._id}`);
        bookings.forEach((booking, index) => {
            console.log(`Booking ${index + 1}:`, {
                id: booking._id,
                hasTourPackage: !!booking.tourPackageId,
                hasHiking: !!booking.hikingId,
                status: booking.bookingStatus
            });
        });

        res.render('bookings', { 
            user: req.user, 
            isAuthenticated: req.isAuthenticated(),
            bookings: bookings,
            currentPage: 'bookings'
        });
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).render('error', { 
            message: 'Error loading bookings',
            user: req.user,
            isAuthenticated: req.isAuthenticated()
        });
    }
});

// Download booking as PDF
app.get('/bookings/:id/download', ensureAuthenticated, async function(req, res) {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('tourPackageId')
            .populate('userId');

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check if user owns this booking
        if (booking.userId._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Generate PDF content (simple HTML that can be printed as PDF)
        const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Booking Confirmation - ${booking.bookingNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; }
        .section h3 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .info-row { display: flex; margin-bottom: 10px; }
        .info-label { font-weight: bold; width: 150px; }
        .info-value { flex: 1; }
        .status { padding: 5px 10px; border-radius: 5px; font-weight: bold; }
        .status.confirmed { background-color: #d4edda; color: #155724; }
        .status.pending { background-color: #fff3cd; color: #856404; }
        .status.cancelled { background-color: #f8d7da; color: #721c24; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Booking Confirmation</h1>
        <h2>Booking Number: ${booking.bookingNumber}</h2>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="section">
        <h3>Tour Package Details</h3>
        <div class="info-row">
            <div class="info-label">Package:</div>
            <div class="info-value">${booking.tourPackageId.title}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Location:</div>
            <div class="info-value">${booking.tourPackageId.location}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Duration:</div>
            <div class="info-value">${booking.tourPackageId.duration}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Price per person:</div>
            <div class="info-value">$${booking.tourPackageId.price}</div>
        </div>
    </div>

    <div class="section">
        <h3>Customer Information</h3>
        <div class="info-row">
            <div class="info-label">Name:</div>
            <div class="info-value">${booking.customerInfo.firstName} ${booking.customerInfo.lastName}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Email:</div>
            <div class="info-value">${booking.customerInfo.email}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Phone:</div>
            <div class="info-value">${booking.customerInfo.phone}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Nationality:</div>
            <div class="info-value">${booking.customerInfo.nationality}</div>
        </div>
    </div>

    <div class="section">
        <h3>Travel Information</h3>
        <div class="info-row">
            <div class="info-label">Departure Date:</div>
            <div class="info-value">${new Date(booking.travelInfo.departureDate).toLocaleDateString()}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Return Date:</div>
            <div class="info-value">${new Date(booking.travelInfo.returnDate).toLocaleDateString()}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Number of Travelers:</div>
            <div class="info-value">${booking.travelInfo.numberOfTravelers}</div>
        </div>
        ${booking.travelInfo.specialRequests ? `
        <div class="info-row">
            <div class="info-label">Special Requests:</div>
            <div class="info-value">${booking.travelInfo.specialRequests}</div>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <h3>Payment Information</h3>
        <div class="info-row">
            <div class="info-label">Total Amount:</div>
            <div class="info-value">$${booking.paymentInfo.amount} ${booking.paymentInfo.currency}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Payment Status:</div>
            <div class="info-value">
                <span class="status ${booking.paymentInfo.paymentStatus}">${booking.paymentInfo.paymentStatus.toUpperCase()}</span>
            </div>
        </div>
        <div class="info-row">
            <div class="info-label">Payment Date:</div>
            <div class="info-value">${new Date(booking.paymentInfo.paymentDate).toLocaleDateString()}</div>
        </div>
    </div>

    <div class="section">
        <h3>Booking Status</h3>
        <div class="info-row">
            <div class="info-label">Status:</div>
            <div class="info-value">
                <span class="status ${booking.bookingStatus}">${booking.bookingStatus.toUpperCase()}</span>
            </div>
        </div>
        <div class="info-row">
            <div class="info-label">Booking Date:</div>
            <div class="info-value">${new Date(booking.createdAt).toLocaleDateString()}</div>
        </div>
    </div>

    <div class="footer">
        <p>Thank you for choosing our tour services!</p>
        <p>For any questions, please contact us at support@touristwebsite.com</p>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="booking-${booking.bookingNumber}.html"`);
        res.send(pdfContent);
    } catch (error) {
        console.error('Error generating booking PDF:', error);
        res.status(500).json({ error: 'Failed to generate booking PDF' });
    }
});

// Review API endpoints
app.post('/api/reviews', ensureAuthenticated, async function(req, res) {
    try {
        const { tourPackageId, hikingId, userName, userEmail, rating, title, comment } = req.body;
        
        // Determine target id (package or hiking)
        const targetId = tourPackageId || hikingId;
        if (!targetId || !userEmail || !rating) {
            return res.status(400).json({ error: 'Target id (package or hiking), email, and rating are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        // Validate rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Resolve target type by looking up package first, then hiking
        let targetType = 'package';
        let targetDoc = await TourPackage.findById(targetId);
        if (!targetDoc) {
            targetDoc = await Hiking.findById(targetId);
            if (!targetDoc) {
                return res.status(404).json({ error: 'Target not found' });
            }
            targetType = 'hiking';
        }

        // Create review
        const review = new Review({
            targetType: targetType,
            tourPackageId: targetType === 'package' ? targetId : undefined,
            hikingId: targetType === 'hiking' ? targetId : undefined,
            userId: req.user._id,
            userName: req.user.name || userName || 'Anonymous',
            userEmail: req.user.email || userEmail,
            rating: parseInt(rating),
            title: title || 'Review',
            comment: comment || 'No comment provided'
        });

        await review.save();

        // Update ratings and review count on the matched target
        const filter = targetType === 'package' ? { tourPackageId: targetId } : { hikingId: targetId };
        const allReviews = await Review.find(filter);
        const averageRating = allReviews.length > 0 ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) : 0;

        if (targetType === 'package') {
            await TourPackage.findByIdAndUpdate(targetId, {
                stars: Math.round(averageRating),
                reviews: allReviews.length
            });
        } else {
            await Hiking.findByIdAndUpdate(targetId, {
                stars: Math.round(averageRating),
                reviews: allReviews.length
            });
        }

        res.json({ success: true, review: review });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});

app.get('/api/reviews/:tourPackageId', async function(req, res) {
    try {
        const id = req.params.tourPackageId;
        const reviews = await Review.find({ $or: [ { tourPackageId: id }, { hikingId: id } ] })
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Stripe Payment Routes
// Removed Stripe route: /api/create-payment-intent

// Booking API endpoints
app.post('/api/bookings', ensureAuthenticated, async function(req, res) {
    try {
        console.log('Booking request received:', req.body);
        
        const {
            tourPackageId,
            hikingId,
            customerInfo,
            travelInfo,
            paymentInfo,
            stripePaymentIntentId,
            stripeChargeId
        } = req.body;

        // Validate required fields
        if ((!tourPackageId && !hikingId) || !customerInfo || !travelInfo || !paymentInfo) {
            console.log('Missing required fields:', { tourPackageId, hikingId, customerInfo, travelInfo, paymentInfo });
            return res.status(400).json({ error: 'Missing required booking information' });
        }

        // Validate tourPackageId is a valid ObjectId
        let tourPackage = null;
        let hikingTrail = null;
        if (tourPackageId) {
            if (!mongoose.Types.ObjectId.isValid(tourPackageId)) {
                console.log('Invalid tourPackageId:', tourPackageId);
                return res.status(400).json({ error: 'Invalid tour package ID' });
            }
            tourPackage = await TourPackage.findById(tourPackageId);
            if (!tourPackage) {
                console.log('Tour package not found:', tourPackageId);
                return res.status(404).json({ error: 'Tour package not found' });
            }
        } else if (hikingId) {
            if (!mongoose.Types.ObjectId.isValid(hikingId)) {
                console.log('Invalid hikingId:', hikingId);
                return res.status(400).json({ error: 'Invalid hiking ID' });
            }
            hikingTrail = await Hiking.findById(hikingId);
            if (!hikingTrail) {
                console.log('Hiking not found:', hikingId);
                return res.status(404).json({ error: 'Hiking not found' });
            }
        }

        // Validate dates
        const departureDate = new Date(travelInfo.departureDate);
        const returnDate = new Date(travelInfo.returnDate);
        
        if (isNaN(departureDate.getTime()) || isNaN(returnDate.getTime())) {
            console.log('Invalid dates:', { departureDate: travelInfo.departureDate, returnDate: travelInfo.returnDate });
            return res.status(400).json({ error: 'Invalid date format' });
        }

        if (departureDate >= returnDate) {
            console.log('Invalid date range:', { departureDate, returnDate });
            return res.status(400).json({ error: 'Return date must be after departure date' });
        }

        // Create booking
        console.log('Creating booking with data:', {
            userId: req.user ? req.user._id : null,
            tourPackageId,
            customerInfo,
            travelInfo,
            paymentInfo: {
                ...paymentInfo,
                stripePaymentIntentId,
                stripeChargeId,
                paymentStatus: 'completed'
            },
            bookingStatus: 'confirmed'
        });

        // Generate booking number
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const bookingNumber = `MTT${timestamp}${random}`;
        console.log('Generated booking number:', bookingNumber);

        const booking = new Booking({
            userId: req.user._id,
            tourPackageId: tourPackage ? tourPackage._id : undefined,
            hikingId: hikingTrail ? hikingTrail._id : undefined,
            bookingNumber: bookingNumber,
            customerInfo,
            travelInfo: {
                ...travelInfo,
                departureDate: departureDate,
                returnDate: returnDate
            },
            paymentInfo: {
                ...paymentInfo,
                stripePaymentIntentId,
                stripeChargeId,
                paymentStatus: 'completed'
            },
            bookingStatus: 'confirmed'
        });

        console.log('Booking object created, saving...');
        await booking.save();
        console.log('Booking saved successfully:', booking._id);
        
        // Populate tour package details
        await booking.populate('tourPackageId');
        await booking.populate('hikingId');

        res.json({ success: true, booking: booking });
    } catch (error) {
        console.error('Error creating booking:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to create booking: ' + error.message });
    }
});

app.get('/api/bookings', async function(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        let query = { userId: req.user._id };
        
        // If 'since' parameter is provided, filter by updatedAt
        if (req.query.since) {
            query.updatedAt = { $gte: new Date(req.query.since) };
        }

        const bookings = await Booking.find(query)
            .populate('tourPackageId')
            .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

app.get('/api/bookings/:id', async function(req, res) {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('tourPackageId')
            .populate('userId');

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check if user owns this booking or is admin
        if (booking.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(booking);
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});

// Get user's payment requests
app.get('/api/payment-requests', ensureAuthenticated, async function(req, res) {
    try {
        let query = { userId: req.user._id };
        
        // If 'since' parameter is provided, filter by updatedAt
        if (req.query.since) {
            query.updatedAt = { $gte: new Date(req.query.since) };
        }
        
        const paymentRequests = await PaymentRequest.find(query)
            .sort({ createdAt: -1 });
        res.json(paymentRequests);
    } catch (error) {
        console.error('Error fetching payment requests:', error);
        res.status(500).json({ error: 'Failed to fetch payment requests' });
    }
});

// Payment Settings Schema (shared with admin panel)
        const paymentSettingSchema = new mongoose.Schema({
    qrImageUrl: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    iban: { type: String, default: '' },
    swift: { type: String, default: '' },
    instructions: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
        }, { timestamps: true });
        
        const PaymentSetting = mongoose.models.PaymentSetting || mongoose.model('PaymentSetting', paymentSettingSchema);
        
// Get payment settings from shared database
app.get('/api/payment-settings', async function(req, res) {
    try {
        const settings = await PaymentSetting.findOne();
        res.json(settings || {});
    } catch (error) {
        console.error('Error fetching payment settings:', error);
        res.json({});
    }
});

// Test endpoint to check image accessibility
app.get('/api/test-image/:filename', function(req, res) {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '..', 'Tourist Website Admin panel', 'public', 'uploads', filename);
    
    console.log('Testing image access from website:', {
        filename: filename,
        imagePath: imagePath,
        exists: require('fs').existsSync(imagePath)
    });
    
    if (require('fs').existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).json({ error: 'Image not found', path: imagePath });
    }
});


// Simple test route to check if server is responding
app.get('/api/test', function(req, res) {
    res.json({ 
        status: 'Server is running', 
        timestamp: new Date().toISOString(),
        domain: req.get('host'),
        protocol: req.get('x-forwarded-proto') || req.protocol
    });
});

// Test endpoint to verify booking schema
app.get('/api/test-booking', async function(req, res) {
    try {
        console.log('Testing booking schema...');
        
        // Generate test booking number
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const testBookingNumber = `MTT${timestamp}${random}`;
        
        const testBooking = new Booking({
            userId: null,
            tourPackageId: '507f1f77bcf86cd799439011', // Test ObjectId
            bookingNumber: testBookingNumber,
            customerInfo: {
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
                phone: '1234567890',
                nationality: 'US'
            },
            travelInfo: {
                departureDate: new Date(),
                returnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                numberOfTravelers: 1,
                specialRequests: 'Test request'
            },
            paymentInfo: {
                amount: 100,
                currency: 'USD',
                stripePaymentIntentId: 'pi_test_123',
                stripeChargeId: 'ch_test_123',
                paymentStatus: 'completed'
            },
            bookingStatus: 'confirmed'
        });
        
        console.log('Test booking object created successfully');
        res.json({ success: true, message: 'Booking schema is working' });
    } catch (error) {
        console.error('Error testing booking schema:', error);
        res.status(500).json({ error: 'Booking schema test failed: ' + error.message });
    }
});

// Test endpoint to check tour packages and their images
app.get('/api/test-tours', async function(req, res) {
    try {
        console.log('Testing tour packages...');
        
        const tourPackages = await TourPackage.find({ active: true }).limit(5);
        console.log('Found tour packages:', tourPackages.length);
        
        const toursWithImageInfo = tourPackages.map(tour => ({
            id: tour._id,
            title: tour.title,
            imageUrl: tour.imageUrl,
            hasImageUrl: !!tour.imageUrl,
            imageUrlType: tour.imageUrl ? (tour.imageUrl.startsWith('http') ? 'full_url' : 'relative_path') : 'none',
            galleryCount: Array.isArray(tour.gallery) ? tour.gallery.length : 0,
            firstGalleryUrlType: Array.isArray(tour.gallery) && tour.gallery[0] && tour.gallery[0].url
                ? (tour.gallery[0].url.startsWith('http') ? 'full_url' : (tour.gallery[0].url.startsWith('data:') ? 'data_url' : 'relative_path'))
                : 'none'
        }));
        
        res.json({ 
            success: true, 
            count: tourPackages.length,
            tours: toursWithImageInfo
        });
    } catch (error) {
        console.error('Error testing tour packages:', error);
        res.status(500).json({ error: 'Tour packages test failed: ' + error.message });
    }
});

// Debug endpoint: get a single tour package minimal info
app.get('/api/test-package/:id', async function(req, res) {
    try {
        const tour = await TourPackage.findById(req.params.id);
        if (!tour) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.json({
            id: tour._id,
            title: tour.title,
            imageUrl: tour.imageUrl,
            galleryCount: Array.isArray(tour.gallery) ? tour.gallery.length : 0,
            firstGalleryUrl: Array.isArray(tour.gallery) && tour.gallery[0] ? tour.gallery[0].url : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint: resolve a raw image URL the same way the views do
app.get('/api/debug/resolve-image', function(req, res) {
    try {
        const raw = (req.query.raw || '').trim();
        const base = (res.locals.adminBaseUrl || '').replace(/\/$/, '');
        let resolved = '/images/hero-img1.webp';
        if (raw) {
            if (/^(https?:)?data:/i.test(raw)) {
                resolved = raw;
            } else if (/^https?:\/\//i.test(raw)) {
                // swap localhost to admin base
                resolved = raw.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?/i, base);
            } else if (raw.startsWith('/')) {
                resolved = base + raw;
            } else {
                resolved = base + '/' + raw;
            }
        }
        return res.json({ raw, base, resolved });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

app.listen(3000, function() {
    console.log("Server is running on port 3000");
    // Auto-open the index page on server start
    const url = 'http://localhost:3000/';
    if (process.env.AUTO_OPEN_BROWSER !== 'false') {
        if (process.platform === 'win32') {
            exec(`start "" "${url}"`);
        } else if (process.platform === 'darwin') {
            exec(`open "${url}"`);
        } else {
            exec(`xdg-open "${url}"`);
        }
    }
});

