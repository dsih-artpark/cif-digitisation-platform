# CIF Digitisation Platform - Branch Structure

## Branch Strategy

### 🌟 Main Branches
- **main** - Production-ready code, stable features only
- **api-dev** - Backend API development and testing
- **backend-dev** - Backend infrastructure and core logic
- **ui-dev** - Frontend development and UI/UX improvements

### 📋 Branch Purpose & Content

#### main Branch
**Purpose**: Production deployment, stable features
**Content**: 
- ✅ Fully tested and reviewed code
- ✅ Production-ready configurations
- ✅ Complete documentation
- ❌ Sensitive files (.env, API keys, cache)

#### api-dev Branch  
**Purpose**: Backend API development, LLM integration, quality check
**Content**:
- ✅ Backend API endpoints
- ✅ LLM processing logic
- ✅ Quality assessment functions
- ✅ API testing files
- ❌ Sensitive configurations

#### backend-dev Branch
**Purpose**: Backend infrastructure, database, deployment setup
**Content**:
- ✅ Infrastructure code
- ✅ Database schemas
- ✅ Deployment configurations
- ✅ Docker files
- ❌ Production secrets

#### ui-dev Branch
**Purpose**: Frontend development, UI components, user experience
**Content**:
- ✅ React components
- ✅ UI/UX improvements
- ✅ Styling and themes
- ✅ Frontend build configurations
- ❌ API keys and secrets

## 🔒 Security - Files Never Pushed

### Sensitive Files (Already in .gitignore):
- `.env` - Environment variables, API keys, database credentials
- `__pycache__/` - Python compiled files with potential sensitive data
- `prescription docs/` - Patient medical documents (PHI)
- `node_modules/` - Dependencies with potential vulnerabilities
- `*.pyc` - Compiled Python files

### Additional Security Files to Consider:
- `*.key` - SSL certificates
- `*.pem` - Private keys
- `config/secrets.json` - Configuration secrets
- `logs/*.log` - Application logs with user data
- `.openrouter-key` - API key files

## 🚀 Push Strategy

### Development Workflow:
1. **Feature Development** → Work in appropriate dev branch
2. **Testing** → Test in dev environment
3. **Code Review** → Team review and approval
4. **Merge to main** → Production deployment

### Branch-Specific Pushes:

#### api-dev Branch Push:
```bash
git checkout api-dev
git add backend/app.py backend/requirements.txt
git commit -m "Add quality assessment layer with OpenCV"
git push origin api-dev
```

#### backend-dev Branch Push:
```bash
git checkout backend-dev
git add backend/ requirements.txt Dockerfile
git commit -m "Update backend infrastructure and dependencies"
git push origin backend-dev
```

#### ui-dev Branch Push:
```bash
git checkout ui-dev
git add src/ package.json public/
git commit -m "Update UI components and styling"
git push origin ui-dev
```

#### main Branch Push:
```bash
git checkout main
git merge api-dev
git merge backend-dev  
git merge ui-dev
git push origin main
```

## 📊 Current Status

### ✅ Properly Secured:
- .env file in .gitignore
- __pycache__/ excluded
- prescription docs/ protected
- API keys not in repository

### 🔄 Branch Sync Status:
- All branches created and available
- Remote repositories configured
- Ready for development workflow

## 🛡️ Security Best Practices Implemented

1. **Environment Variables**: Never commit .env files
2. **API Keys**: Use environment variables, not hardcoded
3. **Medical Data**: Exclude prescription documents
4. **Cache Files**: Exclude __pycache__ and compiled files
5. **Node Modules**: Exclude frontend dependencies

This structure ensures secure development while maintaining proper branch organization for team collaboration.
