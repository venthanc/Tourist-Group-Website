# Tourist Website with Passport.js Authentication

A modern tourist website built with Node.js, Express, EJS, and Passport.js authentication.

## Features

### 🔐 Authentication System
- **User Registration & Login**: Secure user accounts with email/password
- **Google OAuth**: Sign in with Google (optional, requires credentials)
- **Session Management**: Persistent user sessions
- **Role-based Access**: User and admin roles

### 🌐 Website Features
- **Responsive Design**: Mobile-first approach with Bootstrap 5
- **Multi-language Support**: Google Translate integration
- **Modern UI**: Beautiful gradients and animations
- **HK Grotesk Font**: Consistent typography throughout

### 📱 Pages
- **Homepage**: Hero section with image slider
- **About Us**: Company information and testimonials
- **Gallery**: Photo showcase
- **Contact**: Contact form and information
- **FAQ**: Frequently asked questions with accordions

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tourist-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/tourist_website
   SESSION_SECRET=your_session_secret_here
   
   # Optional: Google OAuth (for Google sign-in)
   CLIENT_ID=your_google_client_id
   CLIENT_SECRET=your_google_client_secret
   ```

4. **Start the server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

5. **Access the website**
   Open your browser and go to `http://localhost:3000`

## Database Schema

### User Model
```javascript
{
  username: String (required, unique),
  email: String (required, unique),
  fullName: String,
  googleId: String (optional),
  role: String (enum: 'user', 'admin', default: 'user'),
  timestamps: true
}
```

### Order Model
```javascript
{
  userId: ObjectId (ref: User),
  items: [String],
  status: String (enum: 'pending', 'confirmed', 'completed', 'cancelled'),
  timestamps: true
}
```

## Authentication Flow

1. **Registration**: Users can create accounts with email, username, and password
2. **Login**: Email/password authentication with Passport.js
3. **Google OAuth**: Optional Google sign-in integration
4. **Session Management**: Persistent user sessions with express-session
5. **Authorization**: Role-based access control

## API Endpoints

### Public Routes
- `GET /` - Homepage
- `GET /about` - About page
- `GET /gallery` - Gallery page
- `GET /contact` - Contact page
- `GET /faq` - FAQ page

### Authentication Routes
- `GET /login` - Login page
- `POST /login` - Login form submission
- `GET /register` - Registration page
- `POST /register` - Registration form submission
- `GET /logout` - Logout user
- `GET /auth/google` - Google OAuth initiation
- `GET /auth/google/homepage` - Google OAuth callback

## File Structure

```
tourist-website/
├── app.js                 # Main server file
├── db.js                  # Database models and connection
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── public/                # Static assets
│   ├── styles/           # CSS files
│   ├── js/               # JavaScript files
│   └── images/           # Image assets
└── views/                 # EJS templates
    ├── partials/         # Reusable components
    │   ├── navbar.ejs    # Navigation bar
    │   ├── footer.ejs    # Footer
    │   └── slider.ejs    # Image slider
    ├── index.ejs         # Homepage
    ├── about.ejs         # About page
    ├── login.ejs         # Login page
    ├── register.ejs      # Registration page
    ├── gallery.ejs       # Gallery page
    ├── contact.ejs       # Contact page
    └── faq.ejs           # FAQ page
```

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js, express-session
- **Frontend**: EJS templates, Bootstrap 5
- **Styling**: CSS3 with custom animations
- **Icons**: Bootstrap Icons
- **Fonts**: HK Grotesk (Google Fonts)

## Security Features

- **Password Hashing**: Automatic password hashing with passport-local-mongoose
- **Session Security**: Secure session configuration
- **Input Validation**: Server-side form validation
- **CSRF Protection**: Built-in Express.js protection
- **Environment Variables**: Secure configuration management

## Customization

### Adding New Pages
1. Create a new EJS file in the `views/` directory
2. Add a route in `app.js`
3. Include the navbar and footer partials
4. Pass user authentication data to the navbar

### Styling
- Main styles are in `public/styles/home.css`
- Page-specific styles can be added to individual CSS files
- Bootstrap 5 classes are used for responsive design

### Authentication
- User roles can be modified in the User model
- Additional authentication strategies can be added to Passport.js
- Session configuration can be customized in `app.js`

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check if MongoDB is running
   - Verify connection string in `.env` file

2. **Authentication Not Working**
   - Ensure all dependencies are installed
   - Check session configuration
   - Verify Passport.js setup

3. **Styling Issues**
   - Check if Bootstrap CSS is loading
   - Verify custom CSS file paths
   - Clear browser cache

## License

This project is licensed under the ISC License.

## Support

For support and questions, please open an issue in the repository.
