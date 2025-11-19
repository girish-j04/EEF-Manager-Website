# EEF Manager

A modern SaaS application for managing EEF proposals with automated email notifications via Microsoft Graph API.

## Features

-  **Dashboard**: Overview of proposals, reviewers, and statistics
-  **Data Management**: Upload and manage proposal datasets
-  **Survey System**: Review submission and tracking
-  **Tracker**: Assignment management and status tracking
-  **Approval Workflow**: Track approved proposals and funding
-  **Automated Emails**: Send notifications via Microsoft Graph API

## Refactoring History

This is a refactored version of the original EEF Manager application. The original monolithic HTML file has been split into modular, maintainable files with a Node.js backend added for email functionality.

## Project Structure

```
EEF Manager/
├── server/                     # Backend Node.js server
│   ├── index.js               # Express server entry point
│   ├── routes/
│   │   └── email.js          # Email API routes
│   ├── services/
│   │   └── graphClient.js    # Microsoft Graph service
│   └── middleware/
│       ├── errorHandler.js   # Error handling
│       └── validators.js     # Request validation
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
- Microsoft Graph API (@microsoft/microsoft-graph-client)
- Azure Identity for authentication
- CORS, Helmet, Morgan for security and logging

## Setup Instructions

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Firebase Project** with Firestore and Authentication enabled
3. **Azure AD App Registration** for Microsoft Graph API

### Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com/) > **Azure Active Directory** > **App registrations**
2. Click **New registration**
   - Name: `EEF Manager Email Service`
   - Supported account types: **Accounts in this organizational directory only**
   - Click **Register**

3. **Note down**:
   - Application (client) ID
   - Directory (tenant) ID

4. **Create Client Secret**:
   - Go to **Certificates & secrets** > **New client secret**
   - Description: `EEF Manager Secret`
   - Expires: Choose duration
   - Click **Add** and **copy the secret value immediately**

5. **API Permissions**:
   - Go to **API permissions** > **Add a permission**
   - Choose **Microsoft Graph** > **Application permissions**
   - Add these permissions:
     - `Mail.Send` - Send mail as any user
     - `User.Read.All` - Read all users' full profiles (optional, for user verification)
   - Click **Grant admin consent** for your organization

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Azure credentials:
   ```env
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:8000

   # From Azure App Registration
   TENANT_ID=your-tenant-id-here
   CLIENT_ID=your-client-id-here
   CLIENT_SECRET=your-client-secret-here

   DEFAULT_FROM_EMAIL=noreply@yourdomain.com
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

### Email API

#### Send Single Email
```http
POST /api/email/send
Content-Type: application/json

{
  "from": "sender@example.com",
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "body": "<h1>HTML Email Body</h1>",
  "isHtml": true
}
```

#### Send Batch Emails
```http
POST /api/email/send-batch
Content-Type: application/json

{
  "emails": [
    {
      "from": "sender@example.com",
      "to": "recipient1@example.com",
      "subject": "Subject 1",
      "body": "Body 1"
    }
  ]
}
```

#### Get User Info
```http
GET /api/email/user/:userId
```

#### Test Connection
```http
POST /api/email/test
```

#### Health Check
```http
GET /health
```

## Frontend Integration Example

```javascript
// Send email from frontend
async function sendEmail(emailData) {
  const response = await fetch('http://localhost:3000/api/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'noreply@yourdomain.com',
      to: 'reviewer@example.com',
      subject: 'New Proposal Assignment',
      body: `
        <h2>You have been assigned a new proposal</h2>
        <p>Project: ${projectName}</p>
        <p>Due Date: ${dueDate}</p>
        <p><a href="${proposalUrl}">View Proposal</a></p>
      `,
      isHtml: true
    })
  });

  return await response.json();
}
```

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
2. **Grant admin consent** for Graph API permissions in Azure Portal
3. **Use HTTPS in production** for all API communications
4. **Limit CORS origins** to your production domain
5. **Rotate client secrets** periodically
6. **Use service accounts** for sending emails (not personal accounts)

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Check that `.env` file exists and contains all required variables
   - Verify credentials are correct from Azure Portal

2. **"Failed to send email: Insufficient privileges"**
   - Ensure API permissions are granted in Azure Portal
   - Admin consent must be granted
   - Verify the sender email has a mailbox in your organization

3. **CORS errors**
   - Check `FRONTEND_URL` in `.env` matches your frontend URL
   - Ensure backend server is running

4. **"Cannot find module"**
   - Run `npm install` to install dependencies
   - Check Node.js version (v18+ required)

## Browser Compatibility

Requires a modern browser with ES6 module support:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 16+

## License

ISC
