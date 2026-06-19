# Vetnique P&L — Standalone App Setup

## Project structure

```
vetnique-pl/
├── index.html                        ← the app (copy of pl_review.html + shim)
├── staticwebapp.config.json          ← Azure SWA routing + AAD auth
├── api/
│   ├── host.json
│   ├── package.json
│   ├── netsuite/index.js             ← NetSuite SuiteQL proxy (TBA OAuth)
│   └── claude/index.js               ← Anthropic API proxy
└── .github/workflows/
    └── azure-static-web-apps.yml     ← CI/CD pipeline
```

---

## Step 1 — Create the Azure Static Web App

1. Go to https://portal.azure.com → **Create a resource** → **Static Web App**
2. Name: `vetnique-pl`
3. Plan: **Free**
4. Region: pick closest to you
5. Source: **GitHub** → connect your GitHub account → select your repo + `main` branch
6. Build details:
   - App location: `/`
   - Api location: `api`
   - Output location: *(leave blank)*
7. Click **Review + Create**

Azure will add the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret to your GitHub repo automatically.

---

## Step 2 — Set environment variables in Azure

In the Azure portal → your Static Web App → **Configuration** → **Application settings**, add:

| Name                  | Value                                      |
|-----------------------|--------------------------------------------|
| `NS_ACCOUNT_ID`       | Your NetSuite account ID (e.g. `5261257`)  |
| `NS_CONSUMER_KEY`     | TBA consumer key                           |
| `NS_CONSUMER_SECRET`  | TBA consumer secret                        |
| `NS_TOKEN_KEY`        | TBA token key                              |
| `NS_TOKEN_SECRET`     | TBA token secret                           |
| `ANTHROPIC_API_KEY`   | Your Anthropic API key (`sk-ant-...`)      |

### Getting NetSuite TBA credentials

1. In NetSuite: **Setup → Company → Enable Features → SuiteCloud** → enable **Token-Based Authentication**
2. **Setup → Integrations → Manage Integrations** → New integration
   - Name: `Vetnique PL App`
   - Token-Based Authentication: ✓
   - Copy the **Consumer Key** and **Consumer Secret** (shown once only)
3. **Setup → Users/Roles → Access Tokens** → New
   - Application: your integration
   - User: your user
   - Role: the REST role you're setting up
   - Copy **Token ID** (= Token Key) and **Token Secret** (shown once only)

### Getting an Anthropic API key

Go to https://console.anthropic.com → **API Keys** → **Create Key**

---

## Step 3 — Set up AAD authentication (optional but recommended)

The `staticwebapp.config.json` locks the app to authenticated users only via Azure AD.

In the Azure portal → your Static Web App → **Authentication** → **Add provider** → **Azure Active Directory**

Add two more app settings:
- `AZURE_CLIENT_ID` — from your AAD app registration
- `AZURE_CLIENT_SECRET` — from your AAD app registration

To skip auth for now (open to anyone), remove the `routes` and `auth` sections from `staticwebapp.config.json`.

---

## Step 4 — Push to GitHub and deploy

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_ORG/vetnique-pl.git
git push -u origin main
```

GitHub Actions will build and deploy automatically. The URL appears in the Azure portal under **URL**.
