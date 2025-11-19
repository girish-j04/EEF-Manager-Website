# EEF Manager

A modern SaaS application for managing EEF (Educational Equity Fund) proposals.

## Features

-  **Dashboard**: Overview of proposals, reviewers, and statistics
-  **Data Management**: Upload and manage proposal datasets
-  **Survey System**: Review submission and tracking
-  **Tracker**: Assignment management and status tracking
-  **Approval Workflow**: Track approved proposals and funding

## Refactoring History

This is a refactored version of the original EEF Manager application. The original monolithic HTML file has been split into modular, maintainable files.

## Project Structure

```
EEF Manager/
├── server/                     # Backend Node.js server
│   ├── index.js               # Express server entry point
│   └── middleware/
│       └── errorHandler.js   # Error handling
├── js/                         # Frontend JavaScript modules
│   ├── config.js              # Firebase configuration
│   ├── utils.js               # DOM helpers, formatting, notifications
│   ├── storage.js             # Firestore database operations
│   ├── csv.js                 # XLSX parsing utilities
│   ├── ui-builders.js         # UI component builders
│   ├── dashboard.js           # Dashboard rendering
│   ├── data.js                # Data tab operations
│   ├── survey.js              # Survey functionality
│   ├── tracker.js             # Tracker view logic
│   ├── approved.js            # Approved tab logic
│   ├── modal.js               # Modal/detail view
│   └── app.js                 # Main application orchestrator
├── index.html                  # Main HTML file
├── styles.css                  # Modern SaaS styling
├── package.json                # Node.js dependencies
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## File Descriptions

### Core Files

- **index.html** - Minimal HTML structure with semantic sections
- **styles.css** - Complete styling (CSS variables, utilities, components)

### JavaScript Modules

- **js/config.js** - Firebase configuration and initialization
- **js/utils.js** - Shared utilities (DOM manipulation, formatting, notifications)
- **js/storage.js** - Centralized Firestore database operations
- **js/csv.js** - XLSX file parsing and processing
- **js/ui-builders.js** - Dynamic UI component generation

### Feature Modules

- **js/dashboard.js** - Dashboard metrics and reviewer progress
- **js/data.js** - Dataset management (upload, download, column detection)
- **js/survey.js** - Survey/review submission and management
- **js/tracker.js** - Proposal tracking, assignments, status filters
- **js/approved.js** - Approved proposals table and export
- **js/modal.js** - Proposal detail modal with autosave

### Main Application

- **js/app.js** - Application entry point, auth, navigation, state management


## Technology Stack

### Frontend
- Vanilla JavaScript (ES6 modules)
- Modern CSS with Inter font
- Firebase (Firestore, Authentication)
- Chart.js for visualizations
- XLSX for Excel file handling

### Backend
- Node.js with Express
- CORS, Helmet, Morgan for security and logging

## Setup Instructions

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Firebase Project** with Firestore and Authentication enabled

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:8000
   ```

3. **Configure Firebase**:
   - Update `js/config.js` with your Firebase configuration

## Usage

### Running the Application

#### Development Mode

1. **Start the backend server**:
   ```bash
   npm run dev
   ```
   Server will run on `http://localhost:3000`

2. **Start the frontend** (in a separate terminal):
   ```bash
   python3 -m http.server 8000
   ```
   Frontend will be available at `http://localhost:8000`

#### Production Mode

```bash
npm start
```

## API Endpoints

### Health Check
```http
GET /health
```

Returns server status and timestamp.

## Development

### Adding New Features

1. Determine which module the feature belongs to
2. Add the functionality to the appropriate .js file
3. Export new functions if they need to be used elsewhere
4. Import them in the modules that need them

### Modifying Existing Features

1. Use your code editor's search to find the relevant function
2. The modular structure makes it easy to locate specific functionality
3. Make changes in the isolated module without affecting others

## Backup

The original monolithic file is preserved as index.html.backup for reference.

## Security Notes

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use HTTPS in production** for all API communications
3. **Limit CORS origins** to your production domain
4. **Keep Firebase configuration secure** - Configure proper Firestore security rules

## Troubleshooting

### Common Issues

1. **CORS errors**
   - Check `FRONTEND_URL` in `.env` matches your frontend URL
   - Ensure backend server is running

2. **"Cannot find module"**
   - Run `npm install` to install dependencies
   - Check Node.js version (v18+ required)

3. **Firebase connection issues**
   - Verify your Firebase configuration in [js/config.js](js/config.js)
   - Check that Firestore and Authentication are enabled in your Firebase project
   - Review Firestore security rules

## Browser Compatibility

Requires a modern browser with ES6 module support:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 16+

## License

ISC
