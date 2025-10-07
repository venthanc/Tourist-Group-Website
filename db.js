const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

// User Schema
const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        trim: true, 
        required: true,
        unique: true 
    },
    email: { 
        type: String, 
        trim: true, 
        index: true, 
        unique: true, 
        required: true 
    },
    fullName: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}, { timestamps: true });

userSchema.plugin(passportLocalMongoose, {
    usernameField: 'email',
    usernameLowerCase: true,
    errorMessages: {
        UserExistsError: 'User already exists with this email'
    }
});

// Order Schema (updated to reference User)
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{ type: String }],
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    }
}, { timestamps: true });
const gallerySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    imageUrl: {
        type: String,
        default: ''
    },
    gallery: [{
        url: {
            type: String,
        required: true
    },
        caption: {
            type: String,
            default: ''
        },
        alt: {
            type: String,
            default: ''
        }
    }],
    tags: [{
        type: String,
        trim: true
    }],
    category: {
        type: String,
        enum: ['tours', 'events', 'featured', 'general'],
        default: 'general'
    },
    featured: {
        type: Boolean,
        default: false
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamps on save
gallerySchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Tour Package Schema
const tourPackageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    gallery: [{
        url: {
            type: String,
            required: true
        },
        caption: {
            type: String,
            default: ''
        },
        alt: {
            type: String,
            default: ''
        }
    }],
    stars: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    duration: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    maxGroupSize: {
        type: Number,
        min: 1
    },
    included: [{
        type: String,
        trim: true
    }],
    excluded: [{
        type: String,
        trim: true
    }],
    highlights: [{
        type: String,
        trim: true
    }],
    featured: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Hiking Schema (same as admin panel)
const hikingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: {
        type: String,
        default: ''
    },
    gallery: [{
        url: {
            type: String,
            required: true
        },
        caption: {
            type: String,
            default: ''
        },
        alt: {
            type: String,
            default: ''
        }
    }],
    stars: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    reviews: {
        type: Number,
        default: 0
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'moderate', 'hard', 'expert'],
        default: 'moderate'
    },
    activity: {
        type: String,
        enum: ['hiking', 'trekking', 'photography', 'trophy hunting', 'camping', 'cultural', 'sports', 'adventure sports'],
        default: 'hiking'
    },
    duration: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        min: 0,
        default: 0
    },
    distance: {
        type: String,
        trim: true
    },
    elevation: {
        type: String,
        trim: true
    },
    bestTime: {
        type: String,
        trim: true
    },
    features: [{
        type: String,
        trim: true
    }],
    tips: [{
        type: String,
        trim: true
    }],
    featured: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamps on save
hikingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const Gallery = mongoose.models.Gallery || mongoose.model('Gallery', gallerySchema);
const TourPackage = mongoose.models.TourPackage || mongoose.model('TourPackage', tourPackageSchema);
const Hiking = mongoose.models.Hiking || mongoose.model('Hiking', hikingSchema);

// Review Schema
const reviewSchema = new mongoose.Schema({
    targetType: {
        type: String,
        enum: ['package', 'hiking'],
        default: 'package'
    },
    tourPackageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TourPackage',
        required: false
    },
    hikingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hiking',
        required: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true,
        trim: true
    },
    userEmail: {
        type: String,
        required: true,
        trim: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    verified: {
        type: Boolean,
        default: false
    },
    helpful: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

reviewSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

// Booking Schema
const bookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tourPackageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TourPackage',
        required: false
    },
    hikingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hiking',
        required: false
    },
    bookingNumber: {
        type: String,
        required: true,
        unique: true
    },
    customerInfo: {
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        nationality: {
            type: String,
            required: true,
            trim: true
        },
        emergencyContact: {
            name: String,
            phone: String,
            relationship: String
        }
    },
    travelInfo: {
        departureDate: {
            type: Date,
            required: true
        },
        returnDate: {
            type: Date,
            required: true
        },
        numberOfTravelers: {
            type: Number,
            required: true,
            min: 1
        },
        specialRequests: {
            type: String,
            default: ''
        }
    },
    paymentInfo: {
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            default: 'USD'
        },
        stripePaymentIntentId: {
            type: String,
            required: true
        },
        stripeChargeId: {
            type: String,
            required: true
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        paymentDate: {
            type: Date,
            default: Date.now
        }
    },
    bookingStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    notes: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

bookingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Generate unique booking number
bookingSchema.pre('save', function(next) {
    if (this.isNew && !this.bookingNumber) {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.bookingNumber = `MTT${timestamp}${random}`;
        console.log('Generated booking number:', this.bookingNumber);
    }
    next();
});

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

// Payment Requests (submitted from website, viewed in admin)
const paymentRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String, required: true, trim: true },
    userName: { type: String, default: '' },
    tourPackageId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourPackage' },
    hikingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hiking' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }, // Link to booking
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    paymentMethod: { type: String, default: 'bank_transfer' },
    transactionId: { type: String, default: '' },
    proofImageUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

paymentRequestSchema.pre('save', function(next){
    this.updatedAt = Date.now();
    next();
});

const PaymentRequest = mongoose.models.PaymentRequest || mongoose.model('PaymentRequest', paymentRequestSchema);

module.exports = { User, Order, Gallery, TourPackage, Hiking, Review, Booking, PaymentRequest };


